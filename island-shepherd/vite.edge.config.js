import { defineConfig } from 'vite';

export default defineConfig({
    define: {
        'import.meta.env.VITE_EDGE_API_URL': JSON.stringify(''),
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
        outDir: 'dist-edge',
        emptyOutDir: true,
        minify: true,
        lib: {
            entry: 'src/main.js',
            name: 'IslandShepherd',
            formats: ['iife'],
            fileName: () => 'game.iife.js',
        },
        rollupOptions: {
            external: ['phaser'],
            output: {
                globals: {
                    phaser: 'Phaser',
                },
            },
        },
    },
});