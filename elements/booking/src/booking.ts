import flatpickr from "flatpickr";

import "flatpickr/dist/flatpickr.min.css";
import "./booking.css";

type Service = {
	id: number;
	name: string;
	description: string;
	color: string;
	isPublic: boolean;
};

type Slot = {
	time_start: string;
	time_end: string;
};

declare global {
	interface Window {
		hbePublic?: {
			nonce: string;
			restUrl: string;
		};
	}
}

class BookingWidget {
	private root: HTMLElement;
	private calendarId: number;
	private selectedServiceId = "";
	private selectedDate = "";
	private selectedTimeStart = "";
	private servicesEl: HTMLElement | null;
	private slotsEl: HTMLElement | null;
	private selectionEl: HTMLElement | null;
	private hiddenCalendar: HTMLInputElement | null;
	private hiddenDate: HTMLInputElement | null;
	private hiddenTimeStart: HTMLInputElement | null;
	private hiddenService: HTMLInputElement | null;
	private calendarInstance: flatpickr.Instance | null = null;

	constructor(root: HTMLElement) {
		this.root = root;
		this.calendarId = Number(root.dataset.calendarId ?? 0);
		this.servicesEl = root.querySelector<HTMLElement>("[data-role='services']");
		this.slotsEl = root.querySelector<HTMLElement>("[data-role='slots']");
		this.selectionEl = root.querySelector<HTMLElement>("[data-role='selection']");
		this.hiddenCalendar = root.querySelector<HTMLInputElement>("input[name='hbe_calendar_id']");
		this.hiddenDate = root.querySelector<HTMLInputElement>("input[name='hbe_date']");
		this.hiddenTimeStart = root.querySelector<HTMLInputElement>("input[name='hbe_time_start']");
		this.hiddenService = root.querySelector<HTMLInputElement>("input[name='hbe_service_id']");
	}

	async init() {
		if (!this.calendarId || !window.hbePublic?.restUrl) {
			this.setSelectionMessage("Select a calendar in Bricks first.");
			return;
		}

		this.syncHiddenFields();
		this.renderCalendar();
		await this.loadServices();
	}

	private async apiFetch<T>(path: string): Promise<T> {
		const response = await fetch(`${window.hbePublic?.restUrl}${path}`, {
			headers: {
				"X-WP-Nonce": window.hbePublic?.nonce ?? "",
			},
		});

		if (!response.ok) {
			throw new Error(`Request failed with ${response.status}`);
		}

		return (await response.json()) as T;
	}

	private renderCalendar() {
		const mountEl = this.root.querySelector<HTMLElement>("[data-role='calendar']");
		if (!mountEl) return;

		const input = document.createElement("input");
		mountEl.innerHTML = "";
		mountEl.append(input);

		this.calendarInstance = flatpickr(input, {
			inline: true,
			minDate: "today",
			dateFormat: "Y-m-d",
			locale: { firstDayOfWeek: 1 },
			onReady: async (_selectedDates, _dateStr, instance) => {
				await this.loadMonthAvailability(instance.currentYear, instance.currentMonth + 1);
			},
			onMonthChange: async (_selectedDates, _dateStr, instance) => {
				await this.loadMonthAvailability(instance.currentYear, instance.currentMonth + 1);
			},
			onYearChange: async (_selectedDates, _dateStr, instance) => {
				await this.loadMonthAvailability(instance.currentYear, instance.currentMonth + 1);
			},
			onChange: async (_selectedDates, dateStr) => {
				this.selectedDate = dateStr;
				this.selectedTimeStart = "";
				this.syncHiddenFields();
				await this.loadSlots(dateStr);
			},
		});
	}

	private async loadMonthAvailability(year: number, month: number) {
		if (!this.calendarInstance) return;

		const monthValue = `${year}-${String(month).padStart(2, "0")}`;
		const availableDates = await this.apiFetch<string[]>(`calendars/${this.calendarId}/available-dates?month=${monthValue}`);
		this.calendarInstance.set("enable", availableDates);
		this.calendarInstance.redraw();
	}

	private async loadServices() {
		if (!this.servicesEl) return;

		const services = await this.apiFetch<Service[]>(`calendars/${this.calendarId}/services`);
		if (!services.length) {
			this.servicesEl.innerHTML = `<p class="hbe-empty">No public services configured.</p>`;
			return;
		}

		this.servicesEl.innerHTML = "";
		for (const service of services) {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "hbe-service-card";
			button.dataset.serviceId = String(service.id);
			button.style.setProperty("--service-color", service.color || "#1f7ae0");
			button.innerHTML = `<strong>${service.name}</strong><span>${service.description || "Select this service"}</span>`;
			button.addEventListener("click", () => {
				this.selectedServiceId = String(service.id);
				for (const card of this.servicesEl?.querySelectorAll<HTMLButtonElement>(".hbe-service-card") ?? []) {
					card.classList.toggle("is-active", card.dataset.serviceId === this.selectedServiceId);
				}
				this.syncHiddenFields();
			});
			this.servicesEl.append(button);
		}
	}

	private async loadSlots(date: string) {
		if (!this.slotsEl) return;

		this.slotsEl.innerHTML = `<p class="hbe-empty">Loading slots...</p>`;
		const slots = await this.apiFetch<Slot[]>(`calendars/${this.calendarId}/slots?date=${date}`);

		if (!slots.length) {
			this.slotsEl.innerHTML = `<p class="hbe-empty">No slots available for ${date}.</p>`;
			this.setSelectionMessage("Choose another date.");
			return;
		}

		this.slotsEl.innerHTML = "";
		for (const slot of slots) {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "hbe-slot-button";
			button.dataset.timeStart = slot.time_start;
			button.textContent = `${slot.time_start} - ${slot.time_end}`;
			button.addEventListener("click", () => {
				this.selectedTimeStart = slot.time_start;
				for (const candidate of this.slotsEl?.querySelectorAll<HTMLButtonElement>(".hbe-slot-button") ?? []) {
					candidate.classList.toggle("is-active", candidate.dataset.timeStart === this.selectedTimeStart);
				}
				this.syncHiddenFields();
				this.setSelectionMessage(`Selected ${this.selectedDate} at ${slot.time_start}.`);
			});
			this.slotsEl.append(button);
		}

		this.setSelectionMessage(`Date selected: ${date}. Choose a time.`);
	}

	private syncHiddenFields() {
		if (this.hiddenCalendar) this.hiddenCalendar.value = String(this.calendarId);
		if (this.hiddenDate) this.hiddenDate.value = this.selectedDate;
		if (this.hiddenTimeStart) this.hiddenTimeStart.value = this.selectedTimeStart;
		if (this.hiddenService) this.hiddenService.value = this.selectedServiceId;
	}

	private setSelectionMessage(message: string) {
		if (this.selectionEl) {
			this.selectionEl.textContent = message;
		}
	}
}

document.addEventListener("DOMContentLoaded", () => {
	for (const root of document.querySelectorAll<HTMLElement>(".h-calendar")) {
		void new BookingWidget(root).init();
	}
});
