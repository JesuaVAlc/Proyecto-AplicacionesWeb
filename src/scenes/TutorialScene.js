import Phaser from 'phaser';

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TutorialScene' });
  }

  create() {
    // Placeholder: ir directo a PreloadScene cuando esté lista
    // this.scene.start('PreloadScene');
    console.log('TutorialScene lista');
  }
}