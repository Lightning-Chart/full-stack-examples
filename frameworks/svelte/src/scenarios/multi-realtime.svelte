<script lang="ts">
    import { onMount } from 'svelte'
    import { AxisScrollStrategies, AxisTickStrategies, ChartXY, ColorRGBA, LUT, PalettedFill, PointLineAreaSeries, SolidLine, Themes, lightningChart } from '@lightningchart/lcjs'
    import { getMockData, isLocalMode, type Scenario, type SensorData } from 'shared';

    let chartRef: HTMLDivElement;
    let { activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes } = $props();

    onMount(() => {
        if (!chartRef) return;
        const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
     	const chart: ChartXY = lc.ChartXY({
			defaultAxisX: { type: 'linear-highPrecision' },
			legend: { visible: false },
			container: chartRef,
			theme: Themes[theme],
		})
			.setTitle('Real-Time Vibration Profile (M1-M3)');
		chart.getDefaultAxisX()
			.setTitle("Time")
			.setTickStrategy(AxisTickStrategies.DateTime)
      		.setScrollStrategy(AxisScrollStrategies.scrolling)
    		.setDefaultInterval((state) => ({ end: state.dataMax, start: (state.dataMax ?? 0) - 10 * 1000, stopAxisAfter: false }))
		chart.getDefaultAxisY().dispose();

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
		
		const allSeries: PointLineAreaSeries[] = [];
		for (let i = 0; i < 3; i++) {
			const axisY = chart
                .addAxisY({ iStack: -i })
                .setTitleRotation(0)
                .setMargins(i === 1 ? 15 : 0, i === 1 ? 15 : 0);
            if (i === 1) axisY.setTitle('Vibration (mm/s)').setTitleRotation(270);
			const series = chart.addLineSeries({ 
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
			allSeries.push(series);
		}
		let ws: WebSocket | null = null;
		let interval: ReturnType<typeof setInterval> | null = null;

		if (isLocalMode()) {
			ws = new WebSocket(`ws://localhost:3000/api/scenarios/${activeScenario.fileName}`);
			ws.onmessage = (e) => {
				try {
					const msg = JSON.parse(e.data);
					for (let i = 0; i < allSeries.length; i++) {
						allSeries[i].appendJSON(msg[i]);
					};
				} catch (e) { 
					console.error(e); 
				}
			};
		} else {
			const data = getMockData(activeScenario) as SensorData[][];
			let dataAmount = 0;
            interval = setInterval(() => {
                if (dataAmount >= data[0].length) {
                    if (interval) clearInterval(interval);
                    return;
                }
                for (let i = 0; i < allSeries.length; i++) {
                    allSeries[i].appendJSON([{
                        timestamp: data[i][dataAmount].timestamp,
                        vibration: data[i][dataAmount].vibration,
                        machineId: data[i][dataAmount].machineId
                    }]);
                }
                dataAmount++;
            }, 20);
		}

        return () => {
			if (ws) ws.close();
			if (interval) clearInterval(interval);
            chart.dispose();
            lc.dispose();
        };
    });
</script>

<div bind:this={chartRef} style="width: 100%; height: 100%;"></div>