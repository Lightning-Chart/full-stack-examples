import 'zone.js';
import { createApplication } from '@angular/platform-browser';
import { createComponent, ApplicationRef, ComponentRef } from '@angular/core';
import { SCENARIOS } from 'shared';

const scenarioModules = import.meta.glob('./scenarios/*.ts', { eager: true });
class AngularScenarioElement extends HTMLElement {
	private appRef: ApplicationRef | null = null;
	private componentRef: ComponentRef<unknown> | null = null;

	async connectedCallback() {
		// Read the tags from HTML element's attributes (created in the shell app)
		const theme = this.getAttribute("theme") ?? "darkGold";
		const scenarioId = this.getAttribute("scenario-id");
		const scenario = SCENARIOS.find(s => s.id === scenarioId);
		let ComponentClass = null;
		if (scenario) {
			const path = `./scenarios/${scenario.fileName}.ts`;
			// Get the right module from Vite's Library
			const module = scenarioModules[path] as Record<string, unknown>;
			if (module) {
				// Find first class (Angular components are exported as classes) or default export
				ComponentClass = module['default'] || Object.values(module)[0];
			}
		}
		const shadow = this.attachShadow({ mode: "open" });
		const container = document.createElement("div");
		container.style.width = "100%";
		container.style.height = "100%";
		shadow.appendChild(container);
		if (ComponentClass && scenario) {
			try {
				// Create Angular app context
				this.appRef = await createApplication();
				// Create component and attach to container
				this.componentRef = createComponent(ComponentClass, {
					environmentInjector: this.appRef.injector,
					hostElement: container
				});
				// Pass the parameters
				this.componentRef.setInput('activeScenario', scenario);
				this.componentRef.setInput('theme', theme);
				// Attach component to Angular's Change Detection
				this.appRef.attachView(this.componentRef.hostView);
			} catch (error) {
				console.error(`Failed loading Angular scenario: ${scenarioId}:`, error);
				container.innerHTML = `<div>Error initializing Angular scenario</div>`;
			}
		} else {
			container.innerHTML = `<div>Failed loading scenario: ${scenarioId}</div>`;
			console.error(`Angular scenario not found: ${scenarioId}`);
		}
	}
	disconnectedCallback() {
		if (this.componentRef) {
			this.componentRef.destroy();
			this.componentRef = null;
		}
		if (this.appRef) {
			this.appRef.destroy();
			this.appRef = null;
		}
	}
}
if (!customElements.get("angular-scenario")) {
	customElements.define("angular-scenario", AngularScenarioElement);
}