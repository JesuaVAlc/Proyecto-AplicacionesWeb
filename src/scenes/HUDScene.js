import Phaser from 'phaser';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene' });
  }

  create() {
    // Placeholder: ir directo a PreloadScene cuando esté lista
    // this.scene.start('PreloadScene');
    console.log('HUDScene lista');
  }
}