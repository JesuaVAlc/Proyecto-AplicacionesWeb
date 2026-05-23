/**
 * main.js
 * ─────────────────────────────────────────────────────
 * Punto de entrada del juego.
 * Responsabilidades:
 *   1. Importar Phaser y la configuración del juego.
 *   2. Crear la instancia única de Phaser.Game.
 *   3. Exponer la instancia globalmente (solo para debug).
 *   4. Manejar errores críticos de arranque.
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import { gameConfig } from './config.js';

// ─── Crear la instancia del juego ─────────────────────────────────────────────
// Phaser.Game recibe la config y se encarga de todo el ciclo de vida
let game;

try {
  game = new Phaser.Game(gameConfig);

  /**
   * Exponer en window SOLO en desarrollo para poder inspeccionar
   * escenas y objetos desde la consola del navegador:
   *   window.__GAME__.scene.getScene('GameScene')
   */
  if (import.meta.env.DEV) {
    window.__GAME__ = game;
    console.log(
      '%c🗡 Final Fantasy 2D — Modo desarrollo activo',
      'color: #FFD700; font-weight: bold; font-size: 14px;'
    );
    console.log('Accede al juego con: window.__GAME__');
  }

} catch (error) {
  // Si Phaser no puede arrancar (WebGL no soportado, canvas bloqueado, etc.)
  console.error('Error crítico al iniciar Phaser:', error);

  // Mostrar mensaje amigable al usuario en el DOM
  const container = document.getElementById('game-container');
  if (container) {
    container.innerHTML = `
      <div style="
        color: #FFD700;
        font-family: monospace;
        text-align: center;
        padding: 40px;
        background: #1a0a00;
        border: 2px solid #8B0000;
      ">
        <h2>⚠ Error al cargar el juego</h2>
        <p>Tu navegador no soporta WebGL o Canvas.</p>
        <p>Intenta con Chrome, Firefox o Edge actualizados.</p>
      </div>
    `;
  }
}

// Exportamos la instancia por si algún manager externo la necesita
export { game };