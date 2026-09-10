import { Bug20Regular } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

import { PluginTracesArea } from "./areas/viewer";

export const pluginTracesModule: ModuleDefinition = {
	id: "plugintraces",
	label: "Plugin Traces",
	icon: Bug20Regular,
	order: 9,
	areas: [
		{
			id: "plugintraces.viewer",
			label: "Plugin Traces",
			breadcrumb: ["Plugin Traces"],
			tooltip: "Control plug-in trace logging and open the full-page trace log viewer",
			requires: "model-driven-app",
			component: PluginTracesArea,
		},
	],
};
