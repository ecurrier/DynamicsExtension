import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { readPopupLaunch } from "@/shared/extension";
import { runStorageMigrations } from "@/shared/storage";

import { App } from "./App";
import { AppProviders } from "./AppProviders";

export const mountApp = async (): Promise<void> => {
	const { mode } = readPopupLaunch();
	if (mode !== "popup") {
		document.documentElement.dataset.mode = mode;
	}
	await runStorageMigrations().catch(() => undefined);
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<AppProviders>
				<App />
			</AppProviders>
		</StrictMode>
	);
};
