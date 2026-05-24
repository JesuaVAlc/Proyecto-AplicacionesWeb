/**
 * SettingsScene.js
 * ─────────────────────────────────────────────────────
 * Pantalla de configuración accesible desde el menú principal.
 *
 * Responsabilidades:
 *   - Volumen de música y SFX (slider con teclas)
 *   - Toggle de mute global
 *   - Toggle de alto contraste
 *   - Tamaño de fuente: pequeño / normal / grande
 *   - Persistir toda la configuración en localStorage
 *   - Volver al menú con ESC
 * ─────────────────────────────────────────────────────
 */

import Phaser from 'phaser';
import {
  SCENES,
  GAME_WIDTH,
  GAME_HEIGHT,
  STORAGE_KEYS,
  AUDIO,
} from '../utils/Constants.js';

// Opciones del menú de ajustes con sus tipos
const SETTINGS_OPTIONS = [
  { id: 'musicVolume', label: 'Volumen Música',  type: 'slider',  min: 0, max: 1, step: 0.1 },
  { id: 'sfxVolume',   label: 'Volumen Efectos', type: 'slider',  min: 0, max: 1, step: 0.1 },
  { id: 'muted',       label: 'Silenciar Todo',  type: 'toggle'  },
  { id: 'highContrast',label: 'Alto Contraste',  type: 'toggle'  },
  { id: 'fontSize',    label: 'Tamaño de Letra', type: 'cycle',
    values: ['small', 'normal', 'large'],
    labels: ['Pequeño', 'Normal', 'Grande'] },
  { id: '_back',       label: 'Volver al Menú',  type: 'action'  },
];

export class SettingsScene extends Phaser.Scene {

  constructor() {
    super({ key: SCENES.SETTINGS });
  }

  // ─── init ────────────────────────────────────────────────────────────────────
  init() {
    // Cargar configuración guardada o usar defaults
    try {
      const audioRaw    = localStorage.getItem(STORAGE_KEYS.AUDIO_CONFIG);
      const settingsRaw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const audio       = audioRaw    ? JSON.parse(audioRaw)    : {};
      const settings    = settingsRaw ? JSON.parse(settingsRaw) : {};

      this._config = {
        musicVolume:  audio.musicVolume  ?? AUDIO.MUSIC_VOLUME,
        sfxVolume:    audio.sfxVolume    ?? AUDIO.SFX_VOLUME,
        muted:        audio.muted        ?? AUDIO.DEFAULT_MUTED,
        highContrast: settings.highContrast ?? false,
        fontSize:     settings.fontSize     ?? 'normal',
      };
    } catch {
      this._config = {
        musicVolume:  AUDIO.MUSIC_VOLUME,
        sfxVolume:    AUDIO.SFX_VOLUME,
        muted:        false,
        highContrast: false,
        fontSize:     'normal',
      };
    }
  }

  // ─── create ──────────────────────────────────────────────────────────────────
  create() {
    const cx = GAME_WIDTH  / 2;
    const cy = GAME_HEIGHT / 2;

    this._selectedIndex = 0;

    this._createBackground(cx, cy);
    this._createTitle(cx);
    this._createOptions(cx, cy);
    this._createInstructions(cx);
    this._setupInput();
    this._updateAllOptions();

    this.cameras.main.fadeIn(500, 0, 0, 0);

    console.log('[SettingsScene] Config cargada:', this._config);
  }

  // ─── Construcción visual ──────────────────────────────────────────────────────

  _createBackground(cx, cy) {
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x04050F);

    const lines = this.add.graphics();
    lines.lineStyle(1, 0x111133, 0.5);
    for (let y = 0; y < GAME_HEIGHT; y += 10) {
      lines.lineBetween(0, y, GAME_WIDTH, y);
    }

    const border = this.add.graphics();
    border.lineStyle(2, 0xFFD700, 0.8);
    border.strokeRect(10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20);
  }

  _createTitle(cx) {
    this.add.text(cx, 36, 'CONFIGURACIÓN', {
      fontFamily: 'monospace',
      fontSize:   '26px',
      color:      '#FFD700',
      stroke:     '#8B6914',
      strokeThickness: 3,
    }).setOrigin(0.5);

    const line = this.add.graphics();
    line.lineStyle(1, 0xFFD700, 0.6);
    line.lineBetween(cx - 180, 58, cx + 180, 58);
  }

  /**
   * Crea la lista de opciones del menú de configuración.
   * Cada opción tiene una etiqueta a la izquierda y su valor a la derecha.
   */
  _createOptions(cx, cy) {
    const startY  = 90;
    const spacing = 48;

    this._optionRows  = [];
    this._cursor      = this.add.text(cx - 200, startY, '▶', {
      fontFamily: 'monospace', fontSize: '16px', color: '#FFD700',
    }).setOrigin(0.5);

    SETTINGS_OPTIONS.forEach((opt, i) => {
      const y = startY + i * spacing;

      // Etiqueta de la opción
      const label = this.add.text(cx - 160, y, opt.label, {
        fontFamily: 'monospace',
        fontSize:   '16px',
        color:      '#CCCCCC',
      }).setOrigin(0, 0.5);

      // Valor / control de la opción
      const value = this.add.text(cx + 140, y, '', {
        fontFamily: 'monospace',
        fontSize:   '16px',
        color:      '#FFD700',
      }).setOrigin(1, 0.5);

      // Para sliders: barra gráfica
      let bar = null;
      if (opt.type === 'slider') {
        bar = this.add.graphics();
      }

      this._optionRows.push({ opt, label, value, bar, y });
    });
  }

  /**
   * Instrucciones de navegación en la parte inferior.
   */
  _createInstructions(cx) {
    this.add.text(cx, GAME_HEIGHT - 20,
      'W/S: Navegar   A/D o ←/→: Cambiar   ESC: Volver', {
      fontFamily: 'monospace',
      fontSize:   '10px',
      color:      '#555577',
    }).setOrigin(0.5);
  }

  // ─── Input ────────────────────────────────────────────────────────────────────

  _setupInput() {
    this.input.keyboard.on('keydown-W',     this._onUp,      this);
    this.input.keyboard.on('keydown-UP',    this._onUp,      this);
    this.input.keyboard.on('keydown-S',     this._onDown,    this);
    this.input.keyboard.on('keydown-DOWN',  this._onDown,    this);
    this.input.keyboard.on('keydown-A',     this._onLeft,    this);
    this.input.keyboard.on('keydown-LEFT',  this._onLeft,    this);
    this.input.keyboard.on('keydown-D',     this._onRight,   this);
    this.input.keyboard.on('keydown-RIGHT', this._onRight,   this);
    this.input.keyboard.on('keydown-SPACE', this._onConfirm, this);
    this.input.keyboard.on('keydown-ENTER', this._onConfirm, this);
    this.input.keyboard.on('keydown-ESC',   this._onBack,    this);
  }

  _onUp() {
    this._selectedIndex =
      (this._selectedIndex - 1 + SETTINGS_OPTIONS.length) % SETTINGS_OPTIONS.length;
    this._updateAllOptions();
  }

  _onDown() {
    this._selectedIndex =
      (this._selectedIndex + 1) % SETTINGS_OPTIONS.length;
    this._updateAllOptions();
  }

  _onLeft() {
    this._changeValue(-1);
  }

  _onRight() {
    this._changeValue(1);
  }

  _onConfirm() {
    const opt = SETTINGS_OPTIONS[this._selectedIndex];
    if (opt.type === 'toggle') {
      this._changeValue(1);
    } else if (opt.id === '_back') {
      this._onBack();
    }
  }

  _onBack() {
    this._saveConfig();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENES.MENU);
    });
  }

  // ─── Lógica de cambio de valores ──────────────────────────────────────────────

  /**
   * Modifica el valor de la opción seleccionada.
   * @param {number} direction — -1 (izquierda/disminuir) o +1 (derecha/aumentar)
   */
  _changeValue(direction) {
    const opt = SETTINGS_OPTIONS[this._selectedIndex];
    if (!opt) return;

    switch (opt.type) {
      case 'slider': {
        // Aumentar o disminuir en el step definido
        let val = this._config[opt.id] + direction * opt.step;
        val     = Math.round(val * 10) / 10; // evitar decimales flotantes
        this._config[opt.id] = Phaser.Math.Clamp(val, opt.min, opt.max);
        break;
      }
      case 'toggle': {
        this._config[opt.id] = !this._config[opt.id];
        break;
      }
      case 'cycle': {
        // Rotar entre los valores disponibles
        const current = opt.values.indexOf(this._config[opt.id]);
        const next    = (current + direction + opt.values.length) % opt.values.length;
        this._config[opt.id] = opt.values[next];
        break;
      }
      case 'action': {
        if (opt.id === '_back') this._onBack();
        break;
      }
    }

    // Aplicar cambios de audio en tiempo real
    this._applyAudioConfig();
    this._updateAllOptions();
  }

  /**
   * Aplica la configuración de audio actual al sistema de sonido de Phaser.
   */
  _applyAudioConfig() {
    this.game.sound.mute   = this._config.muted;
    this.game.sound.volume = this._config.musicVolume;

    // Actualizar registry para que AudioManager lo lea
    this.registry.set('audioConfig', {
      musicVolume: this._config.musicVolume,
      sfxVolume:   this._config.sfxVolume,
      muted:       this._config.muted,
    });
  }

  // ─── Actualización visual ─────────────────────────────────────────────────────

  /**
   * Redibuja todos los controles con los valores actuales.
   */
  _updateAllOptions() {
    const startY  = 90;
    const spacing = 48;
    const cx      = GAME_WIDTH / 2;

    this._optionRows.forEach((row, i) => {
      const { opt, label, value, bar } = row;
      const isSelected = i === this._selectedIndex;

      // Color de etiqueta según selección
      label.setColor(isSelected ? '#FFD700' : '#CCCCCC');

      // Renderizar valor según tipo
      switch (opt.type) {
        case 'slider': {
          const val     = this._config[opt.id];
          const pct     = (val - opt.min) / (opt.max - opt.min);
          const barW    = 120;
          const barX    = cx + 20;
          const barY    = row.y;

          // Dibujar barra
          if (bar) {
            bar.clear();
            // Fondo
            bar.fillStyle(0x222244);
            bar.fillRect(barX, barY - 5, barW, 10);
            // Relleno
            bar.fillStyle(isSelected ? 0xFFD700 : 0x4466AA);
            bar.fillRect(barX, barY - 5, Math.floor(barW * pct), 10);
            // Borde
            bar.lineStyle(1, isSelected ? 0xFFD700 : 0x334488, 0.8);
            bar.strokeRect(barX, barY - 5, barW, 10);
          }

          value.setText(`${Math.round(val * 100)}%`);
          break;
        }
        case 'toggle': {
          const isOn = this._config[opt.id];
          value.setText(isOn ? '[ ON  ]' : '[ OFF ]');
          value.setColor(isOn ? '#44FF44' : '#FF4444');
          break;
        }
        case 'cycle': {
          const idx   = opt.values.indexOf(this._config[opt.id]);
          const lbl   = opt.labels?.[idx] ?? this._config[opt.id];
          value.setText(`◀ ${lbl} ▶`);
          break;
        }
        case 'action': {
          value.setText('');
          label.setColor(isSelected ? '#FF6666' : '#AAAAAA');
          break;
        }
      }
    });

    // Mover cursor a la opción activa
    this._cursor.setY(startY + this._selectedIndex * spacing);
  }

  // ─── Persistencia ─────────────────────────────────────────────────────────────

  /**
   * Guarda la configuración completa en localStorage.
   */
  _saveConfig() {
    try {
      const audioConfig = {
        musicVolume: this._config.musicVolume,
        sfxVolume:   this._config.sfxVolume,
        muted:       this._config.muted,
      };
      const settings = {
        highContrast: this._config.highContrast,
        fontSize:     this._config.fontSize,
      };

      localStorage.setItem(STORAGE_KEYS.AUDIO_CONFIG, JSON.stringify(audioConfig));
      localStorage.setItem(STORAGE_KEYS.SETTINGS,     JSON.stringify(settings));

      // Actualizar registry global
      this.registry.set('audioConfig', audioConfig);
      this.registry.set('settings',    settings);

      console.log('[SettingsScene] Config guardada:', { audioConfig, settings });
    } catch (err) {
      console.error('[SettingsScene] Error al guardar config:', err);
    }
  }

  // ─── Limpieza ─────────────────────────────────────────────────────────────────

  shutdown() {
    this.input.keyboard.off('keydown-W',     this._onUp,      this);
    this.input.keyboard.off('keydown-UP',    this._onUp,      this);
    this.input.keyboard.off('keydown-S',     this._onDown,    this);
    this.input.keyboard.off('keydown-DOWN',  this._onDown,    this);
    this.input.keyboard.off('keydown-A',     this._onLeft,    this);
    this.input.keyboard.off('keydown-LEFT',  this._onLeft,    this);
    this.input.keyboard.off('keydown-D',     this._onRight,   this);
    this.input.keyboard.off('keydown-RIGHT', this._onRight,   this);
    this.input.keyboard.off('keydown-SPACE', this._onConfirm, this);
    this.input.keyboard.off('keydown-ENTER', this._onConfirm, this);
    this.input.keyboard.off('keydown-ESC',   this._onBack,    this);
  }
}