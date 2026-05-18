<script lang="ts">
    import { onMount } from 'svelte'
    import { Themes, lightningChart } from '@lightningchart/lcjs'
    import { type Scenario, } from 'shared';

    let chartRef: HTMLDivElement;
    let { activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes } = $props();

    onMount(() => {
        if (!chartRef) return;
        const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE, });
        const chart = lc.ChartXY({ 
            container: chartRef, 
            theme: Themes[theme],
        })
            .setTitle(`Svelte: ${activeScenario.label}`);
        const points= [];
        for (let i = 0; i < 20; i++) {
            points.push({
                x: i,
                y: i
            })
        }
        chart.addPointSeries({
            schema: {
                x: { pattern: 'progressive' },
                y: { pattern: 'progressive' }
            }
        })
            .appendJSON(points);

        return () => {
            chart.dispose();
            lc.dispose();
        }
    })
</script>

<div bind:this={chartRef} style="width: 100%; height: 100%;"></div>