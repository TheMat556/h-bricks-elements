import flatpickr from "flatpickr";

import "./booking.css";
import "flatpickr/dist/flatpickr.min.css";

document.addEventListener("DOMContentLoaded", () => {
	const mountEl = document.querySelector<HTMLElement>(".h-cal-mount");
	if (!mountEl) return;

	console.log("!!!");

	const div = document.createElement("div");
	mountEl.append(div);

	flatpickr(div, {
		inline: true,
		minDate: "today",
		dateFormat: "Y-m-d",
		locale: {
			firstDayOfWeek: 1,
		},
		onChange: (_selectedDate, dateStr) => {
			console.log("Datum ausgewählt:", dateStr);
		},
	});
});
