/**
 * InventoryManager.js
 * ─────────────────────────────────────────────────────
 * Gestiona el inventario del jugador separado del Player.js.
 * Centraliza todas las operaciones sobre items para que
 * BattleScene, GameScene y la UI los consuman de forma uniforme.
 *
 * Responsabilidades:
 *   - Agregar / quitar / verificar items
 *   - Aplicar el efecto de un item al jugador
 *   - Respetar límites de stack (maxStack)
 *   - Generar la lista de items para mostrar en UI
 *   - Sincronizarse con Player.inventory (fuente de verdad)
 * ─────────────────────────────────────────────────────
 */

import { getItemById, ITEMS } from '../data/items.js';

export class InventoryManager {

  /**
   * @param {object} player — instancia de Player o el objeto lite de BattleScene
   */
  constructor(player) {
    this._player = player;

    console.log('[InventoryManager] Inicializado con inventario:', player.inventory);
  }

  // ─── Consulta ─────────────────────────────────────────────────────────────────

  /**
   * Retorna la cantidad de un item en el inventario.
   * @param {string} itemId
   * @returns {number}
   */
  getQuantity(itemId) {
    return this._player.inventory[itemId] ?? 0;
  }

  /**
   * Verifica si el jugador tiene al menos 1 unidad de un item.
   * @param {string} itemId
   * @returns {boolean}
   */
  has(itemId) {
    return this.getQuantity(itemId) > 0;
  }

  /**
   * Verifica si el inventario está vacío.
   * @returns {boolean}
   */
  isEmpty() {
    return Object.keys(this._player.inventory).length === 0;
  }

  /**
   * Retorna la lista de items en el inventario con sus definiciones.
   * Útil para renderizar la UI del inventario.
   *
   * @returns {Array<{ item: object, quantity: number }>}
   */
  getItemList() {
    return Object.entries(this._player.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => ({
        item:     getItemById(id),
        quantity,
      }))
      .filter(entry => entry.item !== undefined); // filtrar ids inválidos
  }

  /**
   * Retorna el número total de slots ocupados (tipos de item distintos).
   * @returns {number}
   */
  getSlotCount() {
    return Object.keys(this._player.inventory).length;
  }

  // ─── Modificación ─────────────────────────────────────────────────────────────

  /**
   * Agrega una cantidad de un item al inventario.
   * Respeta el límite maxStack definido en items.js.
   *
   * @param {string} itemId
   * @param {number} quantity — cantidad a agregar (default: 1)
   * @returns {{ added: number, capped: boolean }} cuánto se agregó y si se llegó al límite
   */
  add(itemId, quantity = 1) {
    const definition = getItemById(itemId);
    if (!definition) {
      console.warn(`[InventoryManager] Item desconocido: "${itemId}"`);
      return { added: 0, capped: false };
    }

    const current  = this.getQuantity(itemId);
    const maxStack = definition.maxStack ?? 99;
    const space    = maxStack - current;
    const toAdd    = Math.min(quantity, space);

    if (toAdd <= 0) {
      console.log(`[InventoryManager] "${itemId}" ya está al máximo (${maxStack}).`);
      return { added: 0, capped: true };
    }

    this._player.inventory[itemId] = current + toAdd;
    console.log(`[InventoryManager] +${toAdd} "${itemId}" → total: ${this._player.inventory[itemId]}`);
    return { added: toAdd, capped: toAdd < quantity };
  }

  /**
   * Quita una cantidad de un item del inventario.
   * Si la cantidad queda en 0 elimina la entrada del inventario.
   *
   * @param {string} itemId
   * @param {number} quantity — cantidad a quitar (default: 1)
   * @returns {boolean} si había suficiente para quitar
   */
  remove(itemId, quantity = 1) {
    const current = this.getQuantity(itemId);
    if (current < quantity) {
      console.warn(`[InventoryManager] No hay suficiente "${itemId}" (${current} < ${quantity}).`);
      return false;
    }

    const newQty = current - quantity;
    if (newQty <= 0) {
      delete this._player.inventory[itemId];
    } else {
      this._player.inventory[itemId] = newQty;
    }

    console.log(`[InventoryManager] -${quantity} "${itemId}" → total: ${newQty}`);
    return true;
  }

  // ─── Uso de items ─────────────────────────────────────────────────────────────

  /**
   * Usa un item del inventario aplicando su efecto al jugador.
   * Consume 1 unidad automáticamente si el uso fue exitoso.
   *
   * @param {string} itemId
   * @returns {{ success: boolean, message: string, healed?: number }}
   */
  use(itemId) {
    const definition = getItemById(itemId);

    if (!definition) {
      return { success: false, message: `Item "${itemId}" no existe.` };
    }

    if (!this.has(itemId)) {
      return { success: false, message: `No tienes ${definition.name}.` };
    }

    let result;

    switch (definition.type) {
      case 'heal':
        result = this._applyHeal(definition);
        break;

      case 'buff':
        result = this._applyBuff(definition);
        break;

      case 'revive':
        // La pluma de fénix es pasiva — se activa automáticamente al morir
        // Usarla manualmente solo muestra un mensaje informativo
        result = {
          success: true,
          message: `${definition.name} está lista para activarse si caes.`,
        };
        break;

      default:
        result = { success: false, message: 'Tipo de item desconocido.' };
    }

    // Consumir el item si el uso fue exitoso
    if (result.success) {
      this.remove(itemId, 1);
    }

    return result;
  }

  /**
   * Aplica el efecto de curación de un item.
   * @param {object} definition — definición del item de items.js
   * @returns {{ success: boolean, message: string, healed: number }}
   */
  _applyHeal(definition) {
    const p = this._player;

    // Si el jugador ya está al máximo, no gastar el item
    if (p.hp >= p.maxHp) {
      return {
        success: false,
        message: `El HP ya está al máximo. No se usó ${definition.name}.`,
      };
    }

    const healAmt = definition.power >= 1
      ? p.maxHp                                      // restaurar todo
      : Math.floor(p.maxHp * definition.power);      // restaurar porcentaje

    const healed = p.heal(healAmt);

    return {
      success: true,
      message: `Usaste ${definition.name}. HP +${healed}.`,
      healed,
    };
  }

  /**
   * Aplica el efecto de buff de un item.
   * @param {object} definition
   * @returns {{ success: boolean, message: string }}
   */
  _applyBuff(definition) {
    const p = this._player;

    if (typeof p.applyEffect !== 'function') {
      return {
        success: false,
        message: 'No se pueden aplicar buffs fuera de batalla.',
      };
    }

    p.applyEffect(
      definition.stat,
      definition.power,
      definition.duration,
      true   // isPositive = buff
    );

    return {
      success: true,
      message: `Usaste ${definition.name}. ${definition.stat} aumentó un ${definition.power * 100}% por ${definition.duration} turnos.`,
    };
  }

  // ─── Pluma de Fénix (revive pasivo) ──────────────────────────────────────────

  /**
   * Verifica y activa la pluma de fénix si el jugador está muerto.
   * Llamar desde BattleScene al detectar que el jugador muere.
   *
   * @returns {{ activated: boolean, message: string }}
   */
  tryRevive() {
    if (!this.has('phoenix_down')) {
      return { activated: false, message: '' };
    }

    const definition = getItemById('phoenix_down');
    this.remove('phoenix_down', 1);

    const reviveHp = Math.floor(this._player.maxHp * (definition.power ?? 0.25));
    this._player.hp = reviveHp;

    console.log(`[InventoryManager] Pluma de Fénix activada. HP restaurado: ${reviveHp}`);
    return {
      activated: true,
      message:   `¡La ${definition.name} te revivió con ${reviveHp} HP!`,
    };
  }

  // ─── Sincronización ───────────────────────────────────────────────────────────

  /**
   * Reemplaza el inventario completo del jugador.
   * Útil al cargar una partida guardada.
   * @param {object} inventoryData — { itemId: quantity, ... }
   */
  loadFromSave(inventoryData) {
    this._player.inventory = { ...inventoryData };
    console.log('[InventoryManager] Inventario cargado desde guardado:', inventoryData);
  }

  /**
   * Retorna una copia del inventario para serializar.
   * @returns {object}
   */
  serialize() {
    return { ...this._player.inventory };
  }
}