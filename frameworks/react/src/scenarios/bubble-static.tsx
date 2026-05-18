import { useEffect, useContext, useRef } from "react";
import { Themes, ChartXY, PointLineAreaSeries, isHitSampleXY } from "@lightningchart/lcjs";
import { LCContext } from "../LC";
import { isLocalMode, getMockData, Scenario, SensorData } from "shared";

export function BubbleStatic({ activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes }) {
	// LCContext is a React context that you can use for sharing LightningChart resources between all charts that are created during the application lifetime.
	// More about LCContext: https://lightningchart.com/js-charts/docs/frameworks/react/#optimizing-apps-with-several-charts-visible-at-once--charts-being-initialized-often
	const lc = useContext(LCContext);
	const chartRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = chartRef.current;
		if (!container || !lc) return
		const chart: ChartXY = lc.ChartXY({
			container,
			theme: Themes[theme],
		})
			.setTitle('Temperature and Vibration by Throughput')
			.setCursorMode('show-nearest');
		chart.axisX.setTitle('Temperature (°C)');
		chart.axisY.setTitle('Vibration (mm/s)');
		const allSeries: PointLineAreaSeries[] = [];
		for (let i = 0; i < 4; i += 1) {
			const series = chart.addPointSeries({
				schema: {
					temperature: { pattern: null },
					vibration: { pattern: null },
					throughput: { pattern: null },
					machineId: { nonNumeric: true }
				}
			})
				.setName(`Machine ${i + 1}`)
				.setDataMapping({ x: 'temperature', y: 'vibration', size: 'throughput' });
			allSeries.push(series);
		};
		let isActive = true;
        
		const setupData = async () => {
			try {
				let data: SensorData[][] = [];
				if (isLocalMode()) {
					const res = await fetch(`/api/scenarios/${activeScenario.fileName}`);
					data = await res.json();
				} else {
					data = getMockData(activeScenario) as SensorData[][];
				}
				if (!isActive || chart.isDisposed()) return;       
                
				for (let i = 0; i < allSeries.length; i++) {
					allSeries[i]
						.appendJSON(data[i], { whitelist: ['machineId', 'temperature', 'vibration', 'throughput'] });
				};
				chart.setCursorFormatting((_, hit) => {
					if (!isHitSampleXY(hit)) return undefined
					return [
						[{ text: 'Temperature (°C)', font: { weight: 'bold' } }, '', hit.x.toFixed(2)],
						[{ text: 'Vibration (mm/s)', font: { weight: 'bold' } }, '', hit.y.toFixed(2)],
						[{ text: 'Throughput', font: { weight: 'bold' } }, '', hit.size?.toFixed(0)]
					]
				});
			} catch (err) {
				console.error("Failed to fetch data:", err);
				return;
			}
		};
		setupData();
        
		return () => {
			isActive = false;
			chart.dispose();
		};
	}, [lc, activeScenario, theme]);

	return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
}