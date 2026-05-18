import { afterNextRender, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { Themes, PointLineAreaSeries, AxisTickStrategies, AxisScrollStrategies, PalettedFill, LUT, ColorRGBA, SolidLine } from "@lightningchart/lcjs";
import { LcContextService } from '../lc-context/lc-context.service';
import { isLocalMode, getMockData, Scenario, RealtimeBinaryData } from "shared";

@Component({
	selector: 'multi-realtime-binary',
	template: `<div #chartRef style="width: 100%; height: 100%;"></div>`,
})
export class MultiRealtimeBinary implements OnDestroy {
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
    			legend: { visible: false },
    			container, 
    			theme: Themes[this.theme], 
    		})			
    			.setTitle('Real-Time Vibration Profile (M1-M3)');
    		chart.getDefaultAxisX()
    			.setTitle("Time")
    			.setTickStrategy(AxisTickStrategies.DateTime)
    			.setScrollStrategy(AxisScrollStrategies.scrolling)
    			.setDefaultInterval((state) => ({ end: state.dataMax, start: (state.dataMax ?? 0) - 10 * 1000, stopAxisAfter: false }))
    		chart.getDefaultAxisY().dispose();

    		const palette = new PalettedFill({
    			lookUpProperty: 'y',
    			lut: new LUT({
    				interpolate: false,
    				steps: [
    					{ value: 0, color: ColorRGBA( 255, 0, 0 ) },
    					{ value: 0.2, color: ColorRGBA( 0, 255, 0 ) },
    					{ value: 4.2, color: ColorRGBA( 255, 0, 0 ) }
    				],
    			})
    		});
		
    		const allSeries: PointLineAreaSeries[] = [];
    		for (let i = 0; i < 3; i++) {
    			const axisY = chart
    				.addAxisY({ iStack: -i })
    				.setTitleRotation(0)
    				.setMargins(i === 1 ? 15 : 0, i === 1 ? 15 : 0);
    			if (i === 1) axisY.setTitle('Vibration (mm/s)').setTitleRotation(270);
    			const series = chart.addLineSeries({ 
    				axisY, 
    				schema: {
    					timestamps: { storage: Float64Array, pattern: 'progressive' },
    					vibrations: { storage: Float32Array },
    				} 
    			})
    				.setName(`Machine ${i+1}`)
    			    // Data cleaning: set the maximum number of samples that are retained
    				.setMaxSampleCount(50_000)
    				.setDataMapping({ x: 'timestamps', y: 'vibrations' })
    				.setStrokeStyle(new SolidLine({ fillStyle: palette}));
    			allSeries.push(series);
    		}
    		let ws: WebSocket | null = null;
    		let interval: ReturnType<typeof setInterval> | null = null;

    		if (isLocalMode()) {
    			ws = new WebSocket(`ws://localhost:3000/api/scenarios/${this.activeScenario.fileName}`);
    			ws.binaryType = "arraybuffer";
    			ws.onmessage = (e) => {
    				try {
    					const buffer = e.data as ArrayBuffer;
    					const view = new DataView(buffer);
    					const machineIndex = view.getUint8(0);
    					const pointCount = (buffer.byteLength - 8) / 12;
    					const timestamps = new Float64Array(buffer, 8, pointCount);
    					const vibrations = new Float32Array(buffer, 8 + pointCount * 8, pointCount);
    					allSeries[machineIndex].appendSamples({ 
    						timestamps: timestamps, 
    						vibrations: vibrations 
    					});
    				} catch (e) { 
    					console.error(e); 
    				}
    			};
    		} else {
    			const data = getMockData(this.activeScenario) as RealtimeBinaryData[];
    			let currentIndex = 0;
    			const tempTimestamps = new Float64Array(1);
    			const tempVibrations = new Float32Array(1);

    			interval = setInterval(() => {
    				if (currentIndex >= data[0].timestamps.length) {
    					if (interval) clearInterval(interval);
    					return;
    				}
    				for (let i = 0; i < allSeries.length; i++) {
    					const machineData = data[i];
    					tempTimestamps[0] = machineData.timestamps[currentIndex];
    					tempVibrations[0] = machineData.vibrations[currentIndex];
    					allSeries[i].appendSamples({
    						timestamps: tempTimestamps,
    						vibrations: tempVibrations
    					});
    				}
    				currentIndex++;
    			}, 20);
    		}

    		this.destroyLC = () => {
    			if (ws) ws.close();
    			if (interval) clearInterval(interval);
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