import { Settings20Regular } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

import { EnvironmentsArea } from "./areas/environments";
import { ExtensionSettingsArea } from "./areas/extension";
import { ServicePrincipalsArea } from "./areas/service-principals";

export const settingsModule: ModuleDefinition = {
	id: "settings",
	label: "Settings",
	icon: Settings20Regular,
	order: 12,
	areas: [
		{
			id: "settings.environments",
			label: "Environments",
			breadcrumb: ["Settings", "Environments"],
			tooltip: "Save environments to open them quickly from the Utilities module",
			keywords: ["instances", "orgs", "organizations", "connections"],
			component: EnvironmentsArea,
		},
		{
			id: "settings.service-principals",
			label: "Service Principals",
			breadcrumb: ["Settings", "Service Principals"],
			tooltip: "App registrations that Power Tools can sign in with when a tool runs against a saved environment",
			keywords: ["app registration", "client credentials", "client secret", "spn", "entra", "azure ad"],
			component: ServicePrincipalsArea,
		},
		{
			id: "settings.extension",
			label: "Extension Settings",
			breadcrumb: ["Settings", "Extension Settings"],
			tooltip: "Behaviour preferences for the extension",
			keywords: ["preferences", "options", "theme", "dark mode", "side panel"],
			component: ExtensionSettingsArea,
		},
	],
};
