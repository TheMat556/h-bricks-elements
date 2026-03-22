import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { mountSettingsApp } from "./src/SettingsApp";

const mountEl = document.getElementById("h-bricks-admin-root");
if (mountEl) {
	mountSettingsApp(mountEl);
}
