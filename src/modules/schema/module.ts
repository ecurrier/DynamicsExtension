import { Table20Regular } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

import { CrossTableColumnsArea, PolymorphicLookupsArea } from "./areas";

export const schemaModule: ModuleDefinition = {
	id: "schema",
	label: "Schema",
	icon: Table20Regular,
	order: 8,
	areas: [
		{
			id: "schema.columns",
			label: "Cross-Table Columns",
			breadcrumb: ["Schema", "Cross-Table Columns"],
			tooltip: "Change a column's label, description, or requirement level across every table that has it",
			component: CrossTableColumnsArea,
		},
		{
			id: "schema.polymorphic",
			label: "Polymorphic Lookups",
			breadcrumb: ["Schema", "Polymorphic Lookups"],
			tooltip: "List and create lookups that can reference more than one table",
			component: PolymorphicLookupsArea,
		},
	],
};
