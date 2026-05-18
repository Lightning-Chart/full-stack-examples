<script lang="ts">
    import { onMount } from 'svelte'
	import { writable } from 'svelte/store';
    import {  AxisTickStrategies, ChartXY, CursorXY, DataSetXY, PointLineAreaSeries, Themes, lightningChart, synchronizeAxisIntervals } from '@lightningchart/lcjs'
    import { getMockData, isLocalMode, type Scenario, type SensorData } from 'shared';

    let chartRef1: HTMLDivElement;
    let chartRef2: HTMLDivElement;
    let chartRef3: HTMLDivElement;
    let { activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes } = $props();
    let dataSet = new DataSetXY({
        schema: {
    		timestamp: { pattern: 'progressive' },
    		temperature: { pattern: null },
    		vibration: { pattern: null },
    		throughput: { pattern: null }
        }
    });
    let VALUES: string[] = ['temperature', 'vibration', 'throughput'];
    let TITLES: string[] = ['Thermal Output Profile (°C)', 'Mechanical Kinematics Profile (mm/s)', 'Production Throughput Efficiency (units/s)'];
	let panelData = writable<{ temp: string; vib: string; tp: string } | null>(null);

    onMount(() => {
        const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
        const containers = [chartRef1, chartRef2, chartRef3];		
    		const charts = containers.map((container, i) => {
    			const chart: ChartXY = lc.ChartXY({
    				defaultAxisX: { type: 'linear-highPrecision' },
    				theme: Themes[theme], 
    				container: container as HTMLDivElement,
    			})
    				.setTitle(`${TITLES[i]}`)
    				.setCursorMode(undefined);
    			chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime);
    			const series = chart.addLineSeries().setName(`${VALUES[i]}`);
    			const cursor: CursorXY = chart.addCursor();
    			cursor.setTickMarkerXVisible(false);
    			return { chart, cursor, series };
    		})
    		synchronizeAxisIntervals(...charts.map((chart) => chart.chart.axisX));

    		const hideCursor = () => {
    			charts.forEach((chart) => chart.cursor.setVisible(false))
    		};
    		const displayCursorAt = (x: number) => {
    			charts.forEach((chart) => {
    				const solveResults = chart.chart
    					.getSeries()
				        // NOTE: Other series types don't currently have direct API syntax to solve nearest from axis coordinate - for them, you have to first translate axis coordinate to client coordinate and then use solve nearest
    					.map((series) => series.getCursorEnabled() && series instanceof PointLineAreaSeries && series.solveNearest({ x, y: 0 }))
    					.filter((solve) => !!solve);
    				if (solveResults.length > 0) {
    					chart.cursor
    						.setVisible(true)
    						.setPosition(...solveResults.map((solve) => solve.cursorPosition))
    						.setResultTable((rt) => rt.setContent(chart.chart.getCursorFormatting()(chart.chart, solveResults[0], solveResults)));
    				} else {
    					chart.cursor.setVisible(false);
    				}
    			});
    		};
    		charts.forEach((chart) => {
                chart.chart.seriesBackground.addEventListener('pointermove', (event) =>
                    displayCursorAt(chart.chart.translateCoordinate(event, chart.chart.coordsAxis).x),
                );
                chart.chart.getSeries().forEach((series) => series.addEventListener('pointermove', (event, info) => displayCursorAt(info.x)));
                chart.chart.seriesBackground.addEventListener('pointerleave', () => hideCursor());
    		});

    		const setupData = async () => {
    			if (!charts || !activeScenario) return;
                try {
                    let data: SensorData[][] = [];
                    if (isLocalMode()) {
                            const res = await fetch(`/api/scenarios/${activeScenario.fileName}`);
                            data = await res.json();
                    } else {
                        data = getMockData(activeScenario) as SensorData[][];
                    }
                    
                    dataSet.clear();
                    dataSet.appendJSON(data, { whitelist: ['timestamp', VALUES[0], VALUES[1], VALUES[2]] });
                    for (let i = 0; i < charts.length; i++) {
                        charts[i].series.setDataSet(dataSet, { x: 'timestamp', y: VALUES[i] });
                    }; 
                    const countAverage = (property: string) => {
                        const array = dataSet.readBack().data[property]
                        let total = 0
                        for (let i = 0; i < array.length; i++) {
                            total += array[i];
                        }
                        return total / array.length;
                    }
                    panelData.set({
                        temp: countAverage(VALUES[0]).toFixed(2),
                        vib: countAverage(VALUES[1]).toFixed(2),
                        tp: (countAverage(VALUES[2]) * 100).toFixed(0)
                    });
                } catch (err) {
                    console.error("Failed to fetch data:", err);
                    return;
                }
    		};
    		setupData();

        return () => {
            charts.forEach(chart => chart.chart.dispose());
            lc.dispose();
        };
    });
</script>

<div style="width: 100%; height: 100%; display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr);">
    <div style="padding: 8px;">
		{#if $panelData }
            <strong>Synchronized Multivariate Production Telemetry</strong><br />
            <br />
            Production unit: <strong>Machine 1</strong><br />
			Average temperature: <strong>{$panelData.temp}</strong> °C<br>
			Average vibration: <strong>{$panelData.vib}</strong> mm/s<br>
			Average throughput: <strong>{$panelData.tp}</strong> units per second
        {:else}
            Loading data...
		{/if}
    </div>
    <div bind:this={chartRef1}></div>
    <div bind:this={chartRef2}></div>
    <div bind:this={chartRef3}></div>
</div>