import { Braces20Regular } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

import { EnvironmentVariablesArea } from "./areas/manager";

export const environmentVariablesModule: ModuleDefinition = {
	id: "environmentvariables",
	label: "Environment Variables",
	icon: Braces20Regular,
	order: 10,
	areas: [
		{
			id: "environmentvariables.manager",
			label: "Environment Variables",
			breadcrumb: ["Environment Variables"],
			tooltip: "Review environment variable definitions and set or remove their current values",
			keywords: ["config", "configuration", "parameters", "app settings", "env var"],
			component: EnvironmentVariablesArea,
		},
	],
};
