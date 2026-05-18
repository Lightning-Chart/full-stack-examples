<script lang="ts">
    import { onMount } from 'svelte'
    import { AxisTickStrategies, ChartXY, PointLineAreaSeries, Themes, lightningChart } from '@lightningchart/lcjs'
    import { getMockData, isLocalMode, type Scenario, type SensorData } from 'shared';

    let chartRef: HTMLDivElement;
    let { activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes } = $props();

    onMount(() => {
        if (!chartRef) return;
        const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
      		const chart: ChartXY = lc.ChartXY({
			defaultAxisX: { type: 'linear-highPrecision' },
			container: chartRef,
			theme: Themes[theme],
		})
			.setTitle('Comparative Thermal Analysis of Production Units');
		chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime).setTitle('Time');
        const axisY = chart.getDefaultAxisY().setTitle('Temperature (°C)');
		const allSeries: PointLineAreaSeries[] = [];
		for (let i = 0; i < 3; i++) {
			const series = chart.addLineSeries({ 
				axisY, 
				schema: {
					timestamp: { pattern: 'progressive' },
					temperature: { pattern: null },
					machineId: { nonNumeric: true }
				} 
			})
			series.setName(`Machine ${i+1}`).setDataMapping({ x: 'timestamp', y: 'temperature' });
			allSeries.push(series);
		};

		const setupData = async () => {
            try {
                let data: SensorData[][] = [];
                if (isLocalMode()) {
                    const res = await fetch(`/api/scenarios/${activeScenario.fileName}`);
                    data = await res.json();
                } else {
                    data = getMockData(activeScenario) as SensorData[][];
                }
                if (chart.isDisposed()) return;
                
                for (let i = 0; i < allSeries.length; i++) {
                    allSeries[i].appendJSON(data[i]);
                };
            } catch (err) {
                console.error("Failed to fetch data:", err);
                return;
            }
		};
		setupData();

        return () => {
            chart.dispose();
            lc.dispose();
        };
    });
</script>

<div bind:this={chartRef} style="width: 100%; height: 100%;"></div>