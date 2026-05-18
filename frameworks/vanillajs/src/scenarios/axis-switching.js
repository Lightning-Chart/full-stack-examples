import { lightningChart, Themes, AxisTickStrategies, DataSetXY } from "@lightningchart/lcjs";
import { getMockData, isLocalMode } from 'shared';

export default function axisSwitchingScenario(container, props) {
	container.innerHTML = `
    	<div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
			<div style="width: 100%; display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 16px; padding: 8px 0px;">
				<span style="margin-left: 8px;">
				    Kinetic Energy Distribution of Machine Vibration (v<sup>2</sup>) Over a 5-Second Interval
				</span>
				<span>Toggle axis type:</span>
				<button id="toggleButton" style="margin-right: 8px;">Linear</button>
			</div>
			<div id="${props.activeScenario.id}" style="width: 100%; flex-grow: 1; min-height: 0;"></div>
		</div>
    `;    
	const chartArea = container.querySelector(`#${props.activeScenario.id}`);
	const toggleButton = container.querySelector("#toggleButton");
	const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
	const dataSet = new DataSetXY({
		schema: {
			relativeTime: { pattern: 'progressive' },
			stress: { pattern: null },
		}
	});
	const chart = lc.ChartXY({
		legend: { visible: false },
		container: chartArea,
		theme: Themes[props.theme],
	})
		.setTitle('');
	const xAxis = chart.getDefaultAxisX().setTitle('Time').setTickStrategy(AxisTickStrategies.Time);
	const linAxis = chart.getDefaultAxisY().setTitle('Kinetic Energy (lin)');
	const logAxis = chart.addAxisY({ type: 'logarithmic', base: 10 }).setTitle('Kinetic Energy (log10)');
	const linSeries = chart.addLineSeries({ axisX: xAxis, axisY: linAxis, automaticColorIndex: 0 }).setName(`Linear Series`);
	const logSeries = chart.addLineSeries({ axisX: xAxis, axisY: logAxis, automaticColorIndex: 0 }).setName(`Logarithmic Series`);
	logSeries.setVisible(false);
	logAxis.setVisible(false);
	let isDisposed = false; 
	let isLog = false;

	const setupData = async () => {
		try {
			let data;
			if (isLocalMode()) {
				const res = await fetch(`/api/scenarios/${props.activeScenario.fileName}`);
				data = await res.json();
			} else {
				data = getMockData(props.activeScenario);
			}
			if (isDisposed) return;
            
			dataSet.clear();
			dataSet.appendJSON(data, { whitelist: ['relativeTime', 'stress'] });
			linSeries.setDataSet(dataSet, { x: 'relativeTime', y: 'stress' });
			logSeries.setDataSet(dataSet, { x: 'relativeTime', y: 'stress' });			
		} catch (error) {
			if (!isDisposed) {
				console.error("Data fetch failed:", error);
			}
		}
	};
	setupData();

	toggleButton.addEventListener("click", () => {
		isLog = !isLog  
		if (isLog) {
			linSeries.setVisible(false);
			linAxis.setVisible(false);
			logSeries.setVisible(true);
			logAxis.setVisible(true);
			logAxis.fit();
			xAxis.fit();
			toggleButton.innerHTML = 'Logarithmic';
		} else {
			linSeries.setVisible(true);
			linAxis.setVisible(true);
			logSeries.setVisible(false);
			logAxis.setVisible(false);
			linAxis.fit();
			xAxis.fit();
			toggleButton.innerHTML = 'Linear';
		}
	})

	return function cleanup() {
		isDisposed = true;
		chart.dispose();
		lc.dispose();
		container.innerHTML = '';
	};
}