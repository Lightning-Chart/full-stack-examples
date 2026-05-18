<template>
	<div ref="chartRef" style="width: 100%; height: 100%;" />
</template>

<script lang="ts">
import { ref, shallowRef, onMounted, PropType, onBeforeUnmount, onErrorCaptured } from 'vue'
import { lightningChart, Themes } from "@lightningchart/lcjs";
import { Scenario } from "shared";

export default {
	name: "BasicChartComponent",
	props: {
		activeScenario: { type: Object as PropType<Scenario>, required: true },
		theme: { type: Object as PropType<keyof typeof Themes>, required: true }
	},
	setup(props) {
		const chartRef = ref<HTMLDivElement | null>(null);
		const lc = shallowRef();
		const chart = shallowRef();

		const createChart = () => {
			lc.value = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
			chart.value = lc.value.ChartXY({
				container: chartRef.value,
				theme: Themes[props.theme],
			});
			if (!chartRef.value || !chart.value || !props.activeScenario) return;
			chart.value.setTitle(`Vue: ${props.activeScenario.label}`);
		}
		const setupData = () => {
			if (!chart.value || !props.activeScenario) return;
			const points= []
			for (let i = 0; i < 20; i++) {
				points.push({
					x: i,
					y: i
				})
			}
			chart.value.addPointSeries({
				schema: {
					x: { pattern: 'progressive' },
					y: { pattern: null }
				}
			})
				.appendJSON(points);
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