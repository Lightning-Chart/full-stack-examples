import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
	const rootDir = path.resolve(import.meta.dirname, '../../');
	return {
		plugins: [react()],
		envDir: rootDir,
		define: {
			'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
		},
		build: {
			lib: {
				entry: {
					// Read the wrapper file at Vite build
					'react-scenarios': path.resolve(import.meta.dirname, 'src/react-wrapper.tsx'),
				},
				formats: ['es'],
				fileName: (format, entryName) => `${entryName}.js`,
			},
			rollupOptions: {
				external: [],  
				output: {
					format: 'es',
				}
			},
		},
		server: {
			fs: {
				allow: [rootDir] 
			}
		},
	};
})
