import { PlugConnectedSettings20Regular } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

import { PackagesArea } from "./areas/packages";
import { PluginStepsArea } from "./areas/steps";
import { PluginTracesArea } from "./areas/traces";

export const pluginsModule: ModuleDefinition = {
	id: "plugins",
	label: "Plug-ins",
	icon: PlugConnectedSettings20Regular,
	order: 9,
	areas: [
		{
			id: "plugins.steps",
			label: "Steps",
			breadcrumb: ["Plug-ins", "Steps"],
			tooltip: "Enable or disable plug-in steps, grouped by assembly and plug-in type",
			keywords: ["plugin", "sdk message processing step", "registration", "enable", "disable"],
			component: PluginStepsArea,
		},
		{
			id: "plugins.packages",
			label: "Packages",
			breadcrumb: ["Plug-ins", "Packages"],
			tooltip: "Update a plug-in package from a freshly built nupkg and see the assemblies and plug-in types it contains",
			keywords: ["plugin", "nuget", "nupkg", "assembly", "dll", "deploy", "upload"],
			component: PackagesArea,
		},
		{
			id: "plugins.traces",
			label: "Traces",
			breadcrumb: ["Plug-ins", "Traces"],
			tooltip: "Control plug-in trace logging and open the full-page trace log viewer",
			keywords: ["plugin", "trace log", "logs", "logging", "exceptions"],
			requires: "model-driven-app",
			component: PluginTracesArea,
		},
	],
};
