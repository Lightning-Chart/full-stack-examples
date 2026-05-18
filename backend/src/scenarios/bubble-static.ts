import { Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import { SensorData } from 'shared';

export const handle = async (req: Request, res: Response, db: Database) => {
	try {
		const data = db.prepare(`
			SELECT timestamp, machineId, temperature, vibration, throughput
			FROM sensor_data 
			WHERE timestamp < '2025-02-12T10:01:00.000'
			ORDER BY machineId
		`).all() as SensorData[];
		if (data.length === 0) return res.json([]);
        
		const groupedData = [
			data.filter((item: { machineId: string; }) => item.machineId === 'M1'),
			data.filter((item: { machineId: string; }) => item.machineId === 'M2'),
			data.filter((item: { machineId: string; }) => item.machineId === 'M3'),
			data.filter((item: { machineId: string; }) => item.machineId === 'M4'),
		];
		res.json(groupedData);
	} catch (error) {
		res.status(500).json({ error: `Database query failed: ${error}` });
	}
}; 