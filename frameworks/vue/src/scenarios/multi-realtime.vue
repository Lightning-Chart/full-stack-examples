<template>
	<div ref="chartRef" style="width: 100%; height: 100%;" />
</template>

<script lang="ts">
import { ref, shallowRef, onMounted, PropType, onBeforeUnmount, onErrorCaptured } from 'vue'
import { lightningChart, Themes, PointLineAreaSeries, AxisTickStrategies, AxisScrollStrategies, SolidLine, ColorRGBA, LUT, PalettedFill } from "@lightningchart/lcjs";
import { isLocalMode, getMockData, Scenario, SensorData } from "shared";

export default {
	name: "MultiRealtime",
	props: {
		activeScenario: { type: Object as PropType<Scenario>, required: true },
		theme: { type: Object as PropType<keyof typeof Themes>, required: true }
	},
	setup(props) {
		const chartRef = ref<HTMLDivElement | null>(null);
		const lc = shallowRef();
		const chart = shallowRef();
		const allSeries = ref<PointLineAreaSeries[]>([]);
		const ws = ref<WebSocket | undefined>();
		let interval: ReturnType<typeof setInterval> | null = null;

		const createChart = () => {
			lc.value = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
			chart.value = lc.value.ChartXY({
				defaultAxisX: { type: 'linear-highPrecision' },
				legend: { visible: false },
				container: chartRef.value,
				theme: Themes[props.theme],
			});
			if (!chartRef.value || !chart.value || !props.activeScenario) return;
			chart.value.setTitle('Real-Time Vibration Profile (M1-M3)');
			chart.value.getDefaultAxisX()
				.setTitle("Time")
				.setTickStrategy(AxisTickStrategies.DateTime)
				.setScrollStrategy(AxisScrollStrategies.scrolling)
				.setDefaultInterval((state: { curStart: number; curEnd: number; dataMin: number | undefined; dataMax: number | undefined;}) => (
					{ end: state.dataMax, start: (state.dataMax ?? 0) - 10 * 1000, stopAxisAfter: false }
				));
			chart.value.getDefaultAxisY().dispose();
            
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

			for (let i = 0; i < 3; i += 1) {
				const axisY = chart.value
					.addAxisY({ iStack: -i })
					.setTitleRotation(0)
					.setMargins(i === 1 ? 15 : 0, i === 1 ? 15 : 0);
				if (i === 1) axisY.setTitle('Vibration (mm/s)').setTitleRotation(270);
				const series = chart.value.addLineSeries({ 
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
				allSeries.value[i] = series;
			};
		}
		const setupData = () => {
			if (!chart.value || !props.activeScenario) return;
			if (isLocalMode()) {
				ws.value = new WebSocket(`ws://localhost:3000/api/scenarios/${props.activeScenario.fileName}`);
				if (!ws.value) return;
				ws.value.onmessage = (e) => {
					try {
						const msg = JSON.parse(e.data);
						for (let i = 0; i < allSeries.value.length; i++) {
							allSeries.value[i].appendJSON(msg[i]);
						};
					} catch (e) {
						console.error(e);
					}
				};
			} else {
				const data = getMockData(props.activeScenario) as SensorData[][];
				let dataAmount = 0;
				interval = setInterval(() => {
					if (dataAmount >= data[0].length) {
						if (interval) clearInterval(interval);
						return;
					}
					for (let i = 0; i < allSeries.value.length; i++) {
						allSeries.value[i].appendJSON([{
							timestamp: data[i][dataAmount].timestamp,
							vibration: data[i][dataAmount].vibration,
							machineId: data[i][dataAmount].machineId
						}]);
					}
					dataAmount++;
				}, 20);
			}			
		}
		onMounted(() => {
			createChart();		
			setupData();
		})
		onBeforeUnmount(() => {
			if (lc.value) lc.value.dispose();
			if (ws.value) ws.value.close();
			if (interval) clearInterval(interval);
		})
		onErrorCaptured((err, _vm, info) => {
			console.error(`Error captured in component: ${info}`, err);
		})
		return {
			chartRef,
		};
	}
};
</script>