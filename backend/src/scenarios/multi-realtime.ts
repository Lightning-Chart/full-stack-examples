import { Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import { WebSocket } from 'ws';
import { SensorData } from 'shared';

export const handle = async (req: Request, res: Response, db: Database, ws?: WebSocket) => {
	if (!ws) return;
	const data = db.prepare(`
        SELECT timestamp, machineId, vibration
        FROM sensor_data 
        ORDER BY timestamp  
    `).all() as SensorData[];
	if (data.length === 0) return res.json([]);

	const groupedData = [
		data.filter((item: { machineId: string; }) => item.machineId === 'M1'),
		data.filter((item: { machineId: string; }) => item.machineId === 'M2'),
		data.filter((item: { machineId: string; }) => item.machineId === 'M3'),
	];
	const startTime = performance.now();
	const pointsSent = 0;
    
	const interval = setInterval(() => {
		const elapsedMs = performance.now() - startTime;
		// Calculate how many 10 ms steps should have been sent
		const totalStepsTarget = Math.floor(elapsedMs / 10);
		const stepsToSend = totalStepsTarget - pointsSent;
		if (stepsToSend > 0) {
			// Check if there's any data left to send
			if (pointsSent < groupedData[0].length) {
			// Send data in batches corresponding to the number of steps to send
				const startIndex = pointsSent;
				const endIndex = pointsSent + stepsToSend;
				const batch = [
					groupedData[0].slice(startIndex, endIndex),
					groupedData[1].slice(startIndex, endIndex),
					groupedData[2].slice(startIndex, endIndex)
				];
				ws.send(JSON.stringify(batch));
			} else {
				clearInterval(interval);
			}
		}
	}, 20);
	ws.on('close', () => {
		clearInterval(interval);
		console.log("Connection closed.");
	});
};  