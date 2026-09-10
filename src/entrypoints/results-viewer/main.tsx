import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app";
import { ResultsViewerApp } from "@/results-viewer";

import "@/results-viewer/results-viewer.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<AppProviders>
			<ResultsViewerApp />
		</AppProviders>
	</StrictMode>
);
