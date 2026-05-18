import DatabaseConstructor from 'better-sqlite3';
import path from 'node:path';
import csvtojson from 'csvtojson';
export const db: DatabaseConstructor.Database = new DatabaseConstructor('database.db');

const relativePath = "shared/data/sensor_stream_100hz.csv";
const absolutePath = path.resolve(import.meta.dirname, '../../', relativePath);

export const initializeDatabase = async () => {
	const query = `
		CREATE TABLE IF NOT EXISTS sensor_data (
			timestamp TEXT,
			machineId TEXT,
			temperature REAL,
			vibration REAL,
			throughput REAL,
			status TEXT
		);
	`;
	db.exec(query);

	// Check if data exists already, if not insert some data
	const checkData = db.prepare("SELECT count(*) as count FROM sensor_data").get() as { count: number };

	if (checkData.count === 0) {
		try {
			const data = await csvtojson().fromFile(absolutePath);
			const insertData = db.prepare("INSERT INTO sensor_data (timestamp, machineId, temperature, vibration, throughput, status) VALUES (?,?,?,?,?,?)");
			const insertMany = db.transaction((rows) => {
				for (const d of rows) {
					insertData.run(d.timestamp, d.machine_id, d.temp_C, d.vibration_mm_s, d.throughput_units, d.status);
				}
			});
			insertMany(data);
			console.log(`Database initialized: ${data.length} rows inserted.`);
		} catch (error) {
			console.error('Error loading CSV data into database:', error);
		}
	} else {
		console.log('Database already contains data, skipping CSV import.');
	}
};