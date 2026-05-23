/**
 * BootScene.js
 * ─────────────────────────────────────────────────────
 * Primera escena que ejecuta Phaser al arrancar.
 * Responsabilidades:
 *   1. Configurar ajustes globales del juego (escala, input, etc.)
 *   2. Cargar ÚNICAMENTE los assets mínimos para mostrar
 *      la barra de progreso en PreloadScene (logo, fuente básica).
 *   3. Leer configuración guardada (audio, accesibilidad) antes
 *      de que cualquier otra escena arranque.
 *   4. Pasar a PreloadScene.
 *
 * NO carga assets del juego — eso es responsabilidad de PreloadScene.
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import { SCENES, STORAGE_KEYS, AUDIO } from '../utils/Constants.js';

export class BootScene extends Phaser.Scene {

  constructor() {
    super({ key: SCENES.BOOT });
  }

  // ─── init ────────────────────────────────────────────────────────────────────
  // Se ejecuta antes que preload() y create().
  // Ideal para leer localStorage antes de que el juego pinte nada.
  init() {
    this._loadSavedSettings();
  }

  // ─── preload ─────────────────────────────────────────────────────────────────
  // Solo cargamos lo mínimo: en modo placeholder no hay archivos externos,
  // así que este bloque queda vacío. Cuando agregues assets reales,
  // aquí cargarías el logo y la fuente de la barra de progreso.
  preload() {
    // Sin assets externos en modo placeholder.
    // Ejemplo futuro:
    //   this.load.image('logo', 'assets/images/ui/logo.png');
  }

  // ─── create ──────────────────────────────────────────────────────────────────
  create() {
    console.log('[BootScene] Configuración cargada, iniciando PreloadScene...');

    // Configurar que el juego NO pierda el foco al hacer clic fuera
    this.game.events.on('hidden',  () => this._onGameHidden());
    this.game.events.on('visible', () => this._onGameVisible());

    // Ir a PreloadScene de inmediato
    this.scene.start(SCENES.PRELOAD);
  }

  // ─── Métodos privados ─────────────────────────────────────────────────────────

  /**
   * Lee la configuración guardada en localStorage y la aplica
   * al registry global de Phaser para que todas las escenas accedan.
   * El registry actúa como un "store" global dentro de Phaser.
   */
  _loadSavedSettings() {
    // ── Configuración de audio ──────────────────────────────────────────────
    let audioConfig;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIO_CONFIG);
      audioConfig = saved ? JSON.parse(saved) : null;
    } catch {
      audioConfig = null;
    }

    // Si no hay config guardada, usar valores por defecto de Constants
    const finalAudio = {
      musicVolume: audioConfig?.musicVolume  ?? AUDIO.MUSIC_VOLUME,
      sfxVolume:   audioConfig?.sfxVolume    ?? AUDIO.SFX_VOLUME,
      muted:       audioConfig?.muted        ?? AUDIO.DEFAULT_MUTED,
    };

    // Guardar en el registry global para que AudioManager lo lea
    this.registry.set('audioConfig', finalAudio);

    // ── Configuración de accesibilidad ──────────────────────────────────────
    let settings;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      settings = saved ? JSON.parse(saved) : null;
    } catch {
      settings = null;
    }

    const finalSettings = {
      highContrast: settings?.highContrast ?? false,   // Modo alto contraste
      fontSize:     settings?.fontSize     ?? 'normal', // 'small' | 'normal' | 'large'
    };

    this.registry.set('settings', finalSettings);

    // ── Highscore ───────────────────────────────────────────────────────────
    let highscore = 0;
    try {
      highscore = parseInt(localStorage.getItem(STORAGE_KEYS.HIGHSCORE)) || 0;
    } catch {
      highscore = 0;
    }
    this.registry.set('highscore', highscore);

    // ── Nivel máximo alcanzado ──────────────────────────────────────────────
    let maxLevel = 1;
    try {
      maxLevel = parseInt(localStorage.getItem(STORAGE_KEYS.MAX_LEVEL)) || 1;
    } catch {
      maxLevel = 1;
    }
    this.registry.set('maxLevelReached', maxLevel);

    console.log('[BootScene] Settings cargados:', { finalAudio, finalSettings, highscore, maxLevel });
  }

  /**
   * Pausa la música cuando el usuario cambia de pestaña.
   * Evita que el audio siga sonando en segundo plano.
   */
  _onGameHidden() {
    this.game.sound.pauseAll();
  }

  /**
   * Reanuda la música cuando el usuario vuelve a la pestaña.
   */
  _onGameVisible() {
    this.game.sound.resumeAll();
  }
}