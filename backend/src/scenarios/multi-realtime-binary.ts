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
		data.filter(item => item.machineId === 'M1'),
		data.filter(item => item.machineId === 'M2'),
		data.filter(item => item.machineId === 'M3'),
	];
	const startTime = performance.now();
	let pointsSent = 0;
	const maxPoints = groupedData[0].length;

	const interval = setInterval(() => {
		const elapsedMs = performance.now() - startTime;
		// Calculate how many 10 ms steps should have been sent
		const totalStepsTarget = Math.floor(elapsedMs / 10);
		const stepsToSend = totalStepsTarget - pointsSent;
		if (stepsToSend <= 0) return;

		if (pointsSent < maxPoints) {
			const startIndex = pointsSent;
			const endIndex = Math.min(pointsSent + stepsToSend, maxPoints);
			const currentBatchSize = endIndex - startIndex;
			if (currentBatchSize <= 0) return;
			// Send each machine's data as its own binary frame
			groupedData.forEach((machineData, machineIndex) => {
				const batch = machineData.slice(startIndex, endIndex);
				if (batch.length === 0) return;
				const buffer = new ArrayBuffer(8 + currentBatchSize * 8 + currentBatchSize * 4);
				const view = new DataView(buffer);
				// The first byte indicates the machine index (0, 1, or 2)
				view.setUint8(0, machineIndex);
				const timestamps = new Float64Array(buffer, 8, currentBatchSize);
				const vibrations = new Float32Array(buffer, 8 + currentBatchSize * 8, currentBatchSize);
				batch.forEach((row, i) => {
					const ts = typeof row.timestamp === 'string' ? Date.parse(row.timestamp) : (row.timestamp ?? 0);
					timestamps[i] = ts as number;
					vibrations[i] = row.vibration ?? 0;
				});
				ws.send(Buffer.from(buffer), { binary: true });
			});
			pointsSent += currentBatchSize; 
		} else {
			clearInterval(interval);
		}
	}, 20);

	ws.on('close', () => {
		clearInterval(interval);
		console.log("Connection closed.");
	});
};