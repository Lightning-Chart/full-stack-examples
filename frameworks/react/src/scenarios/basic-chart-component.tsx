import { useEffect, useRef, useContext } from "react";
import { Themes, ChartXY } from "@lightningchart/lcjs";
import { LCContext } from "../LC";
import { Scenario } from "shared";

export function BasicChartComponent({ activeScenario, theme }: { activeScenario: Scenario, theme: keyof typeof Themes }) {
	// LCContext is a React context that you can use for sharing LightningChart resources between all charts that are created during the application lifetime.
	// More about LCContext: https://lightningchart.com/js-charts/docs/frameworks/react/#optimizing-apps-with-several-charts-visible-at-once--charts-being-initialized-often
	const lc = useContext(LCContext);
	const chartRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = chartRef.current;
		if (!container || !lc) return;
		const chart: ChartXY = lc.ChartXY({
			container,
			theme: Themes[theme],
		})
			.setTitle(`React: ${activeScenario.label}`);
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
				y: { pattern: null }
			}
		})
			.appendJSON(points);
		return () => {
			chart.dispose();
		};
	}, [lc, activeScenario, theme]);
	return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
};