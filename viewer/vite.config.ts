import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react';
import path from 'node:path';
import sirv from 'sirv';

const githubPagesBase = '/full-stack-examples/';

export default defineConfig(() => ({
	base: process.env.GITHUB_ACTIONS === 'true' ? githubPagesBase : '/',
	plugins: [
		react(),
		{
			name: 'serve-frameworks',
			configureServer(server) {
				server.middlewares.use(
					'/frameworks',
					sirv(path.resolve(import.meta.dirname, '../frameworks'), { dev: true })
				);
			},
		},
	],
	envDir: '../',
	resolve: {
		alias: {
			'react': path.resolve(import.meta.dirname, '../node_modules/react'),
			'react-dom': path.resolve(import.meta.dirname, '../node_modules/react-dom'),
			'shared': path.resolve(import.meta.dirname, '../shared/src/index.ts'),
		},
		dedupe: ['react', 'react-dom'],
	},
	optimizeDeps: {
		include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
		exclude: ['@lightningchart/lcjs'],
	},
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				secure: false,
			},
		},
		fs: {
			allow: ['..'],
		},
	},
}))
