<template>
	<div style="width: 100%; height: 100%; display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr);">
		<div style="padding: 8px;">
			<template v-if="panelData">
				<strong>Synchronized Multivariate Production Telemetry</strong><br>
				<br>
				Production unit: <strong>Machine 1</strong><br>
				Average temperature: <strong>{{ panelData.temp }}</strong> °C<br>
				Average vibration: <strong>{{ panelData.vib }}</strong> mm/s<br>
				Average throughput: <strong>{{ panelData.tp }}</strong> units per second
			</template>
			<template v-else>
				Loading data...
			</template>
		</div>
		<div ref="chartRef1" />
		<div ref="chartRef2" />
		<div ref="chartRef3" />
	</div>
</template>

<script lang="ts">
import { ref, shallowRef, onMounted, PropType, onBeforeUnmount, onErrorCaptured } from 'vue'
import { lightningChart, Themes, ChartXY, CursorXY, PointLineAreaSeries, DataSetXY, AxisTickStrategies, synchronizeAxisIntervals } from "@lightningchart/lcjs";
import { isLocalMode, getMockData, Scenario, SensorData } from "shared";

export default {
	name: "SyncedCharts",
	props: {
		activeScenario: { type: Object as PropType<Scenario>, required: true },
		theme: { type: Object as PropType<keyof typeof Themes>, required: true }
	},
	setup(props) {
		const lc = shallowRef();
		const chartRef1 = shallowRef();
		const chartRef2 = shallowRef();
		const chartRef3 = shallowRef();
		const allCharts = shallowRef<Array<{ chart: ChartXY; cursor: CursorXY; series: PointLineAreaSeries }>>([]);
		const VALUES: string[] = ['temperature', 'vibration', 'throughput'];
		const panelData = ref();
		const dataSet = new DataSetXY({
			schema: {
				timestamp: { pattern: 'progressive' },
				temperature: { pattern: null },
				vibration: { pattern: null },
				throughput: { pattern: null }
			}
		});

		const createCharts = () => {
			lc.value = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
			const containers = [chartRef1.value, chartRef2.value, chartRef3.value];		
			if (containers.some(c => !c) || !lc.value) return;
			allCharts.value = containers.map((container, i) => {
				const chart: ChartXY = lc.value.ChartXY({
					defaultAxisX: { type: 'linear-highPrecision' },
					theme: Themes[props.theme],
					container: container as HTMLDivElement,
				})
					.setTitle('')
					.setCursorMode(undefined);
				chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime);
				const series = chart.addLineSeries().setName(`${VALUES[i]}`);
				const cursor: CursorXY = chart.addCursor();
				cursor.setTickMarkerXVisible(false);
				return { chart, cursor, series };
			})		
			synchronizeAxisIntervals(...allCharts.value.map((chart) => chart.chart.axisX));

			const hideCursor = () => {
				allCharts.value.forEach((chart) => chart.cursor.setVisible(false))
			};
			const displayCursorAt = (x: number) => {
				allCharts.value.forEach((chart) => {
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
			allCharts.value.forEach((chart) => {
				chart.chart.seriesBackground.addEventListener('pointermove', (event) =>
					displayCursorAt(chart.chart.translateCoordinate(event, chart.chart.coordsAxis).x),
				);
				chart.chart.getSeries().forEach((series) => series.addEventListener('pointermove', (_event, info) => displayCursorAt(info.x)));
				chart.chart.seriesBackground.addEventListener('pointerleave', () => hideCursor());
			});
		}

		const setupData = async () => {
			if (!allCharts.value || !props.activeScenario) return;
			try {
				let data: SensorData[][] = [];
				if (isLocalMode()) {
					const res = await fetch(`/api/scenarios/${props.activeScenario.fileName}`);
					data = await res.json();
				} else {
					data = getMockData(props.activeScenario);
				}	
                
				dataSet.clear();
				dataSet.appendJSON(data, { whitelist: ['timestamp', VALUES[0], VALUES[1], VALUES[2]] });
				for (let i = 0; i < allCharts.value.length; i++) {
					allCharts.value[i].series.setDataSet(dataSet, { x: 'timestamp', y: VALUES[i] });
				}; 
				const countAverage = (property: string) => {
					const array = dataSet.readBack().data[property]
					let total = 0
					for (let i = 0; i < array.length; i++) {
						total += array[i];
					}
					return total / array.length;
				}
				panelData.value = { 				
					temp: countAverage(VALUES[0]).toFixed(2),
					vib: countAverage(VALUES[1]).toFixed(2),
					tp: (countAverage(VALUES[2]) * 100).toFixed(0) 
				};
			} catch (err) {
				console.error("Failed to fetch data:", err);
				return;
			}	
		}
		onMounted(() => {
			createCharts();		
			setupData();
		})
		onBeforeUnmount(() => {
			if (lc.value) lc.value.dispose();
		})
		onErrorCaptured((err, _vm, info) => {
			console.error(`Error captured in component: ${info}`, err);
		})
		return {
			chartRef1,
			chartRef2,
			chartRef3,
			panelData
		};
	}
};
</script>