/**
 * BattleMenu.js
 * ─────────────────────────────────────────────────────
 * Componente de UI para el menú de batalla por turnos.
 * Maneja la navegación, submenús y coloreo de opciones
 * separado de la lógica de turnos de BattleScene.
 *
 * Uso:
 *   const menu = new BattleMenu(scene, x, y, player);
 *   menu.refresh();
 *
 *   // En input handlers:
 *   menu.moveUp();
 *   menu.moveDown();
 *   menu.openSkills();
 *   const skill = menu.getSelectedSkill();
 * ─────────────────────────────────────────────────────
 */

import { getItemById } from '../data/items.js';

// Opciones del menú principal
const MAIN_OPTIONS = ['⚔ Habilidades', '🎒 Objetos', '🏃 Huir'];

export class BattleMenu {

  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x       — posición X del panel
   * @param {number}       y       — posición Y del panel
   * @param {object}       player  — instancia del jugador (o jugador lite)
   */
  constructor(scene, x, y, player) {
    this._scene   = scene;
    this._x       = x;
    this._y       = y;
    this._player  = player;

    // Estado interno
    this._menuIndex = 0;
    this._subMenu   = null; // 'skills' | 'items' | null

    this._buildPanel();
    this._buildMainOptions();
    this._buildSubMenuTexts();
    this._buildCursor();
  }

  // ─── Construcción visual ──────────────────────────────────────────────────────

  /**
   * Fondo y borde del panel del menú.
   */
  _buildPanel() {
    this._panelBg = this._scene.add.graphics().setDepth(10);
    this._panelBg.fillStyle(0x000033, 0.9);
    this._panelBg.fillRoundedRect(this._x - 8, this._y - 8, 220, 110, 6);
    this._panelBg.lineStyle(2, 0xFFD700, 0.8);
    this._panelBg.strokeRoundedRect(this._x - 8, this._y - 8, 220, 110, 6);
  }

  /**
   * Textos del menú principal.
   */
  _buildMainOptions() {
    this._mainTexts = MAIN_OPTIONS.map((opt, i) =>
      this._scene.add.text(this._x + 16, this._y + 6 + i * 28, opt, {
        fontFamily: 'monospace',
        fontSize:   '14px',
        color:      '#CCCCCC',
      }).setDepth(11)
    );
  }

  /**
   * Textos del submenú (máximo 4 slots — skills o items).
   */
  _buildSubMenuTexts() {
    this._subTexts = Array.from({ length: 4 }, (_, i) =>
      this._scene.add.text(this._x + 16, this._y + 6 + i * 24, '', {
        fontFamily: 'monospace',
        fontSize:   '12px',
        color:      '#CCCCCC',
      }).setDepth(11).setVisible(false)
    );
  }

  /**
   * Cursor triangular dorado.
   */
  _buildCursor() {
    this._cursor = this._scene.add.text(this._x, this._y + 6, '▶', {
      fontFamily: 'monospace',
      fontSize:   '14px',
      color:      '#FFD700',
    }).setDepth(12);
  }

  // ─── Navegación ───────────────────────────────────────────────────────────────

  /**
   * Mueve el cursor hacia arriba.
   */
  moveUp() {
    const len = this._getOptions().length;
    this._menuIndex = (this._menuIndex - 1 + len) % len;
    this.refresh();
  }

  /**
   * Mueve el cursor hacia abajo.
   */
  moveDown() {
    const len = this._getOptions().length;
    this._menuIndex = (this._menuIndex + 1) % len;
    this.refresh();
  }

  /**
   * Abre el submenú de habilidades.
   */
  openSkills() {
    this._subMenu   = 'skills';
    this._menuIndex = 0;
    this.refresh();
  }

  /**
   * Abre el submenú de objetos.
   */
  openItems() {
    this._subMenu   = 'items';
    this._menuIndex = 0;
    this.refresh();
  }

  /**
   * Cierra el submenú activo y vuelve al menú principal.
   */
  closeSubMenu() {
    this._subMenu   = null;
    this._menuIndex = 0;
    this.refresh();
  }

  // ─── Consulta de selección ────────────────────────────────────────────────────

  /**
   * Retorna el índice seleccionado en el menú principal.
   * 0 = Habilidades, 1 = Objetos, 2 = Huir
   * @returns {number}
   */
  getMainIndex() {
    return this._menuIndex;
  }

  /**
   * Retorna el skill seleccionado en el submenú de habilidades.
   * @returns {object|null}
   */
  getSelectedSkill() {
    if (this._subMenu !== 'skills') return null;
    return this._player.skills[this._menuIndex] ?? null;
  }

  /**
   * Retorna el itemId seleccionado en el submenú de objetos.
   * @returns {string|null}
   */
  getSelectedItem() {
    if (this._subMenu !== 'items') return null;
    const keys = Object.keys(this._player.inventory);
    return keys[this._menuIndex] ?? null;
  }

  /**
   * Indica si hay un submenú activo.
   * @returns {boolean}
   */
  isInSubMenu() {
    return this._subMenu !== null;
  }

  // ─── Refresco visual ──────────────────────────────────────────────────────────

  /**
   * Redibuja el menú completo con el estado actual.
   * Llamar después de cualquier cambio de estado.
   */
  refresh() {
    const inSub = this.isInSubMenu();

    // Alternar visibilidad entre menú principal y submenú
    this._mainTexts.forEach(t => t.setVisible(!inSub));

    if (inSub) {
      this._renderSubMenu();
    } else {
      this._renderMainMenu();
    }

    // Mover cursor
    const spacing = inSub ? 24 : 28;
    this._cursor.setY(this._y + 6 + this._menuIndex * spacing);
    this._cursor.setVisible(true);
  }

  /**
   * Colorea las opciones del menú principal.
   */
  _renderMainMenu() {
    this._subTexts.forEach(t => t.setVisible(false));

    this._mainTexts.forEach((text, i) => {
      text.setColor(i === this._menuIndex ? '#FFD700' : '#CCCCCC');
    });
  }

  /**
   * Renderiza el submenú activo (skills o items).
   * Colorea en gris las skills sin MP suficiente.
   */
  _renderSubMenu() {
    const opts = this._getSubMenuOptions();

    this._subTexts.forEach((text, i) => {
      if (i < opts.length) {
        text.setText(opts[i]);
        text.setColor(this._getOptionColor(i));
        text.setVisible(true);
      } else {
        text.setVisible(false);
      }
    });
  }

  /**
   * Calcula el color de una opción del submenú.
   * Skills sin MP suficiente aparecen en gris azulado.
   * @param {number} index
   * @returns {string} color CSS
   */
  _getOptionColor(index) {
    const isSelected = index === this._menuIndex;

    if (this._subMenu === 'skills') {
      const skill = this._player.skills[index];
      if (skill && skill.mpCost > this._player.mp) {
        return '#555577'; // sin MP — gris azulado
      }
    }

    return isSelected ? '#FFD700' : '#CCCCCC';
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Retorna las opciones del submenú activo como strings.
   * @returns {string[]}
   */
  _getSubMenuOptions() {
    if (this._subMenu === 'skills') {
      return this._player.skills.map(s =>
        `${s.name}${s.mpCost > 0 ? ` (${s.mpCost}MP)` : ''}`
      );
    }

    if (this._subMenu === 'items') {
      const keys = Object.keys(this._player.inventory);
      if (keys.length === 0) return ['Sin objetos'];
      return keys.map(id => {
        const item = getItemById(id);
        return item ? `${item.name} ×${this._player.inventory[id]}` : id;
      });
    }

    return [];
  }

  /**
   * Retorna las opciones activas según si hay submenú o no.
   * Se usa para calcular los límites de navegación.
   * @returns {string[]}
   */
  _getOptions() {
    return this.isInSubMenu() ? this._getSubMenuOptions() : MAIN_OPTIONS;
  }

  // ─── API pública ──────────────────────────────────────────────────────────────

  /**
   * Muestra u oculta el menú completo.
   * @param {boolean} visible
   */
  setVisible(visible) {
    this._panelBg.setVisible(visible);
    this._cursor.setVisible(visible);
    this._mainTexts.forEach(t => t.setVisible(visible));
    this._subTexts.forEach(t => t.setVisible(false)); // el submenú siempre empieza oculto
  }

  /**
   * Destruye todos los objetos gráficos del menú.
   */
  destroy() {
    this._panelBg.destroy();
    this._cursor.destroy();
    this._mainTexts.forEach(t => t.destroy());
    this._subTexts.forEach(t => t.destroy());
  }
}