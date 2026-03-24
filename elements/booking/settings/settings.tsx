import { mountSettingsApp } from "./src/SettingsApp";

const mountEl = document.getElementById("h-bricks-admin-root");
if (mountEl) {
	mountSettingsApp(mountEl);
}
