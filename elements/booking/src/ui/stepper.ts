import { escapeHtml } from "../slots";
import { isStepperMode } from "../state";
import type { BookingState, StepperPanel } from "../types";

export function getInitialStepperPanel(state: BookingState): StepperPanel {
	if (state.firstColumnMode !== "off") {
		return "first";
	}

	if (state.showSlots) {
		return "calendar";
	}

	return "calendar";
}

export function getStepperPanels(
	state: BookingState,
): Array<{ panel: StepperPanel; label: string }> {
	const panels: Array<{ panel: StepperPanel; label: string }> = [];

	if (state.firstColumnMode !== "off") {
		panels.push({
			panel: "first",
			label: state.firstColumnMode === "info" ? "Info" : "Service",
		});
	}

	panels.push({
		panel: "calendar",
		label: "Date",
	});

	if (state.showSlots) {
		panels.push({
			panel: "slots",
			label: "Time",
		});
		panels.push({
			panel: "details",
			label: "Details",
		});

		if (state.bookingCompleted) {
			panels.push({
				panel: "success",
				label: "Done",
			});
		}
	}

	return panels;
}

export function ensureStepperProgressElement(state: BookingState) {
	if (!isStepperMode(state)) {
		state.stepperProgressEl?.remove();
		state.stepperProgressEl = null;
		state.root.removeAttribute("data-stepper-panel");
		state.root.removeAttribute("data-stepper-direction");
		return;
	}

	if (!state.showStepperProgress) {
		state.stepperProgressEl?.remove();
		state.stepperProgressEl = null;
		return;
	}

	if (!state.stepperProgressEl) {
		const progressEl = document.createElement("div");
		progressEl.className = "hbe-booking__stepper-progress";
		state.root.prepend(progressEl);
		state.stepperProgressEl = progressEl;
	}
}

export function syncStepperUI(state: BookingState) {
	if (!isStepperMode(state)) {
		return;
	}

	ensureStepperProgressElement(state);

	const stepperPanels = getStepperPanels(state);
	const allowedPanels = new Set(stepperPanels.map((item) => item.panel));

	if (state.bookingCompleted) {
		state.stepperPanel = "success";
	} else if (
		state.bookingStep === "details" &&
		state.showSlots &&
		state.selectedSlot
	) {
		state.stepperPanel = "details";
	} else if (!allowedPanels.has(state.stepperPanel)) {
		state.stepperPanel = getInitialStepperPanel(state);
	} else if (
		state.stepperPanel === "details" &&
		(!state.showSlots || !state.selectedSlot)
	) {
		state.stepperPanel = "slots";
	} else if (state.stepperPanel === "success" && !state.bookingCompleted) {
		state.stepperPanel = getInitialStepperPanel(state);
	}

	state.root.dataset.stepperPanel = state.stepperPanel;

	if (!state.stepperProgressEl) {
		return;
	}

	const activeIndex = stepperPanels.findIndex(
		(item) => item.panel === state.stepperPanel,
	);
	state.stepperProgressEl.innerHTML = `
		<div class="hbe-booking__stepper-track">
			${stepperPanels
				.map((item, index) => {
					const classes = ["hbe-booking__stepper-step"];
					const isReachable = !state.bookingCompleted && index <= activeIndex;

					if (index < activeIndex) {
						classes.push("is-complete");
					}

					if (index === activeIndex) {
						classes.push("is-current");
					}

					const connectorMarkup =
						index < stepperPanels.length - 1
							? `<span class="hbe-booking__stepper-connector${index < activeIndex ? " is-active" : ""}" aria-hidden="true"></span>`
							: "";

					return `
						<button
							type="button"
							class="${classes.join(" ")}"
							${isReachable ? `data-stepper-target="${item.panel}"` : "disabled"}
						>
							<span class="hbe-booking__stepper-index">${index + 1}</span>
							<span class="hbe-booking__stepper-label">${escapeHtml(item.label)}</span>
						</button>
						${connectorMarkup}
					`;
				})
				.join("")}
		</div>
	`;
}

export function setStepperDirection(state: BookingState, panel: StepperPanel) {
	if (!isStepperMode(state)) {
		return;
	}

	const panels = getStepperPanels(state);
	const currentIndex = panels.findIndex(
		(item) => item.panel === state.stepperPanel,
	);
	const nextIndex = panels.findIndex((item) => item.panel === panel);

	if (nextIndex === -1) {
		return;
	}

	if (currentIndex === -1) {
		state.root.dataset.stepperDirection = "forward";
		return;
	}

	state.root.dataset.stepperDirection =
		nextIndex < currentIndex ? "back" : "forward";
}
