/**
 * BattleScene.js
 * ─────────────────────────────────────────────────────
 * Escena de combate por turnos estilo Final Fantasy clásico.
 *
 * Responsabilidades:
 *   - Mostrar al jugador y al enemigo con sus barras de HP/MP
 *   - Menú de acciones: Habilidades (máx 4), Objetos, Huir
 *   - Ejecutar turnos con BattleManager
 *   - Animar ataques, curaciones y efectos
 *   - Mostrar log de mensajes de batalla
 *   - Manejar fin de batalla (victoria / derrota)
 *   - Devolver control a GameScene con el resultado
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import {
  SCENES,
  GAME_WIDTH,
  GAME_HEIGHT,
  BATTLE_STATES,
  SKILL_TYPES,
} from '../utils/Constants.js';
import { Player } from '../objects/Player.js';
import { BattleManager } from '../managers/BattleManager.js';
import { getEnemyById } from '../data/enemies.js';
import { getItemById, ITEMS } from '../data/items.js';
import { HealthBar } from '../ui/HealthBar.js';
import { BattleMenu } from '../ui/BattleMenu.js';
import { DialogBox } from '../ui/DialogoBox.js';

// Layout de la pantalla de batalla
const LAYOUT = {
  enemyX: GAME_WIDTH * 0.65,
  enemyY: GAME_HEIGHT * 0.28,
  playerX: GAME_WIDTH * 0.22,
  playerY: GAME_HEIGHT * 0.55,
  logX: 16,
  logY: GAME_HEIGHT - 90,
  logW: GAME_WIDTH - 32,
  logH: 56,
  menuX: GAME_WIDTH * 0.55,
  menuY: GAME_HEIGHT - 110,
};

export class BattleScene extends Phaser.Scene {

  constructor() {
    super({ key: SCENES.BATTLE });
  }

  // ─── init ────────────────────────────────────────────────────────────────────
  init(data) {
    this._enemyId = data.enemyId;
    this._playerData = data.playerData; // datos serializados del jugador
  }

  // ─── create ──────────────────────────────────────────────────────────────────
  create() {
    // ── Reconstruir jugador desde datos serializados ───────────────────────
    // No usamos el Player de GameScene directamente para no acoplar escenas.
    // BattleScene recibe los datos y crea su propia referencia local.
    this._player = this._rebuildPlayer();

    // ── Obtener datos del enemigo ─────────────────────────────────────────
    this._enemy = getEnemyById(this._enemyId);

    // ── Inicializar BattleManager ─────────────────────────────────────────
    this._manager = new BattleManager(this._player, this._enemy);

    // ── Construir UI ──────────────────────────────────────────────────────
    this._createBackground();
    this._createEnemyDisplay();
    this._createPlayerDisplay();
    this._menu = new BattleMenu(
      this,
      LAYOUT.menuX,
      LAYOUT.menuY,
      this._player
    );
    this._menu.refresh();
    this._battleLog = new DialogBox(
      this,
      LAYOUT.logX,
      LAYOUT.logY,
      LAYOUT.logW,
      LAYOUT.logH,
      { mode: 'log', maxLines: 3, depth: 3 }
    );
    // ── Determinar quién va primero ───────────────────────────────────────
    this._currentTurn = this._manager.getFirstTurn();
    this._state = BATTLE_STATES.PLAYER_TURN;
    this._menuIndex = 0;
    this._subMenu = null; // 'skills' | 'items' | null

    // ── Input ─────────────────────────────────────────────────────────────
    this._setupInput();

    // Fade in de la escena de batalla
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Mostrar quién ataca primero
    const firstMsg = this._currentTurn === 'player'
      ? '¡Tu turno! Elige una acción.'
      : `${this._enemy.name} actúa primero.`;
    this._log(firstMsg);

    // Si el enemigo va primero, ejecutarlo con un pequeño delay
    if (this._currentTurn === 'enemy') {
      this.time.delayedCall(1200, () => this._doEnemyTurn());
    } else {
      this._menu.refresh();
    }

    console.log('[BattleScene] Batalla iniciada contra:', this._enemy.name);
  }

  // ─── Reconstrucción del jugador ───────────────────────────────────────────────

  /**
   * Crea un objeto "jugador lite" con solo los métodos que BattleManager necesita.
   * Evita instanciar un Phaser.Sprite completo (no hay física en batalla).
   */
  _rebuildPlayer() {
    const d = this._playerData;

    // Objeto plano que imita la interfaz de Player para BattleManager
    return {
      level: d.level,
      exp: d.exp,
      score: d.score,
      hp: d.hp,
      maxHp: d.maxHp ?? 120,
      mp: d.mp,
      maxMp: d.maxMp ?? 60,
      attack: d.attack ?? 18,
      defense: d.defense ?? 10,
      speed: d.speed ?? 12,
      inventory: { ...(d.inventory ?? {}) },
      skills: d.skills ?? [],
      _effects: [],

      // ── Métodos requeridos por BattleManager ────────────────────────────
      getEffectiveStat(stat) {
        const base = this[stat] ?? 0;
        let mod = 1.0;
        this._effects.forEach(e => {
          if (e.stat === stat) mod += e.isPositive ? e.modifier : -e.modifier;
        });
        return Math.max(Math.floor(base * mod), Math.floor(base * 0.1));
      },
      takeDamage(amount) {
        const real = Math.max(1, Math.floor(amount));
        this.hp = Math.max(0, this.hp - real);
        return real;
      },
      heal(amount) {
        const before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + Math.floor(amount));
        return this.hp - before;
      },
      spendMp(cost) {
        if (this.mp < cost) return false;
        this.mp -= cost;
        return true;
      },
      applyEffect(stat, modifier, turns, isPositive) {
        const ex = this._effects.find(e => e.stat === stat && e.isPositive === isPositive);
        if (ex) { ex.turnsLeft = turns; return; }
        this._effects.push({ stat, modifier, turnsLeft: turns, isPositive });
      },
      tickEffects() {
        this._effects = this._effects.filter(e => {
          e.turnsLeft--;
          return e.turnsLeft > 0;
        });
      },
      hasItem(id) { return (this.inventory[id] ?? 0) > 0; },
      consumeItem(id) {
        if (!this.hasItem(id)) return false;
        this.inventory[id]--;
        if (this.inventory[id] <= 0) delete this.inventory[id];
        return true;
      },
      gainExp(amount) {
        this.exp += amount;
        return false; // El level up real se calcula en GameScene
      },
      addScore(pts) { this.score += pts; },
      isDead() { return this.hp <= 0; },
    };
  }

  // ─── Construcción de la UI ────────────────────────────────────────────────────

  /**
   * Fondo de batalla: degradado oscuro con líneas de energía.
   */
  _createBackground() {
    // Fondo base
    this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT, 0x04050F
    );

    // Líneas de energía decorativas (horizontal)
    const lines = this.add.graphics();
    lines.lineStyle(1, 0x112244, 0.5);
    for (let y = 0; y < GAME_HEIGHT; y += 20) {
      lines.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Plataforma del jugador
    const playerPlatform = this.add.graphics();
    playerPlatform.fillStyle(0x223355, 0.6);
    playerPlatform.fillEllipse(LAYOUT.playerX, LAYOUT.playerY + 30, 80, 20);

    // Plataforma del enemigo
    const enemyPlatform = this.add.graphics();
    enemyPlatform.fillStyle(0x552233, 0.6);
    enemyPlatform.fillEllipse(LAYOUT.enemyX, LAYOUT.enemyY + 40, 100, 20);

    // Marco dorado general
    const border = this.add.graphics();
    border.lineStyle(2, 0xFFD700, 0.4);
    border.strokeRect(8, 8, GAME_WIDTH - 16, GAME_HEIGHT - 16);
  }

  /**
   * Display del enemigo: sprite, nombre, barra de HP.
   */
  _createEnemyDisplay() {
    const ex = LAYOUT.enemyX;
    const ey = LAYOUT.enemyY;

    // Sprite del enemigo
    this._enemySprite = this.add.image(ex, ey, this._enemy.textureKey)
      .setScale(this._enemy.isBoss ? 3 : 2);

    // Nombre del enemigo
    this.add.text(ex, ey - 50, this._enemy.name, {
      fontFamily: 'monospace',
      fontSize: this._enemy.isBoss ? '16px' : '14px',
      color: this._enemy.isBoss ? '#FF6600' : '#FFAAAA',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Panel de HP del enemigo
    const panelW = 160;
    const panelX = ex - panelW / 2;
    const panelY = ey - 70;

    // Fondo del panel
    this.add.graphics()
      .fillStyle(0x000022, 0.8)
      .fillRect(panelX - 4, panelY - 4, panelW + 8, 22)
      .lineStyle(1, 0xFF4444, 0.6)
      .strokeRect(panelX - 4, panelY - 4, panelW + 8, 22);

    // Barra del enemigo
    this._enemyHpBar = new HealthBar(
      this, panelX, panelY, panelW, 14, 0xFF4444,
      { textPos: 'inside', prefix: 'HP: ', bgColor: 0x330000 }
    );

    this._updateEnemyBars();
  }

  /**
   * Display del jugador: sprite, nombre, barras de HP y MP.
   */
  _createPlayerDisplay() {
    const px = LAYOUT.playerX;
    const py = LAYOUT.playerY;

    // Sprite del jugador (más grande en batalla)
    this._playerSprite = this.add.image(px, py, 'player', 0).setScale(2.5);

    // Nombre
    this.add.text(px, py + 45, 'Héroe', {
      fontFamily: 'monospace', fontSize: '12px', color: '#88AAFF',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Panel de stats del jugador
    const panelW = 180;
    const panelX = px - panelW / 2;
    const panelY = py + 58;

    this.add.graphics()
      .fillStyle(0x000022, 0.85)
      .fillRoundedRect(panelX - 4, panelY - 4, panelW + 8, 56, 6)
      .lineStyle(1, 0x4466FF, 0.6)
      .strokeRoundedRect(panelX - 4, panelY - 4, panelW + 8, 56, 6);

    // Barra HP jugador
    this._playerHpBar = new HealthBar(
      this, panelX + 18, panelY, panelW - 18, 10, 0xFF4444,
      {
        label: 'HP', labelColor: '#FF6666', textPos: 'inside',
        bgColor: 0x330000
      }
    );

    // Barra MP jugador
    this._playerMpBar = new HealthBar(
      this, panelX + 18, panelY + 18, panelW - 18, 10, 0x4488FF,
      {
        label: 'MP', labelColor: '#6688FF', textPos: 'inside',
        bgColor: 0x000033
      }
    );

    // Nivel del jugador
    this._playerLvText = this.add.text(panelX, panelY + 34, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#FFD700',
    });

    this._updatePlayerBars();
  }

  // ─── Input ────────────────────────────────────────────────────────────────────

  _setupInput() {
    this.input.keyboard.on('keydown-W', this._onUp, this);
    this.input.keyboard.on('keydown-UP', this._onUp, this);
    this.input.keyboard.on('keydown-S', this._onDown, this);
    this.input.keyboard.on('keydown-DOWN', this._onDown, this);
    this.input.keyboard.on('keydown-SPACE', this._onConfirm, this);
    this.input.keyboard.on('keydown-ENTER', this._onConfirm, this);
    this.input.keyboard.on('keydown-ESC', this._onBack, this);
  }

  _onUp() {
    if (this._state !== BATTLE_STATES.PLAYER_TURN) return;
    this._menu.moveUp();
  }

  _onDown() {
    if (this._state !== BATTLE_STATES.PLAYER_TURN) return;
    this._menu.moveDown();
  }

  _onConfirm() {
    if (this._state !== BATTLE_STATES.PLAYER_TURN) return;

    if (!this._menu.isInSubMenu()) {
      switch (this._menu.getMainIndex()) {
        case 0: this._menu.openSkills(); break;
        case 1: this._menu.openItems(); break;
        case 2: this._tryFlee(); break;
      }
    } else {
      const skill = this._menu.getSelectedSkill();
      const itemId = this._menu.getSelectedItem();
      if (skill) this._selectSkill(skill);
      if (itemId) this._selectItem(itemId);
    }
  }

  _onBack() {
    if (this._state !== BATTLE_STATES.PLAYER_TURN)
      return;

    if (this._menu.isInSubMenu())
      this._menu.closeSubMenu();
  }

  /**
   * Retorna las opciones del submenú activo.
   * @returns {Array<string>}
   */
  // ─── Ejecución de Habilidades ────────────────────────────────────────────────────
  _selectSkill(skill) {
    if (skill.mpCost > this._player.mp) {
      this._log('¡MP insuficiente!');
      return;
    }
    this._menu.closeSubMenu();
    this._state = BATTLE_STATES.ANIMATING;

    // Animación de ataque del jugador
    this._animatePlayerAttack(() => {
      const result = this._manager.playerAction(skill);
      this._log(result.message);
      this._updateAllBars();

      // Verificar fin de batalla
      this.time.delayedCall(800, () => {
        if (this._checkEnd()) return;
        // Turno del enemigo
        this.time.delayedCall(400, () => this._doEnemyTurn());
      });
    });
  }

  /**
   * Usa el objeto seleccionado del inventario.
   */
  _selectItem(itemId) {
    const item = getItemById(itemId);
    if (!item) return;

    this._menu.closeSubMenu();
    this._state = BATTLE_STATES.ANIMATING;

    const result = this._manager.playerUseItem(item);
    this._log(result.message);
    this._updateAllBars();

    this.time.delayedCall(800, () => {
      if (this._checkEnd()) return;
      this.time.delayedCall(400, () => this._doEnemyTurn());
    });
  }

  /**
   * Intento de huir de la batalla.
   * Probabilidad base: 40% + bonus por speed.
   */
  _tryFlee() {
    const fleeChance = 0.40 + (this._player.speed / 100);
    if (Math.random() < fleeChance) {
      this._log('¡Huiste exitosamente!');
      this.time.delayedCall(1000, () => this._endBattle('flee'));
    } else {
      this._log('¡No pudiste escapar!');
      this._state = BATTLE_STATES.ANIMATING;
      this.time.delayedCall(800, () => this._doEnemyTurn());
    }
  }

  /**
   * Ejecuta el turno del enemigo con animación.
   */
  _doEnemyTurn() {
    this._state = BATTLE_STATES.ANIMATING;

    this._animateEnemyAttack(() => {
      const result = this._manager.enemyAction();
      this._log(`${this._enemy.name}: ${result.message}`);
      this._updateAllBars();

      this.time.delayedCall(800, () => {
        if (this._checkEnd()) return;

        // Volver al turno del jugador
        this._state = BATTLE_STATES.PLAYER_TURN;
        this._menuIndex = 0;
        this._menu.refresh();
        this._log('Tu turno. Elige una acción.');
      });
    });
  }

  // ─── Animaciones ──────────────────────────────────────────────────────────────

  /**
   * Animación del jugador atacando: salta hacia el enemigo.
   * @param {Function} onComplete — callback al terminar
   */
  _animatePlayerAttack(onComplete) {
    this.tweens.add({
      targets: this._playerSprite,
      x: this._playerSprite.x + 60,
      duration: 150,
      yoyo: true,
      repeat: 1,
      ease: 'Power2',
      onComplete,
    });
  }

  /**
   * Animación del enemigo atacando: sacude la pantalla.
   * @param {Function} onComplete
   */
  _animateEnemyAttack(onComplete) {
    // El enemigo se acerca
    this.tweens.add({
      targets: this._enemySprite,
      x: this._enemySprite.x - 40,
      duration: 120,
      yoyo: true,
      repeat: 1,
      ease: 'Power2',
    });

    // Shake de cámara
    this.cameras.main.shake(300, 0.008);

    this.time.delayedCall(400, onComplete);
  }

  // ─── Actualización de barras ──────────────────────────────────────────────────

  _updateAllBars() {
    this._updatePlayerBars();
    this._updateEnemyBars();
  }

  /**
   * Redibuja las barras de HP y MP del jugador.
   */
  _updatePlayerBars() {
    this._playerHpBar.update(this._player.hp, this._player.maxHp);
    this._playerMpBar.update(this._player.mp, this._player.maxMp);
    this._playerLvText.setText(`LV ${this._player.level}  EXP: ${this._player.exp}`);
  }

  /**
   * Redibuja la barra de HP del enemigo.
   */
  _updateEnemyBars() {
    this._enemyHpBar.update(this._enemy.stats.hp, this._enemy.stats.maxHp);
  }

  // ─── Log de mensajes ──────────────────────────────────────────────────────────

  /**
   * Agrega un mensaje al log de batalla.
   * Desplaza los mensajes anteriores hacia abajo (máx 3 visibles).
   * @param {string} message
   */
  _log(message) {
    // Desplazar líneas: la más nueva va arriba
    this._battleLog.addLine(message);
  }

  // ─── Fin de batalla ───────────────────────────────────────────────────────────

  /**
   * Verifica si la batalla terminó y actúa en consecuencia.
   * @returns {boolean} si la batalla terminó
   */
  _checkEnd() {
    const result = this._manager.checkBattleEnd();
    if (!result) return false;

    if (result === 'player_win') {
      this._state = BATTLE_STATES.WIN;
      this._onWin();
    } else {
      this._state = BATTLE_STATES.LOSE;
      this._onLose();
    }
    return true;
  }

  /**
   * Maneja la victoria: calcula recompensas y vuelve a GameScene.
   */
  _onWin() {
    const rewards = this._manager.calcRewards();

    let winMsg = `¡Victoria! EXP +${rewards.exp}`;
    if (rewards.leveledUp) winMsg += ` ¡Subiste al nivel ${this._player.level}!`;
    this._log(winMsg);

    // Ocultar menú
    this._menu.setVisible(false);

    // Guardar datos actualizados del jugador en registry
    this.registry.set('battlePlayerData', {
      level: this._player.level,
      exp: this._player.exp,
      score: this._player.score,
      hp: this._player.hp,
      mp: this._player.mp,
      maxHp: this._player.maxHp,
      maxMp: this._player.maxMp,
      attack: this._player.attack,
      defense: this._player.defense,
      speed: this._player.speed,
      inventory: this._player.inventory,
      skills: this._player.skills,
    });

    this.time.delayedCall(2000, () => this._endBattle('win'));
  }

  /**
   * Maneja la derrota: verifica pluma de fénix o va a GameOver.
   */
  _onLose() {
    // Verificar pluma de fénix
    if (this._player.hasItem('phoenix_down')) {
      this._player.consumeItem('phoenix_down');
      this._player.hp = Math.floor(this._player.maxHp * 0.25);
      this._log('¡La Pluma de Fénix te revivió con el 25% de HP!');
      this._updateAllBars();

      this.time.delayedCall(1000, () => {
        this._state = BATTLE_STATES.PLAYER_TURN;
        this._menuIndex = 0;
        this._menu.refresh()
      });
      return;
    }

    this._log('¡Has sido derrotado!');
    this._menu.setVisible(false);

    this.cameras.main.shake(500, 0.02);
    this.time.delayedCall(2000, () => this._endBattle('lose'));
  }

  /**
   * Termina la batalla y regresa a GameScene con el resultado.
   * @param {'win' | 'lose' | 'flee'} result
   */
  _endBattle(result) {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.GAME, {
        battleResult: result === 'flee' ? null : result,
        enemyId: this._enemyId,
      });
    });
  }

  // ─── Limpieza ─────────────────────────────────────────────────────────────────

  shutdown() {
    this.input.keyboard.off('keydown-W', this._onUp, this);
    this.input.keyboard.off('keydown-UP', this._onUp, this);
    this.input.keyboard.off('keydown-S', this._onDown, this);
    this.input.keyboard.off('keydown-DOWN', this._onDown, this);
    this.input.keyboard.off('keydown-SPACE', this._onConfirm, this);
    this.input.keyboard.off('keydown-ENTER', this._onConfirm, this);
    this.input.keyboard.off('keydown-ESC', this._onBack, this);
    this._playerHpBar.destroy();
    this._playerMpBar.destroy();
    this._enemyHpBar.destroy();
    this._menu.destroy();
    this._battleLog.destroy();
  }
}