import { useEffect, useContext, useRef } from "react";
import { Themes, ChartXY, PointLineAreaSeries, AxisTickStrategies } from "@lightningchart/lcjs";
import { LCContext } from "../LC";
import { isLocalMode, getMockData, Scenario, MultiStaticBinaryData } from "shared";

export function MultiStaticBinary({ activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes }) {
	// LCContext is a React context that you can use for sharing LightningChart resources between all charts that are created during the application lifetime.
	// More about LCContext: https://lightningchart.com/js-charts/docs/frameworks/react/#optimizing-apps-with-several-charts-visible-at-once--charts-being-initialized-often
	const lc = useContext(LCContext);
	const chartRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const container = chartRef.current;
		if (!container || !lc) return   
		const chart: ChartXY = lc.ChartXY({
			defaultAxisX: { type: 'linear-highPrecision', },
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
					x: { storage: Float64Array, pattern: 'progressive' },
					y: { storage: Float32Array }
				} 
			});
			series.setName(`Machine ${i+1}`);
			allSeries.push(series);
		}
		let isActive = true;

		const setupData = async () => {
			try {
				let arrayBuffer: ArrayBuffer;
				let pointsCount: number;
				if (isLocalMode()) {
					const res = await fetch(`/api/scenarios/${activeScenario.fileName}`);
					// Parse custom header to get point counts
					const pointsCountHeader = res.headers.get('Points-Count');
					arrayBuffer = await res.arrayBuffer();
					pointsCount = pointsCountHeader ? parseInt(pointsCountHeader, 10) : arrayBuffer.byteLength / 20;
				} else {
					const data = getMockData(activeScenario) as MultiStaticBinaryData;
					arrayBuffer = data.arrayBuffer;
					pointsCount = data.pointsCount;
				}
				if (!isActive || chart.isDisposed()) return;
				const sharedTimestamps = new Float64Array(arrayBuffer, 0, pointsCount);
				const baseTemperatureByteOffset = pointsCount * 8;

				for (let i = 0; i < 3; i++) {
					const machineByteOffset = baseTemperatureByteOffset + (i * pointsCount * 4);
					const temperatures = new Float32Array(arrayBuffer, machineByteOffset, pointsCount);
                
					allSeries[i].appendSamples({
						x: sharedTimestamps,
						y: temperatures,
					});
				}
			} catch (error) {
				console.error("Data fetch failed:", error);
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