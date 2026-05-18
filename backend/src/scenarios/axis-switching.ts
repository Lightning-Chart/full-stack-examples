import { Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import { SensorData } from 'shared';

export const handle = async (req: Request, res: Response, db: Database) => {
	try {
		const data = db.prepare(`
            SELECT timestamp, machineId, vibration
            FROM sensor_data 
            WHERE timestamp >= '2025-02-12T10:00:55.000' 
              AND timestamp <= '2025-02-12T10:01:00.000' 
              AND machineId = 'M1'
            ORDER BY timestamp ASC
        `).all() as SensorData[];
		if (data.length === 0) return res.json([]);
		
		const startTimeMs = new Date(data[0].timestamp).getTime();

		const processedData = data.map(row => {
			const currentTimeMs = new Date(row.timestamp).getTime();
			const relativeTime = (currentTimeMs - startTimeMs);
			// Calculate "stress" as the square of the absolute vibration value
			const stress = Math.pow(Math.abs(row.vibration), 2);
			// Ensure stress is never zero to avoid issues with logarithmic scale
			const safeStress = Math.max(0.1, stress);
			return { relativeTime, stress: safeStress };
		});
		res.json(processedData);
	} catch (error) {
		res.status(500).json({ error: `Database query failed: ${error}` });
	}
};