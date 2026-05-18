import { lightningChart, Themes } from "@lightningchart/lcjs";

export default function basicChartScenario(container, props) {
	container.innerHTML = `
        <div id="${props.activeScenario.id}" style="width: 100%; height: 100%;"></div>
    `;
	const chartArea = container.querySelector(`#${props.activeScenario.id}`);
	const lc = lightningChart({ license: import.meta.env.VITE_LCJS_LICENSE });
	const chart = lc.ChartXY({
		container: chartArea,
		theme: Themes[props.theme],
	})
		.setTitle(`Vanilla JS: ${props.activeScenario.label}`);
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

	return function cleanup() {
		chart.dispose();
		lc.dispose();
		container.innerHTML = '';
	};
}