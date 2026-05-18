import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import angular from '@analogjs/vite-plugin-angular';

const tsconfigPath = path.resolve(import.meta.dirname, 'tsconfig.app.json');

export default defineConfig(({ mode }) => {
	const rootDir = path.resolve(import.meta.dirname, '../../');
	const rootEnv = loadEnv(mode, rootDir, 'VITE_');
	return {
		plugins: [
			angular({ tsconfig: tsconfigPath }),
			// Cleans up unintended output directories leaked by the Angular compiler's common root path resolution.
			{
				name: 'cleanup',
				closeBundle() {
					const distSrc = path.resolve(import.meta.dirname, 'dist/src');
					const frameworkShared = path.resolve(import.meta.dirname, '../shared'); 
					if (fs.existsSync(distSrc)) {
						fs.rmSync(distSrc, { recursive: true, force: true });
					}
					if (fs.existsSync(frameworkShared)) {
						fs.rmSync(frameworkShared, { recursive: true, force: true });
					}
				}
			}
		],
		resolve: {
			alias: { 'shared': path.resolve(rootDir, 'shared/src/index.ts') }
		},
		envDir: rootDir, 
		define: {
			'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
			'import.meta.env.VITE_LCJS_LICENSE': JSON.stringify(rootEnv.VITE_LCJS_LICENSE),
			'process.env': {}
		},
		build: {
			emptyOutDir: true,
			lib: {
				entry: {
					'angular-scenarios': path.resolve(import.meta.dirname, 'src/angular-wrapper.ts'),
				},
				formats: ['es'],
				fileName: (_format, entryName) => `${entryName}.js`,
			},
			rollupOptions: {
				external: [],  
				output: {
					format: 'es',
					preserveModules: false
				}
			},
		},
		server: {
			fs: {
				allow: [rootDir] 
			}
		},
	};
});