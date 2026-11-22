import { DatabaseSearch20Regular } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

export const queryBuilderModule: ModuleDefinition = {
	id: "querybuilder",
	label: "Query Builder",
	icon: DatabaseSearch20Regular,
	order: 5,
	areas: [
		{
			id: "querybuilder.builder",
			label: "Query Builder",
			breadcrumb: ["Query Builder"],
			tooltip: "Write a Fetch XML query, run it against the page or a saved environment, and check the records it returns",
			keywords: ["fetchxml", "fetch xml", "query", "run query", "xrmtoolbox", "records", "view"],
			fit: "workspace",
			workspace: { id: "query-builder" },
		},
	],
};
