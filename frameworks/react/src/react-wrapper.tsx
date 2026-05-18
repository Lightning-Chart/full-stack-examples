import { createRoot, Root } from "react-dom/client";
import { LCHost } from "./LC.tsx";
import { SCENARIOS, Scenario } from "shared";

const scenarioModules = import.meta.glob('./scenarios/*.tsx', { eager: true });

class ReactScenarioElement extends HTMLElement {
	private root: Root | null = null;

	connectedCallback() {
		// Read the tags from HTML element's attributes (created in the shell app)
		const theme = this.getAttribute("theme") ?? "darkGold";
		const scenarioId = this.getAttribute("scenario-id");
		const scenario = SCENARIOS.find(s => s.id === scenarioId);
		let Component: React.FC<{ activeScenario: Scenario, theme: string }> | null = null;
		if (scenario) {
			const path = `./scenarios/${scenario.fileName}.tsx`;
			// Get the right module from Vite's Library
			const module = scenarioModules[path] as Record<string, React.FC>;
			if (module) {
				// Exported component from the scenario file
				Component = Object.values(module)[0] as React.FC<{ activeScenario: Scenario, theme: string }>;
			}
		}
		const shadow = this.attachShadow({ mode: "open" });
		const container = document.createElement("div");
		container.style.width = "100%";
		container.style.height = "100%";
		shadow.appendChild(container);
		this.root = createRoot(container);
		if (Component && scenario) {
			this.root.render(
				<LCHost>
					<Component activeScenario={scenario} theme={theme} />
				</LCHost>
			);
		} else {
			this.root.render(
				<div>Failed loading scenario: {scenarioId}</div>
			);
		}
	}
	disconnectedCallback() {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}
}
if (!customElements.get("react-scenario")) {
	customElements.define("react-scenario", ReactScenarioElement);
}