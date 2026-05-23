import Phaser from 'phaser';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create() {
    // Placeholder: ir directo a PreloadScene cuando esté lista
    // this.scene.start('PreloadScene');
    console.log('BattleScene lista');
  }
}