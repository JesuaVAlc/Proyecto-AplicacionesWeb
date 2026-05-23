import Phaser from 'phaser';

export class SaveScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SaveScene' });
  }

  create() {
    // Placeholder: ir directo a PreloadScene cuando esté lista
    // this.scene.start('PreloadScene');
    console.log('SaveScene lista');
  }
}