import { defineConfig } from 'vite';
import path from 'node:path';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
	const rootDir = path.resolve(import.meta.dirname, '../../');
	return {
		plugins: [vue()],
		envDir: rootDir,
		define: {
			'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
		},
		build: {
			lib: {
				entry: {
					// Read the wrapper file at Vite build
					'vue-scenarios': path.resolve(import.meta.dirname, 'src/vue-wrapper.ts'),},
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
