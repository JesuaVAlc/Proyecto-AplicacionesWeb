/**
 * BattleManager.js
 * ─────────────────────────────────────────────────────
 * Encapsula TODA la lógica matemática del combate.
 * No tiene acceso a Phaser directamente — solo opera
 * con datos puros (stats, skills, items).
 *
 * Responsabilidades:
 *   - Calcular daño de ataques (con defensa, buffs, crits)
 *   - Calcular curación
 *   - Aplicar buffs/debuffs
 *   - Seleccionar skill del enemigo por IA (pesos)
 *   - Determinar orden de turno (por speed)
 *   - Verificar condiciones de fin de batalla
 * ─────────────────────────────────────────────────────
 */

import { SKILL_TYPES } from '../utils/Constants.js';
import { selectEnemySkill } from '../data/enemies.js';

export class BattleManager {

  /**
   * @param {object} player — instancia de Player
   * @param {object} enemy  — datos del enemigo (copia de enemies.js)
   */
  constructor(player, enemy) {
    this.player = player;
    this.enemy  = enemy;

    // Efectos temporales activos en el enemigo
    // Formato: { stat, modifier, turnsLeft, isPositive }
    this._enemyEffects = [];

    // Contador de turnos para lógica de IA
    this._turnCount = 0;

    console.log('[BattleManager] Batalla iniciada:', {
      player: player.level,
      enemy:  enemy.name,
    });
  }

  // ─── Orden de turno ───────────────────────────────────────────────────────────

  /**
   * Determina quién actúa primero basándose en el stat speed.
   * En caso de empate, el jugador tiene ventaja.
   * @returns {'player' | 'enemy'}
   */
  getFirstTurn() {
    const playerSpeed = this.player.getEffectiveStat('speed');
    const enemySpeed  = this._getEnemyEffectiveStat('speed');
    return playerSpeed >= enemySpeed ? 'player' : 'enemy';
  }

  // ─── Acciones del jugador ─────────────────────────────────────────────────────

  /**
   * Ejecuta una skill del jugador contra el enemigo (o sobre sí mismo).
   * Retorna un objeto de resultado con todos los detalles del turno.
   *
   * @param {object} skill — definición de la habilidad (de skills.js)
   * @returns {object} resultado del turno
   */
  playerAction(skill) {
    this._turnCount++;

    // Verificar MP suficiente
    if (skill.mpCost > 0 && this.player.mp < skill.mpCost) {
      return {
        success:  false,
        reason:   'no_mp',
        message:  `¡Sin MP para usar ${skill.name}!`,
      };
    }

    // Gastar MP
    if (skill.mpCost > 0) {
      this.player.spendMp(skill.mpCost);
    }

    let result = { success: true, skillName: skill.name, skillType: skill.type };

    switch (skill.type) {
      case SKILL_TYPES.ATTACK:
        result = { ...result, ...this._calcPlayerAttack(skill) };
        break;

      case SKILL_TYPES.HEAL:
        result = { ...result, ...this._calcPlayerHeal(skill) };
        break;

      case SKILL_TYPES.BUFF:
        result = { ...result, ...this._applyPlayerBuff(skill) };
        break;

      case SKILL_TYPES.DEBUFF:
        result = { ...result, ...this._applyEnemyDebuff(skill) };
        break;
    }

    // Reducir efectos del jugador al final de su turno
    this.player.tickEffects();

    return result;
  }

  /**
   * Usa un objeto del inventario del jugador en batalla.
   * @param {object} item    — definición del item (de items.js)
   * @returns {object} resultado
   */
  playerUseItem(item) {
    if (!this.player.hasItem(item.id)) {
      return { success: false, reason: 'no_item', message: '¡No tienes ese objeto!' };
    }

    this.player.consumeItem(item.id);
    let result = { success: true, itemName: item.name };

    switch (item.type) {
      case 'heal': {
        const healAmt = Math.floor(this.player.maxHp * item.power);
        const healed  = this.player.heal(healAmt);
        result.message = `Usaste ${item.name}. HP +${healed}`;
        result.healed  = healed;
        break;
      }
      case 'buff': {
        this.player.applyEffect(item.stat, item.power, item.duration, true);
        result.message = `Usaste ${item.name}. ${item.stat} aumentó.`;
        break;
      }
      case 'revive': {
        // La pluma de fénix se usa como item de precaución;
        // si el jugador ya está en pie no hace nada
        result.message = `${item.name} está lista para usarse si caes.`;
        break;
      }
    }

    // Tick de efectos igual que en acción normal
    this.player.tickEffects();
    return result;
  }

  // ─── Acción del enemigo (IA) ──────────────────────────────────────────────────

  /**
   * Selecciona y ejecuta la acción del enemigo usando pesos de probabilidad.
   * La IA se vuelve más agresiva (prioriza ataques fuertes) cuando
   * el enemigo tiene menos del 30% de HP.
   *
   * @returns {object} resultado del turno del enemigo
   */
  enemyAction() {
    // Si el enemigo está bajo de HP, sesgar hacia ataques fuertes
    const hpPct = this.enemy.stats.hp / this.enemy.stats.maxHp;
    let skill;

    if (hpPct < 0.30) {
      // Elegir el ataque más poderoso disponible
      const attacks = this.enemy.skills.filter(s => s.type === SKILL_TYPES.ATTACK);
      skill = attacks.length > 0
        ? attacks.reduce((best, s) => s.power > best.power ? s : best)
        : selectEnemySkill(this.enemy);
    } else {
      skill = selectEnemySkill(this.enemy);
    }

    let result = { success: true, skillName: skill.name, skillType: skill.type };

    switch (skill.type) {
      case SKILL_TYPES.ATTACK:
        result = { ...result, ...this._calcEnemyAttack(skill) };
        break;

      case SKILL_TYPES.HEAL:
        result = { ...result, ...this._calcEnemyHeal(skill) };
        break;

      case SKILL_TYPES.BUFF:
        result = { ...result, ...this._applyEnemyBuff(skill) };
        break;

      case SKILL_TYPES.DEBUFF:
        result = { ...result, ...this._applyPlayerDebuff(skill) };
        break;
    }

    // Reducir efectos del enemigo al final de su turno
    this._tickEnemyEffects();

    return result;
  }

  // ─── Cálculos de daño ────────────────────────────────────────────────────────

  /**
   * Calcula el daño del jugador al enemigo.
   *
   * Fórmula base:
   *   ataque_efectivo = ataque_jugador * skill.power
   *   defensa_efectiva = defensa_enemigo * 0.5 * (1 - ignoreDefensePercent)
   *   daño = ataque_efectivo - defensa_efectiva
   *   daño mínimo = 1
   *
   * Crítico: 10% de probabilidad → daño × 1.5
   *
   * @param {object} skill
   * @returns {object}
   */
  _calcPlayerAttack(skill) {
    const atkStat    = this.player.getEffectiveStat('attack');
    const rawAtk     = Math.floor(atkStat * skill.power);

    // Reducción por defensa del enemigo
    const ignoreAmt  = skill.ignoreDefensePercent ?? 0;
    const defStat    = this._getEnemyEffectiveStat('defense');
    const defReduct  = Math.floor(defStat * 0.5 * (1 - ignoreAmt));

    let damage       = Math.max(1, rawAtk - defReduct);

    // ── Crítico ────────────────────────────────────────────────────────────
    const isCrit = Math.random() < 0.10;
    if (isCrit) damage = Math.floor(damage * 1.5);

    // Aplicar daño al enemigo
    this.enemy.stats.hp = Math.max(0, this.enemy.stats.hp - damage);

    // Drenar vida si el skill lo especifica (ej: Drenar Vida del enemigo)
    let selfHeal = 0;
    if (skill.healSelf) {
      selfHeal = Math.floor(damage * skill.healSelf);
      this.player.heal(selfHeal);
    }

    const message = isCrit
      ? `¡CRÍTICO! ${skill.name} causó ${damage} de daño.`
      : `${skill.name} causó ${damage} de daño.`;

    return { damage, isCrit, selfHeal, message, target: 'enemy' };
  }

  /**
   * Calcula el daño del enemigo al jugador.
   *
   * Misma fórmula que el jugador pero a la inversa.
   * @param {object} skill
   * @returns {object}
   */
  _calcEnemyAttack(skill) {
    const atkStat   = this._getEnemyEffectiveStat('attack');
    const rawAtk    = Math.floor(atkStat * skill.power);

    const ignoreAmt = skill.ignoreDefensePercent ?? 0;
    const defStat   = this.player.getEffectiveStat('defense');
    const defReduct = Math.floor(defStat * 0.5 * (1 - ignoreAmt));

    let damage      = Math.max(1, rawAtk - defReduct);

    // Crítico enemigo: 7% de probabilidad
    const isCrit    = Math.random() < 0.07;
    if (isCrit) damage = Math.floor(damage * 1.5);

    // Drenar vida para el enemigo
    if (skill.healSelf) {
      const healed = Math.floor(damage * skill.healSelf);
      this.enemy.stats.hp = Math.min(
        this.enemy.stats.maxHp,
        this.enemy.stats.hp + healed
      );
    }

    // Aplicar daño al jugador
    const realDamage = this.player.takeDamage(damage);

    const message = isCrit
      ? `¡CRÍTICO! ${skill.name} causó ${realDamage} de daño.`
      : `${skill.name} causó ${realDamage} de daño.`;

    return { damage: realDamage, isCrit, message, target: 'player' };
  }

  // ─── Curaciones ───────────────────────────────────────────────────────────────

  /**
   * Calcula y aplica curación del jugador sobre sí mismo.
   * @param {object} skill
   * @returns {object}
   */
  _calcPlayerHeal(skill) {
    const healAmt = Math.floor(this.player.maxHp * skill.power);
    const healed  = this.player.heal(healAmt);
    return {
      healed,
      message: `${skill.name} restauró ${healed} HP.`,
      target:  'self',
    };
  }

  /**
   * Calcula y aplica curación del enemigo sobre sí mismo.
   * @param {object} skill
   * @returns {object}
   */
  _calcEnemyHeal(skill) {
    const healAmt = Math.floor(this.enemy.stats.maxHp * skill.power);
    const before  = this.enemy.stats.hp;
    this.enemy.stats.hp = Math.min(
      this.enemy.stats.maxHp,
      this.enemy.stats.hp + healAmt
    );
    const healed = this.enemy.stats.hp - before;
    return {
      healed,
      message: `${this.enemy.name} usó ${skill.name} y recuperó ${healed} HP.`,
      target:  'enemy_self',
    };
  }

  // ─── Buffs y debuffs ──────────────────────────────────────────────────────────

  /**
   * Aplica un buff al jugador (desde skill del jugador).
   * @param {object} skill
   * @returns {object}
   */
  _applyPlayerBuff(skill) {
    this.player.applyEffect(skill.stat, skill.power, skill.duration, true);
    return {
      message: `${skill.name} aumentó tu ${skill.stat} un ${skill.power * 100}% por ${skill.duration} turnos.`,
      target:  'self',
    };
  }

  /**
   * Aplica un debuff al enemigo (desde skill del jugador).
   * @param {object} skill
   * @returns {object}
   */
  _applyEnemyDebuff(skill) {
    this._applyEnemyEffect(skill.stat, skill.power, skill.duration, false);
    return {
      message: `${skill.name} redujo el ${skill.stat} del enemigo un ${skill.power * 100}% por ${skill.duration} turnos.`,
      target:  'enemy',
    };
  }

  /**
   * Aplica un buff al enemigo (desde skill del enemigo).
   * @param {object} skill
   * @returns {object}
   */
  _applyEnemyBuff(skill) {
    this._applyEnemyEffect(skill.stat, skill.power, skill.duration, true);
    return {
      message: `${this.enemy.name} usó ${skill.name} y aumentó su ${skill.stat}.`,
      target:  'enemy_self',
    };
  }

  /**
   * Aplica un debuff al jugador (desde skill del enemigo).
   * @param {object} skill
   * @returns {object}
   */
  _applyPlayerDebuff(skill) {
    this.player.applyEffect(skill.stat, skill.power, skill.duration, false);
    return {
      message: `${this.enemy.name} usó ${skill.name}. Tu ${skill.stat} fue reducido.`,
      target:  'player',
    };
  }

  // ─── Efectos del enemigo ──────────────────────────────────────────────────────

  /**
   * Agrega un efecto temporal al enemigo.
   * @param {string}  stat
   * @param {number}  modifier
   * @param {number}  turns
   * @param {boolean} isPositive
   */
  _applyEnemyEffect(stat, modifier, turns, isPositive) {
    const existing = this._enemyEffects.find(
      e => e.stat === stat && e.isPositive === isPositive
    );
    if (existing) {
      existing.turnsLeft = turns;
      return;
    }
    this._enemyEffects.push({ stat, modifier, turnsLeft: turns, isPositive });
  }

  /**
   * Retorna el valor efectivo de un stat del enemigo con efectos activos.
   * @param {string} statName
   * @returns {number}
   */
  _getEnemyEffectiveStat(statName) {
    const base     = this.enemy.stats[statName] ?? 0;
    let   modifier = 1.0;

    this._enemyEffects.forEach(effect => {
      if (effect.stat === statName) {
        modifier += effect.isPositive ? effect.modifier : -effect.modifier;
      }
    });

    return Math.max(Math.floor(base * modifier), Math.floor(base * 0.1));
  }

  /**
   * Reduce en 1 la duración de todos los efectos del enemigo.
   */
  _tickEnemyEffects() {
    this._enemyEffects = this._enemyEffects.filter(e => {
      e.turnsLeft--;
      return e.turnsLeft > 0;
    });
  }

  // ─── Condiciones de fin ───────────────────────────────────────────────────────

  /**
   * Verifica si la batalla ha terminado.
   * @returns {'player_win' | 'player_lose' | null}
   */
  checkBattleEnd() {
    if (this.enemy.stats.hp <= 0)  return 'player_win';
    if (this.player.isDead())      return 'player_lose';
    return null;
  }

  /**
   * Calcula las recompensas al ganar la batalla.
   * La EXP ganada se escala según el HP restante del jugador.
   *
   * Bonus de EXP: +10% por cada 25% de HP restante sobre el 50%
   * (recompensar haber terminado la batalla en buen estado)
   *
   * @returns {{ exp: number, score: number, leveledUp: boolean }}
   */
  calcRewards() {
    const baseExp   = this.enemy.stats.expReward;
    const baseScore = this.enemy.stats.scoreReward;

    // Bonus según HP restante
    const hpPct    = this.player.hp / this.player.maxHp;
    const expBonus = hpPct > 0.75 ? 1.20
      : hpPct > 0.50 ? 1.10
      : hpPct > 0.25 ? 1.00
      : 0.85;

    const finalExp   = Math.floor(baseExp * expBonus);
    const leveledUp  = this.player.gainExp(finalExp);
    this.player.addScore(baseScore);

    console.log(`[BattleManager] Recompensas: EXP +${finalExp} (×${expBonus}), Score +${baseScore}`);
    return { exp: finalExp, score: baseScore, leveledUp };
  }
}