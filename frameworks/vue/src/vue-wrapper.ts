import { createApp, App } from 'vue';
import { SCENARIOS } from "shared";

const scenarioModules = import.meta.glob('./scenarios/*.vue', { eager: true });

class VueScenarioElement extends HTMLElement {
	private app: App | null = null;

	connectedCallback() {
		// Read the tags from HTML element's attributes (created in the shell app)
		const theme = this.getAttribute("theme") ?? "darkGold";
		const scenarioId = this.getAttribute("scenario-id");
		const scenario = SCENARIOS.find(s => s.id === scenarioId);
		let Component = null;
		if (scenario) {
			const path = `./scenarios/${scenario.fileName}.vue`;
			// Get the right module from Vite's Library
			const module = scenarioModules[path] as Record<string, unknown>;
			if (module) {
				// Vue Single File Components usually export the component as default
				Component = module.default || Object.values(module)[0];
			}
		}
		const shadow = this.attachShadow({ mode: "open" });
		const container = document.createElement("div");
		container.style.width = "100%";
		container.style.height = "100%";
		shadow.appendChild(container);
		if (Component) {
			// Create a new Vue instance from the scenario component
			this.app = createApp(Component, { activeScenario: scenario, theme: theme });
			// Attach the component to the container
			this.app.mount(container);
		} else {
			container.innerHTML = `<div>Failed loading scenario: ${scenarioId}</div>`;
			console.error(`Vue scenario not found: ${scenarioId}`);
		}
	}
	disconnectedCallback() {
		if (this.app) {
			this.app.unmount();
			this.app = null;
		}
	}
}
if (!customElements.get("vue-scenario")) {
	customElements.define("vue-scenario", VueScenarioElement);
}
