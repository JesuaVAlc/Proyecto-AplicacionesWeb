/**
 * items.js
 * ─────────────────────────────────────────────────────
 * Definición de todos los objetos usables del inventario.
 *
 * Cada item tiene:
 *   id          — identificador único
 *   name        — nombre visible
 *   type        — 'heal' | 'buff' | 'revive'
 *   power       — magnitud del efecto
 *   stat        — stat afectado (si aplica)
 *   duration    — turnos de duración (si aplica)
 *   maxStack    — cuántos puede llevar el jugador
 *   description — texto del tutorial/inventario
 * ─────────────────────────────────────────────────────
 */

export const ITEMS = [
  {
    id:          'potion',
    name:        'Poción',
    type:        'heal',
    power:       0.25,        // restaura 25% del HP máximo
    maxStack:    9,
    description: 'Restaura el 25% del HP.',
  },
  {
    id:          'hi_potion',
    name:        'Hi-Poción',
    type:        'heal',
    power:       0.50,
    maxStack:    9,
    description: 'Restaura el 50% del HP.',
  },
  {
    id:          'elixir',
    name:        'Elixir',
    type:        'heal',
    power:       1.0,         // restaura HP al máximo
    maxStack:    3,
    description: 'Restaura todo el HP.',
  },
  {
    id:          'power_seed',
    name:        'Semilla de Fuerza',
    type:        'buff',
    power:       0.20,
    stat:        'attack',
    duration:    3,
    maxStack:    5,
    description: 'Aumenta el ataque un 20% por 3 turnos.',
  },
  {
    id:          'iron_shield',
    name:        'Escudo de Hierro',
    type:        'buff',
    power:       0.25,
    stat:        'defense',
    duration:    3,
    maxStack:    5,
    description: 'Aumenta la defensa un 25% por 3 turnos.',
  },
  {
    id:          'phoenix_down',
    name:        'Pluma de Fénix',
    type:        'revive',
    power:       0.25,        // revive con 25% HP
    maxStack:    3,
    description: 'Revive con el 25% del HP si caes en batalla.',
  },
];

/**
 * Retorna un item por su id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getItemById(id) {
  return ITEMS.find(item => item.id === id);
}

/**
 * Inventario inicial del jugador al comenzar una nueva partida.
 * Formato: { itemId: cantidad }
 */
export const STARTING_INVENTORY = {
  potion:      3,
  phoenix_down: 1,
};