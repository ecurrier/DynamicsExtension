import { Wrench20Regular } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

import { AdminArea } from "./areas/admin";
import { DeveloperArea } from "./areas/developer";
import { RecordsArea } from "./areas/records";
import { ADMIN_UTILITIES, DEVELOPER_UTILITIES } from "./lib";

export const utilitiesModule: ModuleDefinition = {
	id: "utilities",
	label: "Utilities",
	icon: Wrench20Regular,
	order: 1,
	areas: [
		{
			id: "utilities.admin",
			label: "Admin",
			breadcrumb: ["Utilities", "Admin"],
			tooltip: "Administrative shortcuts for the current environment and record",
			keywords: ["shortcuts"],
			utilities: Object.values(ADMIN_UTILITIES),
			requires: "model-driven-app",
			component: AdminArea,
		},
		{
			id: "utilities.developer",
			label: "Developer",
			breadcrumb: ["Utilities", "Developer"],
			tooltip: "Developer helpers such as Fetch XML, URLs, and choice code snippets",
			keywords: ["dev tools"],
			utilities: Object.values(DEVELOPER_UTILITIES),
			requires: "model-driven-app",
			component: DeveloperArea,
		},
		{
			id: "utilities.records",
			label: "Record Set Navigator",
			breadcrumb: ["Utilities", "Record Set Navigator"],
			tooltip: "Load a view into a list and step through its records in the tab",
			keywords: ["grid", "next record", "previous record", "record set"],
			requires: "model-driven-app",
			component: RecordsArea,
		},
	],
};
