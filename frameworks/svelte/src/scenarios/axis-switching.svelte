<script lang="ts">
    import { onMount } from 'svelte'
    import { Axis, AxisTickStrategies, ChartXY, DataSetXY, PointLineAreaSeries, Themes, lightningChart } from '@lightningchart/lcjs'
    import { getMockData, isLocalMode, type Scenario, type SensorData } from 'shared';

    let chartRef: HTMLDivElement;
    let { activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes } = $props();
	let chartElements: {
        chart: ChartXY;
        xAxis: Axis;
        linAxis: Axis;
        logAxis: Axis;
        linSeries: PointLineAreaSeries;
        logSeries: PointLineAreaSeries;
	} | null = null;
    let dataSet = new DataSetXY({
        schema: {
            relativeTime: { pattern: 'progressive' },
            stress: { pattern: null },
        }
    });
    let isLog = $state(false);

    onMount(() => {
        if (!chartRef) return;
        const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
        const chart = lc.ChartXY({ 
            legend: { visible: false },
            container: chartRef, 
            theme: Themes[theme],
        })
		    .setTitle('');
		const xAxis = chart.getDefaultAxisX().setTitle('Time').setTickStrategy(AxisTickStrategies.Time);
		const linAxis = chart.getDefaultAxisY().setTitle('Kinetic Energy (lin)');
		const logAxis = chart.addAxisY({ type: 'logarithmic', base: 10 }).setTitle('Kinetic Energy (log10)');
		const linSeries = chart.addLineSeries({ axisX: xAxis, axisY: linAxis, automaticColorIndex: 0 }).setName(`Linear Series`);
		const logSeries = chart.addLineSeries({ axisX: xAxis, axisY: logAxis, automaticColorIndex: 0 }).setName(`Logarithmic Series`);
		logSeries.setVisible(false);
		logAxis.setVisible(false);

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
                
                dataSet.clear();
                dataSet.appendJSON(data, { whitelist: ['relativeTime', 'stress'] });
                linSeries.setDataSet(dataSet, { x: 'relativeTime', y: 'stress' });
                logSeries.setDataSet(dataSet, { x: 'relativeTime', y: 'stress' });
            } catch (err) {
                console.error("Failed to fetch data:", err);
                return;
            }
		};
		setupData();
		chartElements = { chart, linSeries, logSeries, xAxis, linAxis, logAxis };

        return () => {
            chart.dispose();
            lc.dispose();
            chartElements = null;
        };
    });
    
    const toggleAxis = () => {
        if (!chartElements) return;
        isLog = !isLog;
    	const { linSeries, logSeries, xAxis, linAxis, logAxis } = chartElements;
    	if (isLog) {
    		linSeries.setVisible(false);
    		linAxis.setVisible(false);
    		logSeries.setVisible(true);
    		logAxis.setVisible(true);
    		logAxis.fit();
    		xAxis.fit();
    	} else {
    		linSeries.setVisible(true);
    		linAxis.setVisible(true);
    		logSeries.setVisible(false);
    		logAxis.setVisible(false);
    		linAxis.fit();
    		xAxis.fit();
    	}
    };
</script>

<div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
    <div style="width: 100%; display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 16px; padding: 8px 0px;">
        <span style="margin-left: 8px;">Kinetic Energy Distribution of Machine Vibration (v<sup>2</sup>) Over a 5-Second Interval</span>
        <span>Toggle axis type:</span>
        <button style="margin-right: 8px;" onclick={toggleAxis}>
            { isLog ? 'Logarithmic' : 'Linear' }
        </button>
    </div>
    <div bind:this={chartRef} style="width: 100%; flex-grow: 1; min-height: 0;"></div>
</div>