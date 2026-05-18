<template>
	<div ref="chartRef" style="width: 100%; height: 100%;" />
</template>

<script lang="ts">
import { ref, shallowRef, onMounted, PropType, onBeforeUnmount, onErrorCaptured } from 'vue'
import { lightningChart, Themes, PointLineAreaSeries, AxisTickStrategies } from "@lightningchart/lcjs";
import { isLocalMode, getMockData, Scenario } from "shared";

export default {
	name: "MultiStaticBinary",
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
						x: { storage: Float64Array, pattern: 'progressive' },
						y: { storage: Float32Array }
					}
				})
				series.setName(`Machine ${i+1}`);
				allSeries.value[i] = series;
			};
		}
		const setupData = async () => {
			if (!chart.value || !props.activeScenario) return;
			try {
				let arrayBuffer: ArrayBuffer;
				let pointsCount: number;
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
				if (chart.value.isDisposed()) return;
				const sharedTimestamps = new Float64Array(arrayBuffer, 0, pointsCount);
				const baseTemperatureByteOffset = pointsCount * 8;

				for (let i = 0; i < 3; i++) {
					const machineByteOffset = baseTemperatureByteOffset + (i * pointsCount * 4);
					const temperatures = new Float32Array(arrayBuffer, machineByteOffset, pointsCount);
                
					allSeries.value[i].appendSamples({
						x: sharedTimestamps,
						y: temperatures,
					});
				}
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