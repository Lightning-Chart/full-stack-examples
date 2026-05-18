import { useEffect, useContext, useState, useRef, useMemo } from "react";
import { Themes, ChartXY, CursorXY, PointLineAreaSeries, AxisTickStrategies, synchronizeAxisIntervals, DataSetXY } from "@lightningchart/lcjs";
import { LCContext } from "../LC";
import { isLocalMode, getMockData, Scenario, SensorData } from "shared";

const VALUES: string[] = ['temperature', 'vibration', 'throughput'];
const TITLES: string[] = ['Thermal Output Profile (°C)', 'Mechanical Kinematics Profile (mm/s)', 'Production Throughput Efficiency (units/s)'];

export function SyncedCharts({ activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes }) {
	// LCContext is a React context that you can use for sharing LightningChart resources between all charts that are created during the application lifetime.
	// More about LCContext: https://lightningchart.com/js-charts/docs/frameworks/react/#optimizing-apps-with-several-charts-visible-at-once--charts-being-initialized-often
	const lc = useContext(LCContext);
	const chartRef1 = useRef<HTMLDivElement>(null);
	const chartRef2 = useRef<HTMLDivElement>(null);
	const chartRef3 = useRef<HTMLDivElement>(null);
	const [panelData, setPanelData] = useState<{ temp: string, vib: string, tp: string } | null>(null);
	// Shared data set
	const dataSet = useMemo(() => {
		return new DataSetXY({
			schema: {
				timestamp: { pattern: 'progressive' },
				temperature: { pattern: null },
				vibration: { pattern: null },
				throughput: { pattern: null }
			}
		});
	}, []);

	useEffect(() => {
		const containers = [chartRef1.current, chartRef2.current, chartRef3.current];		
		if (containers.some(c => !c) || !lc) return;

		const charts = containers.map((container, i) => {
			const chart: ChartXY = lc.ChartXY({
				defaultAxisX: { type: 'linear-highPrecision' },
				theme: Themes[theme],
				container: container as HTMLDivElement,
			})
				.setTitle(`${TITLES[i]}`)
				.setCursorMode(undefined);
			chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime);
			const series = chart.addLineSeries().setName(`${VALUES[i]}`);
			const cursor: CursorXY = chart.addCursor();
			cursor.setTickMarkerXVisible(false);
			return { chart, cursor, series };
		})
		synchronizeAxisIntervals(...charts.map((chart) => chart.chart.axisX));

		const hideCursor = () => {
			charts.forEach((chart) => chart.cursor.setVisible(false))
		};
		const displayCursorAt = (x: number) => {
			charts.forEach((chart) => {
				const solveResults = chart.chart
					.getSeries()
				    // NOTE: Other series types don't currently have direct API syntax to solve nearest from axis coordinate - for them, you have to first translate axis coordinate to client coordinate and then use solve nearest
					.map((series) => series.getCursorEnabled() && series instanceof PointLineAreaSeries && series.solveNearest({ x, y: 0 }))
					.filter((solve) => !!solve);
				if (solveResults.length > 0) {
					chart.cursor
						.setVisible(true)
						.setPosition(...solveResults.map((solve) => solve.cursorPosition))
						.setResultTable((rt) => rt.setContent(chart.chart.getCursorFormatting()(chart.chart, solveResults[0], solveResults)));
				} else {
					chart.cursor.setVisible(false);
				}
			});
		};
		charts.forEach((chart) => {
			chart.chart.seriesBackground.addEventListener('pointermove', (event) =>
				displayCursorAt(chart.chart.translateCoordinate(event, chart.chart.coordsAxis).x),
			);
			chart.chart.getSeries().forEach((series) => series.addEventListener('pointermove', (_event, info) => displayCursorAt(info.x)));
			chart.chart.seriesBackground.addEventListener('pointerleave', () => hideCursor());
		});
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
				if (!isActive) return;
                
				dataSet.clear();
				dataSet.appendJSON(data, { whitelist: ['timestamp', VALUES[0], VALUES[1], VALUES[2]] });
				for (let i = 0; i < charts.length; i++) {
					charts[i].series.setDataSet(dataSet, { x: 'timestamp', y: VALUES[i] });
				}; 
				const countAverage = (property: string) => {
					const array = dataSet.readBack().data[property];
					let total = 0;
					for (let i = 0; i < array.length; i++) {
						total += array[i];
					}
					return total / array.length;
				}
				setPanelData({
					temp: countAverage(VALUES[0]).toFixed(2),
					vib: countAverage(VALUES[1]).toFixed(2),
					tp: (countAverage(VALUES[2]) * 100).toFixed(0)
				});
			} catch (err) {
				console.error("Failed to fetch data:", err);
				return;
			}
		};
		setupData();

		return () => {
			isActive = false; 
			charts.forEach(chart => chart.chart.dispose());
		};
	}, [activeScenario, dataSet, lc, theme]);

	return (
		<div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gridTemplateRows: "repeat(2, 1fr)" }}>
			<div style={{ padding: "8px" }}>
				{panelData ? (
					<>
						<strong>Synchronized Multivariate Production Telemetry</strong><br />
						<br />
						Production unit: <strong>Machine 1</strong><br />
                        Average temperature: <strong>{panelData.temp}</strong> °C<br />
                        Average vibration: <strong>{panelData.vib}</strong> mm/s<br />
                        Average throughput: <strong>{panelData.tp}</strong> units per second
					</>
				) : (
					"Loading data..."
				)}
			</div>
			<div ref={chartRef1} style={{ width: "100%", height: "100%" }}></div>
			<div ref={chartRef2} style={{ width: "100%", height: "100%" }}></div>
			<div ref={chartRef3} style={{ width: "100%", height: "100%" }}></div>
		</div>
	);
}