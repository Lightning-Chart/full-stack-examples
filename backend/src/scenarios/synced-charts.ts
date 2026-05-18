import { Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import { SensorData } from 'shared';

export const handle = async (req: Request, res: Response, db: Database) => {
	try {
		const data = db.prepare(`
			SELECT timestamp, machineId, temperature, vibration, throughput
			FROM sensor_data 
			WHERE timestamp < '2025-02-12T10:01:00.000' AND machineId = 'M1'
		`).all() as SensorData[];
		if (data.length === 0) return res.json([]);

		res.json(data);
	} catch (error) {
		res.status(500).json({ error: `Database query failed: ${error}` });
	}
}; 