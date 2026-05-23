/**
 * PreloadScene.js
 * ─────────────────────────────────────────────────────
 * Carga TODOS los assets del juego mostrando una pantalla
 * de progreso estilo Final Fantasy (barra dorada sobre fondo negro).
 *
 * En modo PLACEHOLDER todos los assets se generan con
 * Phaser.GameObjects gráficos — no hay archivos externos.
 * Cuando tengas assets reales, reemplaza cada bloque
 * _createPlaceholderXxx() por el this.load correspondiente.
 *
 * Responsabilidades:
 *   1. Mostrar barra de progreso animada.
 *   2. Registrar todos los assets (imágenes, audio, tilemaps).
 *   3. Crear texturas placeholder con Graphics API.
 *   4. Pasar a MenuScene al terminar.
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../utils/Constants.js';

export class PreloadScene extends Phaser.Scene {

  constructor() {
    super({ key: SCENES.PRELOAD });
  }

  // ─── preload ──────────────────────────────────────────────────────────────────
  preload() {
    // Mostrar la UI de carga antes de que arranquen las descargas
    this._createLoadingUI();

    // Escuchar eventos del Loader para actualizar la barra
    this._setupLoaderEvents();

    // ── Cargar assets reales (vacío en modo placeholder) ──────────────────────
    // Cuando tengas archivos, los agregas aquí:
    //
    // IMÁGENES:
    //   this.load.image('tileset_world', 'assets/images/tilesets/world.png');
    //   this.load.spritesheet('player', 'assets/images/characters/player.png', { frameWidth: 32, frameHeight: 32 });
    //
    // TILEMAPS:
    //   this.load.tilemapTiledJSON('map_world', 'assets/maps/world.json');
    //
    // AUDIO:
    //   this.load.audio('music_explore', 'assets/audio/music/exploration.ogg');
    //   this.load.audio('music_battle',  'assets/audio/music/battle.ogg');
    //   this.load.audio('sfx_attack',    'assets/audio/sfx/attack.wav');
  }

  // ─── create ───────────────────────────────────────────────────────────────────
  create() {
    // Generar todas las texturas placeholder con la Graphics API de Phaser
    this._createPlaceholderPlayer();
    this._createPlaceholderEnemies();
    this._createPlaceholderWorld();
    this._createPlaceholderUI();
    this._createPlaceholderAudio();

    console.log('[PreloadScene] Todos los assets (placeholder) generados.');

    // Pequeña pausa para que el jugador vea el 100% antes de continuar
    this.time.delayedCall(600, () => {
      this.scene.start(SCENES.MENU);
    });
  }

  // ─── UI de carga ──────────────────────────────────────────────────────────────

  /**
   * Crea el fondo negro, el título y la barra de progreso.
   * Todo centrado en pantalla estilo RPG clásico.
   */
  _createLoadingUI() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Fondo negro sólido
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000);

    // Título del juego
    this.add.text(cx, cy - 80, 'FINAL FANTASY 2D', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#FFD700',
      stroke: '#8B6914',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Texto "Cargando..."
    this.loadingText = this.add.text(cx, cy - 20, 'Cargando...', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#CCCCCC',
    }).setOrigin(0.5);

    // Marco de la barra (borde dorado)
    const barW = 360;
    const barH = 24;
    const barX = cx - barW / 2;
    const barY = cy + 10;

    this.add.rectangle(cx, barY + barH / 2, barW + 4, barH + 4, 0xFFD700)
      .setOrigin(0.5);

    // Fondo oscuro de la barra
    this.add.rectangle(cx, barY + barH / 2, barW, barH, 0x1a1a2e)
      .setOrigin(0.5);

    // Barra de progreso (empieza en ancho 0)
    this.progressBar = this.add.rectangle(
      barX, barY, 0, barH, 0xFFD700
    ).setOrigin(0, 0);

    // Porcentaje en texto
    this.percentText = this.add.text(cx, barY + barH / 2, '0%', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#000000',
    }).setOrigin(0.5);

    // Nombre del asset que se está cargando
    this.assetText = this.add.text(cx, barY + barH + 14, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#888888',
    }).setOrigin(0.5);
  }

  /**
   * Conecta los eventos del Loader de Phaser con la UI de progreso.
   */
  _setupLoaderEvents() {
    const barW = 360;

    // Se llama cada vez que avanza la carga (0.0 → 1.0)
    this.load.on('progress', (value) => {
      this.progressBar.width = barW * value;
      this.percentText.setText(`${Math.floor(value * 100)}%`);
    });

    // Se llama por cada archivo cargado — muestra su nombre
    this.load.on('fileprogress', (file) => {
      this.assetText.setText(file.key);
    });

    // Se llama cuando TODO terminó de cargar
    this.load.on('complete', () => {
      this.loadingText.setText('¡Listo!');
      this.assetText.setText('');
      this.percentText.setText('100%');
      this.progressBar.width = barW;
    });
  }

  // ─── Generadores de texturas placeholder ──────────────────────────────────────
  // Cada método usa la Graphics API para dibujar formas simples
  // y las convierte en texturas reutilizables con generateTexture().
  // Cuando tengas sprites reales, elimina el método correspondiente
  // y agrega el this.load en preload().

  /**
   * Jugador: sprite 32x32 con cuerpo azul y cabeza amarilla.
   * Se generan 4 frames (uno por dirección) en una misma textura.
   */
  _createPlaceholderPlayer() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Frame 0 — mirando abajo (sur)
    g.fillStyle(0x4488FF); g.fillRect(0, 0, 32, 32);      // cuerpo azul
    g.fillStyle(0xFFDD44); g.fillCircle(16, 10, 8);        // cabeza amarilla
    g.fillStyle(0xFFFFFF); g.fillRect(8, 20, 6, 10);       // pierna izq
    g.fillStyle(0xFFFFFF); g.fillRect(18, 20, 6, 10);      // pierna der

    // Frame 1 — mirando arriba (norte)
    g.fillStyle(0x4488FF); g.fillRect(32, 0, 32, 32);
    g.fillStyle(0xFFDD44); g.fillCircle(48, 10, 8);
    g.fillStyle(0x333333); g.fillRect(40, 20, 6, 10);
    g.fillStyle(0x333333); g.fillRect(50, 20, 6, 10);

    // Frame 2 — mirando izquierda (oeste)
    g.fillStyle(0x4488FF); g.fillRect(64, 0, 32, 32);
    g.fillStyle(0xFFDD44); g.fillCircle(80, 10, 8);
    g.fillStyle(0xFFFFFF); g.fillRect(72, 20, 16, 10);

    // Frame 3 — mirando derecha (este)
    g.fillStyle(0x4488FF); g.fillRect(96, 0, 32, 32);
    g.fillStyle(0xFFDD44); g.fillCircle(112, 10, 8);
    g.fillStyle(0xFFFFFF); g.fillRect(100, 20, 16, 10);

    g.generateTexture('player', 128, 32);
    g.destroy();
  }

  /**
   * Enemigos: 3 tipos con colores distintos (32x32 cada uno).
   *   - enemy_slime:  verde
   *   - enemy_goblin: rojo oscuro
   *   - enemy_boss:   morado grande (48x48)
   */
  _createPlaceholderEnemies() {
    // Slime — círculo verde
    const slime = this.make.graphics({ add: false });
    slime.fillStyle(0x44CC44);
    slime.fillCircle(16, 20, 14);
    slime.fillStyle(0xFFFFFF);
    slime.fillCircle(10, 16, 3); // ojo izq
    slime.fillCircle(22, 16, 3); // ojo der
    slime.generateTexture('enemy_slime', 32, 32);
    slime.destroy();

    // Goblin — figura roja con cuernos
    const goblin = this.make.graphics({ add: false });
    goblin.fillStyle(0xCC2222);
    goblin.fillRect(8, 8, 16, 20);   // cuerpo
    goblin.fillCircle(16, 8, 8);     // cabeza
    goblin.fillStyle(0xFF6600);
    goblin.fillTriangle(8, 2, 4, 12, 12, 10);  // cuerno izq
    goblin.fillTriangle(24, 2, 28, 12, 20, 10); // cuerno der
    goblin.generateTexture('enemy_goblin', 32, 32);
    goblin.destroy();

    // Boss — figura morada grande con aura
    const boss = this.make.graphics({ add: false });
    boss.fillStyle(0x440066, 0.4);
    boss.fillCircle(24, 24, 22);     // aura
    boss.fillStyle(0x9900CC);
    boss.fillRect(8, 10, 32, 28);    // cuerpo
    boss.fillCircle(24, 10, 14);     // cabeza
    boss.fillStyle(0xFF0000);
    boss.fillCircle(18, 8, 4);       // ojo izq
    boss.fillCircle(30, 8, 4);       // ojo der
    boss.generateTexture('enemy_boss', 48, 48);
    boss.destroy();
  }

  /**
   * Tiles del mundo: suelo, pared, árbol, zona de guardado.
   * Cada tile es 32x32.
   */
  _createPlaceholderWorld() {
    // Suelo — verde oscuro con textura de puntos
    const floor = this.make.graphics({ add: false });
    floor.fillStyle(0x2D5A1B); floor.fillRect(0, 0, 32, 32);
    floor.fillStyle(0x3A7A25, 0.5);
    floor.fillRect(4, 4, 4, 4);
    floor.fillRect(16, 12, 4, 4);
    floor.fillRect(8, 22, 4, 4);
    floor.generateTexture('tile_floor', 32, 32);
    floor.destroy();

    // Pared — gris piedra
    const wall = this.make.graphics({ add: false });
    wall.fillStyle(0x666677); wall.fillRect(0, 0, 32, 32);
    wall.fillStyle(0x888899);
    wall.fillRect(2, 2, 13, 13);
    wall.fillRect(17, 2, 13, 13);
    wall.fillRect(2, 17, 13, 13);
    wall.fillRect(17, 17, 13, 13);
    wall.lineStyle(1, 0x444455);
    wall.strokeRect(0, 0, 32, 32);
    wall.generateTexture('tile_wall', 32, 32);
    wall.destroy();

    // Árbol — tronco marrón + copa verde
    const tree = this.make.graphics({ add: false });
    tree.fillStyle(0x8B4513); tree.fillRect(12, 20, 8, 12);  // tronco
    tree.fillStyle(0x228B22); tree.fillCircle(16, 14, 12);   // copa
    tree.fillStyle(0x32CD32); tree.fillCircle(10, 16, 7);    // rama izq
    tree.fillCircle(22, 16, 7);                               // rama der
    tree.generateTexture('tile_tree', 32, 32);
    tree.destroy();

    // Zona de guardado — estrella dorada sobre plataforma
    const save = this.make.graphics({ add: false });
    save.fillStyle(0x1a1a4a);
    save.fillRect(0, 0, 32, 32);
    save.fillStyle(0xFFD700);

    // Estrella dibujada manualmente con un polígono de 10 puntos
    const cx = 16, cy = 16;
    const outerR = 11, innerR = 5;
    const points = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    save.fillPoints(points, true);
    save.lineStyle(2, 0xFFFFAA);
    save.strokeRect(1, 1, 30, 30);
    save.generateTexture('tile_save', 32, 32);
    save.destroy();
  }

  /**
   * Elementos de UI: marcos de ventana, barras de vida/exp, iconos.
   */
  _createPlaceholderUI() {
    // Marco de ventana de diálogo (estilo FF clásico)
    const dialog = this.make.graphics({ add: false });
    dialog.fillStyle(0x000033, 0.9); dialog.fillRect(0, 0, 400, 80);
    dialog.lineStyle(2, 0xFFD700); dialog.strokeRect(0, 0, 400, 80);
    dialog.lineStyle(1, 0x4488FF); dialog.strokeRect(3, 3, 394, 74);
    dialog.generateTexture('ui_dialog', 400, 80);
    dialog.destroy();

    // Barra de vida (fondo rojo oscuro)
    const hpBg = this.make.graphics({ add: false });
    hpBg.fillStyle(0x660000); hpBg.fillRect(0, 0, 200, 16);
    hpBg.lineStyle(1, 0xFF4444); hpBg.strokeRect(0, 0, 200, 16);
    hpBg.generateTexture('bar_hp_bg', 200, 16);
    hpBg.destroy();

    // Relleno de barra de vida
    const hpFill = this.make.graphics({ add: false });
    hpFill.fillStyle(0xFF4444); hpFill.fillRect(0, 0, 200, 16);
    hpFill.generateTexture('bar_hp_fill', 200, 16);
    hpFill.destroy();

    // Barra de exp (fondo azul oscuro)
    const expBg = this.make.graphics({ add: false });
    expBg.fillStyle(0x000066); expBg.fillRect(0, 0, 200, 10);
    expBg.lineStyle(1, 0x4444FF); expBg.strokeRect(0, 0, 200, 10);
    expBg.generateTexture('bar_exp_bg', 200, 10);
    expBg.destroy();

    // Relleno de barra de exp
    const expFill = this.make.graphics({ add: false });
    expFill.fillStyle(0x4488FF); expFill.fillRect(0, 0, 200, 10);
    expFill.generateTexture('bar_exp_fill', 200, 10);
    expFill.destroy();
  }

  /**
   * Audio placeholder: crea AudioMarkers vacíos para que
   * AudioManager no rompa al intentar reproducir sonidos.
   * Cuando tengas archivos de audio reales, elimina este método.
   */
  _createPlaceholderAudio() {
    // Registramos claves de audio en el registry para que
    // AudioManager sepa qué claves existen, sin archivos reales.
    const audioKeys = [
      'music_explore',
      'music_battle',
      'music_boss',
      'sfx_attack',
      'sfx_heal',
      'sfx_levelup',
      'sfx_save',
      'sfx_menu_select',
      'sfx_enemy_hit',
    ];
    this.registry.set('audioKeys', audioKeys);
    console.log('[PreloadScene] Audio en modo placeholder — sin archivos externos.');
  }
}