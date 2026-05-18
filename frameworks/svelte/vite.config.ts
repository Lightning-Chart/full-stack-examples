import { defineConfig } from 'vite';
import path from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ mode }) => {
	const rootDir = path.resolve(import.meta.dirname, '../../');
	return {
		plugins: [svelte()],
		envDir: rootDir,
		define: {
			'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
		},
		build: {
			lib: {
				entry: {
					// Read the wrapper file at Vite build
					'svelte-scenarios': path.resolve(import.meta.dirname, 'src/svelte-wrapper.ts'),},
				formats: ['es'],
				fileName: (format, entryName) => `${entryName}.js`,
			},
			rollupOptions: {
				external: [],  
				output: { format: 'es', }
			},
		},
		server: {
			fs: {
				allow: [rootDir] 
			}
		},
	};
})
