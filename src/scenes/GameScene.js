/**
 * GameScene.js
 * ─────────────────────────────────────────────────────
 * Escena principal de exploración del mundo.
 *
 * Responsabilidades:
 *   - Construir el mapa con tiles placeholder (suelo, paredes, árboles)
 *   - Instanciar y actualizar al jugador
 *   - Colisiones jugador ↔ paredes/árboles
 *   - Colocar enemigos en el mapa y detectar overlap (trigger de batalla)
 *   - Zona de guardado con trigger
 *   - Cámara que sigue al jugador
 *   - Lanzar HUDScene en paralelo
 *   - Recibir resultado de BattleScene y continuar o terminar
 *   - Trigger de caída del mapa (zona sin suelo)
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, STORAGE_KEYS } from '../utils/Constants.js';
import { Player }    from '../objects/Player.js';
import { ENEMIES }   from '../data/enemies.js';

// Tamaño de cada tile en píxeles
const TILE  = 32;

// Dimensiones del mapa en tiles
const MAP_COLS = 40;
const MAP_ROWS = 30;

// Definición del mapa usando caracteres:
//   '.' = suelo transitable
//   'W' = pared (colisión)
//   'T' = árbol (colisión)
//   'S' = zona de guardado
//   'E' = spawn de enemigo normal
//   'B' = spawn de boss
//   'X' = vacío / caída (trigger game over)
const MAP_LAYOUT = [
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  'W......................................T..W',
  'W..T....T..............................T..W',
  'W.........WWWWWW.......................T..W',
  'W.........W....W......E................T..W',
  'W.........W....W.......................T..W',
  'W.........WWWWWW..T....................T..W',
  'W....................................E....W',
  'W....T...............................T....W',
  'W......WWWWWWWWWWW...T................T...W',
  'W......W.......T.W........................W',
  'W......W....E....W.......T.........T......W',
  'W......W.........W........................W',
  'W......WWWWWWWWWWW...T.................T..W',
  'W.....T..........T.....E..................W',
  'W.....T...........................T.......W',
  'W............T............T...............W',
  'W...E.........................................W',
  'W..............T..........................W',
  'W.......WWWWWW..............T.............W',
  'W.......W....W......T.................T...W',
  'W.......W....W..E.........................W',
  'W.......WWWWWW.....T......................W',
  'W..T..............T.............T.........W',
  'W...............WWWWWW....................W',
  'W.......E.......W....W.........T..........W',
  'W...............W.B..W....T...............W',
  'W...S...........WWWWWW....................W',
  'W.......T............................T....W',
  'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
];

export class GameScene extends Phaser.Scene {

  constructor() {
    super({ key: SCENES.GAME });
  }

  // ─── init ────────────────────────────────────────────────────────────────────
  init(data) {
    // Recibir resultado de BattleScene cuando regresa
    // data.battleResult: 'win' | 'lose' | undefined
    this._battleResult  = data?.battleResult  ?? null;
    this._defeatedEnemy = data?.enemyId       ?? null;
  }

  // ─── create ──────────────────────────────────────────────────────────────────
  create() {
    // ── Construir el mapa ──────────────────────────────────────────────────
    this._buildMap();

    // ── Instanciar jugador ─────────────────────────────────────────────────
    this._spawnPlayer();

    // ── Configurar colisiones ──────────────────────────────────────────────
    this._setupCollisions();

    // ── Configurar overlaps (triggers) ────────────────────────────────────
    this._setupTriggers();

    // ── Cámara ────────────────────────────────────────────────────────────
    this._setupCamera();

    // ── Lanzar HUD en paralelo ─────────────────────────────────────────────
    this.scene.launch(SCENES.HUD);
    // Pasar referencia del jugador al HUD via registry
    this.registry.set('player', this.player);

    // ── Procesar resultado de batalla si venimos de BattleScene ───────────
    if (this._battleResult === 'win') {
      this._onBattleWin();
    } else if (this._battleResult === 'lose') {
      this._onBattleLose();
    }

    // Fade in al entrar a la escena
    this.cameras.main.fadeIn(600, 0, 0, 0);

    console.log('[GameScene] Mapa construido. Jugador en posición inicial.');
  }

  // ─── update ──────────────────────────────────────────────────────────────────
  update() {
    // Actualizar movimiento e input del jugador cada frame
    if (this.player) {
      this.player.update();
    }
  }

  // ─── Construcción del mapa ────────────────────────────────────────────────────

  /**
   * Lee MAP_LAYOUT y coloca tiles/objetos en sus posiciones.
   * Crea grupos estáticos para paredes y árboles (colisiones).
   * Registra posiciones de spawn de enemigos y zonas especiales.
   */
  _buildMap() {
    // Grupos de física para colisiones
    this._wallGroup  = this.physics.add.staticGroup();
    this._treeGroup  = this.physics.add.staticGroup();
    this._saveZones  = this.physics.add.staticGroup();
    this._voidZones  = this.physics.add.staticGroup(); // zonas de caída

    // Lista de spawns de enemigos: { x, y, type }
    this._enemySpawns = [];

    for (let row = 0; row < MAP_LAYOUT.length; row++) {
      for (let col = 0; col < MAP_LAYOUT[row].length; col++) {
        const char = MAP_LAYOUT[row][col];
        const px   = col * TILE + TILE / 2;
        const py   = row * TILE + TILE / 2;

        // Siempre colocar suelo debajo de todo
        if (char !== 'X') {
          this.add.image(px, py, 'tile_floor');
        }

        switch (char) {
          case 'W': {
            // Pared: imagen + body estático para colisión
            const wall = this._wallGroup.create(px, py, 'tile_wall');
            wall.setImmovable(true);
            wall.refreshBody();
            break;
          }
          case 'T': {
            // Árbol: imagen + body estático
            const tree = this._treeGroup.create(px, py, 'tile_tree');
            tree.setImmovable(true);
            tree.refreshBody();
            break;
          }
          case 'S': {
            // Zona de guardado: imagen especial + trigger
            this.add.image(px, py, 'tile_save');
            const saveZone = this._saveZones.create(px, py, 'tile_save');
            saveZone.setAlpha(0);     // invisible — solo para trigger
            saveZone.setImmovable(true);
            saveZone.refreshBody();
            // Texto flotante sobre la zona
            this.add.text(px, py - 24, '[ Guardar ]', {
              fontFamily: 'monospace',
              fontSize:   '9px',
              color:      '#FFD700',
            }).setOrigin(0.5);
            break;
          }
          case 'E': {
            // Spawn de enemigo normal
            this._enemySpawns.push({ x: px, y: py, type: 'normal' });
            break;
          }
          case 'B': {
            // Spawn de boss
            this._enemySpawns.push({ x: px, y: py, type: 'boss' });
            break;
          }
          case 'X': {
            // Zona de vacío/caída
            const voidZone = this._voidZones.create(px, py, 'tile_floor');
            voidZone.setAlpha(0);
            voidZone.setTint(0x000000);
            voidZone.refreshBody();
            // Fondo negro para el vacío
            this.add.rectangle(px, py, TILE, TILE, 0x000000);
            break;
          }
        }
      }
    }

    // Crear sprites visibles de enemigos en sus spawns
    this._spawnEnemyMarkers();

    // Límites del mundo = tamaño del mapa
    const mapW = MAP_LAYOUT[0].length * TILE;
    const mapH = MAP_LAYOUT.length    * TILE;
    this.physics.world.setBounds(0, 0, mapW, mapH);
  }

  /**
   * Coloca sprites visuales en cada punto de spawn de enemigos.
   * Estos sprites actúan como triggers de batalla al superponerse con el jugador.
   */
  _spawnEnemyMarkers() {
    this._enemyGroup = this.physics.add.group();

    // Mapeo de enemigos por tipo de spawn y nivel
    // (Se asignará el enemigo concreto cuando inicie la batalla)
    const normalEnemies = ['slime', 'goblin', 'dark_knight'];
    let   normalIdx     = 0;

    this._enemySpawns.forEach(spawn => {
      const isBoss    = spawn.type === 'boss';
      const textureKey = isBoss ? 'enemy_boss' : 'enemy_slime';
      const enemyId   = isBoss
        ? 'chaos_dragon'
        : normalEnemies[normalIdx % normalEnemies.length];

      if (!isBoss) normalIdx++;

      const sprite = this._enemyGroup.create(spawn.x, spawn.y, textureKey);
      sprite.setData('enemyId',  enemyId);
      sprite.setData('defeated', false);
      sprite.setImmovable(true);

      // Efecto de flotación suave
      this.tweens.add({
        targets:  sprite,
        y:        spawn.y - 6,
        duration: 1200 + Math.random() * 400,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });

      // Aura roja para el boss
      if (isBoss) {
        this.tweens.add({
          targets:  sprite,
          alpha:    { from: 1, to: 0.7 },
          duration: 800,
          yoyo:     true,
          repeat:   -1,
        });
      }
    });
  }

  // ─── Jugador ──────────────────────────────────────────────────────────────────

  /**
   * Instancia al jugador en la posición inicial o en la posición
   * guardada si viene de una partida cargada.
   */
  _spawnPlayer() {
    let startX = 3 * TILE + TILE / 2;
    let startY = 3 * TILE + TILE / 2;

    // Si hay partida guardada, restaurar posición
    try {
      const save = localStorage.getItem(STORAGE_KEYS.SAVE_SLOT);
      if (save) {
        const data = JSON.parse(save);
        if (data.x && data.y) {
          startX = data.x;
          startY = data.y;
        }
        this.player = new Player(this, startX, startY, data);
      } else {
        this.player = new Player(this, startX, startY);
      }
    } catch {
      this.player = new Player(this, startX, startY);
    }

    // El jugador se renderiza encima de los tiles
    this.player.setDepth(10);
  }

  // ─── Física ───────────────────────────────────────────────────────────────────

  /**
   * Registra las colisiones sólidas:
   * jugador no puede atravesar paredes ni árboles.
   */
  _setupCollisions() {
    this.physics.add.collider(this.player, this._wallGroup);
    this.physics.add.collider(this.player, this._treeGroup);
  }

  /**
   * Registra los overlaps (triggers sin bloqueo físico):
   *   - Enemigos → iniciar batalla
   *   - Zona de guardado → guardar partida
   *   - Zona de vacío → caída / game over
   */
  _setupTriggers() {
    // ── Trigger: enemigo ──────────────────────────────────────────────────
    this.physics.add.overlap(
      this.player,
      this._enemyGroup,
      this._onEnemyContact,
      null,
      this
    );

    // ── Trigger: zona de guardado ─────────────────────────────────────────
    this.physics.add.overlap(
      this.player,
      this._saveZones,
      this._onSaveZoneContact,
      null,
      this
    );

    // ── Trigger: zona de caída ────────────────────────────────────────────
    this.physics.add.overlap(
      this.player,
      this._voidZones,
      this._onVoidContact,
      null,
      this
    );
  }

  // ─── Callbacks de triggers ────────────────────────────────────────────────────

  /**
   * Se llama cuando el jugador toca un sprite de enemigo.
   * Inicia la BattleScene pasando el id del enemigo.
   * @param {Player}              player
   * @param {Phaser.GameObjects.Sprite} enemySprite
   */
  _onEnemyContact(player, enemySprite) {
    // Evitar disparar múltiples veces mientras se superponen
    if (enemySprite.getData('defeated')) return;
    if (player._state === 'in_battle')  return;

    const enemyId = enemySprite.getData('enemyId');
    console.log('[GameScene] Contacto con enemigo:', enemyId);

    // Marcar temporalmente para no re-disparar
    enemySprite.setData('defeated', true);

    // Detener al jugador
    player.enterBattle();

    // Guardar referencia para eliminar el sprite si se gana
    this._currentEnemySprite = enemySprite;

    // Detener HUD y lanzar batalla con fade
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.pause(SCENES.HUD);
      this.scene.launch(SCENES.BATTLE, {
        enemyId,
        playerData: player.serialize(),
      });
      this.scene.pause();
    });
  }

  /**
   * Se llama cuando el jugador entra en la zona de guardado.
   * Guarda la partida en localStorage con un debounce de 1 segundo.
   */
  _onSaveZoneContact(player, _saveZone) {
    // Evitar guardar múltiples veces por segundo
    if (this._saveDebounce) return;
    this._saveDebounce = true;

    this._saveGame(player);

    // Mostrar notificación flotante
    const text = this.add.text(player.x, player.y - 40, '✦ Partida guardada ✦', {
      fontFamily: 'monospace',
      fontSize:   '12px',
      color:      '#FFD700',
      stroke:     '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // Animar el texto hacia arriba y desvanecerlo
    this.tweens.add({
      targets:  text,
      y:        text.y - 30,
      alpha:    0,
      duration: 1800,
      ease:     'Power2',
      onComplete: () => {
        text.destroy();
        this._saveDebounce = false;
      },
    });
  }

  /**
   * Se llama cuando el jugador cae en una zona de vacío.
   * Reproduce una animación de caída y va a GameOverScene.
   */
  _onVoidContact(player, _voidZone) {
    if (this._falling) return;
    this._falling = true;

    console.log('[GameScene] ¡El jugador cayó al vacío!');

    player.body.setVelocity(0, 0);

    // Animación: el jugador se encoge y desvanece
    this.tweens.add({
      targets:  player,
      scaleX:   0,
      scaleY:   0,
      alpha:    0,
      duration: 600,
      ease:     'Power2',
      onComplete: () => {
        this.scene.stop(SCENES.HUD);
        this.scene.start(SCENES.GAME_OVER, { reason: 'fall' });
      },
    });
  }

  // ─── Resultados de batalla ────────────────────────────────────────────────────

  /**
   * Procesa la victoria en batalla:
   * - Aplica EXP y score al jugador
   * - Elimina el sprite del enemigo derrotado
   * - Reactiva el movimiento
   */
  _onBattleWin() {
    console.log('[GameScene] Victoria en batalla contra:', this._defeatedEnemy);

    // Actualizar stats del jugador con los datos que devuelve BattleScene
    const updatedData = this.registry.get('battlePlayerData');
    if (updatedData && this.player) {
      this.player.level     = updatedData.level;
      this.player.exp       = updatedData.exp;
      this.player.score     = updatedData.score;
      this.player.hp        = updatedData.hp;
      this.player.mp        = updatedData.mp;
      this.player.inventory = updatedData.inventory;
      this.player.skills    = updatedData.skills ?? this.player.skills;
    }

    // Eliminar el sprite del enemigo derrotado del mapa
    if (this._currentEnemySprite) {
      this._currentEnemySprite.destroy();
      this._currentEnemySprite = null;
    }

    // Reanudar el jugador
    this.player?.exitBattle();

    // Verificar si todos los enemigos fueron derrotados
    if (this._enemyGroup.countActive() === 0) {
      this._onAllEnemiesDefeated();
    }
  }

  /**
   * Procesa la derrota en batalla:
   * - Carga el último guardado
   * - Si no hay guardado, va a GameOverScene
   */
  _onBattleLose() {
    console.log('[GameScene] Derrota en batalla.');

    try {
      const save = localStorage.getItem(STORAGE_KEYS.SAVE_SLOT);
      if (save) {
        // Recargar la escena con los datos del último guardado
        this.scene.restart({ battleResult: null });
      } else {
        this.scene.stop(SCENES.HUD);
        this.scene.start(SCENES.GAME_OVER, { reason: 'battle' });
      }
    } catch {
      this.scene.stop(SCENES.HUD);
      this.scene.start(SCENES.GAME_OVER, { reason: 'battle' });
    }
  }

  /**
   * Se llama cuando todos los enemigos del mapa han sido derrotados.
   * Lanza la pantalla de victoria.
   */
  _onAllEnemiesDefeated() {
    console.log('[GameScene] ¡Todos los enemigos derrotados! Victoria total.');

    this.cameras.main.fadeOut(800, 255, 215, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop(SCENES.HUD);
      this.scene.start(SCENES.VICTORY, {
        score: this.player?.score ?? 0,
        level: this.player?.level ?? 1,
      });
    });
  }

  // ─── Guardado ─────────────────────────────────────────────────────────────────

  /**
   * Serializa el estado del jugador y lo guarda en localStorage.
   * @param {Player} player
   */
  _saveGame(player) {
    try {
      const saveData = player.serialize();
      localStorage.setItem(STORAGE_KEYS.SAVE_SLOT, JSON.stringify(saveData));

      // Actualizar highscore si el score actual es mayor
      const currentHigh = parseInt(localStorage.getItem(STORAGE_KEYS.HIGHSCORE)) || 0;
      if (player.score > currentHigh) {
        localStorage.setItem(STORAGE_KEYS.HIGHSCORE, player.score.toString());
        this.registry.set('highscore', player.score);
      }

      // Actualizar nivel máximo alcanzado
      const currentMax = parseInt(localStorage.getItem(STORAGE_KEYS.MAX_LEVEL)) || 1;
      if (player.level > currentMax) {
        localStorage.setItem(STORAGE_KEYS.MAX_LEVEL, player.level.toString());
        this.registry.set('maxLevelReached', player.level);
      }

      console.log('[GameScene] Partida guardada:', saveData);
    } catch (err) {
      console.error('[GameScene] Error al guardar:', err);
    }
  }

  // ─── Cámara ───────────────────────────────────────────────────────────────────

  /**
   * Configura la cámara principal para seguir al jugador
   * dentro de los límites del mapa.
   */
  _setupCamera() {
    const mapW = MAP_LAYOUT[0].length * TILE;
    const mapH = MAP_LAYOUT.length    * TILE;

    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5); // Zoom pixel-art style
  }

  // ─── Limpieza ─────────────────────────────────────────────────────────────────

  shutdown() {
    // Detener el HUD cuando GameScene termina
    this.scene.stop(SCENES.HUD);
  }
}