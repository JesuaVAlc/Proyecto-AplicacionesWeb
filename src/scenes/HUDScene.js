/**
 * HUDScene.js
 * ─────────────────────────────────────────────────────
 * Escena de UI superpuesta que corre EN PARALELO a GameScene.
 * Phaser permite tener múltiples escenas activas al mismo tiempo;
 * el HUD vive en su propia escena para no mezclar lógica de juego
 * con lógica de interfaz.
 *
 * Responsabilidades:
 *   - Barra de HP con texto numérico
 *   - Barra de MP con texto numérico
 *   - Barra de EXP con nivel actual
 *   - Dibujo del personaje (sprite estático en esquina)
 *   - Minimapa con posición del jugador y enemigos
 *   - Botón / indicador de MUTE
 *   - Actualizarse cada frame leyendo del registry
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, HUD, STORAGE_KEYS, AUDIO } from '../utils/Constants.js';
import { getLevelData } from '../data/levels.js';

// Posición y tamaño del panel izquierdo del HUD
const PANEL_X      = 8;
const PANEL_Y      = 8;
const PANEL_W      = 180;
const PANEL_H      = 110;

// Posición del minimapa (esquina superior derecha)
const MINI_X       = GAME_WIDTH  - HUD.MINIMAP_SIZE - 10;
const MINI_Y       = 10;

export class HUDScene extends Phaser.Scene {

  constructor() {
    super({ key: SCENES.HUD });
  }

  // ─── create ──────────────────────────────────────────────────────────────────
  create() {
    this._createPanel();
    this._createBars();
    this._createCharacterPortrait();
    this._createLevelDisplay();
    this._createMinimap();
    this._createMuteButton();

    // Referencia al jugador via registry (GameScene lo pone ahí)
    this._player = this.registry.get('player');

    // Primer render inmediato
    this._updateAll();

    console.log('[HUDScene] HUD iniciado.');
  }

  // ─── update ──────────────────────────────────────────────────────────────────
  update() {
    // Actualizar referencia al jugador en cada frame
    // (puede cambiar si la escena se reinicia)
    this._player = this.registry.get('player');
    if (!this._player) return;

    this._updateAll();
  }

  // ─── Construcción visual ──────────────────────────────────────────────────────

  /**
   * Panel semitransparente de fondo en la esquina superior izquierda.
   * Contiene las barras de HP/MP/EXP y el retrato del personaje.
   */
  _createPanel() {
    // Fondo oscuro semitransparente
    this._panelBg = this.add.graphics();
    this._panelBg.fillStyle(0x000022, 0.75);
    this._panelBg.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 8);

    // Borde dorado
    this._panelBg.lineStyle(2, 0xFFD700, 0.9);
    this._panelBg.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 8);

    // Línea interna decorativa
    this._panelBg.lineStyle(1, 0x334488, 0.5);
    this._panelBg.strokeRoundedRect(PANEL_X + 3, PANEL_Y + 3, PANEL_W - 6, PANEL_H - 6, 6);
  }

  /**
   * Crea las tres barras: HP (roja), MP (azul), EXP (amarilla).
   * Cada barra tiene: fondo, relleno dinámico y texto numérico.
   */
  _createBars() {
    // Posición X de inicio de las barras (deja espacio al retrato)
    const barStartX = PANEL_X + 52;
    const barW      = PANEL_W - 60;

    // ── HP ────────────────────────────────────────────────────────────────
    const hpY = PANEL_Y + 20;

    this.add.text(barStartX - 2, hpY - 1, 'HP', {
      fontFamily: 'monospace', fontSize: '9px', color: '#FF6666',
    });

    // Fondo de barra HP
    this._hpBarBg = this.add.graphics();
    this._hpBarBg.fillStyle(0x330000);
    this._hpBarBg.fillRect(barStartX, hpY + 10, barW, 10);
    this._hpBarBg.lineStyle(1, 0xFF4444, 0.6);
    this._hpBarBg.strokeRect(barStartX, hpY + 10, barW, 10);

    // Relleno dinámico HP
    this._hpBar = this.add.graphics();

    // Texto HP numérico
    this._hpText = this.add.text(barStartX + barW / 2, hpY + 10, '---/---', {
      fontFamily: 'monospace', fontSize: '8px', color: '#FFFFFF',
    }).setOrigin(0.5, 0);

    // ── MP ────────────────────────────────────────────────────────────────
    const mpY = PANEL_Y + 48;

    this.add.text(barStartX - 2, mpY - 1, 'MP', {
      fontFamily: 'monospace', fontSize: '9px', color: '#6688FF',
    });

    this._mpBarBg = this.add.graphics();
    this._mpBarBg.fillStyle(0x000033);
    this._mpBarBg.fillRect(barStartX, mpY + 10, barW, 10);
    this._mpBarBg.lineStyle(1, 0x4466FF, 0.6);
    this._mpBarBg.strokeRect(barStartX, mpY + 10, barW, 10);

    this._mpBar  = this.add.graphics();

    this._mpText = this.add.text(barStartX + barW / 2, mpY + 10, '---/---', {
      fontFamily: 'monospace', fontSize: '8px', color: '#FFFFFF',
    }).setOrigin(0.5, 0);

    // ── EXP ───────────────────────────────────────────────────────────────
    const expY = PANEL_Y + 76;

    this.add.text(barStartX - 2, expY - 1, 'EXP', {
      fontFamily: 'monospace', fontSize: '9px', color: '#FFDD44',
    });

    this._expBarBg = this.add.graphics();
    this._expBarBg.fillStyle(0x222200);
    this._expBarBg.fillRect(barStartX, expY + 10, barW, 8);
    this._expBarBg.lineStyle(1, 0xFFDD44, 0.5);
    this._expBarBg.strokeRect(barStartX, expY + 10, barW, 8);

    this._expBar  = this.add.graphics();

    this._expText = this.add.text(barStartX + barW / 2, expY + 10, '', {
      fontFamily: 'monospace', fontSize: '7px', color: '#FFDD44',
    }).setOrigin(0.5, 0);
  }

  /**
   * Retrato del personaje: sprite estático en la esquina del panel.
   * Muestra el frame "abajo" del sprite del jugador.
   */
  _createCharacterPortrait() {
    // Marco del retrato
    const portraitBg = this.add.graphics();
    portraitBg.fillStyle(0x001133, 0.9);
    portraitBg.fillRect(PANEL_X + 6, PANEL_Y + 10, 38, 38);
    portraitBg.lineStyle(1, 0xFFD700, 0.8);
    portraitBg.strokeRect(PANEL_X + 6, PANEL_Y + 10, 38, 38);

    // Sprite del jugador escalado dentro del marco
    this._portrait = this.add.image(
      PANEL_X + 25, PANEL_Y + 29, 'player', 0
    ).setScale(1.1);
  }

  /**
   * Muestra el nivel actual del jugador sobre el retrato.
   */
  _createLevelDisplay() {
    this._levelText = this.add.text(PANEL_X + 25, PANEL_Y + 50, 'LV 1', {
      fontFamily: 'monospace',
      fontSize:   '9px',
      color:      '#FFD700',
      stroke:     '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);
  }

  /**
   * Minimapa en la esquina superior derecha.
   * Muestra el mapa completo a escala con:
   *   - Puntos blancos para paredes
   *   - Punto verde para el jugador
   *   - Puntos rojos para enemigos activos
   */
  _createMinimap() {
    const size = HUD.MINIMAP_SIZE;

    // Fondo del minimapa
    const minimapBg = this.add.graphics();
    minimapBg.fillStyle(0x000022, 0.85);
    minimapBg.fillRect(MINI_X, MINI_Y, size, size);
    minimapBg.lineStyle(2, 0xFFD700, 0.9);
    minimapBg.strokeRect(MINI_X, MINI_Y, size, size);

    // Etiqueta
    this.add.text(MINI_X + size / 2, MINI_Y - 1, 'MAPA', {
      fontFamily: 'monospace', fontSize: '8px', color: '#888888',
    }).setOrigin(0.5, 1);

    // Gráfico dinámico del minimapa (se redibuja en update)
    this._minimapGraphics = this.add.graphics();
  }

  /**
   * Botón de mute en la esquina inferior derecha.
   * Pulsar M o hacer clic en él alterna el audio.
   */
  _createMuteButton() {
    const bx = GAME_WIDTH  - 36;
    const by = GAME_HEIGHT - 20;

    // Leer estado de mute del registry
    const audioConfig = this.registry.get('audioConfig') ?? {};
    this._muted       = audioConfig.muted ?? AUDIO.DEFAULT_MUTED;

    // Fondo del botón
    this._muteBg = this.add.graphics();
    this._drawMuteButton();

    // Texto del botón
    this._muteText = this.add.text(bx, by, this._muted ? '🔇' : '🔊', {
      fontFamily: 'monospace',
      fontSize:   '14px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Click con ratón
    this._muteText.on('pointerdown', () => this._toggleMute());

    // Tecla M
    this.input.keyboard.on('keydown-M', () => this._toggleMute());
  }

  /**
   * Dibuja el fondo del botón de mute según el estado actual.
   */
  _drawMuteButton() {
    const bx = GAME_WIDTH  - 52;
    const by = GAME_HEIGHT - 30;
    this._muteBg.clear();
    this._muteBg.fillStyle(this._muted ? 0x440000 : 0x003300, 0.8);
    this._muteBg.fillRoundedRect(bx, by, 32, 20, 4);
    this._muteBg.lineStyle(1, this._muted ? 0xFF4444 : 0x44FF44, 0.8);
    this._muteBg.strokeRoundedRect(bx, by, 32, 20, 4);
  }

  /**
   * Alterna el estado de mute del juego y lo persiste.
   */
  _toggleMute() {
    this._muted = !this._muted;
    this.game.sound.mute = this._muted;

    // Actualizar visual del botón
    this._muteText.setText(this._muted ? '🔇' : '🔊');
    this._drawMuteButton();

    // Persistir en localStorage
    try {
      const audioConfig = this.registry.get('audioConfig') ?? {};
      audioConfig.muted = this._muted;
      this.registry.set('audioConfig', audioConfig);
      localStorage.setItem(STORAGE_KEYS.AUDIO_CONFIG, JSON.stringify(audioConfig));
    } catch {}

    console.log('[HUDScene] Mute:', this._muted);
  }

  // ─── Actualización dinámica ───────────────────────────────────────────────────

  /**
   * Actualiza todos los elementos del HUD con los stats actuales del jugador.
   * Se llama cada frame desde update().
   */
  _updateAll() {
    const p = this._player;
    if (!p) return;

    this._updateBar(this._hpBar, p.hp, p.maxHp,
      PANEL_X + 52, PANEL_Y + 30, PANEL_W - 60, 10, 0xFF4444);
    this._hpText.setText(`${p.hp}/${p.maxHp}`);

    this._updateBar(this._mpBar, p.mp, p.maxMp,
      PANEL_X + 52, PANEL_Y + 58, PANEL_W - 60, 10, 0x4488FF);
    this._mpText.setText(`${p.mp}/${p.maxMp}`);

    // EXP: calcular porcentaje hacia el siguiente nivel
    const levelData = getLevelData(p.level);
    const expMax    = levelData?.expToNext ?? 1;
    const expPct    = expMax > 0 ? p.exp / expMax : 1;
    this._updateBar(this._expBar, p.exp, expMax,
      PANEL_X + 52, PANEL_Y + 86, PANEL_W - 60, 8, 0xFFDD44);
    this._expText.setText(p.level >= 20 ? 'MAX' : `${p.exp}/${expMax}`);

    // Nivel
    this._levelText.setText(`LV ${p.level}`);

    // Minimapa
    this._updateMinimap(p);
  }

  /**
   * Redibuja una barra de progreso con el valor/máximo dados.
   * @param {Phaser.GameObjects.Graphics} graphics — objeto graphics de la barra
   * @param {number} current  — valor actual
   * @param {number} max      — valor máximo
   * @param {number} x        — posición X del borde izquierdo
   * @param {number} y        — posición Y del borde superior
   * @param {number} width    — ancho total de la barra
   * @param {number} height   — alto de la barra
   * @param {number} color    — color de relleno (hex)
   */
  _updateBar(graphics, current, max, x, y, width, height, color) {
    graphics.clear();
    if (max <= 0) return;

    const pct     = Phaser.Math.Clamp(current / max, 0, 1);
    const fillW   = Math.floor(width * pct);

    if (fillW <= 0) return;

    // Color se oscurece cuando el valor es bajo (efecto peligro)
    const finalColor = (pct < 0.25 && color === 0xFF4444)
      ? 0xFF0000
      : color;

    graphics.fillStyle(finalColor);
    graphics.fillRect(x, y, fillW, height);

    // Brillo superior (highlight)
    graphics.fillStyle(0xFFFFFF, 0.15);
    graphics.fillRect(x, y, fillW, Math.floor(height / 3));
  }

  /**
   * Redibuja el minimapa con la posición del jugador y los enemigos.
   * Usa una escala proporcional al tamaño del mapa de tiles.
   * @param {Player} player
   */
  _updateMinimap(player) {
    const g    = this._minimapGraphics;
    const size = HUD.MINIMAP_SIZE;

    // Tamaño del mapa en píxeles (40 cols × 32px, 30 rows × 32px)
    const MAP_PX_W = 40 * 32;
    const MAP_PX_H = 30 * 32;

    // Factor de escala: mapa real → minimapa
    const scaleX = size / MAP_PX_W;
    const scaleY = size / MAP_PX_H;

    g.clear();

    // ── Fondo del área de juego en el minimapa ─────────────────────────────
    g.fillStyle(0x112211, 1);
    g.fillRect(MINI_X + 1, MINI_Y + 1, size - 2, size - 2);

    // ── Jugador: punto verde ───────────────────────────────────────────────
    const px = MINI_X + player.x * scaleX;
    const py = MINI_Y + player.y * scaleY;
    g.fillStyle(0x00FF44);
    g.fillCircle(px, py, 3);

    // ── Enemigos activos: puntos rojos ─────────────────────────────────────
    // Leemos la referencia a GameScene para obtener el grupo de enemigos
    const gameScene = this.scene.get(SCENES.GAME);
    if (gameScene?._enemyGroup) {
      gameScene._enemyGroup.getChildren().forEach(enemy => {
        if (!enemy.getData('defeated') && enemy.active) {
          const ex = MINI_X + enemy.x * scaleX;
          const ey = MINI_Y + enemy.y * scaleY;
          const isBoss = enemy.getData('enemyId') === 'chaos_dragon';
          g.fillStyle(isBoss ? 0xFF6600 : 0xFF2222);
          g.fillCircle(ex, ey, isBoss ? 3 : 2);
        }
      });
    }

    // ── Zona de guardado: punto dorado ────────────────────────────────────
    if (gameScene?._saveZones) {
      gameScene._saveZones.getChildren().forEach(zone => {
        const sx = MINI_X + zone.x * scaleX;
        const sy = MINI_Y + zone.y * scaleY;
        g.fillStyle(0xFFD700);
        g.fillRect(sx - 2, sy - 2, 4, 4);
      });
    }
  }
}