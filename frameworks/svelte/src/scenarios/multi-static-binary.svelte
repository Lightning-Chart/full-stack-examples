<script lang="ts">
    import { onMount } from 'svelte'
    import { AxisTickStrategies, ChartXY, PointLineAreaSeries, Themes, lightningChart } from '@lightningchart/lcjs'
    import { getMockData, isLocalMode, type MultiStaticBinaryData, type Scenario, type SensorData } from 'shared';

    let chartRef: HTMLDivElement;
    let { activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes } = $props();

    onMount(() => {
        if (!chartRef) return;
        const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
      	const chart: ChartXY = lc.ChartXY({
			defaultAxisX: { type: 'linear-highPrecision', },
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
                    x: { storage: Float64Array, pattern: 'progressive' },
                    y: { storage: Float32Array }
				}
			});
			series.setName(`Machine ${i+1}`);
			allSeries.push(series);
		}

		const setupData = async () => {
            try {
                let arrayBuffer: ArrayBuffer;
                let pointsCount: number;
                if (isLocalMode()) {
                    const res = await fetch(`/api/scenarios/${activeScenario.fileName}`);
                    // Parse custom header to get point counts
                    const pointsCountHeader = res.headers.get('Points-Count');
                    arrayBuffer = await res.arrayBuffer();
                    pointsCount = pointsCountHeader ? parseInt(pointsCountHeader, 10) : arrayBuffer.byteLength / 20;
                } else {
                    const data = getMockData(activeScenario) as MultiStaticBinaryData;
                    arrayBuffer = data.arrayBuffer;
                    pointsCount = data.pointsCount;
                }
                if (chart.isDisposed()) return;
                const sharedTimestamps = new Float64Array(arrayBuffer, 0, pointsCount);
                const baseTemperatureByteOffset = pointsCount * 8;

                for (let i = 0; i < 3; i++) {
                    const machineByteOffset = baseTemperatureByteOffset + (i * pointsCount * 4);
                    const temperatures = new Float32Array(arrayBuffer, machineByteOffset, pointsCount);
                
                    allSeries[i].appendSamples({
                        x: sharedTimestamps,
                        y: temperatures,
                    });
                }
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