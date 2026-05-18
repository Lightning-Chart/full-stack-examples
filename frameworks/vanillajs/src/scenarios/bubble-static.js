import { lightningChart, Themes, isHitSampleXY } from "@lightningchart/lcjs";
import { isLocalMode, getMockData } from "shared";

export default function bubbleStaticScenario(container, props) {
	container.innerHTML = `
        <div id="${props.activeScenario.id}" style="width: 100%; height: 100%;"></div>
    `;
	const chartArea = container.querySelector(`#${props.activeScenario.id}`);
	const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE });
	const chart = lc.ChartXY({
		container: chartArea,
		theme: Themes[props.theme],
	})
		.setTitle('Temperature and Vibration by Throughput')
		.setCursorMode('show-nearest');
	chart.axisX.setTitle('Temperature (°C)');
	chart.axisY.setTitle('Vibration (mm/s)');
	chart.setCursorFormatting((_, hit) => {
		if (!isHitSampleXY(hit)) return undefined
		return [
			[{ text: 'Temperature (°C)', font: { weight: 'bold' } }, '', hit.x.toFixed(2)],
			[{ text: 'Vibration (mm/s)', font: { weight: 'bold' } }, '', hit.y.toFixed(2)],
			[{ text: 'Throughput', font: { weight: 'bold' } }, '', hit.size?.toFixed(0)]
		]
	});
	for (let i = 0; i < 4; i += 1) {
		chart.addPointSeries({
			schema: {
				temperature: { pattern: null },
				vibration: { pattern: null },
				throughput: { pattern: null },
				machineId: { nonNumeric: true }
			}
		})
			.setName(`Machine ${i + 1}`)
			.setDataMapping({ x: 'temperature', y: 'vibration', size: 'throughput' });
	}
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
			for (let i = 0; i < allSeries.length; i += 1) {
				if (data[i]) {
					allSeries[i].appendJSON(data[i], { 
						whitelist: ['machineId', 'temperature', 'vibration', 'throughput'] 
					});
				}
			}
		} catch (error) {
			if (!isDisposed) {
				console.error("Datan lataus epäonnistui:", error);
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