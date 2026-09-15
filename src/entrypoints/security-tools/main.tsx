import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app";
import { SecurityToolsApp, useSecurityToolsBootstrap } from "@/security-tools";

const Root = () => <SecurityToolsApp status={useSecurityToolsBootstrap()} />;

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<AppProviders>
			<Root />
		</AppProviders>
	</StrictMode>
);
