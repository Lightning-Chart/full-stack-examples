import { useEffect, useContext, useRef } from "react";
import { Themes, ChartXY, PointLineAreaSeries, AxisTickStrategies } from "@lightningchart/lcjs";
import { LCContext } from "../LC";
import { isLocalMode, getMockData, Scenario, SensorData } from "shared";

export function MultiStatic({ activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes }) {
	// LCContext is a React context that you can use for sharing LightningChart resources between all charts that are created during the application lifetime.
	// More about LCContext: https://lightningchart.com/js-charts/docs/frameworks/react/#optimizing-apps-with-several-charts-visible-at-once--charts-being-initialized-often
	const lc = useContext(LCContext);
	const chartRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = chartRef.current;
		if (!container || !lc) return;   
		const chart: ChartXY = lc.ChartXY({
			defaultAxisX: { type: 'linear-highPrecision' },
			container,
			theme: Themes[theme],
		})
			.setTitle('Comparative Thermal Analysis of Production Units');
		chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime).setTitle('Time');
		const axisY = chart.getDefaultAxisY().setTitle('Temperature (°C)');

		const allSeries: PointLineAreaSeries[] = [];
		for (let i = 0; i < 3; i++) {
			const series = chart.addLineSeries({ 
				axisY, 
				schema: {
					timestamp: { pattern: 'progressive' },
					temperature: { pattern: null },
					machineId: { nonNumeric: true }
				} 
			})
			series.setName(`Machine ${i+1}`).setDataMapping({ x: 'timestamp', y: 'temperature' });
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
					allSeries[i].appendJSON(data[i]);
				};
			} catch (err) {
				console.error("Data fetch failed:", err);
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