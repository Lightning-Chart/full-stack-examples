<template>
	<div ref="chartRef" style="width: 100%; height: 100%;" />
</template>

<script lang="ts">
import { ref, shallowRef, onMounted, PropType, onBeforeUnmount, onErrorCaptured } from 'vue'
import { lightningChart, Themes, PointLineAreaSeries, AxisTickStrategies } from "@lightningchart/lcjs";
import { isLocalMode, getMockData, Scenario, SensorData } from "shared";

export default {
	name: "MultiStatic",
	props: {
		activeScenario: { type: Object as PropType<Scenario>, required: true },
		theme: { type: Object as PropType<keyof typeof Themes>, required: true }
	},
	setup(props) {
		const chartRef = ref<HTMLDivElement | null>(null);
		const lc = shallowRef();
		const chart = shallowRef();
		const allSeries = ref<PointLineAreaSeries[]>([]);

		const createChart = () => {
			lc.value = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
			chart.value = lc.value.ChartXY({
				defaultAxisX: { type: 'linear-highPrecision' },
				container: chartRef.value,
				theme: Themes[props.theme],
			});
			if (!chartRef.value || !chart.value || !props.activeScenario) return;
			chart.value.setTitle('Comparative Thermal Analysis of Production Units');
			chart.value.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime).setTitle("Time");
			const axisY = chart.value.getDefaultAxisY().setTitle('Temperature (°C)');
			for (let i = 0; i < 3; i += 1) {
				const series = chart.value.addLineSeries({ 
					axisY, 
					schema: {
						timestamp: { pattern: 'progressive' },
						temperature: { pattern: null },
						machineId: { nonNumeric: true }
					} 
				})
				series.setName(`Machine ${i+1}`).setDataMapping({ x: 'timestamp', y: 'temperature' });
				allSeries.value[i] = series;
			};
		}
		const setupData = async () => {
			if (!chart.value || !props.activeScenario) return;
			try {
				let data: SensorData[][] = [];
				if (isLocalMode()) {
					const res = await fetch(`/api/scenarios/${props.activeScenario.fileName}`);
					data = await res.json();
				} else {
					data = await getMockData(props.activeScenario);
				}	
				for (let i = 0; i < allSeries.value.length; i++) {
					allSeries.value[i].appendJSON(data[i]);
				};
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