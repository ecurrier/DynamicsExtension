import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app";
import { PluginTracesApp } from "@/plugin-traces";

import "@/plugin-traces/plugin-traces.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<AppProviders>
			<PluginTracesApp />
		</AppProviders>
	</StrictMode>
);
