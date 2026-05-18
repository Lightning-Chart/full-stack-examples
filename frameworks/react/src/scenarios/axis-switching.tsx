import { useEffect, useRef, useContext, useState, useMemo } from "react";
import { Themes, ChartXY, PointLineAreaSeries, DataSetXY, AxisTickStrategies, Axis } from "@lightningchart/lcjs";
import { LCContext } from "../LC";
import { getMockData, isLocalMode, Scenario, SensorData } from "shared";

export function AxisSwitching({ activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes }) {
	// LCContext is a React context that you can use for sharing LightningChart resources between all charts that are created during the application lifetime.
	// More about LCContext: https://lightningchart.com/js-charts/docs/frameworks/react/#optimizing-apps-with-several-charts-visible-at-once--charts-being-initialized-often
	const lc = useContext(LCContext);
	const chartRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const chartElementsRef = useRef<{
        chart: ChartXY;
        linSeries: PointLineAreaSeries;
        logSeries: PointLineAreaSeries;
        xAxis: Axis;
        linAxis: Axis;
        logAxis: Axis;
    } | null>(null);
	const [isLog, setIsLog] = useState(false);
	// Shared data set
	const dataSet = useMemo(() => {
		return new DataSetXY({
			schema: {
				relativeTime: { pattern: 'progressive' },
				stress: { pattern: null },
			}
		});
	}, []);

	useEffect(() => {
		const chartContainer = chartRef.current;
		if (!chartContainer || !lc) return;
		const chart = lc.ChartXY({
			legend: { visible: false },
			container: chartContainer,
			theme: Themes[theme],
		})
		    .setTitle('');
		const xAxis = chart.getDefaultAxisX().setTitle('Time').setTickStrategy(AxisTickStrategies.Time);
		const linAxis = chart.getDefaultAxisY().setTitle('Kinetic Energy (lin)');
		const logAxis = chart.addAxisY({ type: 'logarithmic', base: 10 }).setTitle('Kinetic Energy (log10)');
		const linSeries = chart.addLineSeries({ axisX: xAxis, axisY: linAxis, automaticColorIndex: 0 }).setName(`Linear Series`);
		const logSeries = chart.addLineSeries({ axisX: xAxis, axisY: logAxis, automaticColorIndex: 0 }).setName(`Logarithmic Series`);
		logSeries.setVisible(false);
		logAxis.setVisible(false);
		chartElementsRef.current = { chart, linSeries, logSeries, xAxis, linAxis, logAxis };
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
				dataSet.clear();
				dataSet.appendJSON(data, { whitelist: ['relativeTime', 'stress'] });
				linSeries.setDataSet(dataSet, { x: 'relativeTime', y: 'stress' });
				logSeries.setDataSet(dataSet, { x: 'relativeTime', y: 'stress' });				
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
	}, [lc, activeScenario, theme, dataSet]);

	useEffect(() => {
		const chartElements = chartElementsRef.current;
		if (!chartElements) return;
		const { linSeries, logSeries, xAxis, linAxis, logAxis } = chartElements;
		if (isLog) {
			linSeries.setVisible(false);
			linAxis.setVisible(false);
			logSeries.setVisible(true);
			logAxis.setVisible(true);
			logAxis.fit();
			xAxis.fit();
		} else {
			linSeries.setVisible(true);
			linAxis.setVisible(true);
			logSeries.setVisible(false);
			logAxis.setVisible(false);
			linAxis.fit();
			xAxis.fit();
		}
	}, [isLog]);

	return (
		<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
			<div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: "16px", padding: "8px 0px"}}>
				<span style={{ marginLeft: "8px" }}>
				Kinetic Energy Distribution of Machine Vibration (v<sup>2</sup>) Over a 5-Second Interval
				</span>
				<span>Toggle axis type:</span>
				<button ref={buttonRef} style={{ marginRight: "8px" }} onClick={() => setIsLog((prev) => !prev)}>
					{isLog ? 'Logarithmic' : 'Linear'}
				</button>
			</div>
			<div ref={chartRef} style={{ width: "100%", flexGrow: "1", minHeight: "0" }}></div>
		</div>
	);
};