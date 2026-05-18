import { basicInfo, bubbleInfo, multiStaticInfo , multiStaticBinaryInfo , syncedChartsInfo , axisSwitchingInfo , multiRealtimeInfo, multiRealtimeBinaryInfo } from './infoTexts.js'

export * from './mockData.js';
declare global {
    interface Window {
        __IS_LOCAL_MODE__?: boolean;    
    }
}

export const isLocalMode = (): boolean => {
	if (typeof window === 'undefined') return true;
	if (typeof window.__IS_LOCAL_MODE__ !== 'undefined') return window.__IS_LOCAL_MODE__;
	if (import.meta.env && import.meta.env.DEV) return true;
	return false;
};

// Types
export interface Framework {
  id: 'react' | 'vue' | 'angular' | 'svelte' | 'vanillajs';
  label: string;
  extension: string;
  language: string;}

export interface Scenario {
  id: string;
  label: string;
  fileName: string;
  backend?: 'rest' | 'ws';
  info: string;
}
export interface SensorData {  
    machineId: string;
    timestamp?: string | number;
    temperature?: number;
    vibration?: number;
    throughput?: number;
    status?: string;
    relativeTime?: number;
    stress?: number;  
}

export interface MultiStaticBinaryData {
    arrayBuffer: ArrayBuffer;
    pointsCount: number;
}

export interface RealtimeBinaryData {
    timestamps: Float64Array;
    vibrations: Float32Array;
}

export type GeneratedMockData = 
    | SensorData[][] 
    | SensorData[] 
    | MultiStaticBinaryData 
    | RealtimeBinaryData[];

// Data
export const FRAMEWORKS: Framework[] = [
	{
		id: 'react',
		label: 'React',
		extension: 'tsx',
		language: 'typescript'
	},
	{
		id: 'vue',
		label: 'Vue',
		extension: 'vue',
		language: 'vue'
	},
	{
		id: 'angular',
		label: 'Angular',
		extension: 'ts',
		language: 'angular-ts'
	},
	{
		id: 'svelte',
		label: 'Svelte',
		extension: 'svelte',
		language: 'svelte'
	},
	{
		id: 'vanillajs',
		label: 'Vanilla JS',
		extension: 'js',
		language: 'javascript'
	}
];

export const SCENARIOS: Scenario[] = [
	{
		id: 'basic-chart-component',
		label: 'Basic Chart Component',
		fileName: 'basic-chart-component',
		info: basicInfo,
	},
	{
		id: 'bubble-static',
		label: 'Bubble Chart (Static, JSON)',
		fileName: 'bubble-static',
		backend: 'rest',
		info: bubbleInfo,
	},
	{
		id: 'multi-static',
		label: 'Multi-channel Line Chart (Static, JSON)',
		fileName: 'multi-static',
		backend: 'rest',
		info: multiStaticInfo,
	},
	{
		id: 'multi-static-binary',
		label: 'Multi-channel Line Chart (Static, Binary)',
		fileName: 'multi-static-binary',
		backend: 'rest',
		info: multiStaticBinaryInfo,
	},
	{
		id: 'synced-charts',
		label: 'Synced Charts (DataSet Sharing)',
		fileName: 'synced-charts',
		backend: 'rest',
		info: syncedChartsInfo,
	},
	{
		id: 'axis-switching',
		label: 'Axis Type Switching',
		fileName: 'axis-switching',
		backend: 'rest',
		info: axisSwitchingInfo,
	},
	{
		id: 'multi-realtime',
		label: 'Multi-channel Line Chart (Real Time, JSON)',
		fileName: 'multi-realtime',
		backend: 'ws',
		info: multiRealtimeInfo,
	},
	{
		id: 'multi-realtime-binary',
		label: 'Multi-channel Line Chart (Real Time, Binary)',
		fileName: 'multi-realtime-binary',
		backend: 'ws',
		info: multiRealtimeBinaryInfo,
	}
];