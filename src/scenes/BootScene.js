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
import { StorageManager } from '../managers/StorageManager.js';

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
    this.game.events.on('hidden', () => this._onGameHidden());
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
    const storage = new StorageManager();
    this.registry.set('storage', storage);

    this.registry.set('audioConfig', storage.loadAudioConfig());
    this.registry.set('settings', storage.loadSettings());
    this.registry.set('highscore', storage.getHighscore());
    this.registry.set('maxLevelReached', storage.getMaxLevel());
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