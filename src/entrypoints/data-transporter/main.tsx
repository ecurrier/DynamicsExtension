import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app";
import { DataTransporterApp } from "@/data-transporter";
import { runStorageMigrations } from "@/shared/storage";

import "@/data-transporter/data-transporter.css";

const start = async () => {
	await runStorageMigrations().catch(() => undefined);
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<AppProviders>
				<DataTransporterApp />
			</AppProviders>
		</StrictMode>
	);
};

void start();
