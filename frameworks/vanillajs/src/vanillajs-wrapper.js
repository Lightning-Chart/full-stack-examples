import { SCENARIOS } from "shared";
const scenarioModules = import.meta.glob('./scenarios/*.js', { eager: true });

class VanillajsScenarioElement extends HTMLElement {
	static get observedAttributes() { return ['scenario-id', 'theme']; }

	constructor() {
		super();
		this.cleanup = null;
		this.shadow = this.attachShadow({ mode: "open" });
		this.container = document.createElement("div");
		this.container.style.width = "100%";
		this.container.style.height = "100%";
		this.shadow.appendChild(this.container);
	}

	connectedCallback() {
		this.render();
	}

	attributeChangedCallback(name, oldVal, newVal) {
		if (oldVal && oldVal !== newVal) this.render();
	}

	disconnectedCallback() {
		if (this.cleanup) this.cleanup();
	}

	render() {
		if (this.cleanup) this.cleanup();
		this.container.innerHTML = '';
		// Read the tags from HTML element's attributes (created in the shell app)
		const theme = this.getAttribute("theme") ?? "darkGold";
		const scenarioId = this.getAttribute("scenario-id");
		const scenario = SCENARIOS.find(s => s.id === scenarioId);

		if (scenario) {
			// Get the right module from Vite's Library
			const module = scenarioModules[`./scenarios/${scenario.fileName}.js`];
			if (module) {
				// Call ScenarioFunction and pass the container and properties
				// ScenarioFunction returns a cleanup function that is saved to "this.cleanup"
				const ScenarioFunction = module.default || Object.values(module)[0];
				this.cleanup = ScenarioFunction(this.container, { activeScenario: scenario, theme });
				return;
			}
		}
		console.error(`Vanilla JS scenario not found: ${scenarioId}`);
	}
}
if (!customElements.get("vanillajs-scenario")) {
	customElements.define("vanillajs-scenario", VanillajsScenarioElement);
}