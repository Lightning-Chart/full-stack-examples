<template>
	<div ref="chartRef" style="width: 100%; height: 100%;" />
</template>

<script lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, onErrorCaptured, PropType } from 'vue'
import { lightningChart, Themes, ChartXY, PointLineAreaSeries, isHitSampleXY } from "@lightningchart/lcjs";
import { isLocalMode, getMockData, Scenario, SensorData } from "shared";

export default {
	name: "BubbleStatic",
	props: {
		activeScenario: { type: Object as PropType<Scenario>, required: true },
		theme: { type: Object as PropType<keyof typeof Themes>, required: true }
	},
	setup(props) {
		const chartRef = ref<HTMLDivElement | null>(null);
		const lc = shallowRef();
		const chart = shallowRef<ChartXY | undefined>();
		const allSeries = ref<PointLineAreaSeries[]>([]);

		const createChart = () => {
			lc.value = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
			chart.value = lc.value.ChartXY({
				container: chartRef.value,
				theme: Themes[props.theme],
			});
			if (!chartRef.value || !chart.value || !props.activeScenario) return;
			chart.value
				.setTitle('Temperature and Vibration by Throughput')
				.setCursorMode('show-nearest');
			chart.value.axisX.setTitle('Temperature (°C)');
			chart.value.axisY.setTitle('Vibration (mm/s)');

			for (let i = 0; i < 4; i ++) {
				const series = chart.value.addPointSeries({
					schema: {
						temperature: { pattern: null },
						vibration: { pattern: null },
						throughput: { pattern: null },
						machineId: { nonNumeric: true }
					}
				})
					.setName(`Machine ${i + 1}`)
					.setDataMapping({ x: 'temperature', y: 'vibration', size: 'throughput' });
				allSeries.value[i] = series;
			};
		}
		const setupData = () => {
			if (!chart.value || !props.activeScenario) return;
			try {
				if (isLocalMode()) {
					fetch(`/api/scenarios/${props.activeScenario.fileName}`)
						.then(res => res.json())
						.then(data => {	
							for (let i = 0; i < allSeries.value.length; i++) {
								allSeries.value[i].appendJSON(data[i], { whitelist: ['machineId', 'temperature', 'vibration', 'throughput'] });
							};
						})
						.catch(err => console.log(err.message))
				} else {
					const data = getMockData(props.activeScenario) as SensorData[][];
					for (let i = 0; i < allSeries.value.length; i += 1) {
						allSeries.value[i].appendJSON(data[i]);
					};
				}
				chart.value.setCursorFormatting((_, hit) => {
					if (!isHitSampleXY(hit)) return undefined
					return [
						[{ text: 'Temperature (°C)', font: { weight: 'bold' } }, '', hit.x.toFixed(2)],
						[{ text: 'Vibration (mm/s)', font: { weight: 'bold' } }, '', hit.y.toFixed(2)],
						[{ text: 'Throughput', font: { weight: 'bold' } }, '', hit.size?.toFixed(0)]
					]
				});
			} catch (err) {
				console.error("Failed to fetch data:", err);
				return;
			}
		}
		onMounted(() => {
			createChart();			
			setupData();
		})
		onBeforeUnmount(() => {
			if (lc.value) lc.value.dispose();
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