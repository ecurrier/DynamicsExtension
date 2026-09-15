import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app";
import { SchemaToolsApp, useSchemaToolsBootstrap } from "@/schema-tools";

const Root = () => <SchemaToolsApp status={useSchemaToolsBootstrap()} />;

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<AppProviders>
			<Root />
		</AppProviders>
	</StrictMode>
);
