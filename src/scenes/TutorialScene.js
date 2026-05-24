/**
 * TutorialScene.js
 * ─────────────────────────────────────────────────────
 * Tutorial interactivo estilo Final Fantasy clásico.
 * Se lanza desde MenuScene como opción del menú principal.
 *
 * Estructura de pasos:
 *   - THEORY: muestra texto, avanza con SPACE
 *   - PRACTICE: el jugador debe ejecutar una acción real
 *
 * Secciones:
 *   1. Movimiento WASD
 *   2. Sistema de combate por turnos
 *   3. Habilidades / Skills
 *   4. Inventario y objetos
 *
 * Al finalizar vuelve a MenuScene.
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import {
  SCENES,
  GAME_WIDTH,
  GAME_HEIGHT,
  KEYS,
  DIRECTIONS,
  PLAYER_SPEED,
} from '../utils/Constants.js';

// ─── Definición de pasos del tutorial ─────────────────────────────────────────

const TUTORIAL_STEPS = [
  // ── Sección 1: Movimiento ──────────────────────────────────────────────────
  {
    id:      'move_intro',
    type:    'theory',
    section: 'Movimiento',
    title:   '¡Bienvenido, aventurero!',
    lines: [
      'En tu travesía explorarás tierras peligrosas.',
      'Primero aprenderás a moverte por el mundo.',
      'Usa W A S D para moverte en las 4 direcciones.',
      'Pulsa ESPACIO para continuar...',
    ],
  },
  {
    id:       'move_up',
    type:     'practice',
    section:  'Movimiento',
    title:    'Practica: Mover arriba',
    prompt:   'Pulsa W para moverte hacia arriba.',
    action:   'move_up',
    hint:     '[W] ↑ Arriba',
  },
  {
    id:       'move_down',
    type:     'practice',
    section:  'Movimiento',
    title:    'Practica: Mover abajo',
    prompt:   'Pulsa S para moverte hacia abajo.',
    action:   'move_down',
    hint:     '[S] ↓ Abajo',
  },
  {
    id:       'move_left',
    type:     'practice',
    section:  'Movimiento',
    title:    'Practica: Mover izquierda',
    prompt:   'Pulsa A para moverte hacia la izquierda.',
    action:   'move_left',
    hint:     '[A] ← Izquierda',
  },
  {
    id:       'move_right',
    type:     'practice',
    section:  'Movimiento',
    title:    'Practica: Mover derecha',
    prompt:   'Pulsa D para moverte hacia la derecha.',
    action:   'move_right',
    hint:     '[D] → Derecha',
  },

  // ── Sección 2: Combate ─────────────────────────────────────────────────────
  {
    id:      'battle_intro',
    type:    'theory',
    section: 'Combate',
    title:   'Sistema de Combate',
    lines: [
      'El combate es por turnos, igual que los RPG clásicos.',
      'En tu turno eliges: Atacar, Habilidad, Objeto o Huir.',
      'Cada acción tiene consecuencias — ¡elige con cuidado!',
      'Pulsa ESPACIO para continuar...',
    ],
  },
  {
    id:      'battle_attack',
    type:    'theory',
    section: 'Combate',
    title:   'Ataque básico',
    lines: [
      '⚔  ATACAR: golpe directo sin costo de MP.',
      '   El daño depende de tu ATK vs la DEF enemiga.',
      '   Es tu acción más confiable cuando el MP es bajo.',
      'Pulsa ESPACIO para continuar...',
    ],
  },
  {
    id:      'battle_defense',
    type:    'theory',
    section: 'Combate',
    title:   'Turno enemigo',
    lines: [
      '🛡  Tras tu acción, el enemigo actúa automáticamente.',
      '   Los enemigos tienen distintas IAs de comportamiento.',
      '   Algunos atacan fuerte, otros debuffean o se curan.',
      'Pulsa ESPACIO para continuar...',
    ],
  },
  {
    id:       'battle_select',
    type:     'practice',
    section:  'Combate',
    title:    'Practica: Seleccionar acción',
    prompt:   'Usa ↑ ↓ para navegar el menú y ESPACIO para confirmar.\nSelecciona "Atacar".',
    action:   'battle_select_attack',
    hint:     '[↑↓] Navegar  [SPACE] Confirmar',
    // En esta práctica mostramos un menú de batalla simulado
    mockBattle: true,
  },

  // ── Sección 3: Habilidades ─────────────────────────────────────────────────
  {
    id:      'skills_intro',
    type:    'theory',
    section: 'Habilidades',
    title:   'Sistema de Habilidades',
    lines: [
      '✨ Las habilidades gastan MP pero son más poderosas.',
      '   Hay 4 tipos: Ataque, Curación, Buff y Debuff.',
      '   Aprendes nuevas habilidades al subir de nivel.',
      'Pulsa ESPACIO para continuar...',
    ],
  },
  {
    id:      'skills_types',
    type:    'theory',
    section: 'Habilidades',
    title:   'Tipos de habilidad',
    lines: [
      '⚔  ATAQUE  — daño mágico directo al enemigo.',
      '💚 CURAR   — restaura HP propio.',
      '⬆  BUFF    — aumenta tus stats temporalmente.',
      '⬇  DEBUFF  — reduce los stats del enemigo.',
    ],
  },
  {
    id:       'skills_select',
    type:     'practice',
    section:  'Habilidades',
    title:    'Practica: Usar una habilidad',
    prompt:   'Abre el menú de habilidades y selecciona\ncualquier habilidad de la lista.',
    action:   'skills_open',
    hint:     '[↑↓] Navegar  [SPACE] Confirmar',
    mockSkills: true,
  },

  // ── Sección 4: Inventario ──────────────────────────────────────────────────
  {
    id:      'inventory_intro',
    type:    'theory',
    section: 'Inventario',
    title:   'Inventario y Objetos',
    lines: [
      '🎒 Tu inventario guarda objetos de consumo.',
      '   Los objetos se usan en combate o en el mapa.',
      '   Algunos curan HP, otros restauran MP.',
      'Pulsa ESPACIO para continuar...',
    ],
  },
  {
    id:      'inventory_items',
    type:    'theory',
    section: 'Inventario',
    title:   'Objetos disponibles',
    lines: [
      '🧪 Poción       — restaura 50 HP.',
      '🔵 Éter         — restaura 30 MP.',
      '💊 Mega Poción  — restaura 200 HP.',
      '⭐ Elixir       — restaura HP y MP al máximo.',
    ],
  },
  {
    id:       'inventory_use',
    type:     'practice',
    section:  'Inventario',
    title:    'Practica: Usar un objeto',
    prompt:   'Selecciona un objeto del inventario\ny úsalo con ESPACIO.',
    action:   'inventory_use',
    hint:     '[↑↓] Navegar  [SPACE] Usar objeto',
    mockInventory: true,
  },

  // ── Final ──────────────────────────────────────────────────────────────────
  {
    id:      'end',
    type:    'theory',
    section: 'Fin',
    title:   '¡Tutorial completado!',
    lines: [
      '🏆 ¡Excelente! Ya conoces lo esencial del juego.',
      '   Ahora estás listo para comenzar tu aventura.',
      '   El mundo te espera, héroe.',
      'Pulsa ESPACIO para volver al menú...',
    ],
  },
];

// ─── Colores de sección ────────────────────────────────────────────────────────
const SECTION_COLORS = {
  'Movimiento':  0x4488FF,
  'Combate':     0xFF4444,
  'Habilidades': 0xCC44FF,
  'Inventario':  0x44CC88,
  'Fin':         0xFFD700,
};

export class TutorialScene extends Phaser.Scene {

  constructor() {
    super({ key: SCENES.TUTORIAL });
  }

  // ─── init ─────────────────────────────────────────────────────────────────────

  /**
   * Inicializa el estado interno antes de crear objetos.
   */
  init() {
    this._stepIndex      = 0;
    this._practiceOk     = false;   // true cuando el jugador completó la práctica actual
    this._inputLocked    = false;   // evita doble-pulsación rápida
    this._mockMenuIndex  = 0;       // índice seleccionado en menús simulados
    this._mockOptions    = [];      // opciones del menú simulado activo
  }

  // ─── create ───────────────────────────────────────────────────────────────────

  create() {
    this._buildBackground();
    this._buildHeaderBar();
    this._buildDialogBox();
    this._buildPlayerSprite();
    this._buildArena();
    this._buildInputs();

    // Renderizar el primer paso
    this._showStep(0);
  }

  // ─── update ───────────────────────────────────────────────────────────────────

  /**
   * Loop principal: procesa el movimiento libre cuando el paso
   * es de tipo 'practice' con action de movimiento.
   */
  update() {
    const step = TUTORIAL_STEPS[this._stepIndex];
    if (!step || step.type !== 'practice') return;
    if (this._practiceOk) return;

    const isMove = ['move_up','move_down','move_left','move_right'].includes(step.action);
    if (isMove) this._updateMovement(step);
  }

  // ─── Construcción de UI ───────────────────────────────────────────────────────

  /**
   * Fondo degradado oscuro estilo FF.
   */
  _buildBackground() {
    // Fondo base
    this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x0a0a1a
    );

    // Partículas decorativas (estrellas estáticas)
    const stars = this.make.graphics({ add: true });
    stars.fillStyle(0xFFFFFF, 0.5);
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const r = Phaser.Math.FloatBetween(0.5, 1.5);
      stars.fillCircle(x, y, r);
    }
  }

  /**
   * Barra superior: nombre de sección + número de paso.
   */
  _buildHeaderBar() {
    // Fondo de la barra
    this._headerBg = this.add.rectangle(
      GAME_WIDTH / 2, 20,
      GAME_WIDTH, 40,
      0x000033, 0.95
    );
    this.add.rectangle(GAME_WIDTH / 2, 39, GAME_WIDTH, 2, 0xFFD700);

    // Texto de sección (se actualiza en _showStep)
    this._sectionText = this.add.text(16, 20, '', {
      fontFamily: 'monospace',
      fontSize:   '14px',
      color:      '#FFD700',
    }).setOrigin(0, 0.5);

    // Progreso "paso X de Y"
    this._progressText = this.add.text(GAME_WIDTH - 16, 20, '', {
      fontFamily: 'monospace',
      fontSize:   '12px',
      color:      '#AAAAAA',
    }).setOrigin(1, 0.5);
  }

  /**
   * Caja de diálogo inferior estilo FF clásico.
   * Contiene: título, líneas de texto, hint de teclas.
   */
  _buildDialogBox() {
    const boxH  = 160;
    const boxY  = GAME_HEIGHT - boxH - 8;
    const pad   = 16;

    // Fondo con borde dorado + borde interno azul
    this._dialogBg = this.add.rectangle(
      GAME_WIDTH / 2, boxY + boxH / 2,
      GAME_WIDTH - 16, boxH,
      0x000033, 0.96
    );
    this.add.rectangle(
      GAME_WIDTH / 2, boxY + boxH / 2,
      GAME_WIDTH - 16, boxH,
      0x000000, 0
    ).setStrokeStyle(2, 0xFFD700);
    this.add.rectangle(
      GAME_WIDTH / 2, boxY + boxH / 2,
      GAME_WIDTH - 22, boxH - 6,
      0x000000, 0
    ).setStrokeStyle(1, 0x4488FF);

    // Indicador de sección (rectángulo de color)
    this._sectionBar = this.add.rectangle(
      pad + 4, boxY + 2,
      6, boxH - 4,
      0xFFD700
    ).setOrigin(0, 0);

    // Título del paso
    this._titleText = this.add.text(pad + 16, boxY + 14, '', {
      fontFamily: 'monospace',
      fontSize:   '16px',
      color:      '#FFD700',
      stroke:     '#000000',
      strokeThickness: 2,
    });

    // Líneas de contenido
    this._contentLines = [];
    for (let i = 0; i < 4; i++) {
      this._contentLines.push(
        this.add.text(pad + 16, boxY + 38 + i * 24, '', {
          fontFamily: 'monospace',
          fontSize:   '13px',
          color:      '#DDDDDD',
        })
      );
    }

    // Hint de tecla (esquina inferior derecha del diálogo)
    this._hintText = this.add.text(
      GAME_WIDTH - pad - 8,
      boxY + boxH - 14,
      '',
      {
        fontFamily: 'monospace',
        fontSize:   '11px',
        color:      '#888888',
      }
    ).setOrigin(1, 1);

    // Cursor parpadeante "▼" cuando es theory
    this._cursor = this.add.text(
      GAME_WIDTH - pad - 8,
      boxY + boxH - 16,
      '▼',
      {
        fontFamily: 'monospace',
        fontSize:   '14px',
        color:      '#FFD700',
      }
    ).setOrigin(1, 1).setVisible(false);

    this.tweens.add({
      targets:  this._cursor,
      alpha:    0,
      duration: 500,
      yoyo:     true,
      repeat:   -1,
    });
  }

  /**
   * Sprite del jugador que se mueve en los pasos de práctica de movimiento.
   */
  _buildPlayerSprite() {
    // Arena de movimiento (mitad superior de la pantalla)
    this._playerStartX = GAME_WIDTH / 2;
    this._playerStartY = 200;

    this._player = this.add.image(
      this._playerStartX,
      this._playerStartY,
      'player_down'
    ).setVisible(false);

    // Límites del área de movimiento
    this._arenaBounds = new Phaser.Geom.Rectangle(60, 50, GAME_WIDTH - 120, 300);
  }

  /**
   * Arena visual para los pasos de práctica de movimiento.
   */
  _buildArena() {
    // Zona de movimiento con borde sutil
    this._arenaGraphic = this.add.graphics().setVisible(false);
    this._arenaGraphic.lineStyle(1, 0x334455, 0.8);
    this._arenaGraphic.strokeRect(60, 50, GAME_WIDTH - 120, 300);

    // Grid decorativo
    this._arenaGraphic.lineStyle(1, 0x1a2233, 0.5);
    for (let x = 60; x < GAME_WIDTH - 60; x += 32) {
      this._arenaGraphic.lineBetween(x, 50, x, 350);
    }
    for (let y = 50; y < 350; y += 32) {
      this._arenaGraphic.lineBetween(60, y, GAME_WIDTH - 60, y);
    }

    // Contenedor del menú simulado (batalla/habilidades/inventario)
    this._mockContainer = this.add.container(0, 0).setVisible(false);
  }

  /**
   * Registra todos los inputs necesarios.
   */
  _buildInputs() {
    this._keys = this.input.keyboard.addKeys({
      up:     Phaser.Input.Keyboard.KeyCodes.W,
      down:   Phaser.Input.Keyboard.KeyCodes.S,
      left:   Phaser.Input.Keyboard.KeyCodes.A,
      right:  Phaser.Input.Keyboard.KeyCodes.D,
      space:  Phaser.Input.Keyboard.KeyCodes.SPACE,
      esc:    Phaser.Input.Keyboard.KeyCodes.ESC,
      arrowU: Phaser.Input.Keyboard.KeyCodes.UP,
      arrowD: Phaser.Input.Keyboard.KeyCodes.DOWN,
    });

    // SPACE: avanzar paso (theory) o confirmar (mock menus)
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this._inputLocked) return;
      this._onSpacePressed();
    });

    // ESC: salir del tutorial en cualquier momento
    this.input.keyboard.on('keydown-ESC', () => {
      this._exitTutorial();
    });

    // Flechas para navegar menús simulados
    this.input.keyboard.on('keydown-UP',   () => this._onArrowNav(-1));
    this.input.keyboard.on('keydown-DOWN', () => this._onArrowNav(1));
  }

  // ─── Flujo de pasos ───────────────────────────────────────────────────────────

  /**
   * Muestra el paso en el índice dado, configurando la UI
   * según si es 'theory' o 'practice'.
   * @param {number} index - Índice en TUTORIAL_STEPS
   */
  _showStep(index) {
    this._stepIndex  = index;
    this._practiceOk = false;
    this._inputLocked = false;

    const step = TUTORIAL_STEPS[index];
    if (!step) return;

    // ── Header ────────────────────────────────────────────────────────────────
    const color = SECTION_COLORS[step.section] ?? 0xFFFFFF;
    this._sectionText.setText(`📖 ${step.section}`).setColor(
      '#' + color.toString(16).padStart(6, '0')
    );
    this._progressText.setText(`${index + 1} / ${TUTORIAL_STEPS.length}`);
    this._sectionBar.setFillStyle(color);

    // ── Título ────────────────────────────────────────────────────────────────
    this._titleText.setText(step.title);

    // ── Limpiar contenido anterior ────────────────────────────────────────────
    this._contentLines.forEach(t => t.setText(''));
    this._hintText.setText('');
    this._cursor.setVisible(false);
    this._player.setVisible(false);
    this._arenaGraphic.setVisible(false);
    this._clearMockMenu();

    // ── Renderizar según tipo ─────────────────────────────────────────────────
    if (step.type === 'theory') {
      this._renderTheory(step);
    } else {
      this._renderPractice(step);
    }

    // Animación de entrada del diálogo
    this._animateDialogIn();
  }

  /**
   * Muestra las líneas de texto de un paso teórico.
   * @param {object} step
   */
  _renderTheory(step) {
    step.lines.forEach((line, i) => {
      if (this._contentLines[i]) {
        this._contentLines[i].setText(line);
      }
    });
    this._cursor.setVisible(true);
    this._hintText.setText('[SPACE] Continuar  [ESC] Salir');
  }

  /**
   * Configura la UI para un paso de práctica.
   * @param {object} step
   */
  _renderPractice(step) {
    // Prompt partido en dos líneas si tiene \n
    const [line0, line1] = step.prompt.split('\n');
    if (this._contentLines[0]) this._contentLines[0].setText(`▶ ${line0}`);
    if (this._contentLines[1] && line1) this._contentLines[1].setText(`  ${line1}`);

    this._hintText.setText(step.hint + '   [ESC] Salir');

    // Mostrar arena de movimiento
    const isMove = ['move_up','move_down','move_left','move_right'].includes(step.action);
    if (isMove) {
      this._player.setTexture('player_down')
                  .setPosition(this._playerStartX, this._playerStartY)
                  .setVisible(true);
      this._arenaGraphic.setVisible(true);
    }

    // Mostrar menú simulado de batalla
    if (step.mockBattle)    this._buildMockBattleMenu();
    if (step.mockSkills)    this._buildMockSkillsMenu();
    if (step.mockInventory) this._buildMockInventoryMenu();
  }

  /**
   * Avanza al siguiente paso o termina el tutorial.
   */
  _nextStep() {
    this._inputLocked = true;

    // Flash de confirmación
    this.cameras.main.flash(200, 255, 215, 0, false);

    this.time.delayedCall(250, () => {
      const next = this._stepIndex + 1;
      if (next >= TUTORIAL_STEPS.length) {
        this._exitTutorial();
      } else {
        this._showStep(next);
      }
    });
  }

  // ─── Input handlers ───────────────────────────────────────────────────────────

  /**
   * Maneja la pulsación de SPACE según el estado del paso actual.
   */
  _onSpacePressed() {
    const step = TUTORIAL_STEPS[this._stepIndex];
    if (!step) return;

    if (step.type === 'theory') {
      // En teoría, SPACE siempre avanza
      this._nextStep();
      return;
    }

    // En práctica, SPACE confirma la selección del menú simulado
    if (step.mockBattle || step.mockSkills || step.mockInventory) {
      this._confirmMockSelection(step);
    }
  }

  /**
   * Navega arriba/abajo en los menús simulados.
   * @param {number} dir - -1 arriba, +1 abajo
   */
  _onArrowNav(dir) {
    if (this._mockOptions.length === 0) return;
    const prev = this._mockMenuIndex;
    this._mockMenuIndex = Phaser.Math.Clamp(
      this._mockMenuIndex + dir,
      0,
      this._mockOptions.length - 1
    );
    if (this._mockMenuIndex !== prev) {
      this._updateMockMenuHighlight();
    }
  }

  // ─── Movimiento libre ─────────────────────────────────────────────────────────

  /**
   * Procesa el movimiento del sprite del jugador en el area de práctica.
   * Detecta automáticamente si el jugador movió en la dirección requerida.
   * @param {object} step - Paso actual
   */
  _updateMovement(step) {
    const speed = 3;
    let dx = 0, dy = 0;

    if (Phaser.Input.Keyboard.JustDown(this._keys.up))    dy = -speed;
    if (Phaser.Input.Keyboard.JustDown(this._keys.down))  dy =  speed;
    if (Phaser.Input.Keyboard.JustDown(this._keys.left))  dx = -speed;
    if (Phaser.Input.Keyboard.JustDown(this._keys.right)) dx =  speed;

    // Actualizar textura según dirección
    if      (dy < 0) this._player.setTexture('player_up');
    else if (dy > 0) this._player.setTexture('player_down');
    else if (dx < 0) this._player.setTexture('player_left');
    else if (dx > 0) this._player.setTexture('player_right');

    // Mover dentro de límites del arena
    if (dx !== 0 || dy !== 0) {
      const nx = Phaser.Math.Clamp(
        this._player.x + dx * 20,
        this._arenaBounds.left + 16,
        this._arenaBounds.right - 16
      );
      const ny = Phaser.Math.Clamp(
        this._player.y + dy * 20,
        this._arenaBounds.top + 16,
        this._arenaBounds.bottom - 16
      );
      this._player.setPosition(nx, ny);

      // Comprobar si completó la acción requerida
      this._checkMoveCompleted(step, dx, dy);
    }
  }

  /**
   * Verifica si el movimiento corresponde al que pide el paso.
   * @param {object} step
   * @param {number} dx
   * @param {number} dy
   */
  _checkMoveCompleted(step, dx, dy) {
    const map = {
      move_up:    { dx: 0,  dy: -1 },
      move_down:  { dx: 0,  dy:  1 },
      move_left:  { dx: -1, dy:  0 },
      move_right: { dx:  1, dy:  0 },
    };
    const req = map[step.action];
    if (!req) return;

    const ok =
      (req.dx !== 0 && Math.sign(dx) === req.dx) ||
      (req.dy !== 0 && Math.sign(dy) === req.dy);

    if (ok) {
      this._practiceOk = true;
      this._showPracticeSuccess();
    }
  }

  // ─── Menús simulados ──────────────────────────────────────────────────────────

  /**
   * Construye el menú simulado de batalla con las 4 opciones.
   */
  _buildMockBattleMenu() {
    this._mockOptions    = ['⚔  Atacar', '✨ Habilidad', '🎒 Objeto', '🏃 Huir'];
    this._mockMenuIndex  = 0;
    this._buildMockMenuUI(280, 80, 'BATALLA');
  }

  /**
   * Construye el menú simulado de habilidades.
   */
  _buildMockSkillsMenu() {
    this._mockOptions   = ['🔥 Llama Lvl1', '💧 Aqua Lvl1', '⚡ Rayo Lvl2', '💚 Curar Lvl1'];
    this._mockMenuIndex = 0;
    this._buildMockMenuUI(300, 80, 'HABILIDADES');
  }

  /**
   * Construye el menú simulado de inventario.
   */
  _buildMockInventoryMenu() {
    this._mockOptions   = ['🧪 Poción  ×3', '🔵 Éter    ×1', '💊 Mega P. ×1', '⭐ Elixir  ×1'];
    this._mockMenuIndex = 0;
    this._buildMockMenuUI(300, 80, 'INVENTARIO');
  }

  /**
   * Genera la UI visual de un menú simulado (lista con cursor).
   * @param {number} menuW  - Ancho del panel
   * @param {number} menuH  - Altura base (crece con las opciones)
   * @param {string} label  - Título del menú
   */
  _buildMockMenuUI(menuW, menuH, label) {
    this._clearMockMenu();

    const totalH = menuH + this._mockOptions.length * 36;
    const cx     = GAME_WIDTH / 2;
    const cy     = 190;

    // Fondo del panel
    const bg = this.add.rectangle(cx, cy, menuW, totalH, 0x000044, 0.95)
      .setStrokeStyle(2, 0xFFD700);

    // Título del panel
    const title = this.add.text(cx, cy - totalH / 2 + 16, label, {
      fontFamily: 'monospace',
      fontSize:   '13px',
      color:      '#FFD700',
    }).setOrigin(0.5, 0);

    // Línea divisoria
    const line = this.add.rectangle(cx, cy - totalH / 2 + 34, menuW - 16, 1, 0x4488FF);

    // Opciones
    this._mockOptionTexts = [];
    this._mockCursorArrow = [];

    this._mockOptions.forEach((opt, i) => {
      const oy = cy - totalH / 2 + 50 + i * 36;

      // Cursor "▶"
      const arrow = this.add.text(cx - menuW / 2 + 12, oy, '▶', {
        fontFamily: 'monospace',
        fontSize:   '13px',
        color:      '#FFD700',
      }).setOrigin(0, 0.5).setVisible(i === 0);

      // Texto de la opción
      const optText = this.add.text(cx - menuW / 2 + 28, oy, opt, {
        fontFamily: 'monospace',
        fontSize:   '13px',
        color:      i === 0 ? '#FFFFFF' : '#AAAAAA',
      }).setOrigin(0, 0.5);

      this._mockOptionTexts.push(optText);
      this._mockCursorArrow.push(arrow);
    });

    // Guardar referencias para poder destruirlos
    this._mockContainer.add([bg, title, line,
      ...this._mockCursorArrow,
      ...this._mockOptionTexts,
    ]);
    this._mockContainer.setVisible(true);
  }

  /**
   * Actualiza el highlight del menú simulado tras navegar con flechas.
   */
  _updateMockMenuHighlight() {
    this._mockOptionTexts.forEach((t, i) => {
      t.setColor(i === this._mockMenuIndex ? '#FFFFFF' : '#AAAAAA');
    });
    this._mockCursorArrow.forEach((a, i) => {
      a.setVisible(i === this._mockMenuIndex);
    });
  }

  /**
   * Valida la selección en el menú simulado y avanza si es correcta.
   * Para battle_select solo acepta "Atacar" (índice 0).
   * Para skills/inventory acepta cualquier opción.
   * @param {object} step
   */
  _confirmMockSelection(step) {
    if (this._practiceOk) return;

    let valid = false;

    if (step.action === 'battle_select_attack') {
      // Debe seleccionar "Atacar" (índice 0)
      valid = this._mockMenuIndex === 0;
      if (!valid) {
        this._showWrongSelection('Selecciona "Atacar" (primera opción)');
        return;
      }
    } else if (step.action === 'skills_open' || step.action === 'inventory_use') {
      // Cualquier selección es válida
      valid = true;
    }

    if (valid) {
      this._practiceOk = true;
      this._showPracticeSuccess();
    }
  }

  /**
   * Destruye todos los hijos del contenedor de menú simulado.
   */
  _clearMockMenu() {
    if (!this._mockContainer) return;
    this._mockContainer.removeAll(true);
    this._mockContainer.setVisible(false);
    this._mockOptions       = [];
    this._mockOptionTexts   = [];
    this._mockCursorArrow   = [];
    this._mockMenuIndex     = 0;
  }

  // ─── Feedback de práctica ─────────────────────────────────────────────────────

  /**
   * Muestra el mensaje de éxito tras completar una práctica
   * y espera un momento antes de avanzar al siguiente paso.
   */
  _showPracticeSuccess() {
    // Cambiar color del prompt a verde
    if (this._contentLines[0]) {
      this._contentLines[0].setColor('#44FF88');
    }
    if (this._contentLines[1]) {
      this._contentLines[1].setColor('#44FF88');
    }
    if (this._contentLines[2]) {
      this._contentLines[2].setText('✔ ¡Correcto! Muy bien...').setColor('#44FF88');
    }

    // Flash verde
    this.cameras.main.flash(300, 0, 255, 100, false);

    // Avanzar después de 1.2 s
    this.time.delayedCall(1200, () => {
      this._nextStep();
    });
  }

  /**
   * Muestra feedback de selección incorrecta (solo para battle_select).
   * @param {string} msg
   */
  _showWrongSelection(msg) {
    if (this._contentLines[2]) {
      this._contentLines[2].setText(`✗ ${msg}`).setColor('#FF4444');
    }
    this.cameras.main.shake(200, 0.005);

    // Borrar el mensaje de error tras 1.5 s
    this.time.delayedCall(1500, () => {
      if (this._contentLines[2]) {
        this._contentLines[2].setText('').setColor('#DDDDDD');
      }
    });
  }

  // ─── Animaciones ──────────────────────────────────────────────────────────────

  /**
   * Animación de entrada de la caja de diálogo (desliza desde abajo).
   */
  _animateDialogIn() {
    const targets = [
      this._titleText,
      ...this._contentLines,
      this._hintText,
    ];
    targets.forEach(t => { t.setAlpha(0); });

    this.tweens.add({
      targets,
      alpha:    1,
      duration: 180,
      ease:     'Linear',
      delay:    this.tweens.stagger(40),
    });
  }

  // ─── Salir ────────────────────────────────────────────────────────────────────

  /**
   * Cierra el tutorial y vuelve a MenuScene con un fade.
   */
  _exitTutorial() {
    this._inputLocked = true;

    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.MENU);
    });
  }
}