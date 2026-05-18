import { 
	Scenario, 
	SensorData, 
	MultiStaticBinaryData, 
	RealtimeBinaryData, 
	GeneratedMockData 
} from 'shared';

declare global {
    interface Window {
        __SHARED_MOCK_CACHE__?: Record<string, GeneratedMockData>;
    }
}

interface MachineProfile {
    id: string;
    tempMu: number;
    tempTheta: number;
    tempSigma: number;
    vibMu: number;
    vibTheta: number;
    vibSigma: number;
}

// Helper functions for data generators
const MACHINE_PROFILES: MachineProfile[] = [
	{ id: 'M1', tempMu: 71.6, tempTheta: 0.02, tempSigma: 0.1, vibMu: 2.5, vibTheta: 0.05, vibSigma: 0.1 },
	{ id: 'M2', tempMu: 75.6, tempTheta: 0.02, tempSigma: 0.1, vibMu: 3.2, vibTheta: 0.05, vibSigma: 0.1 },
	{ id: 'M3', tempMu: 78.6, tempTheta: 0.02, tempSigma: 0.1, vibMu: 3.8, vibTheta: 0.05, vibSigma: 0.1 },
	{ id: 'M4', tempMu: 73.6, tempTheta: 0.02, tempSigma: 0.1, vibMu: 2.9, vibTheta: 0.05, vibSigma: 0.1 }
];

const machineStates: Record<string, { temp: number; vib: number }> = {};

const randomNormal = (mean: number, stdDev: number): number => {
	let u = 0, v = 0;
	while (u === 0) u = Math.random();
	while (v === 0) v = Math.random();
	const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
	return mean + stdDev * z;
};

const updateOUProcess = (current: number, mu: number, theta: number, sigma: number): number => {
	const drift = theta * (mu - current);
	const diffusion = sigma * randomNormal(0, 1);
	return current + drift + diffusion;
};

const getRandomThroughput = (): number => {
	const r = Math.random();
	if (r < 0.25) return 3;
	if (r < 0.50) return 4;
	if (r < 0.70) return 2;
	if (r < 0.85) return 5;
	if (r < 0.95) return 1;
	return 0;
};

const getSeededRandom = (seed: number) => {
	return function() {
		seed = (seed * 9301 + 49297) % 233280;
		return seed / 233280;
	};
};

const createSeededNormal = (rng: () => number) => {
	return (mean: number, stdDev: number): number => {
		let u = 0, v = 0;
		while (u === 0) u = rng();
		while (v === 0) v = rng();
		const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
		return mean + stdDev * z;
	};
};

const generateMachineDataPoint = (profile: MachineProfile) => {
	if (!machineStates[profile.id]) {
		machineStates[profile.id] = { temp: profile.tempMu, vib: profile.vibMu };
	}
	const state = machineStates[profile.id];
	state.temp = updateOUProcess(state.temp, profile.tempMu, profile.tempTheta, profile.tempSigma);
	state.vib = updateOUProcess(state.vib, profile.vibMu, profile.vibTheta, profile.vibSigma);
	return {
		temp_C: parseFloat(state.temp.toFixed(2)),
		vibration_mm_s: parseFloat(state.vib.toFixed(2)),
		status: state.vib >= 4.2 ? 'WARN' : 'OK'
	};
};

const getStaticRawData = () => {
	const pointsPerMachine = 30000;
	const numMachines = 3;
	const startTimeUnix = Date.parse('2025-02-12T10:00:00.000Z');
	const rng = getSeededRandom(987654);
	const seededNormal = createSeededNormal(rng);
	const rawData = [
		{ timestamps: new Float64Array(pointsPerMachine), temperatures: new Float32Array(pointsPerMachine) },
		{ timestamps: new Float64Array(pointsPerMachine), temperatures: new Float32Array(pointsPerMachine) },
		{ timestamps: new Float64Array(pointsPerMachine), temperatures: new Float32Array(pointsPerMachine) }
	];
	const mus = [71.6, 75.6, 78.6];
	for (let m = 0; m < numMachines; m++) {
		let temp = mus[m];
		for (let i = 0; i < pointsPerMachine; i++) {
			rawData[m].timestamps[i] = startTimeUnix + i * 10;
			temp += 0.02 * (mus[m] - temp) + 0.1 * seededNormal(0, 1);
			rawData[m].temperatures[i] = Number(temp.toFixed(2));
		}
	}
	return { rawData, pointsPerMachine };
};

const getRealtimeRawData = () => {
	const pointsPerMachine = 30000;
	const numMachines = 3;
	const startTimeUnix = Date.parse('2025-02-12T10:00:00.000Z');
	const rng = getSeededRandom(123456);
	const seededNormal = createSeededNormal(rng);
	const rawData = [
		{ timestamps: new Float64Array(pointsPerMachine), vibrations: new Float32Array(pointsPerMachine) },
		{ timestamps: new Float64Array(pointsPerMachine), vibrations: new Float32Array(pointsPerMachine) },
		{ timestamps: new Float64Array(pointsPerMachine), vibrations: new Float32Array(pointsPerMachine) }
	];
	const mus = [2.5, 3.2, 3.8];
	const noiseLevels = [0.15, 0.20, 0.30];
	for (let m = 0; m < numMachines; m++) {
		let state = mus[m];
		for (let i = 0; i < pointsPerMachine; i++) {
			rawData[m].timestamps[i] = startTimeUnix + i * 10;
            
			state += 0.02 * (mus[m] - state) + 0.15 * seededNormal(0, 1);
			const finalVib = state + noiseLevels[m] * seededNormal(0, 1);
            
			rawData[m].vibrations[i] = Number(Math.max(0.1, finalVib).toFixed(2));
		}
	}
	return { rawData, pointsPerMachine };
};

// Scenario data generators
const generateBubbleData = (): SensorData[][] => {
	const data: SensorData[] = [];
	const pointsPerMachine = 6000; 
	for (let i = 0; i < pointsPerMachine; i++) {
		MACHINE_PROFILES.forEach(profile => {
			const point = generateMachineDataPoint(profile);
			data.push({
				machineId: profile.id,
				temperature: point.temp_C,
				vibration: point.vibration_mm_s,
				throughput: getRandomThroughput() || 1
			});
		});
	}
	return [
		data.filter(item => item.machineId === 'M1'),
		data.filter(item => item.machineId === 'M2'),
		data.filter(item => item.machineId === 'M3'),
		data.filter(item => item.machineId === 'M4'),
	];
};

const generateMultiStaticData = (): SensorData[][] => {
	const { rawData, pointsPerMachine } = getStaticRawData();
	const result: SensorData[][] = [[], [], []];
	const machineIds = ['M1', 'M2', 'M3'];
	for (let m = 0; m < 3; m++) {
		for (let i = 0; i < pointsPerMachine; i++) {
			result[m].push({
				timestamp: new Date(rawData[m].timestamps[i]).toISOString(),
				machineId: machineIds[m],
				temperature: rawData[m].temperatures[i]
			});
		}
	}
	return result;
};

const generateMultiStaticBinaryData = (): MultiStaticBinaryData => {
	const { rawData, pointsPerMachine } = getStaticRawData();
	const buffer = new ArrayBuffer(pointsPerMachine * 8 + pointsPerMachine * 12);
	const sharedTimestamps = new Float64Array(buffer, 0, pointsPerMachine);
	const tempM1 = new Float32Array(buffer, pointsPerMachine * 8, pointsPerMachine);
	const tempM2 = new Float32Array(buffer, pointsPerMachine * 8 + pointsPerMachine * 4, pointsPerMachine);
	const tempM3 = new Float32Array(buffer, pointsPerMachine * 8 + pointsPerMachine * 8, pointsPerMachine);
	for (let i = 0; i < pointsPerMachine; i++) {
		sharedTimestamps[i] = rawData[0].timestamps[i];
		tempM1[i] = rawData[0].temperatures[i];
		tempM2[i] = rawData[1].temperatures[i];
		tempM3[i] = rawData[2].temperatures[i];
	}
	return { arrayBuffer: buffer, pointsCount: pointsPerMachine };
};

const generateSyncedChartsData = (): SensorData[] => {
	const data: SensorData[] = [];
	const startTimeUnix = Date.parse('2025-02-12T10:00:00.000Z');
	const profile = MACHINE_PROFILES[0]; 
	const pointsPerMachine = 6000;
	for (let i = 0; i < pointsPerMachine; i++) {
		const timestamp = startTimeUnix + i * 10;
		const point = generateMachineDataPoint(profile);
		data.push({
			timestamp: new Date(timestamp).toISOString(),
			machineId: profile.id,
			temperature: point.temp_C,
			vibration: point.vibration_mm_s,
			throughput: getRandomThroughput() || 1
		});
	}   
	return data;
};

const generateAxisSwitchingData = (): SensorData[] => {
	const data: SensorData[] = [];
	const pointsPerMachine = 501; 
	const rng = getSeededRandom(12345);
	const seededNormal = createSeededNormal(rng);
	for (let i = 0; i < pointsPerMachine; i++) {
		const relativeTime = i * 10;
		let simulatedVib = seededNormal(2.2, 0.8);
		simulatedVib = Math.max(0.1, Math.min(simulatedVib, 4.5));
		const stress = Math.max(0.1, Math.pow(simulatedVib, 2));
		data.push({ machineId: 'M1', relativeTime, stress });
	}
	return data;
};

const generateMultiRealtimeData = (): SensorData[][] => {
	const { rawData, pointsPerMachine } = getRealtimeRawData();
	const result: SensorData[][] = [[], [], []];
	const machineIds = ['M1', 'M2', 'M3'];
	for (let m = 0; m < 3; m++) {
		for (let i = 0; i < pointsPerMachine; i++) {
			result[m].push({
				timestamp: rawData[m].timestamps[i],
				machineId: machineIds[m],
				vibration: rawData[m].vibrations[i]
			});
		}
	}
	return result;
};

const generateMultiRealtimeBinaryData = (): RealtimeBinaryData[] => {
	const { rawData } = getRealtimeRawData();
	const result = [];
	for (let m = 0; m < 3; m++) {
		result.push({
			timestamps: rawData[m].timestamps,
			vibrations: rawData[m].vibrations
		});
	}
	return result;
};

// Main function
export const getMockData = (scenario: Scenario): GeneratedMockData => {
	// Check if data for this scenario has already been created
	if (typeof window !== 'undefined') {
		if (!window.__SHARED_MOCK_CACHE__) {
			window.__SHARED_MOCK_CACHE__ = {};
		}
		const cache = window.__SHARED_MOCK_CACHE__;
		if (cache[scenario.id]) {
			return cache[scenario.id];
		}
	}
	let generatedData: GeneratedMockData;
	switch (scenario.id) {
	case 'bubble-static':
		generatedData = generateBubbleData();
		break;
	case 'multi-static':
		generatedData = generateMultiStaticData();
		break;
	case 'multi-static-binary':
		generatedData = generateMultiStaticBinaryData();
		break;
	case 'synced-charts':
		generatedData = generateSyncedChartsData();
		break;
	case 'axis-switching':
		generatedData = generateAxisSwitchingData();
		break;
	case 'multi-realtime':
		generatedData = generateMultiRealtimeData();
		break;
	case 'multi-realtime-binary':
		generatedData = generateMultiRealtimeBinaryData();
		break;
	default:
		console.warn(`No mock data generator defined for scenario: ${scenario.id}`);
		generatedData = [];
	}
	// Save generated data to cache
	if (typeof window !== 'undefined' && window.__SHARED_MOCK_CACHE__) {
		window.__SHARED_MOCK_CACHE__[scenario.id] = generatedData;
	}
	return generatedData;
};