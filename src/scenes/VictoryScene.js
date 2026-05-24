/**
 * VictoryScene.js
 * ─────────────────────────────────────────────────────
 * Pantalla de victoria total (todos los enemigos derrotados).
 *
 * Responsabilidades:
 *   - Animación de victoria con efecto dorado
 *   - Mostrar score final, nivel alcanzado y highscore
 *   - Actualizar highscore y nivel máximo en localStorage
 *   - Opción de volver al menú principal
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, STORAGE_KEYS } from '../utils/Constants.js';

export class VictoryScene extends Phaser.Scene {

  constructor() {
    super({ key: SCENES.VICTORY });
  }

  // ─── init ────────────────────────────────────────────────────────────────────
  init(data) {
    this._score = data?.score ?? 0;
    this._level = data?.level ?? 1;

    // Leer y actualizar highscore
    try {
      const saved = parseInt(localStorage.getItem(STORAGE_KEYS.HIGHSCORE)) || 0;
      this._isNewHighscore = this._score > saved;
      if (this._isNewHighscore) {
        localStorage.setItem(STORAGE_KEYS.HIGHSCORE, this._score.toString());
      }
      this._highscore = Math.max(this._score, saved);
    } catch {
      this._highscore      = this._score;
      this._isNewHighscore = false;
    }

    // Actualizar nivel máximo
    try {
      const savedLevel = parseInt(localStorage.getItem(STORAGE_KEYS.MAX_LEVEL)) || 1;
      if (this._level > savedLevel) {
        localStorage.setItem(STORAGE_KEYS.MAX_LEVEL, this._level.toString());
      }
    } catch {}
  }

  // ─── create ──────────────────────────────────────────────────────────────────
  create() {
    const cx = GAME_WIDTH  / 2;
    const cy = GAME_HEIGHT / 2;

    this._createBackground(cx, cy);
    this._createParticles(cx, cy);
    this._createVictoryText(cx, cy);
    this._createStatsPanel(cx, cy);
    this._createReturnOption(cx, cy);
    this._setupInput();

    this.cameras.main.fadeIn(800, 255, 215, 0);

    console.log('[VictoryScene] Victoria. Score:', this._score, 'Nivel:', this._level);
  }

  // ─── Construcción visual ──────────────────────────────────────────────────────

  /**
   * Fondo dorado oscuro con estrellas — atmósfera de triunfo.
   */
  _createBackground(cx, cy) {
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0A0800);

    // Destellos dorados de fondo
    const stars = this.add.graphics();
    for (let i = 0; i < 120; i++) {
      const x    = Phaser.Math.Between(0, GAME_WIDTH);
      const y    = Phaser.Math.Between(0, GAME_HEIGHT);
      const size = Math.random() < 0.15 ? 2 : 1;
      const alpha = 0.3 + Math.random() * 0.7;
      stars.fillStyle(0xFFD700, alpha);
      stars.fillCircle(x, y, size);
    }

    // Marco dorado brillante
    const border = this.add.graphics();
    border.lineStyle(3, 0xFFD700, 1);
    border.strokeRect(10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20);
    border.lineStyle(1, 0xFFAA00, 0.5);
    border.strokeRect(14, 14, GAME_WIDTH - 28, GAME_HEIGHT - 28);
  }

  /**
   * Partículas doradas decorativas simuladas con tweens.
   * Phaser Arcade no tiene sistema de partículas completo
   * en placeholder, así que usamos círculos animados.
   */
  _createParticles(cx, cy) {
    for (let i = 0; i < 20; i++) {
      const particle = this.add.graphics();
      particle.fillStyle(0xFFD700, 0.8);
      particle.fillCircle(0, 0, Phaser.Math.Between(2, 5));
      particle.setPosition(
        Phaser.Math.Between(50, GAME_WIDTH - 50),
        GAME_HEIGHT + 10
      );

      // Animar cada partícula subiendo y desvaneciéndose
      this.tweens.add({
        targets:  particle,
        y:        Phaser.Math.Between(-20, cy),
        x:        particle.x + Phaser.Math.Between(-60, 60),
        alpha:    0,
        duration: Phaser.Math.Between(2000, 4000),
        delay:    Phaser.Math.Between(0, 3000),
        repeat:   -1,
        ease:     'Power1',
        onRepeat: () => {
          particle.setPosition(
            Phaser.Math.Between(50, GAME_WIDTH - 50),
            GAME_HEIGHT + 10
          );
          particle.setAlpha(0.8);
        },
      });
    }
  }

  /**
   * Texto de victoria con animación de escala.
   */
  _createVictoryText(cx, cy) {
    // Sombra
    this.add.text(cx + 3, cy - 100 + 3, '¡VICTORIA!', {
      fontFamily: 'monospace',
      fontSize:   '48px',
      color:      '#4a3000',
    }).setOrigin(0.5);

    // Texto principal con escala animada
    const victoryText = this.add.text(cx, cy - 100, '¡VICTORIA!', {
      fontFamily: 'monospace',
      fontSize:   '48px',
      color:      '#FFD700',
      stroke:     '#8B6914',
      strokeThickness: 4,
    }).setOrigin(0.5).setScale(0);

    // Animación de aparición con rebote
    this.tweens.add({
      targets:  victoryText,
      scaleX:   1,
      scaleY:   1,
      duration: 800,
      ease:     'Back.easeOut',
      delay:    200,
    });

    // Subtítulo
    this.time.delayedCall(900, () => {
      const sub = this.add.text(cx, cy - 48, '~ El Dragón del Caos ha sido derrotado ~', {
        fontFamily: 'monospace',
        fontSize:   '13px',
        color:      '#FFCC44',
        stroke:     '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({ targets: sub, alpha: 1, duration: 600 });
    });

    // Línea decorativa
    this.time.delayedCall(1100, () => {
      const line = this.add.graphics().setAlpha(0);
      line.lineStyle(2, 0xFFD700, 0.8);
      line.lineBetween(cx - 220, cy - 28, cx + 220, cy - 28);
      this.tweens.add({ targets: line, alpha: 1, duration: 400 });
    });
  }

  /**
   * Panel con score, nivel y highscore.
   */
  _createStatsPanel(cx, cy) {
    this.time.delayedCall(1200, () => {
      // Fondo del panel
      const panel = this.add.graphics().setAlpha(0);
      panel.fillStyle(0x000022, 0.7);
      panel.fillRoundedRect(cx - 180, cy - 14, 360, 100, 8);
      panel.lineStyle(1, 0xFFD700, 0.5);
      panel.strokeRoundedRect(cx - 180, cy - 14, 360, 100, 8);
      this.tweens.add({ targets: panel, alpha: 1, duration: 500 });

      // Score
      const scoreLabel = this.add.text(cx - 120, cy + 5, 'PUNTUACIÓN', {
        fontFamily: 'monospace', fontSize: '10px', color: '#888888',
      }).setOrigin(0.5).setAlpha(0);

      const scoreValue = this.add.text(cx - 120, cy + 20, `${this._score}`, {
        fontFamily: 'monospace', fontSize: '22px', color: '#FFD700',
      }).setOrigin(0.5).setAlpha(0);

      // Nivel alcanzado
      const levelLabel = this.add.text(cx + 120, cy + 5, 'NIVEL FINAL', {
        fontFamily: 'monospace', fontSize: '10px', color: '#888888',
      }).setOrigin(0.5).setAlpha(0);

      const levelValue = this.add.text(cx + 120, cy + 20, `LV ${this._level}`, {
        fontFamily: 'monospace', fontSize: '22px', color: '#88AAFF',
      }).setOrigin(0.5).setAlpha(0);

      // Highscore
      const hsColor = this._isNewHighscore ? '#FFD700' : '#AAAAAA';
      const hsLabel = this._isNewHighscore ? '★ NUEVO RÉCORD ★' : 'MEJOR PUNTUACIÓN';

      const hsText = this.add.text(cx, cy + 60, `${hsLabel}: ${this._highscore}`, {
        fontFamily: 'monospace', fontSize: '13px', color: hsColor,
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setAlpha(0);

      // Si es nuevo récord, animación de destello
      if (this._isNewHighscore) {
        this.tweens.add({
          targets:  hsText,
          alpha:    { from: 1, to: 0.5 },
          duration: 600,
          yoyo:     true,
          repeat:   -1,
        });
      }

      const allTexts = [scoreLabel, scoreValue, levelLabel, levelValue, hsText];
      allTexts.forEach((t, i) => {
        this.tweens.add({ targets: t, alpha: 1, duration: 400, delay: i * 100 });
      });
    });
  }

  /**
   * Opción de volver al menú.
   */
  _createReturnOption(cx, cy) {
    this.time.delayedCall(2000, () => {
      // Texto parpadeante de instrucción
      const prompt = this.add.text(cx, cy + 120, 'Presiona SPACE o ENTER para continuar', {
        fontFamily: 'monospace',
        fontSize:   '13px',
        color:      '#AAAAAA',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({ targets: prompt, alpha: 1, duration: 500 });

      // Parpadeo
      this.tweens.add({
        targets:  prompt,
        alpha:    { from: 1, to: 0.3 },
        duration: 900,
        yoyo:     true,
        repeat:   -1,
        delay:    600,
      });

      // Habilitar input después de que aparezca el prompt
      this._inputReady = true;
    });
  }

  // ─── Input ────────────────────────────────────────────────────────────────────

  _setupInput() {
    this._inputReady = false;

    this.input.keyboard.on('keydown-SPACE', this._onConfirm, this);
    this.input.keyboard.on('keydown-ENTER', this._onConfirm, this);
  }

  _onConfirm() {
    if (!this._inputReady) return;

    this.cameras.main.fadeOut(600, 255, 215, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.MENU);
    });
  }

  // ─── Limpieza ─────────────────────────────────────────────────────────────────

  shutdown() {
    this.input.keyboard.off('keydown-SPACE', this._onConfirm, this);
    this.input.keyboard.off('keydown-ENTER', this._onConfirm, this);
  }
}