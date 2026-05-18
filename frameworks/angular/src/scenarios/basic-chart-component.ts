import { afterNextRender, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { Themes } from "@lightningchart/lcjs";
import { LcContextService } from '../lc-context/lc-context.service';
import { Scenario } from "shared";

@Component({
	selector: 'basic-chart-component',
	template: `<div #chartRef style="width: 100%; height: 100%;"></div>`,
})
export class BasicChartComponent implements OnDestroy {
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
    			.setTitle(`Angular: ${this.activeScenario.label}`);
                
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