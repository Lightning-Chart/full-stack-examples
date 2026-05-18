import { afterNextRender, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { Themes, PointLineAreaSeries, AxisTickStrategies } from "@lightningchart/lcjs";
import { LcContextService } from '../lc-context/lc-context.service';
import { isLocalMode, getMockData, Scenario, SensorData } from "shared";

@Component({
	selector: 'multi-static',
	template: `<div #chartRef style="width: 100%; height: 100%;"></div>`,
})
export class MultiStatic implements OnDestroy {
    @ViewChild('chartRef', { static: false }) chartRef!: ElementRef<HTMLDivElement>;
    @Input({ required: true }) theme!: keyof typeof Themes; 
    @Input({ required: true }) activeScenario!: Scenario;
    private destroyLC?: () => void;
    
    constructor(lcContextService: LcContextService) {
    	afterNextRender(() => {
    		const lc = lcContextService.getLightningChartContext();
    		const container = this.chartRef.nativeElement;
    		const chart = lc.ChartXY({ 
    			defaultAxisX: { type: 'linear-highPrecision', },
    			container, 
    			theme: Themes[this.theme], 
    		})			
			    .setTitle('Comparative Thermal Analysis of Production Units');
    		chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime).setTitle('Time');
    		const axisY = chart.getDefaultAxisY().setTitle('Temperature (°C)');
    		const allSeries: PointLineAreaSeries[] = [];
    		for (let i = 0; i < 3; i++) {
    			const series = chart.addLineSeries({ 
    				axisY, 
    				schema: {
    					timestamp: { pattern: 'progressive' },
    					temperature: { pattern: null },
    					machineId: { nonNumeric: true }
    				} 
    			})
    			series.setName(`Machine ${i+1}`).setDataMapping({ x: 'timestamp', y: 'temperature' });
    			allSeries.push(series);
    		};

    		const setupData = async () => {
    			try {
    				let data: SensorData[][] = [];
    				if (isLocalMode()) {
    					const res = await fetch(`/api/scenarios/${this.activeScenario.fileName}`);
    					data = await res.json();
    				} else {
    					data = getMockData(this.activeScenario) as SensorData[][];
    				}
    				if (chart.isDisposed()) return;
                    
    				for (let i = 0; i < allSeries.length; i++) {
    					allSeries[i].appendJSON(data[i]);
    				};
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
    
    ngOnDestroy(): void {
    	if (this.destroyLC) {
    		this.destroyLC();
    	} 
    };
}