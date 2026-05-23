import Phaser from 'phaser';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  create() {
    // Placeholder: ir directo a PreloadScene cuando esté lista
    // this.scene.start('PreloadScene');
    console.log('SettingsScene lista');
  }
}