import { afterNextRender, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { Themes, PointLineAreaSeries, isHitSampleXY } from "@lightningchart/lcjs";
import { LcContextService } from '../lc-context/lc-context.service';
import { isLocalMode, getMockData, Scenario, SensorData } from "shared";

@Component({
	selector: 'bubble-static',
	template: `<div #chartRef style="width: 100%; height: 100%;"></div>`,
})
export class BubbleStatic implements OnDestroy {
    @ViewChild('chartRef', { static: false }) chartRef!: ElementRef<HTMLDivElement>;
    @Input({ required: true }) theme!: keyof typeof Themes; 
    @Input({ required: true }) activeScenario!: Scenario;
    private destroyLC?: () => void;
    
    constructor(lcContextService: LcContextService) {
    	afterNextRender(() => {
    		const lc = lcContextService.getLightningChartContext();
    		const container = this.chartRef.nativeElement;
    		const chart = lc.ChartXY({ 
    			container, 
    			theme: Themes[this.theme], 
    		})			
    			.setTitle('Temperature and Vibration by Throughput')
    			.setCursorMode('show-nearest');

    		chart.axisX.setTitle('Temperature (°C)');
    		chart.axisY.setTitle('Vibration (mm/s)');
    		const allSeries: PointLineAreaSeries[] = [];
    		for (let i = 0; i < 4; i += 1) {
    			const series = chart.addPointSeries({
    				schema: {
    					temperature: { pattern: null },
    					vibration: { pattern: null },
    					throughput: { pattern: null },
    					machineId: { nonNumeric: true }
    				}
    			})
    				.setName(`Machine ${i + 1}`)
    				.setDataMapping({ x: 'temperature', y: 'vibration', size: 'throughput' });
    			allSeries.push(series);
    		};

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
                    
    				for (let i = 0; i < allSeries.length; i++) {
    					allSeries[i]
    						.appendJSON(data[i], { whitelist: ['machineId', 'temperature', 'vibration', 'throughput'] });
    				};
    				chart.setCursorFormatting((_, hit) => {
    					if (!isHitSampleXY(hit)) return undefined
    					return [
    						[{ text: 'Temperature (°C)', font: { weight: 'bold' } }, '', hit.x.toFixed(2)],
    						[{ text: 'Vibration (mm/s)', font: { weight: 'bold' } }, '', hit.y.toFixed(2)],
    						[{ text: 'Throughput', font: { weight: 'bold' } }, '', hit.size?.toFixed(0)]
    					]
    				});
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