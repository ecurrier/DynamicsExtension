import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app";
import { SchemaToolsApp, useSchemaToolsBootstrap } from "@/schema-tools";

import "@/schema-tools/schema-tools.css";

const Root = () => <SchemaToolsApp status={useSchemaToolsBootstrap()} />;

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<AppProviders>
			<Root />
		</AppProviders>
	</StrictMode>
);
