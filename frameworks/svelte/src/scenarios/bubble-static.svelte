<script lang="ts">
    import { onMount } from 'svelte'
    import { PointLineAreaSeries, Themes, isHitSampleXY, lightningChart } from '@lightningchart/lcjs'
    import { getMockData, isLocalMode, type Scenario, type SensorData } from 'shared';

    let chartRef: HTMLDivElement;
    let { activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes } = $props();

    onMount(() => {
        if (!chartRef) return;
        const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
        const chart = lc.ChartXY({ 
            container: chartRef, 
            theme: Themes[theme],
        })
            .setTitle('Temperature and Vibration by Throughput')
    		.setCursorMode('show-nearest');
		chart.axisX.setTitle('Temperature (°C)');
		chart.axisY.setTitle('Vibration (mm/s)');
		const allSeries: PointLineAreaSeries[] = [];
		for (let i = 0; i < 4; i += 1) {
			const series = chart.addPointSeries({
				schema: {
					temperature: { pattern: null },
					vibration: { pattern: null },
					throughput: { pattern: null },
					machineId: { nonNumeric: true }
				}
			})
				.setName(`Machine ${i + 1}`)
				.setDataMapping({ x: 'temperature', y: 'vibration', size: 'throughput' });
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
                    allSeries[i]
                        .appendJSON(data[i], { whitelist: ['machineId', 'temperature', 'vibration', 'throughput'] });
                };
                chart.setCursorFormatting((_, hit) => {
                    if (!isHitSampleXY(hit)) return undefined
                    return [
                        [{ text: 'Temperature (°C)', font: { weight: 'bold' } }, '', hit.x.toFixed(2)],
                        [{ text: 'Vibration (mm/s)', font: { weight: 'bold' } }, '', hit.y.toFixed(2)],
                        [{ text: 'Throughput', font: { weight: 'bold' } }, '', hit.size?.toFixed(0)]
                    ]
                });
            } catch (err) {
                console.error("Data fetch failed:", err);
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