import { lightningChart, Themes, AxisTickStrategies } from "@lightningchart/lcjs";
import { isLocalMode, getMockData } from "shared";

export default function multiStaticBinaryScenario(container, props) {
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
				x: { storage: Float64Array, pattern: 'progressive' },
				y: { storage: Float32Array }
			}
		});
		series.setName(`Machine ${i+1}`);
		allSeries.push(series);
	};
	let isDisposed = false; 

	const setupData = async () => {
		try {
			let arrayBuffer;
			let pointsCount;
			if (isLocalMode()) {
				const res = await fetch(`/api/scenarios/${props.activeScenario.fileName}`);
				// Parse custom header to get point counts
				const pointsCountHeader = res.headers.get('Points-Count');
				arrayBuffer = await res.arrayBuffer();
				pointsCount = pointsCountHeader ? parseInt(pointsCountHeader, 10) : arrayBuffer.byteLength / 20;
			} else {
				const data = getMockData(props.activeScenario);
				arrayBuffer = data.arrayBuffer;
				pointsCount = data.pointsCount;
			}
			if (isDisposed || chart.isDisposed()) return;
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