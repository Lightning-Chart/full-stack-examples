import { afterNextRender, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { Themes, PointLineAreaSeries, AxisTickStrategies, Axis, ChartXY, DataSetXY } from "@lightningchart/lcjs";
import { LcContextService } from '../lc-context/lc-context.service';
import { isLocalMode, getMockData, Scenario, SensorData } from "shared";

@Component({
	selector: 'axis-switching',
	template: `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
            <div style="width: 100%; display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 16px; padding: 8px 0px;">
                <span style="margin-left: 8px;">Kinetic Energy Distribution of Machine Vibration (v<sup>2</sup>) Over a 5-Second Interval</span>
                <span>Toggle axis type:</span>
                <button style="margin-right: 8px;" (click)="toggleAxis()">
                    {{ isLog ? 'Logarithmic' : 'Linear' }}
                </button>
            </div>
            <div #chartRef style="width: 100%; flex-grow: 1; min-height: 0;"></div>
        </div>
    `,
})
export class AxisSwitching implements OnDestroy {
    @ViewChild('chartRef', { static: false }) chartRef!: ElementRef<HTMLDivElement>;
    @Input({ required: true }) theme!: keyof typeof Themes; 
    @Input({ required: true }) activeScenario!: Scenario;
    private destroyLC?: () => void;
    private chartElements?: {
        chart: ChartXY;
        xAxis: Axis;
        linAxis: Axis;
        logAxis: Axis;
        linSeries: PointLineAreaSeries;
        logSeries: PointLineAreaSeries;
    };
    private dataSet = new DataSetXY({
    	schema: {
    		relativeTime: { pattern: 'progressive' },
    		stress: { pattern: null },
    	}
    });
    isLog = false;
    
    constructor(lcContextService: LcContextService) {
    	afterNextRender(() => {
    		const lc = lcContextService.getLightningChartContext();
    		const container = this.chartRef.nativeElement;
    		const chart = lc.ChartXY({ 
    			legend: { visible: false },
    			container, 
    			theme: Themes[this.theme], 
    		})			
    			.setTitle('');
    		const xAxis = chart.getDefaultAxisX().setTitle('Time').setTickStrategy(AxisTickStrategies.Time);
    		const linAxis = chart.getDefaultAxisY().setTitle('Kinetic Energy (lin)');
    		const logAxis = chart.addAxisY({ type: 'logarithmic', base: 10 }).setTitle('Kinetic Energy (log10)');
    		const linSeries = chart.addLineSeries({ axisX: xAxis, axisY: linAxis, automaticColorIndex: 0 }).setName(`Linear Series`);
    		const logSeries = chart.addLineSeries({ axisX: xAxis, axisY: logAxis, automaticColorIndex: 0 }).setName(`Logarithmic Series`);
    		logSeries.setVisible(false);
    		logAxis.setVisible(false);
    		this.chartElements = { chart, linSeries, logSeries, xAxis, linAxis, logAxis };

    		const setupData = async () => {
    			try {
    				let data: SensorData[][] = [];
    				if (isLocalMode()) {
    					const res = await fetch(`/api/scenarios/${this.activeScenario.fileName}`);
    					data = await res.json();
    				} else {
    					data = getMockData(this.activeScenario);
    				}
    				if (chart.isDisposed()) return;
                    
    				this.dataSet.clear();
    				this.dataSet.appendJSON(data, { whitelist: ['relativeTime', 'stress'] });
    				linSeries.setDataSet(this.dataSet, { x: 'relativeTime', y: 'stress' });
    				logSeries.setDataSet(this.dataSet, { x: 'relativeTime', y: 'stress' });
    			} catch (err) {
    				console.error("Failed to fetch data:", err);
    				return;
    			}
    		};
    		setupData();
                        
    		this.destroyLC = () => {
    			chart.dispose();
    		}    
    	})
    };
    
    toggleAxis = () => {
    	this.isLog = !this.isLog;
    	const chartElements = this.chartElements;
    	if (!chartElements) return;
    	const { linSeries, logSeries, xAxis, linAxis, logAxis } = chartElements;
    	if (this.isLog) {
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
    
    ngOnDestroy(): void {
    	if (this.destroyLC) {
    		this.destroyLC();
    	} 
    };
}