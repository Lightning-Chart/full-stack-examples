import { lightningChart, Themes, AxisTickStrategies, AxisScrollStrategies, PalettedFill, LUT, ColorRGBA, SolidLine } from "@lightningchart/lcjs";
import { isLocalMode, getMockData } from "shared";

export default function multiRealtimeScenario(container, props) {
	container.innerHTML = `
        <div id="${props.activeScenario.id}" style="width: 100%; height: 100%;"></div>
    `;
	const chartArea = container.querySelector(`#${props.activeScenario.id}`);
	const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE });
	const chart = lc.ChartXY({
		defaultAxisX: { type: 'linear-highPrecision' },
		legend: { visible: false },
		container: chartArea,
		theme: Themes[props.theme],
	})
		.setTitle('Real-Time Vibration Profile (M1-M3)');
	chart.getDefaultAxisX()
		.setTitle("Time")
		.setTickStrategy(AxisTickStrategies.DateTime)
		.setScrollStrategy(AxisScrollStrategies.scrolling)
		.setDefaultInterval((state) => ({ end: state.dataMax, start: (state.dataMax ?? 0) - 10 * 1000, stopAxisAfter: false }));
	chart.getDefaultAxisY().dispose();

	const palette = new PalettedFill({
		lookUpProperty: 'y',
		lut: new LUT({
			interpolate: false,
			steps: [
				{ value: 0, color: ColorRGBA( 255, 0, 0 ) },
				{ value: 0.2, color: ColorRGBA( 0, 255, 0 ) },
				{ value: 4.2, color: ColorRGBA( 255, 0, 0 ) }
			],
		})
	});
    
	const allSeries = [];
	for (let i = 0; i < 3; i++) {
		const axisY = chart
			.addAxisY({ iStack: -i })
			.setTitleRotation(0)
			.setMargins(i === 1 ? 15 : 0, i === 1 ? 15 : 0);
		if (i === 1) axisY.setTitle('Vibration (mm/s)').setTitleRotation(270);
		const series = chart.addLineSeries({ 
			axisY, 
			schema: {
				timestamp: { pattern: 'progressive' },
				vibration: { pattern: null },
				machineId: { nonNumeric: true }
			} 
		})
			.setName(`Machine ${i+1}`)
		    // Data cleaning: set the maximum number of samples that are retained
			.setMaxSampleCount(50_000)
			.setDataMapping({ x: 'timestamp', y: 'vibration' })
			.setStrokeStyle(new SolidLine({ fillStyle: palette}));
		allSeries.push(series);
	} 
	let ws = null;
	let interval = null;

	if (isLocalMode()) {
		ws = new WebSocket(`ws://localhost:3000/api/scenarios/${props.activeScenario.fileName}`);
		ws.onmessage = (e) => {
			try {
				const msg = JSON.parse(e.data);
				for (let i = 0; i < allSeries.length; i++) {
					allSeries[i].appendJSON(msg[i]);
				};
			} catch (e) { 
				console.error(e); 
			}
		};
	} else {
		const data = getMockData(props.activeScenario);
		let dataAmount = 0;
		interval = setInterval(() => {
			if (dataAmount >= data[0].length) {
				if (interval) clearInterval(interval);
				return;
			}
			for (let i = 0; i < allSeries.length; i++) {
				allSeries[i].appendJSON([{
					timestamp: data[i][dataAmount].timestamp,
					vibration: data[i][dataAmount].vibration,
					machineId: data[i][dataAmount].machineId
				}]);
			}
			dataAmount++;
		}, 20);
	}

	return function cleanup() {
		if (ws) ws.close();
		if (interval) clearInterval(interval);
		chart.dispose();
		lc.dispose();
		container.innerHTML = '';
	};
}