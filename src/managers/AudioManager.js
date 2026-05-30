/**
 * AudioManager.js
 * ─────────────────────────────────────────────────────
 * Gestiona todo el audio del juego: música de fondo y SFX.
 * En modo PLACEHOLDER no hay archivos de audio — el manager
 * existe pero no produce sonido. Cuando agregues archivos
 * reales solo hay que cargarlos en PreloadScene y el manager
 * los reproducirá automáticamente.
 *
 * Responsabilidades:
 *   - Reproducir / detener música por escena
 *   - Reproducir efectos de sonido (SFX)
 *   - Aplicar volumen y mute globales
 *   - Hacer crossfade entre pistas de música
 *   - Leer configuración del StorageManager
 *
 * Uso:
 *   const audio = new AudioManager(scene, storageManager);
 *   audio.playMusic('music_explore');
 *   audio.playSfx('sfx_attack');
 * ─────────────────────────────────────────────────────
 */

import { AUDIO } from '../utils/Constants.js';

// Claves de audio registradas en PreloadScene._createPlaceholderAudio()
// Cuando existan archivos reales estas claves mapearán a sonidos reales.
const MUSIC_KEYS = ['music_explore', 'music_battle', 'music_boss'];

const SFX_KEYS = [
  'sfx_attack',
  'sfx_heal',
  'sfx_levelup',
  'sfx_save',
  'sfx_menu_select',
  'sfx_enemy_hit',
];

export class AudioManager {

  /**
   * @param {Phaser.Scene}   scene   — escena actual (para acceder a this.sound)
   * @param {StorageManager} storage — para cargar/guardar config de audio
   */
  constructor(scene, storage) {
    this._scene   = scene;
    this._storage = storage;
    this._sound   = scene.sound;

    // Música actualmente en reproducción
    this._currentMusic    = null;
    this._currentMusicKey = null;

    // Cargar configuración guardada
    const config         = storage ? storage.loadAudioConfig() : {};
    this._musicVolume    = config.musicVolume ?? AUDIO.MUSIC_VOLUME;
    this._sfxVolume      = config.sfxVolume   ?? AUDIO.SFX_VOLUME;
    this._muted          = config.muted       ?? AUDIO.DEFAULT_MUTED;

    // Verificar qué claves de audio están realmente cargadas
    this._availableKeys = this._detectAvailableKeys();

    // Aplicar estado de mute inicial
    this._sound.mute = this._muted;

    console.log('[AudioManager] Inicializado.', {
      musicVolume:    this._musicVolume,
      sfxVolume:      this._sfxVolume,
      muted:          this._muted,
      availableAudio: this._availableKeys.length > 0,
    });
  }

  // ─── Detección de assets ──────────────────────────────────────────────────────

  /**
   * Detecta qué claves de audio están realmente cargadas en el cache de Phaser.
   * En modo placeholder ninguna estará disponible.
   * @returns {string[]}
   */
  _detectAvailableKeys() {
    const all  = [...MUSIC_KEYS, ...SFX_KEYS];
    return all.filter(key => this._scene.cache.audio.exists(key));
  }

  /**
   * Verifica si una clave de audio está disponible.
   * @param {string} key
   * @returns {boolean}
   */
  _hasAudio(key) {
    return this._availableKeys.includes(key);
  }

  // ─── Música ───────────────────────────────────────────────────────────────────

  /**
   * Reproduce una pista de música en loop.
   * Si ya se está reproduciendo la misma pista, no hace nada.
   * Si hay otra pista activa, hace crossfade.
   *
   * @param {string}  key      — clave del audio (ej: 'music_explore')
   * @param {boolean} fadeIn   — si debe hacer fade in (default: true)
   */
  playMusic(key, fadeIn = true) {
    // Evitar reiniciar la misma música
    if (this._currentMusicKey === key && this._currentMusic?.isPlaying) {
      return;
    }

    // Sin archivo de audio disponible (modo placeholder)
    if (!this._hasAudio(key)) {
      console.log(`[AudioManager] Música "${key}" no disponible (placeholder).`);
      this._currentMusicKey = key; // Recordar la key para cuando se agreguen assets
      return;
    }

    // Hacer crossfade si hay música activa
    if (this._currentMusic && this._currentMusic.isPlaying) {
      this._fadeOutMusic(() => this._startMusic(key, fadeIn));
    } else {
      this._startMusic(key, fadeIn);
    }
  }

  /**
   * Inicia la reproducción de una pista de música.
   * @param {string}  key
   * @param {boolean} fadeIn
   */
  _startMusic(key, fadeIn) {
    this._currentMusic = this._sound.add(key, {
      loop:   true,
      volume: fadeIn ? 0 : this._musicVolume,
    });

    this._currentMusic.play();
    this._currentMusicKey = key;

    // Fade in opcional
    if (fadeIn) {
      this._scene.tweens.add({
        targets:  this._currentMusic,
        volume:   this._musicVolume,
        duration: 1000,
        ease:     'Linear',
      });
    }

    console.log(`[AudioManager] Reproduciendo música: "${key}"`);
  }

  /**
   * Detiene la música actual con un fade out opcional.
   * @param {Function} onComplete — callback al terminar el fade
   * @param {number}   duration   — duración del fade en ms
   */
  stopMusic(onComplete = null, duration = 800) {
    if (!this._currentMusic || !this._currentMusic.isPlaying) {
      if (onComplete) onComplete();
      return;
    }

    this._fadeOutMusic(() => {
      this._currentMusicKey = null;
      if (onComplete) onComplete();
    }, duration);
  }

  /**
   * Fade out de la música actual y la destruye al terminar.
   * @param {Function} onComplete
   * @param {number}   duration
   */
  _fadeOutMusic(onComplete = null, duration = 800) {
    if (!this._currentMusic) {
      if (onComplete) onComplete();
      return;
    }

    const music = this._currentMusic;
    this._currentMusic = null;

    this._scene.tweens.add({
      targets:  music,
      volume:   0,
      duration,
      ease:     'Linear',
      onComplete: () => {
        music.stop();
        music.destroy();
        if (onComplete) onComplete();
      },
    });
  }

  /**
   * Pausa la música actual (sin destruirla).
   */
  pauseMusic() {
    if (this._currentMusic?.isPlaying) {
      this._currentMusic.pause();
    }
  }

  /**
   * Reanuda la música pausada.
   */
  resumeMusic() {
    if (this._currentMusic?.isPaused) {
      this._currentMusic.resume();
    }
  }

  // ─── Efectos de sonido ────────────────────────────────────────────────────────

  /**
   * Reproduce un efecto de sonido (SFX) sin loop.
   * Los SFX no se detienen entre escenas — son disparos únicos.
   *
   * @param {string} key      — clave del SFX (ej: 'sfx_attack')
   * @param {number} volume   — volumen relativo (0-1, por defecto usa sfxVolume)
   */
  playSfx(key, volume = null) {
    if (this._muted) return;

    if (!this._hasAudio(key)) {
      // En placeholder solo loguear, sin error
      return;
    }

    const vol = volume !== null
      ? volume * this._sfxVolume
      : this._sfxVolume;

    this._sound.play(key, { volume: vol });
  }

  // ─── Atajos de SFX ───────────────────────────────────────────────────────────
  // Métodos de conveniencia para los SFX más usados.
  // Reemplaza el string con la clave real cuando tengas el archivo.

  /** Efecto de ataque físico */
  playAttack()     { this.playSfx('sfx_attack'); }

  /** Efecto de curación */
  playHeal()       { this.playSfx('sfx_heal'); }

  /** Fanfare de subida de nivel */
  playLevelUp()    { this.playSfx('sfx_levelup'); }

  /** Efecto de zona de guardado */
  playSave()       { this.playSfx('sfx_save'); }

  /** Efecto de selección en menú */
  playMenuSelect() { this.playSfx('sfx_menu_select'); }

  /** Efecto de golpe al enemigo */
  playEnemyHit()   { this.playSfx('sfx_enemy_hit'); }

  // ─── Atajos de música ─────────────────────────────────────────────────────────

  /** Música de exploración del mapa */
  playExploration() { this.playMusic('music_explore'); }

  /** Música de batalla normal */
  playBattle()      { this.playMusic('music_battle'); }

  /** Música de batalla contra el jefe */
  playBossBattle()  { this.playMusic('music_boss'); }

  // ─── Volumen y mute ───────────────────────────────────────────────────────────

  /**
   * Cambia el volumen de la música.
   * @param {number} volume — 0.0 a 1.0
   */
  setMusicVolume(volume) {
    this._musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    if (this._currentMusic) {
      this._currentMusic.setVolume(this._musicVolume);
    }
    this._saveConfig();
  }

  /**
   * Cambia el volumen de los SFX.
   * @param {number} volume — 0.0 a 1.0
   */
  setSfxVolume(volume) {
    this._sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
    this._saveConfig();
  }

  /**
   * Activa o desactiva el mute global.
   * @param {boolean} muted
   */
  setMuted(muted) {
    this._muted          = muted;
    this._sound.mute     = muted;
    this._saveConfig();
    console.log(`[AudioManager] Mute: ${muted}`);
  }

  /**
   * Alterna el estado de mute.
   * @returns {boolean} nuevo estado de mute
   */
  toggleMute() {
    this.setMuted(!this._muted);
    return this._muted;
  }

  /** @returns {boolean} */
  isMuted() { return this._muted; }

  /** @returns {number} */
  getMusicVolume() { return this._musicVolume; }

  /** @returns {number} */
  getSfxVolume() { return this._sfxVolume; }

  // ─── Persistencia ─────────────────────────────────────────────────────────────

  /**
   * Guarda la configuración actual de audio via StorageManager.
   */
  _saveConfig() {
    if (!this._storage) return;
    this._storage.saveAudioConfig({
      musicVolume: this._musicVolume,
      sfxVolume:   this._sfxVolume,
      muted:       this._muted,
    });
  }

  // ─── Limpieza ─────────────────────────────────────────────────────────────────

  /**
   * Detiene y destruye toda la música activa.
   * Llamar al cambiar de escena si no se quiere que continúe.
   */
  destroy() {
    this.stopMusic();
    console.log('[AudioManager] Destruido.');
  }
}