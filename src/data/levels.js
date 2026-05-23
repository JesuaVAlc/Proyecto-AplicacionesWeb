/**
 * levels.js
 * ─────────────────────────────────────────────────────
 * Tabla de experiencia y stats base por nivel.
 * 
 * expToNext: EXP necesaria para subir AL SIGUIENTE nivel.
 * statGrowth: cuánto sube cada stat al alcanzar ese nivel.
 * ─────────────────────────────────────────────────────
 */

export const LEVEL_TABLE = [
  // nivel 1 — stats iniciales del jugador
  {
    level:      1,
    expToNext:  100,
    statGrowth: { maxHp: 0,  attack: 0,  defense: 0,  speed: 0  },
  },
  {
    level:      2,
    expToNext:  220,
    statGrowth: { maxHp: 15, attack: 3,  defense: 2,  speed: 1  },
  },
  {
    level:      3,
    expToNext:  380,
    statGrowth: { maxHp: 15, attack: 3,  defense: 2,  speed: 1  },
  },
  {
    level:      4,
    expToNext:  600,
    statGrowth: { maxHp: 20, attack: 4,  defense: 3,  speed: 1  },
  },
  {
    level:      5,
    expToNext:  900,
    statGrowth: { maxHp: 20, attack: 4,  defense: 3,  speed: 2  },
  },
  {
    level:      6,
    expToNext:  1300,
    statGrowth: { maxHp: 25, attack: 5,  defense: 4,  speed: 2  },
  },
  {
    level:      7,
    expToNext:  1800,
    statGrowth: { maxHp: 25, attack: 5,  defense: 4,  speed: 2  },
  },
  {
    level:      8,
    expToNext:  2500,
    statGrowth: { maxHp: 30, attack: 6,  defense: 5,  speed: 2  },
  },
  {
    level:      9,
    expToNext:  3300,
    statGrowth: { maxHp: 30, attack: 6,  defense: 5,  speed: 3  },
  },
  {
    level:      10,
    expToNext:  4500,
    statGrowth: { maxHp: 40, attack: 8,  defense: 6,  speed: 3  },
  },
  {
    level:      11,
    expToNext:  6000,
    statGrowth: { maxHp: 35, attack: 7,  defense: 6,  speed: 3  },
  },
  {
    level:      12,
    expToNext:  8000,
    statGrowth: { maxHp: 35, attack: 7,  defense: 6,  speed: 3  },
  },
  {
    level:      13,
    expToNext:  10500,
    statGrowth: { maxHp: 40, attack: 9,  defense: 7,  speed: 4  },
  },
  {
    level:      14,
    expToNext:  13500,
    statGrowth: { maxHp: 40, attack: 9,  defense: 7,  speed: 4  },
  },
  {
    level:      15,
    expToNext:  17000,
    statGrowth: { maxHp: 50, attack: 11, defense: 8,  speed: 4  },
  },
];

/**
 * Retorna la entrada de la tabla para un nivel dado.
 * @param {number} level
 * @returns {object}
 */
export function getLevelData(level) {
  return LEVEL_TABLE.find(entry => entry.level === level) ?? LEVEL_TABLE[0];
}

/**
 * Calcula los stats totales del jugador acumulando
 * todos los statGrowth desde nivel 1 hasta el nivel dado.
 * @param {number} level
 * @param {object} baseStats — stats iniciales en nivel 1
 * @returns {object} stats finales
 */
export function calcStatsForLevel(level, baseStats) {
  const stats = { ...baseStats };

  for (let lvl = 2; lvl <= level; lvl++) {
    const entry = getLevelData(lvl);
    if (!entry) break;
    stats.maxHp   += entry.statGrowth.maxHp;
    stats.attack  += entry.statGrowth.attack;
    stats.defense += entry.statGrowth.defense;
    stats.speed   += entry.statGrowth.speed;
  }

  return stats;
}