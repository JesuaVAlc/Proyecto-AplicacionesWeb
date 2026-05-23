/**
 * Player.js
 * ─────────────────────────────────────────────────────
 * Clase del jugador. Extiende Phaser.Physics.Arcade.Sprite
 * para tener cuerpo físico integrado con Arcade Physics.
 *
 * Responsabilidades:
 *   - Movimiento en 4 direcciones con detección de input
 *   - Animaciones por dirección (con placeholders de color)
 *   - Stats: hp, maxHp, mp, maxMp, attack, defense, speed
 *   - Sistema de niveles y experiencia
 *   - Aplicar/remover buffs y debuffs temporales
 *   - Inventario y uso de objetos
 *   - Serialización para guardado de partida
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import {
  DIRECTIONS,
  PLAYER_STATES,
  PLAYER_SPEED,
  KEYS,
  MAX_LEVEL,
} from '../utils/Constants.js';
import { getLevelData, calcStatsForLevel } from '../data/levels.js';
import { getSkillsForLevel }               from '../data/skills.js';
import { STARTING_INVENTORY }              from '../data/items.js';

// Stats base del jugador en nivel 1
const BASE_STATS = {
  maxHp:   120,
  maxMp:   60,
  attack:  18,
  defense: 10,
  speed:   12,
};

export class Player extends Phaser.Physics.Arcade.Sprite {

  /**
   * @param {Phaser.Scene} scene   — escena a la que pertenece
   * @param {number}       x       — posición X inicial
   * @param {number}       y       — posición Y inicial
   * @param {object|null}  saveData — datos de partida guardada (opcional)
   */
  constructor(scene, x, y, saveData = null) {
    // 'player' es la clave de textura generada en PreloadScene
    super(scene, x, y, 'player');

    // Añadir al sistema de física de la escena
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configuración del cuerpo físico
    this.body.setCollideWorldBounds(true);
    // Hitbox más pequeña que el sprite para colisiones más precisas
    this.body.setSize(20, 20);
    this.body.setOffset(6, 10);

    // ── Estado interno ──────────────────────────────────────────────────────
    this._state     = PLAYER_STATES.IDLE;
    this._direction = DIRECTIONS.DOWN;

    // ── Inicializar stats según save o nueva partida ─────────────────────────
    if (saveData) {
      this._loadFromSave(saveData);
    } else {
      this._initNewGame();
    }

    // ── Registrar teclas de movimiento ──────────────────────────────────────
    this._setupKeys(scene);

    // ── Crear animaciones de movimiento ─────────────────────────────────────
    this._createAnimations(scene);

    // ── Lista de efectos temporales activos (buffs/debuffs) ─────────────────
    // Formato: { stat, modifier, turnsLeft, isMultiplier }
    this._activeEffects = [];

    console.log('[Player] Creado en nivel', this.level, '— HP:', this.hp, '/', this.maxHp);
  }

  // ─── Inicialización ───────────────────────────────────────────────────────────

  /**
   * Configura los stats para una nueva partida desde nivel 1.
   */
  _initNewGame() {
    this.level   = 1;
    this.exp     = 0;
    this.score   = 0;

    // Copiar stats base
    const stats  = { ...BASE_STATS };
    this.maxHp   = stats.maxHp;
    this.maxMp   = stats.maxMp;
    this.attack  = stats.attack;
    this.defense = stats.defense;
    this.speed   = stats.speed;

    // HP y MP al máximo al comenzar
    this.hp = this.maxHp;
    this.mp = this.maxMp;

    // Inventario inicial definido en items.js
    this.inventory = { ...STARTING_INVENTORY };

    // Habilidades disponibles en nivel 1
    this.skills = getSkillsForLevel(1);
  }

  /**
   * Carga el estado del jugador desde datos de partida guardada.
   * @param {object} saveData
   */
  _loadFromSave(saveData) {
    this.level   = saveData.level   ?? 1;
    this.exp     = saveData.exp     ?? 0;
    this.score   = saveData.score   ?? 0;

    // Recalcular stats acumulados hasta el nivel guardado
    const stats  = calcStatsForLevel(this.level, { ...BASE_STATS });
    this.maxHp   = stats.maxHp;
    this.maxMp   = stats.maxMp;
    this.attack  = stats.attack;
    this.defense = stats.defense;
    this.speed   = stats.speed;

    // Restaurar HP/MP guardados (no necesariamente al máximo)
    this.hp = saveData.hp ?? this.maxHp;
    this.mp = saveData.mp ?? this.maxMp;

    this.inventory = saveData.inventory ?? { ...STARTING_INVENTORY };
    this.skills    = getSkillsForLevel(this.level);

    console.log('[Player] Partida cargada — Nivel:', this.level);
  }

  /**
   * Registra las teclas WASD y flechas para movimiento.
   * @param {Phaser.Scene} scene
   */
  _setupKeys(scene) {
    this._keys = scene.input.keyboard.addKeys({
      up:        Phaser.Input.Keyboard.KeyCodes.W,
      down:      Phaser.Input.Keyboard.KeyCodes.S,
      left:      Phaser.Input.Keyboard.KeyCodes.A,
      right:     Phaser.Input.Keyboard.KeyCodes.D,
      arrowUp:   Phaser.Input.Keyboard.KeyCodes.UP,
      arrowDown: Phaser.Input.Keyboard.KeyCodes.DOWN,
      arrowLeft: Phaser.Input.Keyboard.KeyCodes.LEFT,
      arrowRight:Phaser.Input.Keyboard.KeyCodes.RIGHT,
    });
  }

  /**
   * Crea las animaciones de movimiento usando los frames
   * de la textura placeholder generada en PreloadScene.
   * Frame 0: abajo | 1: arriba | 2: izquierda | 3: derecha
   * @param {Phaser.Scene} scene
   */
  _createAnimations(scene) {
    const anims = scene.anims;

    // Evitar duplicados si la escena se reinicia
    if (anims.exists('player_down'))  return;

    anims.create({
      key:       'player_down',
      frames:    [{ key: 'player', frame: 0 }],
      frameRate: 8,
      repeat:    -1,
    });
    anims.create({
      key:       'player_up',
      frames:    [{ key: 'player', frame: 1 }],
      frameRate: 8,
      repeat:    -1,
    });
    anims.create({
      key:       'player_left',
      frames:    [{ key: 'player', frame: 2 }],
      frameRate: 8,
      repeat:    -1,
    });
    anims.create({
      key:       'player_right',
      frames:    [{ key: 'player', frame: 3 }],
      frameRate: 8,
      repeat:    -1,
    });
  }

  // ─── Update (llamado cada frame desde GameScene) ───────────────────────────

  /**
   * Procesa input y mueve al jugador.
   * Solo actúa si el estado es IDLE o MOVING
   * (no se mueve durante batallas o muerte).
   */
  update() {
    if (
      this._state === PLAYER_STATES.IN_BATTLE ||
      this._state === PLAYER_STATES.DEAD
    ) {
      this.body.setVelocity(0, 0);
      return;
    }

    this._handleMovement();
  }

  /**
   * Lee el teclado y aplica velocidad + animación correspondiente.
   * La velocidad se escala con el stat speed del jugador.
   */
  _handleMovement() {
    const keys    = this._keys;
    const speed   = PLAYER_SPEED + (this.speed - BASE_STATS.speed) * 4;
    let   vx      = 0;
    let   vy      = 0;
    let   moved   = false;

    // ── Movimiento horizontal ──────────────────────────────────────────────
    if (keys.left.isDown || keys.arrowLeft.isDown) {
      vx            = -speed;
      this._direction = DIRECTIONS.LEFT;
      moved         = true;
    } else if (keys.right.isDown || keys.arrowRight.isDown) {
      vx            = speed;
      this._direction = DIRECTIONS.RIGHT;
      moved         = true;
    }

    // ── Movimiento vertical ────────────────────────────────────────────────
    if (keys.up.isDown || keys.arrowUp.isDown) {
      vy            = -speed;
      this._direction = DIRECTIONS.UP;
      moved         = true;
    } else if (keys.down.isDown || keys.arrowDown.isDown) {
      vy            = speed;
      this._direction = DIRECTIONS.DOWN;
      moved         = true;
    }

    // ── Normalizar diagonal (evita que ir diagonal sea más rápido) ──────────
    if (vx !== 0 && vy !== 0) {
      const norm = Math.SQRT2;
      vx /= norm;
      vy /= norm;
    }

    this.body.setVelocity(vx, vy);

    // ── Animación ──────────────────────────────────────────────────────────
    if (moved) {
      this._state = PLAYER_STATES.MOVING;
      this.anims.play(`player_${this._direction}`, true);
    } else {
      this._state = PLAYER_STATES.IDLE;
      this.anims.stop();
      // Mantener el frame de la última dirección cuando está quieto
      this.setFrame(this._getIdleFrame());
    }
  }

  /**
   * Retorna el frame correcto para el estado idle
   * según la última dirección del jugador.
   */
  _getIdleFrame() {
    const frameMap = {
      [DIRECTIONS.DOWN]:  0,
      [DIRECTIONS.UP]:    1,
      [DIRECTIONS.LEFT]:  2,
      [DIRECTIONS.RIGHT]: 3,
    };
    return frameMap[this._direction] ?? 0;
  }

  // ─── Sistema de combate ───────────────────────────────────────────────────────

  /**
   * Aplica daño al jugador.
   * @param {number} amount — daño a recibir (ya calculado por BattleManager)
   * @returns {number} daño real recibido
   */
  takeDamage(amount) {
    const real  = Math.max(1, Math.floor(amount));
    this.hp     = Math.max(0, this.hp - real);

    // Efecto visual: parpadeo rojo
    this.scene.tweens.add({
      targets:  this,
      tint:     { from: 0xFF4444, to: 0xFFFFFF },
      duration: 300,
      ease:     'Linear',
    });

    console.log(`[Player] Recibió ${real} de daño. HP: ${this.hp}/${this.maxHp}`);
    return real;
  }

  /**
   * Restaura HP al jugador.
   * @param {number} amount — HP a restaurar
   * @returns {number} HP real restaurado
   */
  heal(amount) {
    const before = this.hp;
    this.hp      = Math.min(this.maxHp, this.hp + Math.floor(amount));
    const healed = this.hp - before;

    // Efecto visual: destello verde
    this.scene.tweens.add({
      targets:  this,
      tint:     { from: 0x44FF44, to: 0xFFFFFF },
      duration: 300,
      ease:     'Linear',
    });

    console.log(`[Player] Curado ${healed} HP. HP: ${this.hp}/${this.maxHp}`);
    return healed;
  }

  /**
   * Consume MP para usar una habilidad.
   * @param {number} cost
   * @returns {boolean} si había suficiente MP
   */
  spendMp(cost) {
    if (this.mp < cost) return false;
    this.mp -= cost;
    return true;
  }

  /**
   * Aplica un efecto temporal (buff o debuff) al jugador.
   * @param {string}  stat         — stat afectado ('attack', 'defense', 'speed')
   * @param {number}  modifier     — valor porcentual (0.25 = 25%)
   * @param {number}  turns        — duración en turnos
   * @param {boolean} isPositive   — true = buff, false = debuff
   */
  applyEffect(stat, modifier, turns, isPositive) {
    // Si ya existe un efecto del mismo tipo, resetear duración
    const existing = this._activeEffects.find(
      e => e.stat === stat && e.isPositive === isPositive
    );

    if (existing) {
      existing.turnsLeft = turns;
      return;
    }

    this._activeEffects.push({ stat, modifier, turnsLeft: turns, isPositive });
    console.log(`[Player] Efecto aplicado: ${stat} ${isPositive ? '+' : '-'}${modifier * 100}% por ${turns} turnos`);
  }

  /**
   * Reduce en 1 el contador de todos los efectos activos
   * y elimina los que hayan expirado.
   * Llamar al final de cada turno del jugador.
   */
  tickEffects() {
    this._activeEffects = this._activeEffects.filter(effect => {
      effect.turnsLeft--;
      if (effect.turnsLeft <= 0) {
        console.log(`[Player] Efecto expiró: ${effect.stat}`);
        return false;
      }
      return true;
    });
  }

  /**
   * Calcula el valor efectivo de un stat considerando efectos activos.
   * Ejemplo: getEffectiveStat('attack') devuelve attack * (1 + suma de modificadores)
   * @param {string} statName
   * @returns {number}
   */
  getEffectiveStat(statName) {
    const base     = this[statName] ?? 0;
    let   modifier = 1.0;

    this._activeEffects.forEach(effect => {
      if (effect.stat === statName) {
        modifier += effect.isPositive ? effect.modifier : -effect.modifier;
      }
    });

    // Nunca por debajo del 10% del valor base
    return Math.max(Math.floor(base * modifier), Math.floor(base * 0.1));
  }

  // ─── Sistema de niveles ───────────────────────────────────────────────────────

  /**
   * Añade experiencia al jugador y sube de nivel si corresponde.
   * @param {number} amount — EXP ganada
   * @returns {boolean} si subió de nivel
   */
  gainExp(amount) {
    if (this.level >= MAX_LEVEL) return false;

    this.exp += amount;
    const levelData = getLevelData(this.level);

    if (levelData && this.exp >= levelData.expToNext) {
      this.exp -= levelData.expToNext;
      this._levelUp();
      return true;
    }
    return false;
  }

  /**
   * Sube el nivel del jugador y aumenta sus stats.
   * Restaura HP y MP al nuevo máximo.
   */
  _levelUp() {
    if (this.level >= MAX_LEVEL) return;

    this.level++;
    const newData = getLevelData(this.level);

    if (newData) {
      // Aplicar crecimiento de stats del nuevo nivel
      this.maxHp   += newData.statGrowth.maxHp;
      this.attack  += newData.statGrowth.attack;
      this.defense += newData.statGrowth.defense;
      this.speed   += newData.statGrowth.speed;
    }

    // Restaurar HP y MP al nuevo máximo
    this.hp = this.maxHp;
    this.mp = this.maxMp;

    // Actualizar habilidades disponibles
    this.skills = getSkillsForLevel(this.level);

    console.log(`[Player] ¡Subió al nivel ${this.level}! Stats:`, {
      maxHp: this.maxHp, attack: this.attack,
      defense: this.defense, speed: this.speed,
    });
  }

  /**
   * Añade puntos al score del jugador.
   * @param {number} points
   */
  addScore(points) {
    this.score += points;
  }

  // ─── Inventario ───────────────────────────────────────────────────────────────

  /**
   * Verifica si el jugador tiene al menos 1 unidad de un item.
   * @param {string} itemId
   * @returns {boolean}
   */
  hasItem(itemId) {
    return (this.inventory[itemId] ?? 0) > 0;
  }

  /**
   * Consume 1 unidad de un item del inventario.
   * @param {string} itemId
   * @returns {boolean} si se pudo consumir
   */
  consumeItem(itemId) {
    if (!this.hasItem(itemId)) return false;
    this.inventory[itemId]--;
    if (this.inventory[itemId] <= 0) {
      delete this.inventory[itemId];
    }
    return true;
  }

  /**
   * Agrega items al inventario (al recogerlos en el mapa).
   * @param {string} itemId
   * @param {number} quantity
   */
  addItem(itemId, quantity = 1) {
    this.inventory[itemId] = (this.inventory[itemId] ?? 0) + quantity;
  }

  // ─── Estado del jugador ───────────────────────────────────────────────────────

  /** @returns {boolean} */
  isDead() {
    return this.hp <= 0;
  }

  /** Cambia al estado IN_BATTLE (detiene movimiento) */
  enterBattle() {
    this._state = PLAYER_STATES.IN_BATTLE;
    this.body.setVelocity(0, 0);
  }

  /** Vuelve al estado IDLE tras la batalla */
  exitBattle() {
    this._state = PLAYER_STATES.IDLE;
    this._activeEffects = []; // Los efectos de batalla no persisten al mapa
  }

  /** @returns {string} dirección actual del jugador */
  getDirection() {
    return this._direction;
  }

  // ─── Serialización ────────────────────────────────────────────────────────────

  /**
   * Serializa el estado del jugador a un objeto plano
   * para guardarlo en localStorage via StorageManager.
   * @returns {object}
   */
  serialize() {
    return {
      level:     this.level,
      exp:       this.exp,
      score:     this.score,
      hp:        this.hp,
      mp:        this.mp,
      inventory: { ...this.inventory },
      x:         Math.floor(this.x),
      y:         Math.floor(this.y),
    };
  }
}