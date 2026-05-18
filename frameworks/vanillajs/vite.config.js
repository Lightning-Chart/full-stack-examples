import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
	const rootDir = path.resolve(__dirname, '../../');
	return {
		envDir: rootDir,
		define: {
			'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
		},
		// Tell Vite where to find "shared", because VanillaJS framework doesn't contain tsconfig files
		resolve: {
			alias: {
				'shared': path.resolve(__dirname, '../../shared/src/index.ts')
			}
		},
		build: {
			lib: {
				entry: {
					// Read the wrapper file at Vite build
					'vanillajs-scenarios': path.resolve(__dirname, 'src/vanillajs-wrapper.js'),},
				formats: ['es'],
				fileName: (format, entryName) => `${entryName}.js`,
			},
			rollupOptions: {
				output: { preserveModules: false, }
			},
		},
		server: {
			fs: {
				allow: [rootDir] 
			}
		},
	};
})