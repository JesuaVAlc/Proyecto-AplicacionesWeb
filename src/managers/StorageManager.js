/**
 * StorageManager.js
 * ─────────────────────────────────────────────────────
 * Wrapper centralizado de localStorage.
 * Todas las operaciones de persistencia del juego pasan
 * por aquí para tener manejo de errores en un solo lugar.
 *
 * Responsabilidades:
 *   - Guardar / cargar partida
 *   - Guardar / cargar highscore y nivel máximo
 *   - Guardar / cargar configuración de audio y accesibilidad
 *   - Detectar si existe una partida guardada
 *   - Borrar datos (nueva partida / reset)
 * ─────────────────────────────────────────────────────
 */

import { STORAGE_KEYS, AUDIO } from '../utils/Constants.js';

export class StorageManager {

  /**
   * StorageManager no extiende nada — es una clase utilitaria pura.
   * Se instancia una vez y se pasa entre escenas via registry.
   *
   * Uso:
   *   const storage = new StorageManager();
   *   registry.set('storage', storage);
   */
  constructor() {
    // Verificar si localStorage está disponible
    this._available = this._checkAvailability();

    if (!this._available) {
      console.warn('[StorageManager] localStorage no disponible. Los datos no se persistirán.');
    } else {
      console.log('[StorageManager] Inicializado correctamente.');
    }
  }

  // ─── Disponibilidad ───────────────────────────────────────────────────────────

  /**
   * Verifica si localStorage está disponible en el navegador.
   * Puede fallar en modo privado o con cookies bloqueadas.
   * @returns {boolean}
   */
  _checkAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Operaciones base ─────────────────────────────────────────────────────────

  /**
   * Guarda un valor en localStorage como JSON.
   * @param {string} key
   * @param {any}    value
   * @returns {boolean} éxito
   */
  _set(key, value) {
    if (!this._available) return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[StorageManager] Error al guardar "${key}":`, err);
      return false;
    }
  }

  /**
   * Lee y parsea un valor de localStorage.
   * @param {string} key
   * @param {any}    fallback — valor por defecto si no existe o falla
   * @returns {any}
   */
  _get(key, fallback = null) {
    if (!this._available) return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[StorageManager] Error al leer "${key}":`, err);
      return fallback;
    }
  }

  /**
   * Elimina una clave de localStorage.
   * @param {string} key
   * @returns {boolean} éxito
   */
  _remove(key) {
    if (!this._available) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error(`[StorageManager] Error al eliminar "${key}":`, err);
      return false;
    }
  }

  // ─── Partida guardada ─────────────────────────────────────────────────────────

  /**
   * Guarda el estado completo del jugador.
   * @param {object} playerData — resultado de player.serialize()
   * @returns {boolean} éxito
   */
  saveGame(playerData) {
    const ok = this._set(STORAGE_KEYS.SAVE_SLOT, playerData);
    if (ok) {
      console.log('[StorageManager] Partida guardada:', playerData);
      // Actualizar highscore y nivel máximo automáticamente
      this.updateHighscore(playerData.score ?? 0);
      this.updateMaxLevel(playerData.level ?? 1);
    }
    return ok;
  }

  /**
   * Carga el estado guardado del jugador.
   * @returns {object|null} datos del jugador o null si no hay guardado
   */
  loadGame() {
    const data = this._get(STORAGE_KEYS.SAVE_SLOT, null);
    if (data) {
      console.log('[StorageManager] Partida cargada:', data);
    }
    return data;
  }

  /**
   * Verifica si existe una partida guardada.
   * @returns {boolean}
   */
  hasSave() {
    if (!this._available) return false;
    try {
      return localStorage.getItem(STORAGE_KEYS.SAVE_SLOT) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Elimina la partida guardada (nueva partida).
   * @returns {boolean}
   */
  deleteSave() {
    console.log('[StorageManager] Partida eliminada.');
    return this._remove(STORAGE_KEYS.SAVE_SLOT);
  }

  // ─── Highscore ────────────────────────────────────────────────────────────────

  /**
   * Actualiza el highscore si el nuevo valor es mayor.
   * @param {number} score
   * @returns {boolean} si se actualizó el récord
   */
  updateHighscore(score) {
    const current = this.getHighscore();
    if (score > current) {
      this._set(STORAGE_KEYS.HIGHSCORE, score);
      console.log(`[StorageManager] Nuevo highscore: ${score}`);
      return true;
    }
    return false;
  }

  /**
   * Retorna el highscore guardado.
   * @returns {number}
   */
  getHighscore() {
    return this._get(STORAGE_KEYS.HIGHSCORE, 0);
  }

  // ─── Nivel máximo ─────────────────────────────────────────────────────────────

  /**
   * Actualiza el nivel máximo alcanzado si el nuevo es mayor.
   * @param {number} level
   * @returns {boolean} si se actualizó
   */
  updateMaxLevel(level) {
    const current = this.getMaxLevel();
    if (level > current) {
      this._set(STORAGE_KEYS.MAX_LEVEL, level);
      console.log(`[StorageManager] Nuevo nivel máximo: ${level}`);
      return true;
    }
    return false;
  }

  /**
   * Retorna el nivel máximo alcanzado.
   * @returns {number}
   */
  getMaxLevel() {
    return this._get(STORAGE_KEYS.MAX_LEVEL, 1);
  }

  // ─── Configuración de audio ───────────────────────────────────────────────────

  /**
   * Guarda la configuración de audio.
   * @param {object} config — { musicVolume, sfxVolume, muted }
   * @returns {boolean}
   */
  saveAudioConfig(config) {
    return this._set(STORAGE_KEYS.AUDIO_CONFIG, config);
  }

  /**
   * Carga la configuración de audio con valores por defecto.
   * @returns {{ musicVolume: number, sfxVolume: number, muted: boolean }}
   */
  loadAudioConfig() {
    return this._get(STORAGE_KEYS.AUDIO_CONFIG, {
      musicVolume: AUDIO.MUSIC_VOLUME,
      sfxVolume:   AUDIO.SFX_VOLUME,
      muted:       AUDIO.DEFAULT_MUTED,
    });
  }

  // ─── Configuración de accesibilidad ──────────────────────────────────────────

  /**
   * Guarda la configuración de accesibilidad.
   * @param {object} config — { highContrast, fontSize }
   * @returns {boolean}
   */
  saveSettings(config) {
    return this._set(STORAGE_KEYS.SETTINGS, config);
  }

  /**
   * Carga la configuración de accesibilidad con valores por defecto.
   * @returns {{ highContrast: boolean, fontSize: string }}
   */
  loadSettings() {
    return this._get(STORAGE_KEYS.SETTINGS, {
      highContrast: false,
      fontSize:     'normal',
    });
  }

  // ─── Reset completo ───────────────────────────────────────────────────────────

  /**
   * Borra TODOS los datos del juego del localStorage.
   * Útil para debugging o botón "Reiniciar todo" en Settings.
   */
  resetAll() {
    Object.values(STORAGE_KEYS).forEach(key => this._remove(key));
    console.log('[StorageManager] Todos los datos eliminados.');
  }
}