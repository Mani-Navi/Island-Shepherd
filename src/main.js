import Phaser from 'phaser';
import './style.css';
import { GameScene } from './scenes/GameScene.js';
import { generateTextures } from './utils/TextureGen.js';

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        generateTextures(this);
        this.scene.start('GameScene');
    }
}

function getHiDpiViewport() {
    const container = document.getElementById('game-container');
    const cssW = Math.max(320, Math.round(container?.clientWidth || window.innerWidth));
    const cssH = Math.max(320, Math.round(container?.clientHeight || window.innerHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    return {
        cssW,
        cssH,
        dpr,
        width: Math.round(cssW * dpr),
        height: Math.round(cssH * dpr),
    };
}

const initial = getHiDpiViewport();

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: initial.width,
    height: initial.height,
    backgroundColor: '#1687c9',
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false,
    render: {
        antialias: true,
        antialiasGL: true,
        pixelArt: false,
        roundPixels: false,
        powerPreference: 'high-performance',
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GameScene],
};

const game = new Phaser.Game(config);

let resizeRaf = null;
const handleViewportResize = () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
        const vp = getHiDpiViewport();
        // setGameSize نسبت تصویر پایه را هم همگام می‌کند تا جزیره بیضی نشود
        game.scale.setGameSize(vp.width, vp.height);
        game.scale.refresh();
    });
};

window.addEventListener('resize', handleViewportResize);
window.addEventListener('orientationchange', () => setTimeout(handleViewportResize, 180));
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportResize);
}