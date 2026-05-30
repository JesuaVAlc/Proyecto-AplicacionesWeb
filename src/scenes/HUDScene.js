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
import { HealthBar } from '../ui/HealthBar.js';
import { MiniMap } from '../ui/MiniMap.js';

// Posición y tamaño del panel izquierdo del HUD
const PANEL_X = 8;
const PANEL_Y = 8;
const PANEL_W = 180;
const PANEL_H = 110;

// Posición del minimapa (esquina superior derecha)
const MINI_X = GAME_WIDTH - HUD.MINIMAP_SIZE - 10;
const MINI_Y = 10;

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
    this._createMuteButton();
    this._minimap = new MiniMap(
      this,
      MINI_X, MINI_Y,
      HUD.MINIMAP_SIZE,
      40 * 32,  // MAP_COLS * TILE
      30 * 32,  // MAP_ROWS * TILE
      { depth: 10 }
    );

    // Referencia al jugador via registry (GameScene lo pone ahí)
    this._player = this.registry.get('player');

    // Primer render inmediato
    this._updateAll();

    console.log('[HUDScene] HUD iniciado.');
  }

  // ─── update ──────────────────────────────────────────────────────────────────
  update() {
    this._player = this.registry.get('player');
    if (!this._player) return;

    // Pasar los grupos al minimapa la primera vez que estén disponibles
    if (!this._minimapReady) {
      const gameScene = this.scene.get(SCENES.GAME);
      if (gameScene?._enemyGroup && gameScene?._saveZones) {
        this._minimap.setGroups(gameScene._enemyGroup, gameScene._saveZones);
        this._minimapReady = true;
      }
    }

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
    const barW = PANEL_W - 60;
    const baseOpts = { depth: 10 };
    // HP
    this._hpBar = new HealthBar(
      this, barStartX, PANEL_Y + 30, barW, 10, 0xFF4444,
      {
        label: 'HP', labelColor: '#FF6666', textPos: 'inside',
        bgColor: 0x330000, lowThreshold: 0.25, ...baseOpts
      }
    );
    // MP
    this._mpBar = new HealthBar(
      this, barStartX, PANEL_Y + 58, barW, 10, 0x4488FF,
      {
        label: 'MP', labelColor: '#6688FF', textPos: 'inside',
        bgColor: 0x000033, ...baseOpts
      }
    );
    // EXP
    this._expBar = new HealthBar(
      this, barStartX, PANEL_Y + 86, barW, 8, 0xFFDD44,
      {
        label: 'EXP', labelColor: '#FFDD44', textPos: 'inside',
        bgColor: 0x222200, ...baseOpts
      }
    );
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
      fontSize: '9px',
      color: '#FFD700',
      stroke: '#000000',
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
    const bx = GAME_WIDTH - 36;
    const by = GAME_HEIGHT - 20;

    // Leer estado de mute del registry
    const audioConfig = this.registry.get('audioConfig') ?? {};
    this._muted = audioConfig.muted ?? AUDIO.DEFAULT_MUTED;

    // Fondo del botón
    this._muteBg = this.add.graphics();
    this._drawMuteButton();

    // Texto del botón
    this._muteText = this.add.text(bx, by, this._muted ? '🔇' : '🔊', {
      fontFamily: 'monospace',
      fontSize: '14px',
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
    const bx = GAME_WIDTH - 52;
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
    } catch { }

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

    this._hpBar.update(p.hp, p.maxHp);
    this._mpBar.update(p.mp, p.maxMp);

    // EXP: calcular porcentaje hacia el siguiente nivel
    const levelData = getLevelData(p.level);
    const expMax = levelData?.expToNext ?? 1;
    this._expBar.update(p.exp, expMax);

    // Nivel
    this._levelText.setText(`LV ${p.level}`);

    // Minimapa
    this._minimap.update(p);
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

  /**
   * Redibuja el minimapa con la posición del jugador y los enemigos.
   * Usa una escala proporcional al tamaño del mapa de tiles.
   * @param {Player} player
   */

  shutdown() {
    this.input.keyboard.off('keydown-M', () => this._toggleMute());
    this._minimap.destroy();
  }

}