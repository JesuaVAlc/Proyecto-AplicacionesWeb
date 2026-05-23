/**
 * MenuScene.js
 * ─────────────────────────────────────────────────────
 * Pantalla principal del juego estilo Final Fantasy clásico.
 * Responsabilidades:
 *   1. Mostrar título animado con efecto de parpadeo dorado.
 *   2. Opciones: Nueva Partida, Continuar, Tutorial, Configuración.
 *   3. Mostrar highscore y nivel máximo alcanzado.
 *   4. Navegar con teclado (W/S o flechas + SPACE/ENTER).
 *   5. Detectar si hay partida guardada para habilitar "Continuar".
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import {
  SCENES,
  GAME_WIDTH,
  GAME_HEIGHT,
  STORAGE_KEYS,
} from '../utils/Constants.js';

// Opciones del menú con su escena/acción destino
const MENU_OPTIONS = [
  { label: 'Nueva Partida', action: 'new_game'   },
  { label: 'Continuar',     action: 'continue'   },
  { label: 'Tutorial',      action: 'tutorial'   },
  { label: 'Configuración', action: 'settings'   },
];

export class MenuScene extends Phaser.Scene {

  constructor() {
    super({ key: SCENES.MENU });

    // Índice de la opción actualmente seleccionada
    this._selectedIndex = 0;

    // Si hay partida guardada disponible
    this._hasSave = false;
  }

  // ─── init ────────────────────────────────────────────────────────────────────
  init() {
    // Verificar si existe una partida guardada en localStorage
    try {
      const save = localStorage.getItem(STORAGE_KEYS.SAVE_SLOT);
      this._hasSave = save !== null;
    } catch {
      this._hasSave = false;
    }
  }

  // ─── create ──────────────────────────────────────────────────────────────────
  create() {
    const cx = GAME_WIDTH  / 2;
    const cy = GAME_HEIGHT / 2;

    this._createBackground(cx, cy);
    this._createTitle(cx);
    this._createMenuOptions(cx, cy);
    this._createFooter(cx);
    this._createCursor();
    this._setupInput();
    this._updateCursor();

    // Animación de entrada: el menú aparece con fade desde negro
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  // ─── Construcción visual ──────────────────────────────────────────────────────

  /**
   * Fondo con degradado oscuro y líneas decorativas estilo RPG clásico.
   */
  _createBackground(cx, cy) {
    // Fondo base negro azulado
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x04050F);

    // Líneas horizontales decorativas (scanlines suaves)
    const lines = this.add.graphics();
    lines.lineStyle(1, 0x1a1a3a, 0.4);
    for (let y = 0; y < GAME_HEIGHT; y += 8) {
      lines.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Marco dorado exterior
    const border = this.add.graphics();
    border.lineStyle(3, 0xFFD700, 1);
    border.strokeRect(10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20);
    border.lineStyle(1, 0x8B6914, 1);
    border.strokeRect(14, 14, GAME_WIDTH - 28, GAME_HEIGHT - 28);

    // Esquinas decorativas
    this._drawCornerDecoration(border, 20, 20);
    this._drawCornerDecoration(border, GAME_WIDTH - 20, 20,       true, false);
    this._drawCornerDecoration(border, 20,              GAME_HEIGHT - 20, false, true);
    this._drawCornerDecoration(border, GAME_WIDTH - 20, GAME_HEIGHT - 20, true, true);

    // Estrellas de fondo (puntos blancos aleatorios)
    const stars = this.add.graphics();
    stars.fillStyle(0xFFFFFF, 0.6);
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(20, GAME_WIDTH  - 20);
      const sy = Phaser.Math.Between(20, GAME_HEIGHT - 20);
      const sr = Math.random() < 0.2 ? 1.5 : 0.8;
      stars.fillCircle(sx, sy, sr);
    }
  }

  /**
   * Dibuja una esquina decorativa en la posición dada.
   * flipX / flipY permiten reutilizar el mismo trazo en las 4 esquinas.
   */
  _drawCornerDecoration(g, x, y, flipX = false, flipY = false) {
    const dx = flipX ? -1 : 1;
    const dy = flipY ? -1 : 1;
    g.lineStyle(2, 0xFFD700, 1);
    g.lineBetween(x, y, x + dx * 20, y);
    g.lineBetween(x, y, x, y + dy * 20);
  }

  /**
   * Título animado con efecto de parpadeo y subrayado dorado.
   */
  _createTitle(cx) {
    // Sombra del título
    this.add.text(cx + 3, 78, 'FINAL FANTASY 2D', {
      fontFamily: 'monospace',
      fontSize:   '36px',
      color:      '#2a1a00',
    }).setOrigin(0.5);

    // Título principal
    const title = this.add.text(cx, 75, 'FINAL FANTASY 2D', {
      fontFamily: 'monospace',
      fontSize:   '36px',
      color:      '#FFD700',
      stroke:     '#8B6914',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Subtítulo
    this.add.text(cx, 115, '~ Legend of the Crystal ~', {
      fontFamily: 'monospace',
      fontSize:   '13px',
      color:      '#88AAFF',
      stroke:     '#000033',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Línea decorativa bajo el título
    const line = this.add.graphics();
    line.lineStyle(2, 0xFFD700, 0.8);
    line.lineBetween(cx - 200, 132, cx + 200, 132);

    // Efecto parpadeo suave en el título (tweens de alpha)
    this.tweens.add({
      targets:    title,
      alpha:      { from: 1, to: 0.7 },
      duration:   2000,
      yoyo:       true,
      repeat:     -1,
      ease:       'Sine.easeInOut',
    });
  }

  /**
   * Crea los textos de las opciones del menú centrados en pantalla.
   * La opción "Continuar" aparece atenuada si no hay partida guardada.
   */
  _createMenuOptions(cx, cy) {
    this._optionTexts = [];

    // Posición Y del primer item — centrado verticalmente con offset
    const startY  = cy - 30;
    const spacing = 44;

    MENU_OPTIONS.forEach((option, index) => {
      const y        = startY + index * spacing;
      const isContinue = option.action === 'continue';
      const disabled   = isContinue && !this._hasSave;

      // Color según estado
      const color = disabled ? '#444466' : '#FFFFFF';

      const text = this.add.text(cx + 24, y, option.label, {
        fontFamily: 'monospace',
        fontSize:   '20px',
        color,
        stroke:     '#000022',
        strokeThickness: 2,
      }).setOrigin(0.5);

      // Guardar referencia y si está deshabilitada
      text.setData('disabled', disabled);
      text.setData('index', index);
      this._optionTexts.push(text);
    });
  }

  /**
   * Pie de pantalla con highscore y nivel máximo leídos del registry.
   */
  _createFooter(cx) {
    const highscore = this.registry.get('highscore')       || 0;
    const maxLevel  = this.registry.get('maxLevelReached') || 1;

    // Línea separadora
    const line = this.add.graphics();
    line.lineStyle(1, 0x444466, 0.8);
    line.lineBetween(40, GAME_HEIGHT - 55, GAME_WIDTH - 40, GAME_HEIGHT - 55);

    // Highscore
    this.add.text(cx - 120, GAME_HEIGHT - 42, `HIGH SCORE`, {
      fontFamily: 'monospace',
      fontSize:   '10px',
      color:      '#888888',
    }).setOrigin(0.5);

    this.add.text(cx - 120, GAME_HEIGHT - 28, `${highscore}`, {
      fontFamily: 'monospace',
      fontSize:   '14px',
      color:      '#FFD700',
    }).setOrigin(0.5);

    // Nivel máximo
    this.add.text(cx + 120, GAME_HEIGHT - 42, `NIVEL MÁX`, {
      fontFamily: 'monospace',
      fontSize:   '10px',
      color:      '#888888',
    }).setOrigin(0.5);

    this.add.text(cx + 120, GAME_HEIGHT - 28, `LV ${maxLevel}`, {
      fontFamily: 'monospace',
      fontSize:   '14px',
      color:      '#88AAFF',
    }).setOrigin(0.5);

    // Instrucciones de navegación
    this.add.text(cx, GAME_HEIGHT - 16, 'W/S · Navegar    SPACE/ENTER · Confirmar', {
      fontFamily: 'monospace',
      fontSize:   '10px',
      color:      '#555577',
    }).setOrigin(0.5);
  }

  /**
   * Cursor triangular dorado que apunta a la opción activa.
   * Se mueve verticalmente con _updateCursor().
   */
  _createCursor() {
    const cx = GAME_WIDTH / 2;

    this._cursor = this.add.graphics();
    this._cursor.fillStyle(0xFFD700);
    // Triángulo apuntando a la derecha → (punta, base sup, base inf)
    this._cursor.fillTriangle(
      cx - 110, 0,   // punta
      cx - 124, -7,  // base superior
      cx - 124,  7   // base inferior
    );

    // Animación de latido horizontal del cursor
    this.tweens.add({
      targets:  this._cursor,
      x:        { from: 0, to: 6 },
      duration: 600,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  // ─── Input ────────────────────────────────────────────────────────────────────

  /**
   * Configura las teclas de navegación del menú.
   * Soporta W/S y flechas arriba/abajo para moverse,
   * SPACE y ENTER para confirmar.
   */
  _setupInput() {
    // Teclas de movimiento vertical
    this._keyUp   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this._keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this._keyArrowUp   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this._keyArrowDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

    // Teclas de confirmación
    this._keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this._keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Usar justDown para evitar repetición de tecla mantenida
    this.input.keyboard.on('keydown-W',      this._moveUp,      this);
    this.input.keyboard.on('keydown-S',      this._moveDown,    this);
    this.input.keyboard.on('keydown-UP',     this._moveUp,      this);
    this.input.keyboard.on('keydown-DOWN',   this._moveDown,    this);
    this.input.keyboard.on('keydown-SPACE',  this._confirmSelection, this);
    this.input.keyboard.on('keydown-ENTER',  this._confirmSelection, this);
  }

  // ─── Navegación ───────────────────────────────────────────────────────────────

  /**
   * Mueve el cursor hacia arriba saltando opciones deshabilitadas.
   */
  _moveUp() {
    let next = this._selectedIndex;
    do {
      next = (next - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length;
    } while (
      this._optionTexts[next].getData('disabled') &&
      next !== this._selectedIndex
    );
    this._selectedIndex = next;
    this._updateCursor();
  }

  /**
   * Mueve el cursor hacia abajo saltando opciones deshabilitadas.
   */
  _moveDown() {
    let next = this._selectedIndex;
    do {
      next = (next + 1) % MENU_OPTIONS.length;
    } while (
      this._optionTexts[next].getData('disabled') &&
      next !== this._selectedIndex
    );
    this._selectedIndex = next;
    this._updateCursor();
  }

  /**
   * Actualiza la posición Y del cursor y el color de las opciones.
   * La opción activa se pinta dorada; las demás en blanco o gris.
   */
  _updateCursor() {
    const cy      = GAME_HEIGHT / 2;
    const startY  = cy - 30;
    const spacing = 44;

    this._optionTexts.forEach((text, index) => {
      const isSelected = index === this._selectedIndex;
      const isDisabled = text.getData('disabled');

      if (isDisabled) {
        text.setColor('#444466');
      } else if (isSelected) {
        text.setColor('#FFD700');
      } else {
        text.setColor('#CCCCCC');
      }
    });

    // Mover el cursor a la Y de la opción activa
    const targetY = startY + this._selectedIndex * spacing;
    this._cursor.setY(targetY);
  }

  /**
   * Ejecuta la acción correspondiente a la opción seleccionada.
   * Hace fade out antes de cambiar de escena para una transición suave.
   */
  _confirmSelection() {
    const option   = MENU_OPTIONS[this._selectedIndex];
    const disabled = this._optionTexts[this._selectedIndex].getData('disabled');

    if (disabled) return;

    // Fade out y luego cambiar de escena
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this._executeAction(option.action);
    });
  }

  /**
   * Despacha la acción seleccionada a la escena correspondiente.
   */
  _executeAction(action) {
    switch (action) {
      case 'new_game':
        // Limpiar partida guardada y comenzar desde cero
        try { localStorage.removeItem(STORAGE_KEYS.SAVE_SLOT); } catch {}
        this.scene.start(SCENES.GAME);
        break;

      case 'continue':
        // Cargar partida guardada — GameScene leerá el save del registry
        this.scene.start(SCENES.GAME);
        break;

      case 'tutorial':
        this.scene.start(SCENES.TUTORIAL);
        break;

      case 'settings':
        this.scene.start(SCENES.SETTINGS);
        break;
    }
  }

  // ─── Limpieza ─────────────────────────────────────────────────────────────────

  /**
   * Phaser llama a shutdown al salir de la escena.
   * Removemos los listeners de teclado para evitar memory leaks.
   */
  shutdown() {
    this.input.keyboard.off('keydown-W',     this._moveUp,           this);
    this.input.keyboard.off('keydown-S',     this._moveDown,         this);
    this.input.keyboard.off('keydown-UP',    this._moveUp,           this);
    this.input.keyboard.off('keydown-DOWN',  this._moveDown,         this);
    this.input.keyboard.off('keydown-SPACE', this._confirmSelection, this);
    this.input.keyboard.off('keydown-ENTER', this._confirmSelection, this);
  }
}