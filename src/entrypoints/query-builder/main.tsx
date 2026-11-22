import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app";
import { QueryBuilderApp, useQueryBuilderBootstrap } from "@/query-builder";

import "@/query-builder/query-builder.css";

const Root = () => <QueryBuilderApp status={useQueryBuilderBootstrap()} />;

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<AppProviders>
			<Root />
		</AppProviders>
	</StrictMode>
);
