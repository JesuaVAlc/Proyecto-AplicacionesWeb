/**
 * Constants.js
 * Archivo central de constantes globales del juego.
 * Todas las "magic numbers" o valores fijos viven aquí
 * para facilitar ajustes sin buscar por todo el código.
 */

// ─── Dimensiones del canvas ───────────────────────────────────────────────────
export const GAME_WIDTH  = 960;
export const GAME_HEIGHT = 540;

// ─── Escenas (nombres únicos que Phaser usa para identificarlas) ──────────────
export const SCENES = {
  BOOT:       'BootScene',
  PRELOAD:    'PreloadScene',
  MENU:       'MenuScene',
  GAME:       'GameScene',
  BATTLE:     'BattleScene',
  HUD:        'HUDScene',
  SAVE:       'SaveScene',
  GAME_OVER:  'GameOverScene',
  VICTORY:    'VictoryScene',
  TUTORIAL:   'TutorialScene',
  SETTINGS:   'SettingsScene',
};

// ─── Teclas de movimiento ─────────────────────────────────────────────────────
export const KEYS = {
  UP:     'W',
  DOWN:   'S',
  LEFT:   'A',
  RIGHT:  'D',
  ACTION: 'SPACE',   // Interactuar / confirmar
  MENU:   'ESC',     // Abrir menú / cancelar
  MUTE:   'M',       // Silenciar audio
};

// ─── Dirección del jugador (para animaciones) ─────────────────────────────────
export const DIRECTIONS = {
  UP:    'up',
  DOWN:  'down',
  LEFT:  'left',
  RIGHT: 'right',
};

// ─── Estados posibles del jugador ─────────────────────────────────────────────
export const PLAYER_STATES = {
  IDLE:      'idle',
  MOVING:    'moving',
  IN_BATTLE: 'in_battle',
  DEAD:      'dead',
};

// ─── Estados posibles del combate ─────────────────────────────────────────────
export const BATTLE_STATES = {
  PLAYER_TURN:  'player_turn',
  ENEMY_TURN:   'enemy_turn',
  WIN:          'win',
  LOSE:         'lose',
  ANIMATING:    'animating',  // mientras se reproduce una animación de ataque
};

// ─── Tipos de habilidad ───────────────────────────────────────────────────────
export const SKILL_TYPES = {
  ATTACK:  'attack',   // Daño directo
  HEAL:    'heal',     // Restaurar HP
  BUFF:    'buff',     // Aumentar stat
  DEBUFF:  'debuff',   // Disminuir stat del enemigo
};

// ─── Velocidad del jugador en el mapa ────────────────────────────────────────
export const PLAYER_SPEED = 160;

// ─── Física ───────────────────────────────────────────────────────────────────
export const PHYSICS = {
  GRAVITY:        0,    // Juego top-down, sin gravedad
  BOUNCE:         0.4,  // Rebote para proyectiles
  WORLD_BOUNDS:   true, // El jugador no puede salir del mapa
};

// ─── Experiencia y niveles ────────────────────────────────────────────────────
export const MAX_LEVEL = 15;

// ─── Audio ────────────────────────────────────────────────────────────────────
export const AUDIO = {
  MUSIC_VOLUME:  0.5,
  SFX_VOLUME:    0.8,
  DEFAULT_MUTED: false,
};

// ─── Persistencia (claves de localStorage) ────────────────────────────────────
export const STORAGE_KEYS = {
  SAVE_SLOT:     'ff2d_save',
  HIGHSCORE:     'ff2d_highscore',
  MAX_LEVEL:     'ff2d_max_level',
  AUDIO_CONFIG:  'ff2d_audio',
  SETTINGS:      'ff2d_settings',
};

// ─── HUD ──────────────────────────────────────────────────────────────────────
export const HUD = {
  MINIMAP_SIZE:   120,   // px del minimapa cuadrado
  BAR_WIDTH:      200,
  BAR_HEIGHT:     18,
  PADDING:        12,
};