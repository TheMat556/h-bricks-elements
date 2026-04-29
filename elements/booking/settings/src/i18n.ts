import deDE from "antd/locale/de_DE";
import enUS from "antd/locale/en_US";

type AdminLanguage = "de" | "en";

type AdminBootData = {
	hBricksAdmin?: {
		locale?: string;
	};
};

const deTranslations: Record<string, string> = {
	"REST URL missing.": "REST-URL fehlt.",
	"Calendar could not be created.": "Kalender konnte nicht erstellt werden.",
	"Calendar could not be deleted.": "Kalender konnte nicht gelöscht werden.",
	"Calendars could not be loaded.": "Kalender konnten nicht geladen werden.",
	"Settings could not be loaded.":
		"Einstellungen konnten nicht geladen werden.",
	"Settings could not be saved.":
		"Einstellungen konnten nicht gespeichert werden.",
	Calendar: "Kalender",
	Expand: "Erweitern",
	Settings: "Einstellungen",
	Calendars: "Kalender",
	"New Calendar": "Neuer Kalender",
	"Calendar Settings": "Kalender-Einstellungen",
	"Switch to": "Wechsel zu",
	format: "Format",
	Month: "Monat",
	Week: "Woche",
	Day: "Tag",
	Agenda: "Agenda",
	Panel: "Panel",
	"Unsaved changes": "Ungespeicherte Änderungen",
	"All changes saved": "Alle Änderungen gespeichert",
	"Save Settings": "Einstellungen speichern",
	"Create Calendar": "Kalender erstellen",
	"Delete Calendar": "Kalender löschen",
	"Enter a name for the new calendar.":
		"Gib einen Namen für den neuen Kalender ein.",
	"Calendar name": "Kalendername",
	"No calendar created": "Kein Kalender erstellt",
	"Create your first calendar to unlock the booking view, date navigation and calendar-related controls.":
		"Erstelle deinen ersten Kalender, um die Buchungsansicht, Datumsnavigation und kalenderbezogene Einstellungen freizuschalten.",
	"Create a calendar first. Until then, all calendar-related controls stay disabled.":
		"Erstelle zuerst einen Kalender. Bis dahin bleiben alle kalenderbezogenen Einstellungen deaktiviert.",
	"Calendar name is required.": "Ein Kalendername ist erforderlich.",
	"Are you sure you want to delete this calendar?":
		"Möchtest du diesen Kalender wirklich löschen?",
	"This permanently removes the calendar and all bookings assigned to it.":
		"Das entfernt den Kalender dauerhaft und löscht alle dazugehörigen Buchungen.",
	Overview: "Übersicht",
	Today: "Heute",
	Upcoming: "Anstehend",
	"No bookings today": "Heute keine Buchungen",
	"No upcoming bookings": "Keine anstehenden Buchungen",
	"Bookings could not be loaded.": "Buchungen konnten nicht geladen werden.",
	"Booking could not be created.": "Buchung konnte nicht erstellt werden.",
	"Booking could not be updated.": "Buchung konnte nicht aktualisiert werden.",
	"Booking could not be deleted.": "Buchung konnte nicht gelöscht werden.",
	"This timeslot conflicts with an existing booking.":
		"Dieses Zeitfenster überschneidet sich mit einer bestehenden Buchung.",
	"End time must be after start time.":
		"Die Endzeit muss nach der Startzeit liegen.",
	"Booking could not be saved.": "Buchung konnte nicht gespeichert werden.",
	"Edit Booking": "Buchung bearbeiten",
	"New Booking": "Neue Buchung",
	Delete: "Löschen",
	Cancel: "Abbrechen",
	Save: "Speichern",
	Create: "Erstellen",
	Name: "Name",
	"Please enter a name.": "Bitte gib einen Namen ein.",
	"Booking name": "Buchungsname",
	"Short Description": "Kurzbeschreibung",
	"Please enter a short description.": "Bitte gib eine Kurzbeschreibung ein.",
	"Short description": "Kurzbeschreibung",
	Date: "Datum",
	"Please choose a date.": "Bitte wähle ein Datum aus.",
	From: "Von",
	"Please choose a start time.": "Bitte wähle eine Startzeit aus.",
	To: "Bis",
	"Please choose an end time.": "Bitte wähle eine Endzeit aus.",
	"Adjust time or details directly here.":
		"Passe Zeit oder Details direkt hier an.",
	"You can fine-tune the date and time before creating the booking.":
		"Du kannst Datum und Uhrzeit vor dem Erstellen der Buchung noch feinjustieren.",
	"Calendar Identity": "Kalender-Identität",
	"Change the calendar name and add a small icon or emoji to help distinguish calendars in the sidebar and future frontend views.":
		"Ändere den Kalendernamen und füge ein kleines Icon oder Emoji hinzu, damit sich Kalender in der Sidebar und in künftigen Frontend-Ansichten besser unterscheiden lassen.",
	"Keep the internal calendar name clear for your team, then choose the customer-facing labels shown in the booking flow.":
		"Halte den internen Kalendernamen für dein Team eindeutig und lege danach die kunden sichtbaren Bezeichnungen für den Buchungsablauf fest.",
	"Calendar Name": "Kalendername",
	"Internal calendar name": "Interner Kalendername",
	"Used in the admin area only. Keep it clear for your team.":
		"Nur im Admin-Bereich sichtbar. Halte ihn für dein Team eindeutig.",
	"Icon Selection": "Icon-Auswahl",
	None: "Keins",
	"Or enter a custom icon / emoji.": "Oder gib ein eigenes Icon / Emoji ein.",
	"Leave the icon empty if you only want to show the calendar name.":
		"Lass das Icon leer, wenn nur der Kalendername angezeigt werden soll.",
	"Public display name": "Öffentlicher Anzeigename",
	"Shown to customers instead of the internal calendar name.":
		"Wird Kunden anstelle des internen Kalendernamens angezeigt.",
	"Default meeting title": "Standard-Terminname",
	"Used when no specific service title is selected.":
		"Wird verwendet, wenn kein eigener Service-Titel ausgewählt ist.",
	"Meeting location": "Terminort",
	"Shown in the booking confirmation when relevant.":
		"Wird bei Bedarf in der Buchungsbestätigung angezeigt.",
	"e.g. Matthias Hader": "z. B. Matthias Hader",
	"e.g. Intro call": "z. B. Erstgespräch",
	"e.g. Video call": "z. B. Videocall",
	"Booking Rules": "Buchungsregeln",
	"Define how visitors may select services and whether the calendar allows overlapping or admin-only bookings.":
		"Definiere, wie Besucher Services auswählen dürfen und ob der Kalender überlappende oder nur Admin-Buchungen erlaubt.",
	"Single Select": "Einzelauswahl",
	"Multi Select": "Mehrfachauswahl",
	"Service Selection": "Service-Auswahl",
	"Allow Double Bookings": "Doppelte Buchungen erlauben",
	"If enabled, overlapping bookings may exist in the same calendar.":
		"Wenn aktiviert, dürfen sich Buchungen im selben Kalender überschneiden.",
	"Admin Only Bookings": "Nur Admin-Buchungen",
	"Reserve this calendar for admin-managed bookings only.":
		"Diesen Kalender nur für vom Admin verwaltete Buchungen reservieren.",
	"Default Slot Timing": "Standard-Slot-Timing",
	"Define the base slot footprint and how far ahead customers are allowed to book.":
		"Definiere die Basisdauer eines Slots und wie weit im Voraus Kunden buchen dürfen.",
	Session: "Sitzung",
	Prep: "Vorbereitung",
	Cleanup: "Nachbereitung",
	"Book ahead": "Im Voraus buchen",
	"Working Hours": "Arbeitszeiten",
	"Configure availability per weekday. Multiple intervals per day allow lunch breaks and split shifts.":
		"Konfiguriere die Verfügbarkeit pro Wochentag. Mehrere Intervalle pro Tag erlauben Mittagspausen und geteilte Schichten.",
	Open: "Offen",
	Closed: "Geschlossen",
	On: "An",
	Off: "Aus",
	to: "bis",
	"No time intervals configured.": "Keine Zeitintervalle konfiguriert.",
	"Add Interval": "Intervall hinzufügen",
	Services: "Services",
	"Add the services available for this calendar, including duration and optional prep / cleanup times.":
		"Füge die Services hinzu, die für diesen Kalender verfügbar sind, inklusive Dauer sowie optionaler Vor- und Nachbereitungszeit.",
	Duration: "Dauer",
	"Price, e.g. 59 EUR": "Preis, z. B. 59 EUR",
	"Service name": "Service-Name",
	"Internal service name": "Interner Service-Name",
	"Public service title": "Öffentlicher Service-Titel",
	"Add Service": "Service hinzufügen",
	"Blocked Dates": "Blockierte Tage",
	"Add holidays or exception days that should be unavailable despite normal working hours.":
		"Füge Feiertage oder Ausnahmetage hinzu, die trotz normaler Arbeitszeiten nicht verfügbar sein sollen.",
	Reason: "Grund",
	"Add Blocked Date": "Blockierten Tag hinzufügen",
	"Mail Service": "Mail-Service",
	"Danger Zone": "Gefahrenbereich",
	"Delete this calendar permanently. This also removes all bookings assigned to it.":
		"Diesen Kalender dauerhaft löschen. Dabei werden auch alle zugehörigen Buchungen entfernt.",
	"This action cannot be undone. You will be asked to confirm before the calendar is deleted.":
		"Diese Aktion kann nicht rückgängig gemacht werden. Vor dem Löschen musst du den Vorgang noch bestätigen.",
	"Dummy SMTP configuration for future booking confirmation emails. This stores settings only and does not send emails yet.":
		"Dummy-SMTP-Konfiguration für künftige Buchungsbestätigungen per E-Mail. Diese Einstellungen werden nur gespeichert, es werden noch keine E-Mails versendet.",
	"Enable SMTP Mailer": "SMTP-Mailer aktivieren",
	"Prepared for future booking confirmation emails. No mail logic is active yet.":
		"Vorbereitet für zukünftige Buchungsbestätigungen per E-Mail. Aktuell ist noch keine Mail-Logik aktiv.",
	Port: "Port",
	TLS: "TLS",
	SSL: "SSL",
	"SMTP host": "SMTP-Host",
	"SMTP username": "SMTP-Benutzername",
	"SMTP password": "SMTP-Passwort",
	"From name": "Absendername",
	"From email": "Absender-E-Mail",
	"Confirmation email subject": "Betreff der Bestätigungs-E-Mail",
	"Booking confirmation": "Buchungsbestätigung",
	Monday: "Montag",
	Tuesday: "Dienstag",
	Wednesday: "Mittwoch",
	Thursday: "Donnerstag",
	Friday: "Freitag",
	Saturday: "Samstag",
	Sunday: "Sonntag",
	"Manage working hours, services, booking rules and blocked dates.":
		"Verwalte Arbeitszeiten, Services, Buchungsregeln und blockierte Tage.",
	"Total slot footprint": "Gesamte Slot-Dauer",
	minutes: "Minuten",
	"Set “Book ahead” to 0 to allow booking without an advance-day limit.":
		"Setze „Im Voraus buchen“ auf 0, um Buchungen ohne Tageslimit im Voraus zu erlauben.",
	Service: "Service",
	"Customers can book up to": "Kunden koennen bis zu",
	"e.g. 💇, 🦷, A": "z. B. 💇, 🦷, A",
};

function readRawLocale(): string {
	if (typeof window !== "undefined") {
		const bootData = window as Window & AdminBootData;
		if (bootData.hBricksAdmin?.locale) {
			return bootData.hBricksAdmin.locale;
		}
	}

	if (typeof document !== "undefined" && document.documentElement.lang) {
		return document.documentElement.lang;
	}

	if (typeof navigator !== "undefined" && navigator.language) {
		return navigator.language;
	}

	return "en";
}

export function getAdminLanguage(): AdminLanguage {
	return readRawLocale().toLowerCase().startsWith("de") ? "de" : "en";
}

export function tr(value: string): string {
	if (getAdminLanguage() !== "de") {
		return value;
	}

	return deTranslations[value] ?? value;
}

export function getAntdLocale() {
	return getAdminLanguage() === "de" ? deDE : enUS;
}

export function getCalendarCulture(): AdminLanguage {
	return getAdminLanguage();
}

export function getDayjsLocale(): string {
	return getAdminLanguage() === "de" ? "de" : "en";
}
