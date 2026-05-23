/**
 * enemies.js
 * ─────────────────────────────────────────────────────
 * Definición de todos los enemigos del juego.
 *
 * Cada enemigo tiene:
 *   id          — identificador único
 *   name        — nombre visible en batalla
 *   textureKey  — clave de la textura generada en PreloadScene
 *   isBoss      — si es jefe final
 *   stats       — hp, attack, defense, speed, expReward, scoreReward
 *   skills      — habilidades que puede usar (máx 4)
 *   aiWeights   — probabilidad relativa de cada skill en la IA
 * ─────────────────────────────────────────────────────
 */

import { SKILL_TYPES } from '../utils/Constants.js';

// ── Habilidades de enemigos (definidas inline, no usan MP) ─────────────────────
const ENEMY_SKILLS = {

  // Slime
  slime_tackle: {
    id: 'slime_tackle', name: 'Embestida',
    type: SKILL_TYPES.ATTACK, power: 0.8, target: 'player',
    description: 'Embestida blanda.',
  },
  slime_split: {
    id: 'slime_split', name: 'División',
    type: SKILL_TYPES.DEBUFF, power: 0.15, stat: 'defense',
    target: 'player', duration: 2,
    description: 'Se divide y reduce tu defensa un 15%.',
  },

  // Goblin
  goblin_slash: {
    id: 'goblin_slash', name: 'Cuchillada',
    type: SKILL_TYPES.ATTACK, power: 1.1, target: 'player',
    description: 'Cuchillada rápida.',
  },
  goblin_regen: {
    id: 'goblin_regen', name: 'Regenerar',
    type: SKILL_TYPES.HEAL, power: 0.15, target: 'self',
    description: 'Recupera el 15% de su HP.',
  },
  goblin_fury: {
    id: 'goblin_fury', name: 'Furia',
    type: SKILL_TYPES.BUFF, power: 0.20, stat: 'attack',
    target: 'self', duration: 2,
    description: 'Aumenta su ataque un 20%.',
  },

  // Dark Knight
  knight_crush: {
    id: 'knight_crush', name: 'Machacar',
    type: SKILL_TYPES.ATTACK, power: 1.4, target: 'player',
    description: 'Golpe aplastante de hacha.',
  },
  knight_shield: {
    id: 'knight_shield', name: 'Escudo Oscuro',
    type: SKILL_TYPES.BUFF, power: 0.35, stat: 'defense',
    target: 'self', duration: 3,
    description: 'Aumenta su defensa un 35%.',
  },
  knight_drain: {
    id: 'knight_drain', name: 'Drenar Vida',
    type: SKILL_TYPES.ATTACK, power: 0.9, target: 'player',
    healSelf: 0.5,  // cura al enemigo el 50% del daño infligido
    description: 'Absorbe vida del jugador.',
  },

  // Boss — Chaos Dragon
  boss_inferno: {
    id: 'boss_inferno', name: 'Infierno',
    type: SKILL_TYPES.ATTACK, power: 2.2,
    ignoreDefensePercent: 0.4, target: 'player',
    description: 'Llamarada que ignora el 40% de la defensa.',
  },
  boss_roar: {
    id: 'boss_roar', name: 'Rugido del Caos',
    type: SKILL_TYPES.DEBUFF, power: 0.30, stat: 'attack',
    target: 'player', duration: 3,
    description: 'Rugido que reduce tu ataque un 30%.',
  },
  boss_regen: {
    id: 'boss_regen', name: 'Regeneración Dragón',
    type: SKILL_TYPES.HEAL, power: 0.20, target: 'self',
    description: 'Recupera el 20% de su HP.',
  },
  boss_crush: {
    id: 'boss_crush', name: 'Aplastamiento',
    type: SKILL_TYPES.ATTACK, power: 3.0, target: 'player',
    description: 'Golpe definitivo de cola.',
  },
};

// ── Enemigos ───────────────────────────────────────────────────────────────────
export const ENEMIES = [
  {
    id:         'slime',
    name:       'Slime Verde',
    textureKey: 'enemy_slime',
    isBoss:     false,
    stats: {
      maxHp:       60,
      hp:          60,
      attack:      12,
      defense:     5,
      speed:       8,
      expReward:   30,    // EXP que da al morir
      scoreReward: 100,   // puntos para el highscore
    },
    skills: [
      ENEMY_SKILLS.slime_tackle,
      ENEMY_SKILLS.slime_split,
    ],
    // Peso de IA: probabilidad relativa de elegir cada skill
    aiWeights: [0.7, 0.3],
  },

  {
    id:         'goblin',
    name:       'Goblin Feroz',
    textureKey: 'enemy_goblin',
    isBoss:     false,
    stats: {
      maxHp:       95,
      hp:          95,
      attack:      22,
      defense:     10,
      speed:       14,
      expReward:   65,
      scoreReward: 220,
    },
    skills: [
      ENEMY_SKILLS.goblin_slash,
      ENEMY_SKILLS.goblin_regen,
      ENEMY_SKILLS.goblin_fury,
    ],
    aiWeights: [0.55, 0.25, 0.20],
  },

  {
    id:         'dark_knight',
    name:       'Caballero Oscuro',
    textureKey: 'enemy_goblin',  // reutiliza textura hasta tener sprite propio
    isBoss:     false,
    stats: {
      maxHp:       150,
      hp:          150,
      attack:      35,
      defense:     22,
      speed:       10,
      expReward:   120,
      scoreReward: 450,
    },
    skills: [
      ENEMY_SKILLS.knight_crush,
      ENEMY_SKILLS.knight_shield,
      ENEMY_SKILLS.knight_drain,
    ],
    aiWeights: [0.50, 0.25, 0.25],
  },

  {
    id:         'chaos_dragon',
    name:       'Dragón del Caos',
    textureKey: 'enemy_boss',
    isBoss:     true,
    stats: {
      maxHp:       500,
      hp:          500,
      attack:      70,
      defense:     40,
      speed:       18,
      expReward:   800,
      scoreReward: 5000,
    },
    skills: [
      ENEMY_SKILLS.boss_inferno,
      ENEMY_SKILLS.boss_roar,
      ENEMY_SKILLS.boss_regen,
      ENEMY_SKILLS.boss_crush,
    ],
    aiWeights: [0.35, 0.25, 0.15, 0.25],
  },
];

/**
 * Retorna un enemigo por su id con stats frescos (copia profunda).
 * Usar siempre esta función al instanciar un enemigo en batalla
 * para evitar mutar el objeto original.
 * @param {string} id
 * @returns {object}
 */
export function getEnemyById(id) {
  const template = ENEMIES.find(e => e.id === id);
  if (!template) return null;

  // Copia profunda para que cada batalla tenga su propia instancia
  return JSON.parse(JSON.stringify(template));
}

/**
 * Selecciona una skill de enemigo según sus pesos de IA.
 * Usa una ruleta de probabilidad ponderada.
 * @param {object} enemy — instancia del enemigo en batalla
 * @returns {object} skill seleccionada
 */
export function selectEnemySkill(enemy) {
  const { skills, aiWeights } = enemy;

  // Suma total de pesos
  const total  = aiWeights.reduce((sum, w) => sum + w, 0);
  let   random = Math.random() * total;

  for (let i = 0; i < skills.length; i++) {
    random -= aiWeights[i];
    if (random <= 0) return skills[i];
  }

  // Fallback al primer skill si hay error de redondeo
  return skills[0];
}