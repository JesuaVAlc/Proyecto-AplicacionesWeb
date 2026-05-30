/**
`* Configuración principal
 *
 * Separar la config aquí permite cambiar el renderer,
 * la física o el tamaño sin tocar la lógica de arranque.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS } from './utils/Constants.js';

// ── Importamos todas las escenas ──────────────────────────────────────────────
// (Estarán vacías al principio; se irán llenando módulo a módulo)
import { BootScene }     from './scenes/BootScene.js';
import { PreloadScene }  from './scenes/PreloadScene.js';
import { MenuScene }     from './scenes/MenuScene.js';
import { GameScene }     from './scenes/GameScene.js';
import { BattleScene }   from './scenes/BattleScene.js';
import { HUDScene }      from './scenes/HUDScene.js';
import { SaveScene }     from './scenes/SaveScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { VictoryScene }  from './scenes/VictoryScene.js';
import { TutorialScene } from './scenes/TutorialScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { InventoryScene } from './scenes/InventoryScene.js';

/** @type {Phaser.Types.Core.GameConfig} */
export const gameConfig = {
  // ── Renderer ────────────────────────────────────────────────────────────────
  // AUTO deja que Phaser elija WebGL si está disponible, sino Canvas 2D
  type: Phaser.AUTO,

  // ── Tamaño del canvas ────────────────────────────────────────────────────────
  width:  GAME_WIDTH,
  height: GAME_HEIGHT,

  // ── Contenedor del DOM ───────────────────────────────────────────────────────
  parent: 'game-container',

  // ── Escala responsive ────────────────────────────────────────────────────────
  // FIT mantiene la relación de aspecto y ajusta al tamaño de la ventana
  scale: {
    mode:            Phaser.Scale.FIT,
    autoCenter:      Phaser.Scale.CENTER_BOTH,
    width:           GAME_WIDTH,
    height:          GAME_HEIGHT,
    // Rango mínimo/máximo de zoom para pantallas muy pequeñas o muy grandes
    min: { width: 480, height: 270 },
    max: { width: 1920, height: 1080 },
  },

  // ── Física Arcade ────────────────────────────────────────────────────────────
  // Arcade Physics: ligera y perfecta para juegos top-down 2D
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS.GRAVITY },
      // debug: true,  ← descomenta para ver hitboxes durante desarrollo
      debug: false,
    },
  },

  // ── Render extra ─────────────────────────────────────────────────────────────
  render: {
    // Desactiva el antialiasing para mantener el look pixel art nítido
    antialias:       false,
    pixelArt:        true,
    roundPixels:     true,
  },

  // ── Fondo por defecto ─────────────────────────────────────────────────────────
  backgroundColor: '#000000',

  // ── Registro de escenas ───────────────────────────────────────────────────────
  // El orden importa: la PRIMERA escena de la lista es la que arranca
  scene: [
    BootScene,      // 1. Carga assets mínimos (logo, barra de progreso)
    PreloadScene,   // 2. Carga el resto de assets con progreso visual
    MenuScene,      // 3. Menú principal
    GameScene,      // 4. Exploración del mundo
    HUDScene,       // 5. HUD superpuesto (corre EN PARALELO a GameScene)
    BattleScene,    // 6. Combate por turnos
    SaveScene,      // 7. Zona de guardado
    GameOverScene,  // 8. Pantalla de derrota
    VictoryScene,   // 9. Pantalla de victoria
    TutorialScene,  // 10. Tutorial de controles
    SettingsScene,  // 11. Ajustes de accesibilidad y audio
    InventoryScene, // 12. Inventario
  ],
};