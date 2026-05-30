/**
 * InventoryScene.js
 * ─────────────────────────────────────────────────────
 * Pantalla de inventario accesible desde el mapa.
 * Se lanza como escena superpuesta sobre GameScene
 * con scene.launch() — no interrumpe el estado del mapa.
 *
 * Responsabilidades:
 *   - Mostrar lista navegable de items con cantidad
 *   - Mostrar descripción e info del item seleccionado
 *   - Permitir usar items de tipo 'heal' fuera de batalla
 *   - Devolver los cambios al jugador via registry
 *   - Reanudar GameScene al cerrar
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants.js';
import { getItemById } from '../data/items.js';

// Layout de los paneles
const LAYOUT = {
  // Panel izquierdo — lista de items
  listX:    40,
  listY:    80,
  listW:    280,
  listH:    360,

  // Panel derecho — descripción
  detailX:  360,
  detailY:  80,
  detailW:  560,
  detailH:  360,

  // Panel inferior — instrucciones
  footerX:  40,
  footerY:  460,
  footerW:  GAME_WIDTH - 80,
  footerH:  50,
};

export class InventoryScene extends Phaser.Scene {

  constructor() {
    super({ key: SCENES.INVENTORY });
  }

  // ─── init ────────────────────────────────────────────────────────────────────

  init() {
    // Leer datos del jugador desde el registry
    const player        = this.registry.get('player');
    this._playerHp      = player.hp;
    this._playerMaxHp   = player.maxHp;
    this._inventory     = { ...(player.inventory ?? {}) };
    this._selectedIndex = 0;
    this._message       = '';
    this._messageTimer  = null;
  }

  // ─── create ──────────────────────────────────────────────────────────────────

  create() {
    this._createBackground();
    this._createTitle();
    this._createListPanel();
    this._createDetailPanel();
    this._createFooter();
    this._setupInput();

    // Fade in suave
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this._refresh();
  }

  // ─── Construcción visual ──────────────────────────────────────────────────────

  /**
   * Fondo semitransparente sobre GameScene.
   */
  _createBackground() {
    // Overlay oscuro
    this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.75
    );

    // Marco dorado exterior
    const border = this.add.graphics();
    border.lineStyle(2, 0xFFD700, 0.9);
    border.strokeRect(10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20);
  }

  /**
   * Título de la pantalla.
   */
  _createTitle() {
    this.add.text(GAME_WIDTH / 2, 36, 'INVENTARIO', {
      fontFamily: 'monospace',
      fontSize:   '24px',
      color:      '#FFD700',
      stroke:     '#8B6914',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Línea separadora bajo el título
    const line = this.add.graphics();
    line.lineStyle(1, 0xFFD700, 0.5);
    line.lineBetween(40, 58, GAME_WIDTH - 40, 58);
  }

  /**
   * Panel izquierdo con la lista navegable de items.
   */
  _createListPanel() {
    const { listX, listY, listW, listH } = LAYOUT;

    // Fondo del panel
    const bg = this.add.graphics();
    bg.fillStyle(0x000033, 0.9);
    bg.fillRoundedRect(listX, listY, listW, listH, 8);
    bg.lineStyle(2, 0x4466AA, 0.8);
    bg.strokeRoundedRect(listX, listY, listW, listH, 8);

    // Etiqueta del panel
    this.add.text(listX + listW / 2, listY + 14, 'Objetos', {
      fontFamily: 'monospace',
      fontSize:   '12px',
      color:      '#AAAACC',
    }).setOrigin(0.5);

    // Línea bajo la etiqueta
    const line = this.add.graphics();
    line.lineStyle(1, 0x4466AA, 0.5);
    line.lineBetween(listX + 10, listY + 28, listX + listW - 10, listY + 28);

    // Cursor
    this._cursor = this.add.text(listX + 10, listY + 40, '▶', {
      fontFamily: 'monospace',
      fontSize:   '14px',
      color:      '#FFD700',
    });

    // Textos de items (máx 8 visibles)
    this._itemTexts = Array.from({ length: 8 }, (_, i) =>
      this.add.text(listX + 28, listY + 40 + i * 36, '', {
        fontFamily: 'monospace',
        fontSize:   '13px',
        color:      '#CCCCCC',
      })
    );

    // Subtextos de cantidad
    this._qtyTexts = Array.from({ length: 8 }, (_, i) =>
      this.add.text(listX + listW - 14, listY + 40 + i * 36, '', {
        fontFamily: 'monospace',
        fontSize:   '13px',
        color:      '#AAAAAA',
      }).setOrigin(1, 0)
    );
  }

  /**
   * Panel derecho con descripción del item seleccionado.
   */
  _createDetailPanel() {
    const { detailX, detailY, detailW, detailH } = LAYOUT;

    // Fondo del panel
    const bg = this.add.graphics();
    bg.fillStyle(0x000033, 0.9);
    bg.fillRoundedRect(detailX, detailY, detailW, detailH, 8);
    bg.lineStyle(2, 0x4466AA, 0.8);
    bg.strokeRoundedRect(detailX, detailY, detailW, detailH, 8);

    const pad = 20;

    // Nombre del item
    this._detailName = this.add.text(detailX + pad, detailY + 20, '', {
      fontFamily: 'monospace',
      fontSize:   '18px',
      color:      '#FFD700',
    });

    // Línea bajo el nombre
    this._detailLine = this.add.graphics();

    // Tipo del item
    this._detailType = this.add.text(detailX + pad, detailY + 56, '', {
      fontFamily: 'monospace',
      fontSize:   '11px',
      color:      '#8888AA',
    });

    // Descripción
    this._detailDesc = this.add.text(detailX + pad, detailY + 80, '', {
      fontFamily: 'monospace',
      fontSize:   '13px',
      color:      '#DDDDDD',
      wordWrap:   { width: detailW - pad * 2 },
    });

    // Efecto (poder, stat, duración)
    this._detailEffect = this.add.text(detailX + pad, detailY + 160, '', {
      fontFamily: 'monospace',
      fontSize:   '13px',
      color:      '#88FFAA',
    });

    // HP actual del jugador
    this._detailHp = this.add.text(detailX + pad, detailY + detailH - 50, '', {
      fontFamily: 'monospace',
      fontSize:   '13px',
      color:      '#FF6666',
    });

    // Mensaje de feedback (usado/error)
    this._detailMessage = this.add.text(
      detailX + detailW / 2,
      detailY + detailH - 24,
      '',
      {
        fontFamily: 'monospace',
        fontSize:   '12px',
        color:      '#44FF88',
      }
    ).setOrigin(0.5, 0);
  }

  /**
   * Panel inferior con instrucciones de teclas.
   */
  _createFooter() {
    const { footerX, footerY, footerW, footerH } = LAYOUT;

    const bg = this.add.graphics();
    bg.fillStyle(0x000022, 0.8);
    bg.fillRoundedRect(footerX, footerY, footerW, footerH, 6);
    bg.lineStyle(1, 0x334488, 0.6);
    bg.strokeRoundedRect(footerX, footerY, footerW, footerH, 6);

    this.add.text(GAME_WIDTH / 2, footerY + footerH / 2,
      'W/S · Navegar     SPACE · Usar objeto     ESC · Cerrar',
      {
        fontFamily: 'monospace',
        fontSize:   '11px',
        color:      '#555577',
      }
    ).setOrigin(0.5);
  }

  // ─── Input ────────────────────────────────────────────────────────────────────

  _setupInput() {
    this.input.keyboard.on('keydown-W',     this._onUp,      this);
    this.input.keyboard.on('keydown-UP',    this._onUp,      this);
    this.input.keyboard.on('keydown-S',     this._onDown,    this);
    this.input.keyboard.on('keydown-DOWN',  this._onDown,    this);
    this.input.keyboard.on('keydown-SPACE', this._onUse,     this);
    this.input.keyboard.on('keydown-ESC',   this._onClose,   this);
  }

  _onUp() {
    const items = this._getItemList();
    if (items.length === 0) return;
    this._selectedIndex = (this._selectedIndex - 1 + items.length) % items.length;
    this._refresh();
  }

  _onDown() {
    const items = this._getItemList();
    if (items.length === 0) return;
    this._selectedIndex = (this._selectedIndex + 1) % items.length;
    this._refresh();
  }

  /**
   * Usa el item seleccionado si es de tipo heal.
   */
  _onUse() {
    const items = this._getItemList();
    if (items.length === 0) return;

    const { item, quantity } = items[this._selectedIndex];
    if (!item) return;

    if (item.type !== 'heal') {
      this._showMessage('Solo puedes usar pociones fuera de batalla.', '#FF6666');
      return;
    }

    if (this._playerHp >= this._playerMaxHp) {
      this._showMessage('El HP ya está al máximo.', '#FF6666');
      return;
    }

    // Calcular curación
    const healAmt = item.power >= 1
      ? this._playerMaxHp
      : Math.floor(this._playerMaxHp * item.power);

    const before         = this._playerHp;
    this._playerHp       = Math.min(this._playerMaxHp, this._playerHp + healAmt);
    const healed         = this._playerHp - before;

    // Consumir del inventario local
    this._inventory[item.id]--;
    if (this._inventory[item.id] <= 0) {
      delete this._inventory[item.id];
      // Ajustar índice si era el último item
      const newLen = this._getItemList().length;
      if (this._selectedIndex >= newLen) {
        this._selectedIndex = Math.max(0, newLen - 1);
      }
    }

    this._showMessage(`Usaste ${item.name}. HP +${healed}`, '#44FF88');
    this._saveChanges();
    this._refresh();
  }

  /**
   * Cierra la pantalla y reanuda GameScene.
   */
  _onClose() {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.resume(SCENES.GAME);
      this.scene.stop();
    });
  }

  // ─── Refresco visual ──────────────────────────────────────────────────────────

  /**
   * Redibuja la lista y el panel de detalle con el estado actual.
   */
  _refresh() {
    const items = this._getItemList();

    // Lista vacía
    if (items.length === 0) {
      this._itemTexts.forEach(t => t.setText(''));
      this._qtyTexts.forEach(t => t.setText(''));
      this._cursor.setVisible(false);
      this._clearDetail();
      this._detailName.setText('Sin objetos');
      return;
    }

    this._cursor.setVisible(true);

    // Renderizar items visibles
    items.forEach(({ item, quantity }, i) => {
      if (i >= this._itemTexts.length) return;

      const isSelected = i === this._selectedIndex;
      const color      = isSelected ? '#FFD700' : '#CCCCCC';

      this._itemTexts[i].setText(item?.name ?? '???').setColor(color);
      this._qtyTexts[i].setText(`×${quantity}`).setColor(isSelected ? '#FFD700' : '#AAAAAA');
    });

    // Limpiar slots vacíos
    for (let i = items.length; i < this._itemTexts.length; i++) {
      this._itemTexts[i].setText('');
      this._qtyTexts[i].setText('');
    }

    // Mover cursor
    this._cursor.setY(LAYOUT.listY + 40 + this._selectedIndex * 36);

    // Actualizar detalle
    const selected = items[this._selectedIndex];
    if (selected) this._renderDetail(selected.item);
  }

  /**
   * Renderiza el panel de detalle con la info del item.
   * @param {object} item
   */
  _renderDetail(item) {
    if (!item) return;

    const { detailX, detailY, detailW } = LAYOUT;
    const pad = 20;

    // Nombre
    this._detailName.setText(item.name);

    // Línea bajo el nombre
    this._detailLine.clear();
    this._detailLine.lineStyle(1, 0x4466AA, 0.5);
    this._detailLine.lineBetween(
      detailX + pad, detailY + 44,
      detailX + detailW - pad, detailY + 44
    );

    // Tipo
    const typeLabels = {
      heal:   '🧪 Consumible — Curación',
      buff:   '⬆ Consumible — Mejora',
      revive: '⭐ Consumible — Revivir',
    };
    this._detailType.setText(typeLabels[item.type] ?? item.type);

    // Descripción
    this._detailDesc.setText(item.description ?? '');

    // Efecto
    let effectText = '';
    if (item.type === 'heal') {
      const healPct = item.power >= 1 ? '100' : Math.floor(item.power * 100);
      effectText = `Restaura el ${healPct}% del HP máximo.`;
    } else if (item.type === 'buff') {
      effectText = `+${Math.floor(item.power * 100)}% ${item.stat} durante ${item.duration} turnos.`;
    } else if (item.type === 'revive') {
      effectText = `Revive con el ${Math.floor(item.power * 100)}% del HP.`;
    }
    this._detailEffect.setText(effectText);

    // HP actual
    this._detailHp.setText(`HP actual: ${this._playerHp} / ${this._playerMaxHp}`);
  }

  /**
   * Limpia el panel de detalle.
   */
  _clearDetail() {
    this._detailName.setText('');
    this._detailLine.clear();
    this._detailType.setText('');
    this._detailDesc.setText('');
    this._detailEffect.setText('');
    this._detailHp.setText('');
  }

  /**
   * Muestra un mensaje de feedback temporal en el panel de detalle.
   * @param {string} message
   * @param {string} color
   */
  _showMessage(message, color) {
    this._detailMessage.setText(message).setColor(color);

    if (this._messageTimer) this._messageTimer.remove();
    this._messageTimer = this.time.delayedCall(2000, () => {
      this._detailMessage.setText('');
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Retorna la lista de items del inventario con sus definiciones.
   * @returns {Array<{ item: object, quantity: number }>}
   */
  _getItemList() {
    return Object.entries(this._inventory)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => ({
        item: getItemById(id),
        quantity,
      }))
      .filter(entry => entry.item !== undefined);
  }

  /**
   * Guarda los cambios del inventario y HP en el registry
   * para que GameScene los aplique al jugador real.
   */
  _saveChanges() {
    this.registry.set('inventoryPlayerData', {
      hp:        this._playerHp,
      inventory: { ...this._inventory },
    });
  }

  // ─── Limpieza ─────────────────────────────────────────────────────────────────

  shutdown() {
    this.input.keyboard.off('keydown-W',     this._onUp,    this);
    this.input.keyboard.off('keydown-UP',    this._onUp,    this);
    this.input.keyboard.off('keydown-S',     this._onDown,  this);
    this.input.keyboard.off('keydown-DOWN',  this._onDown,  this);
    this.input.keyboard.off('keydown-SPACE', this._onUse,   this);
    this.input.keyboard.off('keydown-ESC',   this._onClose, this);
  }
}