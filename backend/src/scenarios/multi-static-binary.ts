import { Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import { SensorData } from 'shared';

export const handle = async (req: Request, res: Response, db: Database) => {
	try {
		const data = db.prepare(`
            SELECT timestamp, machineId, temperature
            FROM sensor_data 
            WHERE timestamp < '2025-02-12T10:05:00.000' AND machineId IN ('M1', 'M2', 'M3')
            ORDER BY timestamp ASC
        `).all() as SensorData[];
		if (data.length === 0) return res.json([]);

		const m1 = data.filter(item => item.machineId === 'M1');
		const m2 = data.filter(item => item.machineId === 'M2');
		const m3 = data.filter(item => item.machineId === 'M3');
		const pointsPerMachine = m1.length;
		const buffer = new ArrayBuffer(pointsPerMachine * 8 + pointsPerMachine * 12);
		const timestamps = new Float64Array(buffer, 0, pointsPerMachine);
		const tempM1 = new Float32Array(buffer, pointsPerMachine * 8, pointsPerMachine);
		const tempM2 = new Float32Array(buffer, pointsPerMachine * 8 + pointsPerMachine * 4, pointsPerMachine);
		const tempM3 = new Float32Array(buffer, pointsPerMachine * 8 + pointsPerMachine * 8, pointsPerMachine);

		for (let i = 0; i < pointsPerMachine; i++) {
			timestamps[i] = new Date(m1[i].timestamp).getTime();
			tempM1[i] = m1[i].temperature;
			tempM2[i] = m2[i]?.temperature ?? 0;
			tempM3[i] = m3[i]?.temperature ?? 0;
		}
		res.setHeader('Points-Count', pointsPerMachine.toString());
		res.setHeader('Content-Type', 'application/octet-stream');
		res.send(Buffer.from(buffer));
	} catch (error) {
		res.status(500).json({ error: `Database query failed: ${error}` });
	}
};