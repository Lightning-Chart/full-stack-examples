import { lightningChart, Themes, AxisTickStrategies, DataSetXY, synchronizeAxisIntervals } from "@lightningchart/lcjs";
import { getMockData, isLocalMode } from 'shared';

const VALUES = ['temperature', 'vibration', 'throughput'];
const TITLES = ['Thermal Output Profile (°C)', 'Mechanical Kinematics Profile (mm/s)', 'Production Throughput Efficiency (units/s)'];

export default function syncedChartsScenario(container, props) {
	container.innerHTML = `
        <div style="width: 100%; height: 100%; display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr);">
            <div id="dataPanel" style="padding: 8px;">Loading data...</div>
            <div id="${props.activeScenario.id}1" style="width: 100%; height: 100%;"></div>
            <div id="${props.activeScenario.id}2" style="width: 100%; height: 100%;"></div>
            <div id="${props.activeScenario.id}3" style="width: 100%; height: 100%;"></div>
        </div>
    `;    
	const chartArea1 = container.querySelector(`#${props.activeScenario.id}1`);
	const chartArea2 = container.querySelector(`#${props.activeScenario.id}2`);
	const chartArea3 = container.querySelector(`#${props.activeScenario.id}3`);
	const dataPanel = container.querySelector(`#dataPanel`);
	const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
	const dataSet = new DataSetXY({
		schema: {
			timestamp: { pattern: 'progressive' },
			temperature: { pattern: null },
			vibration: { pattern: null },
			throughput: { pattern: null }
		}
	});
	const containers = [chartArea1, chartArea2, chartArea3];
	const charts = containers.map((container, i) => {
		const chart = lc.ChartXY({
			defaultAxisX: { type: 'linear-highPrecision' },
			theme: Themes[props.theme],
			container: container,
		})
			.setTitle(`${TITLES[i]}`)
			.setCursorMode(undefined);
		chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime);
		const series = chart.addLineSeries().setName(`${VALUES[i]}`);
		const cursor = chart.addCursor();
		cursor.setTickMarkerXVisible(false);
		return { chart, cursor, series };
	})
	synchronizeAxisIntervals(...charts.map((chart) => chart.chart.axisX));

	const hideCursor = () => {
		charts.forEach((chart) => chart.cursor.setVisible(false))
	};
	const displayCursorAt = (x) => {
		charts.forEach((chart) => {
			const solveResults = chart.chart
				.getSeries()
			    // NOTE: Other series types don't currently have direct API syntax to solve nearest from axis coordinate - for them, you have to first translate axis coordinate to client coordinate and then use solve nearest
				.map((series) => series.getCursorEnabled() && series.solveNearest({ x, y: 0 }))
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
		chart.chart.getSeries().forEach((series) => series.addEventListener('pointermove', (event, info) => displayCursorAt(info.x)));
		chart.chart.seriesBackground.addEventListener('pointerleave', () => hideCursor());
	});
	let isDisposed = false; 
    
	const setPanelData = (data) => {
		dataPanel.innerHTML = `
            <strong>Synchronized Multivariate Production Telemetry</strong><br />
            <br />
            Production unit: <strong>Machine 1</strong><br />
            Average temperature: <strong>${data.temp}</strong> °C<br />
            Average vibration: <strong>${data.vib}</strong> mm/s<br />
            Average throughput: <strong>${data.tp}</strong> units per second
        `;
	};

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
            
			dataSet.appendJSON(data, { whitelist: ['timestamp', VALUES[0], VALUES[1], VALUES[2]] });
			for (let i = 0; i < charts.length; i++) {
				charts[i].series.setDataSet(dataSet, { x: 'timestamp', y: VALUES[i] });
			};		
			const countAverage = (property) => {
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

	return function cleanup() {
		isDisposed = true;
		charts.forEach(chart => chart.chart.dispose());
		lc.dispose();
		container.innerHTML = '';
	};
}