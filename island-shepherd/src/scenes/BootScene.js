import Phaser from 'phaser';
import { generateTextures } from '../utils/TextureGen.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        generateTextures(this);
        this.scene.start('GameScene');
    }
}