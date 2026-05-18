import { afterNextRender, Component, ElementRef, Input, OnDestroy, signal, ViewChild } from '@angular/core';
import { Themes, PointLineAreaSeries, AxisTickStrategies, CursorXY, ChartXY, DataSetXY, synchronizeAxisIntervals } from "@lightningchart/lcjs";
import { LcContextService } from '../lc-context/lc-context.service';
import { isLocalMode, getMockData, Scenario, SensorData } from "shared";

@Component({
	selector: 'synced-charts',
	template: `
        <div style="width: 100%; height: 100%; display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr);">
            <div style="padding: 8px;">
                @if (panelData()) {
                    <strong>Synchronized Multivariate Production Telemetry</strong><br />
                    <br />
                    Production unit: <strong>Machine 1</strong><br />
                    Average temperature: <strong>{{ panelData()!.temp }}</strong> °C<br>
                    Average vibration: <strong>{{ panelData()!.vib }}</strong> mm/s<br>
                    Average throughput: <strong>{{ panelData()!.tp }}</strong> units per second
                } @else {
                    Loading data...
                }
            </div>
            <div #chartRef1></div>
            <div #chartRef2></div>
            <div #chartRef3></div>
        </div>
    `,
})
export class SyncedCharts implements OnDestroy {
    @ViewChild('chartRef1', { static: false }) chartRef1!: ElementRef<HTMLDivElement>;
    @ViewChild('chartRef2', { static: false }) chartRef2!: ElementRef<HTMLDivElement>;
    @ViewChild('chartRef3', { static: false }) chartRef3!: ElementRef<HTMLDivElement>;
    @Input({ required: true }) theme!: keyof typeof Themes; 
    @Input({ required: true }) activeScenario!: Scenario;
    private destroyLC?: () => void;
    private dataSet = new DataSetXY({
    	schema: {
    		timestamp: { pattern: 'progressive' },
    		temperature: { pattern: null },
    		vibration: { pattern: null },
    		throughput: { pattern: null }
    	}
    });
    private VALUES: string[] = ['temperature', 'vibration', 'throughput'];
    private TITLES: string[] = ['Thermal Output Profile (°C)', 'Mechanical Kinematics Profile (mm/s)', 'Production Throughput Efficiency (units/s)'];
    panelData = signal<{ temp: string; vib: string; tp: string } | null>(null);
        
    constructor(lcContextService: LcContextService) {
    	afterNextRender(() => {
    		const lc = lcContextService.getLightningChartContext();
    		const containers = [this.chartRef1, this.chartRef2, this.chartRef3];		
    		const charts = containers.map((container, i) => {
    			const chart: ChartXY = lc.ChartXY({
    				defaultAxisX: { type: 'linear-highPrecision' },
    				theme: Themes[this.theme], 
    				container: container.nativeElement,
    			})
				    .setTitle(`${this.TITLES[i]}`)
    				.setCursorMode(undefined);
    			chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime);
    			const series = chart.addLineSeries().setName(`${this.VALUES[i]}`);
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
    			chart.chart.getSeries().forEach((series) => series.addEventListener('pointermove', (_event, info) => displayCursorAt(info.x)));
    			chart.chart.seriesBackground.addEventListener('pointerleave', () => hideCursor());
    		});
    		const setupData = async () => {
    			if (!charts || !this.activeScenario) return;
    			try {
    				let data: SensorData[][] = [];
    				if (isLocalMode()) {
    					const res = await fetch(`/api/scenarios/${this.activeScenario.fileName}`);
    					data = await res.json();
    				} else {
    					data = getMockData(this.activeScenario) as SensorData[][];
    				}
    				this.dataSet.clear();
    				this.dataSet.appendJSON(data, { whitelist: ['timestamp', this.VALUES[0], this.VALUES[1], this.VALUES[2]] });
    				for (let i = 0; i < charts.length; i++) {
    					charts[i].series.setDataSet(this.dataSet, { x: 'timestamp', y: this.VALUES[i] });
    				};
    				const countAverage = (property: string) => {
    					const array = this.dataSet.readBack().data[property]
    					let total = 0
    					for (let i = 0; i < array.length; i++) {
    						total += array[i];
    					}
    					return total / array.length;
    				}
    				this.panelData.set({
    					temp: countAverage(this.VALUES[0]).toFixed(2),
    					vib: countAverage(this.VALUES[1]).toFixed(2),
    					tp: (countAverage(this.VALUES[2]) * 100).toFixed(0)
    				});
    			} catch (err) {
    				console.error("Failed to fetch data:", err);
    				return;
    			}
    		};
    		setupData();

    		this.destroyLC = () => {
    			charts.forEach(chart => chart.chart.dispose());
    		}    
    	})
    };

    ngOnDestroy(): void {
    	if (this.destroyLC) {
    		this.destroyLC();
    	} 
    };
}