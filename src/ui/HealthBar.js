/**
 * HealthBar.js
 * ─────────────────────────────────────────────────────
 * Componente reutilizable de barra de vida/maná/exp.
 * Maneja fondo, relleno dinámico, etiqueta y texto numérico.
 *
 * Uso:
 *   const bar = new HealthBar(scene, x, y, 160, 14, 0xFF4444, {
 *     label:         'HP',
 *     labelColor:    '#FF6666',
 *     textPos:       'inside',
 *     lowThreshold:  0.25,
 *     lowColor:      0xFF0000,
 *   });
 *   bar.update(current, max);
 * ─────────────────────────────────────────────────────
 */
import Phaser from 'phaser';
export class HealthBar {

  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x           — posición X del borde izquierdo de la barra
   * @param {number}       y           — posición Y del borde superior de la barra
   * @param {number}       width       — ancho total de la barra
   * @param {number}       height      — alto de la barra
   * @param {number}       color       — color principal de relleno (hex)
   * @param {object}       options
   * @param {string}       [options.label]         — etiqueta a la izquierda ('HP', 'MP', 'EXP')
   * @param {string}       [options.labelColor]    — color CSS de la etiqueta (default '#FFFFFF')
   * @param {string}       [options.textPos]       — 'inside' | 'above' | null
   * @param {string}       [options.prefix]        — texto antes del número ('HP: ')
   * @param {number}       [options.lowThreshold]  — porcentaje de alerta (default 0.25)
   * @param {number}       [options.lowColor]      — color cuando está bajo (default 0xFF0000)
   * @param {number}       [options.bgColor]       — color del fondo (default 0x000000)
   * @param {number}       [options.depth]         — profundidad de render (default 0)
   */
  constructor(scene, x, y, width, height, color, options = {}) {
    this._scene  = scene;
    this._x      = x;
    this._y      = y;
    this._width  = width;
    this._height = height;
    this._color  = color;

    // Opciones con defaults
    this._label        = options.label        ?? null;
    this._labelColor   = options.labelColor   ?? '#FFFFFF';
    this._textPos      = options.textPos      ?? null;
    this._prefix       = options.prefix       ?? '';
    this._lowThreshold = options.lowThreshold ?? 0.25;
    this._lowColor     = options.lowColor     ?? 0xFF0000;
    this._bgColor      = options.bgColor      ?? 0x000000;
    this._depth        = options.depth        ?? 0;

    this._buildGraphics();
    this._buildLabel();
    this._buildText();
  }

  // ─── Construcción ─────────────────────────────────────────────────────────────

  /**
   * Crea los graphics de fondo y relleno.
   */
  _buildGraphics() {
    // Desplazamiento horizontal si hay etiqueta a la izquierda
    this._barOffsetX = this._label ? 20 : 0;
    const barX = this._x + this._barOffsetX;
    const barW = this._width - this._barOffsetX;

    // Fondo
    this._bg = this._scene.add.graphics().setDepth(this._depth);
    this._bg.fillStyle(this._bgColor);
    this._bg.fillRect(barX, this._y, barW, this._height);

    // Borde sutil
    this._bg.lineStyle(1, this._color, 0.4);
    this._bg.strokeRect(barX, this._y, barW, this._height);

    // Relleno dinámico
    this._fill = this._scene.add.graphics().setDepth(this._depth + 1);
  }

  /**
   * Crea la etiqueta a la izquierda si está definida.
   */
  _buildLabel() {
    if (!this._label) return;

    this._labelText = this._scene.add.text(
      this._x,
      this._y - 1,
      this._label,
      {
        fontFamily: 'monospace',
        fontSize:   '9px',
        color:      this._labelColor,
      }
    ).setDepth(this._depth + 2);
  }

  /**
   * Crea el texto numérico según textPos.
   */
  _buildText() {
    if (!this._textPos) return;

    const barX = this._x + this._barOffsetX;
    const barW = this._width - this._barOffsetX;

    let textX, textY;

    if (this._textPos === 'inside') {
      textX = barX + barW / 2;
      textY = this._y;
    } else if (this._textPos === 'above') {
      textX = barX + barW / 2;
      textY = this._y - 14;
    }

    this._valueText = this._scene.add.text(textX, textY, '', {
      fontFamily: 'monospace',
      fontSize:   '8px',
      color:      '#FFFFFF',
    }).setOrigin(0.5, 0).setDepth(this._depth + 3);
  }

  // ─── API pública ──────────────────────────────────────────────────────────────

  /**
   * Actualiza el relleno y el texto con los valores actuales.
   * Llamar cada vez que cambien current o max.
   *
   * @param {number} current — valor actual
   * @param {number} max     — valor máximo
   */
  update(current, max) {
    if (max <= 0) return;

    const pct  = Phaser.Math.Clamp(current / max, 0, 1);
    const barX = this._x + this._barOffsetX;
    const barW = this._width - this._barOffsetX;
    const fillW = Math.floor(barW * pct);

    // Color según umbral
    const fillColor = pct <= this._lowThreshold ? this._lowColor : this._color;

    this._fill.clear();

    if (fillW > 0) {
      this._fill.fillStyle(fillColor);
      this._fill.fillRect(barX, this._y, fillW, this._height);

      // Brillo superior
      this._fill.fillStyle(0xFFFFFF, 0.15);
      this._fill.fillRect(barX, this._y, fillW, Math.floor(this._height / 3));
    }

    // Actualizar texto
    if (this._valueText) {
      this._valueText.setText(`${this._prefix}${current}/${max}`);
    }
  }

  /**
   * Muestra u oculta todos los elementos de la barra.
   * @param {boolean} visible
   */
  setVisible(visible) {
    this._bg.setVisible(visible);
    this._fill.setVisible(visible);
    this._labelText?.setVisible(visible);
    this._valueText?.setVisible(visible);
  }

  /**
   * Mueve la barra a una nueva posición.
   * Útil si el layout cambia al entrar a batalla.
   * @param {number} x
   * @param {number} y
   */
  setPosition(x, y) {
    const dx = x - this._x;
    const dy = y - this._y;

    this._x = x;
    this._y = y;

    // Redibujar fondo en nueva posición
    const barX = this._x + this._barOffsetX;
    const barW = this._width - this._barOffsetX;

    this._bg.clear();
    this._bg.fillStyle(this._bgColor);
    this._bg.fillRect(barX, this._y, barW, this._height);
    this._bg.lineStyle(1, this._color, 0.4);
    this._bg.strokeRect(barX, this._y, barW, this._height);

    this._labelText?.setPosition(
      this._labelText.x + dx,
      this._labelText.y + dy
    );
    this._valueText?.setPosition(
      this._valueText.x + dx,
      this._valueText.y + dy
    );
  }

  /**
   * Destruye todos los objetos gráficos.
   * Llamar cuando la escena termina o el componente ya no se necesita.
   */
  destroy() {
    this._bg.destroy();
    this._fill.destroy();
    this._labelText?.destroy();
    this._valueText?.destroy();
  }
}