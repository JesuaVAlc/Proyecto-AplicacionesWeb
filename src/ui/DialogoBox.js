/**
 * DialogBox.js
 * ─────────────────────────────────────────────────────
 * Componente reutilizable de caja de texto/diálogo.
 *
 * Modos:
 *   'log'    — log de batalla: las nuevas líneas empujan
 *              las anteriores hacia abajo (máx 3 visibles)
 *   'dialog' — diálogo de tutorial: título, 4 líneas de
 *              contenido, hint de tecla y cursor parpadeante
 *
 * Uso log:
 *   const log = new DialogBox(scene, x, y, width, height, { mode: 'log' });
 *   log.addLine('¡Golpe crítico! 42 de daño.');
 *
 * Uso dialog:
 *   const dialog = new DialogBox(scene, x, y, width, height, { mode: 'dialog' });
 *   dialog.setTitle('¡Bienvenido!');
 *   dialog.setLines(['Línea 1', 'Línea 2']);
 *   dialog.setHint('[SPACE] Continuar');
 *   dialog.setCursorVisible(true);
 * ─────────────────────────────────────────────────────
 */

export class DialogBox {

  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x
   * @param {number}       y
   * @param {number}       width
   * @param {number}       height
   * @param {object}       options
   * @param {string}       [options.mode]          — 'log' | 'dialog' (default: 'log')
   * @param {number}       [options.maxLines]      — líneas visibles en modo log (default: 3)
   * @param {number}       [options.depth]         — profundidad de render (default: 0)
   * @param {number}       [options.bgColor]       — color de fondo (default: 0x000022)
   * @param {number}       [options.borderColor]   — color del borde (default: 0x334488)
   * @param {number}       [options.cornerRadius]  — radio de esquinas (default: 6)
   */
  constructor(scene, x, y, width, height, options = {}) {
    this._scene        = scene;
    this._x            = x;
    this._y            = y;
    this._width        = width;
    this._height       = height;

    this._mode         = options.mode         ?? 'log';
    this._maxLines     = options.maxLines      ?? 3;
    this._depth        = options.depth         ?? 0;
    this._bgColor      = options.bgColor       ?? 0x000022;
    this._borderColor  = options.borderColor   ?? 0x334488;
    this._cornerRadius = options.cornerRadius  ?? 6;

    // Estado interno
    this._logLines     = [];  // modo log
    this._titleStr     = '';  // modo dialog
    this._contentStrs  = [];  // modo dialog

    this._buildBackground();

    if (this._mode === 'log') {
      this._buildLogTexts();
    } else {
      this._buildDialogTexts();
    }
  }

  // ─── Construcción visual ──────────────────────────────────────────────────────

  /**
   * Fondo semitransparente con borde redondeado.
   * Igual en ambos modos.
   */
  _buildBackground() {
    this._bg = this._scene.add.graphics().setDepth(this._depth);
    this._bg.fillStyle(this._bgColor, 0.85);
    this._bg.fillRoundedRect(this._x, this._y, this._width, this._height, this._cornerRadius);
    this._bg.lineStyle(1, this._borderColor, 0.8);
    this._bg.strokeRoundedRect(this._x, this._y, this._width, this._height, this._cornerRadius);
  }

  /**
   * Textos para el modo log (3 líneas apiladas).
   * La línea 0 es la más reciente — color blanco.
   * Las anteriores se atenúan progresivamente.
   */
  _buildLogTexts() {
    const lineColors = ['#FFFFFF', '#AAAACC', '#777799'];
    const lineHeight = 16;
    const pad        = 10;

    this._lineTexts = Array.from({ length: this._maxLines }, (_, i) =>
      this._scene.add.text(
        this._x + pad,
        this._y + 6 + i * lineHeight,
        '',
        {
          fontFamily: 'monospace',
          fontSize:   '11px',
          color:      lineColors[i] ?? '#777799',
        }
      ).setDepth(this._depth + 1)
    );
  }

  /**
   * Textos para el modo dialog:
   * barra de sección, título, 4 líneas de contenido,
   * hint de tecla y cursor parpadeante.
   */
  _buildDialogTexts() {
    const pad = 16;

    // Barra de color de sección (rectángulo vertical izquierdo)
    this._sectionBar = this._scene.add.rectangle(
      this._x + pad - 8, this._y + 2,
      6, this._height - 4,
      0xFFD700
    ).setOrigin(0, 0).setDepth(this._depth + 1);

    // Título
    this._titleText = this._scene.add.text(
      this._x + pad + 8, this._y + 14,
      '',
      {
        fontFamily: 'monospace',
        fontSize:   '16px',
        color:      '#FFD700',
        stroke:     '#000000',
        strokeThickness: 2,
      }
    ).setDepth(this._depth + 1);

    // 4 líneas de contenido
    this._contentTexts = Array.from({ length: 4 }, (_, i) =>
      this._scene.add.text(
        this._x + pad + 8,
        this._y + 38 + i * 24,
        '',
        {
          fontFamily: 'monospace',
          fontSize:   '13px',
          color:      '#DDDDDD',
        }
      ).setDepth(this._depth + 1)
    );

    // Hint de tecla (esquina inferior derecha)
    this._hintText = this._scene.add.text(
      this._x + this._width - pad,
      this._y + this._height - 14,
      '',
      {
        fontFamily: 'monospace',
        fontSize:   '11px',
        color:      '#888888',
      }
    ).setOrigin(1, 1).setDepth(this._depth + 1);

    // Cursor parpadeante ▼
    this._cursorText = this._scene.add.text(
      this._x + this._width - pad,
      this._y + this._height - 16,
      '▼',
      {
        fontFamily: 'monospace',
        fontSize:   '14px',
        color:      '#FFD700',
      }
    ).setOrigin(1, 1).setDepth(this._depth + 2).setVisible(false);

    // Tween de parpadeo permanente
    this._scene.tweens.add({
      targets:  this._cursorText,
      alpha:    0,
      duration: 500,
      yoyo:     true,
      repeat:   -1,
    });
  }

  // ─── API modo log ─────────────────────────────────────────────────────────────

  /**
   * Agrega una línea al log desplazando las anteriores.
   * La línea nueva siempre aparece en la posición 0 (arriba).
   * @param {string} message
   */
  addLine(message) {
    if (this._mode !== 'log') return;

    this._logLines = [message, ...this._logLines.slice(0, this._maxLines - 1)];
    this._lineTexts.forEach((text, i) => {
      text.setText(this._logLines[i] ?? '');
    });
  }

  /**
   * Borra todas las líneas del log.
   */
  clearLog() {
    this._logLines = [];
    this._lineTexts?.forEach(t => t.setText(''));
  }

  // ─── API modo dialog ──────────────────────────────────────────────────────────

  /**
   * Cambia el título del diálogo.
   * @param {string} title
   */
  setTitle(title) {
    if (this._mode !== 'dialog') return;
    this._titleStr = title;
    this._titleText.setText(title);
  }

  /**
   * Reemplaza las líneas de contenido.
   * Acepta hasta 4 líneas — las sobrantes se limpian.
   * @param {string[]} lines
   */
  setLines(lines) {
    if (this._mode !== 'dialog') return;
    this._contentStrs = lines;
    this._contentTexts.forEach((text, i) => {
      text.setText(lines[i] ?? '');
    });
  }

  /**
   * Cambia el color de una línea de contenido específica.
   * Útil para feedback de éxito (verde) o error (rojo).
   * @param {number} index
   * @param {string} color — color CSS
   */
  setLineColor(index, color) {
    if (this._mode !== 'dialog') return;
    this._contentTexts[index]?.setColor(color);
  }

  /**
   * Restaura el color por defecto de todas las líneas.
   */
  resetLineColors() {
    if (this._mode !== 'dialog') return;
    this._contentTexts?.forEach(t => t.setColor('#DDDDDD'));
  }

  /**
   * Cambia el texto del hint de tecla.
   * @param {string} hint
   */
  setHint(hint) {
    if (this._mode !== 'dialog') return;
    this._hintText.setText(hint);
  }

  /**
   * Muestra u oculta el cursor parpadeante ▼.
   * @param {boolean} visible
   */
  setCursorVisible(visible) {
    if (this._mode !== 'dialog') return;
    this._cursorText.setVisible(visible);
  }

  /**
   * Cambia el color de la barra de sección.
   * @param {number} color — color hex
   */
  setSectionColor(color) {
    if (this._mode !== 'dialog') return;
    this._sectionBar.setFillStyle(color);
  }

  /**
   * Anima la entrada del contenido con fade in escalonado.
   * Llamar al mostrar un nuevo paso del tutorial.
   */
  animateIn() {
    if (this._mode !== 'dialog') return;

    const targets = [
      this._titleText,
      ...this._contentTexts,
      this._hintText,
    ];

    targets.forEach(t => t.setAlpha(0));

    this._scene.tweens.add({
      targets,
      alpha:    1,
      duration: 180,
      ease:     'Linear',
      delay:    this._scene.tweens.stagger(40),
    });
  }

  // ─── API común ────────────────────────────────────────────────────────────────

  /**
   * Muestra u oculta la caja completa.
   * @param {boolean} visible
   */
  setVisible(visible) {
    this._bg.setVisible(visible);
    this._lineTexts?.forEach(t => t.setVisible(visible));
    this._titleText?.setVisible(visible);
    this._contentTexts?.forEach(t => t.setVisible(visible));
    this._hintText?.setVisible(visible);
    this._cursorText?.setVisible(visible ? this._cursorText.visible : false);
    this._sectionBar?.setVisible(visible);
  }

  /**
   * Destruye todos los objetos gráficos.
   */
  destroy() {
    this._bg.destroy();
    this._lineTexts?.forEach(t => t.destroy());
    this._titleText?.destroy();
    this._contentTexts?.forEach(t => t.destroy());
    this._hintText?.destroy();
    this._cursorText?.destroy();
    this._sectionBar?.destroy();
  }
}