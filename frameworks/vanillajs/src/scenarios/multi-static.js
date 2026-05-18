import { lightningChart, Themes, AxisTickStrategies } from "@lightningchart/lcjs";
import { isLocalMode, getMockData } from "shared";

export default function multiStaticScenario(container, props) {
	container.innerHTML = `
        <div id="${props.activeScenario.id}" style="width: 100%; height: 100%;"></div>
    `;
	const chartArea = container.querySelector(`#${props.activeScenario.id}`);
	const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE });
	const chart = lc.ChartXY({
		defaultAxisX: { type: 'linear-highPrecision' },
		container: chartArea,
		theme: Themes[props.theme],
	})
		.setTitle('Comparative Thermal Analysis of Production Units');
	chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime).setTitle('Time');
	const axisY = chart.getDefaultAxisY().setTitle('Temperature (°C)');
	const allSeries = [];
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
	let isDisposed = false; 

	const setupData = async () => {
		try {
			const allSeries = chart.getSeries();
			let data;
			if (isLocalMode()) {
				const res = await fetch(`/api/scenarios/${props.activeScenario.fileName}`);
				data = await res.json();
			} else {
				data = getMockData(props.activeScenario);
			}
			if (isDisposed) return;
            
			for (let i = 0; i < allSeries.length; i++) {
				allSeries[i].appendJSON(data[i]);
			};
		} catch (error) {
			if (!isDisposed) {
				console.error("Data fetch failed:", error);
			}
		}
	};
	setupData();

	return function cleanup() {
		isDisposed = true;
		chart.dispose();
		lc.dispose();
		container.innerHTML = '';
	};
}