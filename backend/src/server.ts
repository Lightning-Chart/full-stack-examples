import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { WebSocketServer } from 'ws';
import { initializeDatabase, db } from './database.js';
import { isLocalMode, SCENARIOS } from 'shared';

const app = express();
app.use(cors());
const port = 3000;

// Source code fetcher (for Shiki)
app.get('/api/source', (req, res) => {
	const relativePath = req.query.path as string;
	const absolutePath = path.resolve(import.meta.dirname, '../../', relativePath);
	try {
		const content = fs.readFileSync(absolutePath, 'utf-8');
		res.header('Content-Type', 'text/plain');
		res.send(content);
	} catch (error) {
		res.status(404).json({ error: 'File not found:' + error });
	}
});

// Serve llms-folder
const llmsDir = path.join(import.meta.dirname, '../llms');
app.use('/', express.static(llmsDir, {
	setHeaders: (res, filePath) => {
		if (filePath.endsWith('.txt')) {
			res.setHeader('Content-Type', 'text/plain; charset=utf-8');
		}
	}
}));

if (isLocalMode()) {
	// Initialize database at server start
	await initializeDatabase();

	// REST scenario routing
	// Directs requests to the right scenario file in /backend/src/scenarios/ based on /shared/scenarios.ts
	SCENARIOS.forEach(scenario => {
		if (scenario.backend === 'rest') {
			app.get(`/api/scenarios/${scenario.fileName}`, async (req, res) => {
				try {
					const scenarioModule = await import(`./scenarios/${scenario.fileName}.ts`);
					await scenarioModule.handle(req, res, db);
				} catch (error) {
					console.error(`Error handling scenario ${scenario.id}:`, error);
					res.status(500).json({ error: 'Scenario handling failed' });
				}
			});
		} else if (scenario.backend === 'ws') {
			return;
		} else {
			console.warn(`Unknown backend type for scenario ${scenario.id}: ${scenario.backend}`);
		}
	});

	// Start the server
	const server = app.listen(port, () => {
		console.log(`Backend running at http://localhost:${port}`)
	})

	// WebSocket server setup
	const wss = new WebSocketServer({ server });

	wss.on('connection', async (ws, req) => {
		const url = req.url || '';
		const urlParts = url.split('/');
		const requestedFileName = urlParts[urlParts.length - 1];
		const scenario = SCENARIOS.find(s => s.fileName === requestedFileName);
        
		if (!scenario || scenario.backend !== 'ws') {
			console.warn(`WebSocket connection rejected: Scenario not found for URL ${url}`);
			ws.close();
			return;
		}
		try {
			const scenarioModule = await import(`./scenarios/${scenario.fileName}.ts`);
			await scenarioModule.handle(req, null, db, ws);    
		} catch (error) {
			console.error(`Error handling WebSocket scenario ${scenario.id}:`, error);
			ws.close();
		}
		ws.on("close", () => {
			console.log("Client disconnected");
		});
	});

} else {
	app.listen(port, () => {
		console.log(`Server running at http://localhost:${port}`);
	});
}