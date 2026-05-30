/**
 * MiniMap.js
 * ─────────────────────────────────────────────────────
 * Componente reutilizable de minimapa.
 * Muestra la posición del jugador, enemigos activos
 * y zonas de guardado a escala proporcional del mapa.
 *
 * Uso:
 *   const minimap = new MiniMap(scene, x, y, size, mapPixelW, mapPixelH, {
 *     enemyGroup: this._enemyGroup,
 *     saveZones:  this._saveZones,
 *   });
 *
 *   // En update():
 *   minimap.update(player);
 * ─────────────────────────────────────────────────────
 */

export class MiniMap {

  /**
   * @param {Phaser.Scene}                    scene
   * @param {number}                          x          — posición X del panel
   * @param {number}                          y          — posición Y del panel
   * @param {number}                          size       — tamaño del minimapa (cuadrado)
   * @param {number}                          mapPixelW  — ancho del mapa en píxeles
   * @param {number}                          mapPixelH  — alto del mapa en píxeles
   * @param {object}                          options
   * @param {Phaser.Physics.Arcade.Group}     [options.enemyGroup] — grupo de enemigos
   * @param {Phaser.Physics.Arcade.StaticGroup} [options.saveZones] — zonas de guardado
   * @param {number}                          [options.depth]      — profundidad (default: 0)
   */
  constructor(scene, x, y, size, mapPixelW, mapPixelH, options = {}) {
    this._scene      = scene;
    this._x          = x;
    this._y          = y;
    this._size       = size;
    this._mapPixelW  = mapPixelW;
    this._mapPixelH  = mapPixelH;

    this._enemyGroup = options.enemyGroup ?? null;
    this._saveZones  = options.saveZones  ?? null;
    this._depth      = options.depth      ?? 0;

    // Factores de escala: mundo real → minimapa
    this._scaleX = size / mapPixelW;
    this._scaleY = size / mapPixelH;

    this._buildPanel();
    this._buildGraphics();
  }

  // ─── Construcción visual ──────────────────────────────────────────────────────

  /**
   * Fondo, borde y etiqueta del panel del minimapa.
   */
  _buildPanel() {
    // Fondo
    this._panelBg = this._scene.add.graphics().setDepth(this._depth);
    this._panelBg.fillStyle(0x000022, 0.85);
    this._panelBg.fillRect(this._x, this._y, this._size, this._size);
    this._panelBg.lineStyle(2, 0xFFD700, 0.9);
    this._panelBg.strokeRect(this._x, this._y, this._size, this._size);

    // Etiqueta
    this._label = this._scene.add.text(
      this._x + this._size / 2,
      this._y - 1,
      'MAPA',
      {
        fontFamily: 'monospace',
        fontSize:   '8px',
        color:      '#888888',
      }
    ).setOrigin(0.5, 1).setDepth(this._depth + 1);
  }

  /**
   * Graphics dinámico que se redibuja cada frame.
   */
  _buildGraphics() {
    this._graphics = this._scene.add.graphics().setDepth(this._depth + 1);
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  /**
   * Redibuja el minimapa con las posiciones actuales.
   * Llamar cada frame desde HUDScene.update().
   * @param {object} player — instancia del jugador
   */
  update(player) {
    const g = this._graphics;
    g.clear();

    // Fondo del área de juego
    g.fillStyle(0x112211, 1);
    g.fillRect(this._x + 1, this._y + 1, this._size - 2, this._size - 2);

    // Zonas de guardado: puntos dorados
    this._drawSaveZones();

    // Enemigos activos: puntos rojos o naranja para el boss
    this._drawEnemies();

    // Jugador: punto verde
    this._drawPlayer(player);
  }

  /**
   * Dibuja el punto del jugador.
   * @param {object} player
   */
  _drawPlayer(player) {
    if (!player) return;

    const px = this._x + player.x * this._scaleX;
    const py = this._y + player.y * this._scaleY;

    this._graphics.fillStyle(0x00FF44);
    this._graphics.fillCircle(px, py, 3);
  }

  /**
   * Dibuja los puntos de los enemigos activos.
   */
  _drawEnemies() {
    if (!this._enemyGroup) return;

    this._enemyGroup.getChildren().forEach(enemy => {
      if (enemy.getData('defeated') || !enemy.active) return;

      const ex     = this._x + enemy.x * this._scaleX;
      const ey     = this._y + enemy.y * this._scaleY;
      const isBoss = enemy.getData('enemyId') === 'chaos_dragon';

      this._graphics.fillStyle(isBoss ? 0xFF6600 : 0xFF2222);
      this._graphics.fillCircle(ex, ey, isBoss ? 3 : 2);
    });
  }

  /**
   * Dibuja los puntos de las zonas de guardado.
   */
  _drawSaveZones() {
    if (!this._saveZones) return;

    this._saveZones.getChildren().forEach(zone => {
      const sx = this._x + zone.x * this._scaleX;
      const sy = this._y + zone.y * this._scaleY;

      this._graphics.fillStyle(0xFFD700);
      this._graphics.fillRect(sx - 2, sy - 2, 4, 4);
    });
  }

  // ─── API pública ──────────────────────────────────────────────────────────────

  /**
   * Actualiza las referencias a los grupos cuando estén disponibles.
   * Útil si los grupos se crean después del minimapa.
   * @param {Phaser.Physics.Arcade.Group}       enemyGroup
   * @param {Phaser.Physics.Arcade.StaticGroup} saveZones
   */
  setGroups(enemyGroup, saveZones) {
    this._enemyGroup = enemyGroup;
    this._saveZones  = saveZones;
  }

  /**
   * Muestra u oculta el minimapa completo.
   * @param {boolean} visible
   */
  setVisible(visible) {
    this._panelBg.setVisible(visible);
    this._label.setVisible(visible);
    this._graphics.setVisible(visible);
  }

  /**
   * Destruye todos los objetos gráficos.
   */
  destroy() {
    this._panelBg.destroy();
    this._label.destroy();
    this._graphics.destroy();
  }
}