import { Table20Regular } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

export const schemaModule: ModuleDefinition = {
	id: "schema",
	label: "Schema",
	icon: Table20Regular,
	order: 9,
	areas: [
		{
			id: "schema.columns",
			label: "Cross-Table Columns",
			breadcrumb: ["Schema", "Cross-Table Columns"],
			tooltip: "Change a column's label, description, or requirement level across every table that has it",
			keywords: ["attribute", "field", "rename", "required", "metadata"],
			fit: "workspace",
			workspace: { id: "schema-tools", tool: "columns" },
		},
		{
			id: "schema.polymorphic",
			label: "Polymorphic Lookups",
			breadcrumb: ["Schema", "Polymorphic Lookups"],
			tooltip: "List and create lookups that can reference more than one table",
			keywords: ["multi-table lookup", "customer", "relationship", "regarding"],
			fit: "workspace",
			workspace: { id: "schema-tools", tool: "polymorphic" },
		},
	],
};
