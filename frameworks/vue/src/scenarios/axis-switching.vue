<template>
	<div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
		<div style="width: 100%; display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 16px; padding: 8px 0px;">
			<span style="margin-left: 8px;">Kinetic Energy Distribution of Machine Vibration (v<sup>2</sup>) Over a 5-Second Interval</span>
			<span>Toggle axis type:</span>
			<button style="margin-right: 8px;" @click="toggleAxis">
				{{ isLog ? 'Logarithmic' : 'Linear' }}
			</button>
		</div>
		<div ref="chartRef" style="width: 100%; flex-grow: 1; min-height: 0;" />
	</div>
</template>

<script lang="ts">
import { ref, shallowRef, onMounted, PropType, onBeforeUnmount, onErrorCaptured } from 'vue'
import { lightningChart, Themes, PointLineAreaSeries, Axis, AxisTickStrategies, DataSetXY } from "@lightningchart/lcjs";
import { isLocalMode, getMockData, Scenario, SensorData } from "shared";

export default {
	name: "AxisSwitching",
	props: {
		activeScenario: { type: Object as PropType<Scenario>, required: true },
		theme: { type: Object as PropType<keyof typeof Themes>, required: true }
	},
	setup(props) {
		const chartRef = ref<HTMLDivElement | null>(null);
		const lc = shallowRef();
		const chart = shallowRef();
		const xAxis = shallowRef<Axis>();
		const linAxis = shallowRef<Axis>();
		const logAxis = shallowRef<Axis>();
		const linSeries = shallowRef<PointLineAreaSeries>();
		const logSeries = shallowRef<PointLineAreaSeries>();
		const isLog = ref(false);
		const dataSet = new DataSetXY({
			schema: {
				relativeTime: { pattern: 'progressive' },
				stress: { pattern: null },
			}
		});

		const createChart = () => {
			lc.value = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
			chart.value = lc.value.ChartXY({
				legend: { visible: false },
				container: chartRef.value,
				theme: Themes[props.theme],
			})
				.setTitle('');;
			if (!chart.value) return;

			xAxis.value = chart.value.getDefaultAxisX().setTitle('Time').setTickStrategy(AxisTickStrategies.Time);
			linAxis.value = chart.value.getDefaultAxisY().setTitle('Kinetic Energy (lin)');
			logAxis.value = chart.value.addAxisY({ type: 'logarithmic', base: 10 }).setTitle('Kinetic Energy (log10)');
			if (!xAxis.value || !linAxis.value || !logAxis.value) return;
			linSeries.value = chart.value.addLineSeries({ axisX: xAxis.value, axisY: linAxis.value, automaticColorIndex: 0 }).setName(`Linear Series`);
			logSeries.value = chart.value.addLineSeries({ axisX: xAxis.value, axisY: logAxis.value, automaticColorIndex: 0 }).setName(`Logarithmic Series`);
			logSeries.value.setVisible(false);
			logAxis.value.setVisible(false);
		}
		const setupData = async () => {
			if (!chart.value || !props.activeScenario) return;
			try {
				let data: SensorData[][] = [];
				if (isLocalMode()) {
					const res = await fetch(`/api/scenarios/${props.activeScenario.fileName}`);
					data = await res.json();
				} else {
					data = getMockData(props.activeScenario);
				}
				dataSet.clear();
				dataSet.appendJSON(data, { whitelist: ['relativeTime', 'stress'] });			
				if (linSeries.value && logSeries.value) { 
					linSeries.value.setDataSet(dataSet, { x: 'relativeTime', y: 'stress' });
					logSeries.value.setDataSet(dataSet, { x: 'relativeTime', y: 'stress' });
				}
			} catch (err) {
				console.error("Failed to fetch data:", err);
				return;
			}
		};
		const toggleAxis = () => {
			isLog.value = !isLog.value;
			if (!linSeries.value || !logSeries.value || !linAxis.value || !logAxis.value || !xAxis.value) return;
			if (isLog.value) {
				linSeries.value.setVisible(false);
				linAxis.value.setVisible(false);
				logSeries.value.setVisible(true);
				logAxis.value.setVisible(true);
				logAxis.value.fit();
				xAxis.value.fit();
			} else {
				linSeries.value.setVisible(true);
				linAxis.value.setVisible(true);
				logSeries.value.setVisible(false);
				logAxis.value.setVisible(false);
				linAxis.value.fit();
				xAxis.value.fit();
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
			isLog,
			toggleAxis
		};
	}
};
</script>