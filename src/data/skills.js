/**
 * skills.js
 * ─────────────────────────────────────────────────────
 * Definición de todas las habilidades del jugador.
 *
 * Cada habilidad tiene:
 *   id          — identificador único
 *   name        — nombre visible en el menú de batalla
 *   type        — 'attack' | 'heal' | 'buff' | 'debuff'
 *   levelReq    — nivel mínimo para desbloquearla
 *   mpCost      — coste de magia (0 si no usa MP)
 *   power       — multiplicador base del efecto
 *   description — texto del tutorial/HUD
 *   target      — 'enemy' | 'self'
 * ─────────────────────────────────────────────────────
 */

import { SKILL_TYPES } from '../utils/Constants.js';

export const SKILLS = [
  // ── Nivel 1 — habilidades iniciales ──────────────────────────────────────────
  {
    id:          'attack_basic',
    name:        'Golpe',
    type:        SKILL_TYPES.ATTACK,
    levelReq:    1,
    mpCost:      0,
    power:       1.0,       // daño = ataque * power
    target:      'enemy',
    description: 'Ataque físico básico sin coste de MP.',
  },
  {
    id:          'heal_basic',
    name:        'Curar',
    type:        SKILL_TYPES.HEAL,
    levelReq:    1,
    mpCost:      8,
    power:       0.3,       // cura = maxHp * power
    target:      'self',
    description: 'Restaura el 30% del HP máximo.',
  },

  // ── Nivel 3 ───────────────────────────────────────────────────────────────────
  {
    id:          'attack_slash',
    name:        'Tajo',
    type:        SKILL_TYPES.ATTACK,
    levelReq:    3,
    mpCost:      5,
    power:       1.5,
    target:      'enemy',
    description: 'Tajo rápido que inflige 1.5x daño.',
  },
  {
    id:          'debuff_blind',
    name:        'Cegar',
    type:        SKILL_TYPES.DEBUFF,
    levelReq:    3,
    mpCost:      6,
    power:       0.25,      // reduce ataque enemigo en 25%
    stat:        'attack',
    target:      'enemy',
    description: 'Reduce el ataque del enemigo un 25% por 3 turnos.',
    duration:    3,
  },

  // ── Nivel 5 ───────────────────────────────────────────────────────────────────
  {
    id:          'buff_guard',
    name:        'Guardia',
    type:        SKILL_TYPES.BUFF,
    levelReq:    5,
    mpCost:      7,
    power:       0.30,      // aumenta defensa propia en 30%
    stat:        'defense',
    target:      'self',
    description: 'Aumenta tu defensa un 30% por 3 turnos.',
    duration:    3,
  },
  {
    id:          'heal_great',
    name:        'Curagran',
    type:        SKILL_TYPES.HEAL,
    levelReq:    5,
    mpCost:      16,
    power:       0.6,       // cura = maxHp * 0.6
    target:      'self',
    description: 'Restaura el 60% del HP máximo.',
  },

  // ── Nivel 8 ───────────────────────────────────────────────────────────────────
  {
    id:          'attack_fire',
    name:        'Fuego',
    type:        SKILL_TYPES.ATTACK,
    levelReq:    8,
    mpCost:      12,
    power:       2.0,
    target:      'enemy',
    description: 'Ataque de fuego que ignora parte de la defensa.',
    ignoreDefensePercent: 0.5, // ignora 50% de la DEF del enemigo
  },
  {
    id:          'debuff_slow',
    name:        'Lentitud',
    type:        SKILL_TYPES.DEBUFF,
    levelReq:    8,
    mpCost:      10,
    power:       0.40,
    stat:        'speed',
    target:      'enemy',
    description: 'Reduce la velocidad del enemigo un 40% por 4 turnos.',
    duration:    4,
  },

  // ── Nivel 11 ──────────────────────────────────────────────────────────────────
  {
    id:          'attack_thunder',
    name:        'Rayo',
    type:        SKILL_TYPES.ATTACK,
    levelReq:    11,
    mpCost:      18,
    power:       2.8,
    target:      'enemy',
    description: 'Descarga eléctrica devastadora.',
  },
  {
    id:          'buff_haste',
    name:        'Prisa',
    type:        SKILL_TYPES.BUFF,
    levelReq:    11,
    mpCost:      14,
    power:       0.50,
    stat:        'speed',
    target:      'self',
    description: 'Aumenta tu velocidad un 50% por 3 turnos.',
    duration:    3,
  },

  // ── Nivel 15 ──────────────────────────────────────────────────────────────────
  {
    id:          'attack_blizzard',
    name:        'Ventisca',
    type:        SKILL_TYPES.ATTACK,
    levelReq:    15,
    mpCost:      25,
    power:       3.5,
    target:      'enemy',
    description: 'Tormenta de hielo que congela al enemigo.',
  },
  {
    id:          'heal_full',
    name:        'Curaplena',
    type:        SKILL_TYPES.HEAL,
    levelReq:    15,
    mpCost:      30,
    power:       1.0,       // restaura HP al máximo
    target:      'self',
    description: 'Restaura todo el HP.',
  },

  // ── Nivel 18 ──────────────────────────────────────────────────────────────────
  {
    id:          'attack_ultima',
    name:        'Ultima',
    type:        SKILL_TYPES.ATTACK,
    levelReq:    18,
    mpCost:      40,
    power:       5.0,
    target:      'enemy',
    ignoreDefensePercent: 0.75,
    description: 'El ataque más poderoso. Ignora el 75% de la defensa.',
  },
];

/**
 * Retorna las habilidades disponibles para un nivel dado.
 * Máximo 4 habilidades activas (las más recientes desbloqueadas).
 * @param {number} level
 * @returns {Array}
 */
export function getSkillsForLevel(level) {
  const available = SKILLS.filter(skill => skill.levelReq <= level);

  // Si hay más de 4, quedarse con las 4 de mayor levelReq (más poderosas)
  // pero siempre incluir 'attack_basic' y 'heal_basic'
  if (available.length <= 4) return available;

  const basics  = available.filter(s =>
    s.id === 'attack_basic' || s.id === 'heal_basic'
  );
  const rest    = available
    .filter(s => s.id !== 'attack_basic' && s.id !== 'heal_basic')
    .sort((a, b) => b.levelReq - a.levelReq)
    .slice(0, 4 - basics.length);

  return [...basics, ...rest];
}

/**
 * Retorna una habilidad por su id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getSkillById(id) {
  return SKILLS.find(skill => skill.id === id);
}