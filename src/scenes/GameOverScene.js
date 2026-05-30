/**
 * GameOverScene.js
 * ─────────────────────────────────────────────────────
 * Pantalla de derrota estilo Final Fantasy clásico.
 *
 * Responsabilidades:
 *   - Mostrar animación de "Game Over" con efecto dramático
 *   - Indicar la causa de la derrota (batalla o caída)
 *   - Mostrar el score y nivel alcanzado
 *   - Opciones: Continuar desde guardado / Volver al menú
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, STORAGE_KEYS } from '../utils/Constants.js';

export class GameOverScene extends Phaser.Scene {

  constructor() {
    super({ key: SCENES.GAME_OVER });
  }

  // ─── init ────────────────────────────────────────────────────────────────────
  init(data) {
    // 'battle' | 'fall' | undefined
    this._reason  = data?.reason ?? 'battle';
    this._hasSave = false;

    this._hasSave = this.registry.get('storage').hasSave();
  }

  // ─── create ──────────────────────────────────────────────────────────────────
  create() {
    const cx = GAME_WIDTH  / 2;
    const cy = GAME_HEIGHT / 2;

    this._createBackground(cx, cy);
    this._createGameOverText(cx, cy);
    this._createReasonText(cx, cy);
    this._createOptions(cx, cy);
    this._setupInput();

    this._selectedIndex = 0;
    this._updateCursor();

    // Fade in desde negro
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    console.log('[GameOverScene] Razón:', this._reason);
  }

  // ─── Construcción visual ──────────────────────────────────────────────────────

  /**
   * Fondo rojo oscuro con viñeta negra — atmósfera de derrota.
   */
  _createBackground(cx, cy) {
    // Fondo base rojo muy oscuro
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0D0000);

    // Viñeta: círculo oscuro en los bordes
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.8, 0.8, 0, 0);
    vignette.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Líneas rojas sutiles
    const lines = this.add.graphics();
    lines.lineStyle(1, 0x330000, 0.6);
    for (let y = 0; y < GAME_HEIGHT; y += 12) {
      lines.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Marco rojo oscuro
    const border = this.add.graphics();
    border.lineStyle(3, 0x880000, 0.8);
    border.strokeRect(10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20);
  }

  /**
   * Texto "GAME OVER" con animación de aparición dramática.
   */
  _createGameOverText(cx, cy) {
    // Sombra roja
    this.add.text(cx + 4, cy - 80 + 4, 'GAME OVER', {
      fontFamily: 'monospace',
      fontSize:   '52px',
      color:      '#330000',
    }).setOrigin(0.5).setAlpha(0);

    // Texto principal — empieza invisible y aparece con tween
    this._gameOverText = this.add.text(cx, cy - 80, 'GAME OVER', {
      fontFamily: 'monospace',
      fontSize:   '52px',
      color:      '#CC0000',
      stroke:     '#FF0000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    // Animación: aparecer lentamente desde transparente
    this.tweens.add({
      targets:  this._gameOverText,
      alpha:    1,
      duration: 2000,
      ease:     'Power2',
      delay:    300,
    });

    // Parpadeo sutil después de aparecer
    this.time.delayedCall(2400, () => {
      this.tweens.add({
        targets:  this._gameOverText,
        alpha:    { from: 1, to: 0.6 },
        duration: 1500,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    });
  }

  /**
   * Texto con la razón de la derrota y stats finales.
   */
  _createReasonText(cx, cy) {
    // Mensaje según razón
    const reasonMsg = this._reason === 'fall'
      ? '¡Caíste al vacío!'
      : '¡Fuiste derrotado en batalla!';

    this.add.text(cx, cy - 20, reasonMsg, {
      fontFamily: 'monospace',
      fontSize:   '16px',
      color:      '#FF6666',
      stroke:     '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    // Animar después del GAME OVER
    this.time.delayedCall(1800, () => {
      this.tweens.add({
        targets:  this.children.list.filter(c => c.text === reasonMsg),
        alpha:    1,
        duration: 600,
      });
    });

    // Línea separadora
    this.time.delayedCall(2000, () => {
      const line = this.add.graphics().setAlpha(0);
      line.lineStyle(1, 0x660000, 0.8);
      line.lineBetween(cx - 160, cy + 10, cx + 160, cy + 10);
      this.tweens.add({ targets: line, alpha: 1, duration: 400 });
    });
  }

  /**
   * Opciones navegables: Continuar (si hay save) y Menú Principal.
   */
  _createOptions(cx, cy) {
    const options = [];

    if (this._hasSave) {
      options.push({ label: 'Continuar desde guardado', action: 'continue' });
    }
    options.push({ label: 'Volver al menú principal', action: 'menu' });

    this._options     = options;
    this._optionTexts = [];

    const startY  = cy + 50;
    const spacing = 40;

    this.time.delayedCall(2200, () => {
      options.forEach((opt, i) => {
        const text = this.add.text(cx + 20, startY + i * spacing, opt.label, {
          fontFamily: 'monospace',
          fontSize:   '18px',
          color:      '#CCCCCC',
          stroke:     '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({ targets: text, alpha: 1, duration: 400 });
        this._optionTexts.push(text);
      });

      // Cursor
      this._cursor = this.add.text(cx - 100, startY, '▶', {
        fontFamily: 'monospace',
        fontSize:   '18px',
        color:      '#FF4444',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({ targets: this._cursor, alpha: 1, duration: 400 });
      this._updateCursor();
    });
  }

  // ─── Input ────────────────────────────────────────────────────────────────────

  _setupInput() {
    this.input.keyboard.on('keydown-W',     this._onUp,      this);
    this.input.keyboard.on('keydown-UP',    this._onUp,      this);
    this.input.keyboard.on('keydown-S',     this._onDown,    this);
    this.input.keyboard.on('keydown-DOWN',  this._onDown,    this);
    this.input.keyboard.on('keydown-SPACE', this._onConfirm, this);
    this.input.keyboard.on('keydown-ENTER', this._onConfirm, this);
  }

  _onUp() {
    if (!this._options || !this._cursor) return;
    this._selectedIndex =
      (this._selectedIndex - 1 + this._options.length) % this._options.length;
    this._updateCursor();
  }

  _onDown() {
    if (!this._options || !this._cursor) return;
    this._selectedIndex =
      (this._selectedIndex + 1) % this._options.length;
    this._updateCursor();
  }

  _onConfirm() {
    if (!this._options || !this._cursor) return;
    const action = this._options[this._selectedIndex]?.action;
    if (!action) return;

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (action === 'continue') {
        this.scene.start(SCENES.GAME);
      } else {
        this.scene.start(SCENES.MENU);
      }
    });
  }

  /**
   * Mueve el cursor a la opción activa y actualiza colores.
   */
  _updateCursor() {
    if (!this._cursor || !this._optionTexts) return;

    const cy      = GAME_HEIGHT / 2;
    const startY  = cy + 50;
    const spacing = 40;

    this._optionTexts.forEach((text, i) => {
      text.setColor(i === this._selectedIndex ? '#FF4444' : '#CCCCCC');
    });

    this._cursor.setY(startY + this._selectedIndex * spacing);
  }

  // ─── Limpieza ─────────────────────────────────────────────────────────────────

  shutdown() {
    this.input.keyboard.off('keydown-W',     this._onUp,      this);
    this.input.keyboard.off('keydown-UP',    this._onUp,      this);
    this.input.keyboard.off('keydown-S',     this._onDown,    this);
    this.input.keyboard.off('keydown-DOWN',  this._onDown,    this);
    this.input.keyboard.off('keydown-SPACE', this._onConfirm, this);
    this.input.keyboard.off('keydown-ENTER', this._onConfirm, this);
  }
}