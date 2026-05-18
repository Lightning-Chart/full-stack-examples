import { afterNextRender, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { Themes, PointLineAreaSeries, AxisTickStrategies } from "@lightningchart/lcjs";
import { LcContextService } from '../lc-context/lc-context.service';
import { isLocalMode, getMockData, Scenario } from "shared";

@Component({
	selector: 'multi-static-binary',
	template: `<div #chartRef style="width: 100%; height: 100%;"></div>`,
})
export class MultiStaticBinary implements OnDestroy {
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
    					x: { storage: Float64Array, pattern: 'progressive' },
    					y: { storage: Float32Array }
    				} 
    			})
    			series.setName(`Machine ${i+1}`);
    			allSeries.push(series);
    		};

    		const setupData = async () => {
    			try {
    				let arrayBuffer: ArrayBuffer;
    				let pointsCount: number;
    				if (isLocalMode()) {
    					const res = await fetch(`/api/scenarios/${this.activeScenario.fileName}`);
    					// Parse custom header to get point counts
    					const pointsCountHeader = res.headers.get('Points-Count');
    					arrayBuffer = await res.arrayBuffer();
    					pointsCount = pointsCountHeader ? parseInt(pointsCountHeader, 10) : arrayBuffer.byteLength / 20;
    				} else {
    					const data = getMockData(this.activeScenario);
    					arrayBuffer = data.arrayBuffer;
    					pointsCount = data.pointsCount;
    				}
    				if (chart.isDisposed()) return;
    				const sharedTimestamps = new Float64Array(arrayBuffer, 0, pointsCount);
    				const baseTemperatureByteOffset = pointsCount * 8;

    				for (let i = 0; i < 3; i++) {
    					const machineByteOffset = baseTemperatureByteOffset + (i * pointsCount * 4);
    					const temperatures = new Float32Array(arrayBuffer, machineByteOffset, pointsCount);
                
    					allSeries[i].appendSamples({
    						x: sharedTimestamps,
    						y: temperatures,
    					});
    				}
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