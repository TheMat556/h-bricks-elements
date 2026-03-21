import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import "./admin.css";

const rootElement = document.getElementById("hbe-admin-root");

if (rootElement) {
	ReactDOM.createRoot(rootElement).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	);
}
