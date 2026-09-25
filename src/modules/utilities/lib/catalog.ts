import { type UtilityDefinition } from "@/modules/types";

export const ADMIN_UTILITIES = {
	adminMode: {
		id: "admin-mode",
		title: "Enable Admin Mode",
		description: "Unlock every field, tab, and section, and report which of them were hidden, read-only, or required.",
		keywords: ["god mode", "unlock", "show hidden fields"],
	},
	logicalNames: {
		id: "logical-names",
		title: "Toggle Logical Names",
		description: "Switch form control labels between display names and logical names.",
		keywords: ["schema names", "field names", "column names"],
	},
	dirtyColumns: {
		id: "dirty-columns",
		title: "Dirty Columns",
		description: "List every column on the open form with an unsaved change, its current value, and whether the next save will send it.",
		keywords: ["unsaved changes", "modified fields", "isdirty"],
	},
	recordLinks: {
		id: "record-links",
		title: "Record Links & Debug Flags",
		description: "Build record links, the Web API URL, and one-click command checker, form monitor, and perf URLs.",
		keywords: ["url", "ribbon debug", "monitor", "debug"],
	},
	solutionLayers: {
		id: "solution-layers",
		title: "Solution Layers",
		description: "Show the layer stack for the current form or view and flag an unmanaged layer sitting on top.",
		keywords: ["active layer", "customizations"],
	},
	refreshCommandBar: {
		id: "refresh-command-bar",
		title: "Refresh Command Bar",
		description: "Refresh the main command bar of the current record or view.",
		keywords: ["ribbon", "buttons"],
	},
	makerPortal: {
		id: "maker-portal",
		title: "Open Maker Portal",
		description: "Open make.powerapps.com for the current or a saved environment.",
		keywords: ["make.powerapps.com", "power apps"],
	},
	formViewEditor: {
		id: "form-view-editor",
		title: "Open Form/View Editor",
		description: "Open the current form or view in the maker portal designer.",
		keywords: ["customize", "edit form", "edit view"],
	},
	adminCenter: {
		id: "admin-center",
		title: "Open Admin Center",
		description: "Open the Power Platform Admin Center for the current or a saved environment.",
		keywords: ["ppac", "admin.powerplatform"],
	},
	environmentSession: {
		id: "environment-session",
		title: "Environment & Session",
		description: "Environment, current user, platform diagnostic, and session/app context.",
		keywords: ["whoami", "user id", "org id", "version", "tenant"],
	},
} satisfies Record<string, UtilityDefinition>;

export const DEVELOPER_UTILITIES = {
	generateQuery: {
		id: "generate-query",
		title: "Generate Query",
		description: "Fetch XML for the current record, its subgrids, or the view as displayed. Plus Web API and JavaScript equivalents.",
		keywords: ["fetchxml", "odata"],
	},
	recordPayload: {
		id: "record-payload",
		title: "Record Payload",
		description: "The open record as a Web API create or update body, with lookups bound and read-only columns left out.",
		keywords: ["json", "request body"],
	},
	tableMetadata: {
		id: "table-metadata",
		title: "Table Metadata",
		description: "Schema names, entity set, primary columns, alternate keys, and every relationship with its navigation property.",
		keywords: ["entity", "keys", "navigation property"],
	},
	columnBrowser: {
		id: "column-browser",
		title: "Column Browser",
		description: "Search the current table's columns by display, logical, or schema name, and copy the one you need.",
		keywords: ["attributes", "fields", "logical names"],
	},
	webApiUrl: {
		id: "web-api-url",
		title: "Open Web API URL",
		description: "Open the current environment's Web API root in a new tab.",
		keywords: ["odata", "api root"],
	},
	findColumn: {
		id: "find-column",
		title: "Find Column on Form",
		description: "Locate a column on the open form, see its tab, section, and state, and reveal it when it is hidden.",
		keywords: ["field", "attribute", "hidden field"],
	},
	choiceSnippet: {
		id: "choice-snippet",
		title: "Generate Choice Code Snippet",
		description: "Enums or objects for this table's choices and the global ones, from your default choice Template.",
		keywords: ["option set", "optionset", "picklist"],
	},
	tableClass: {
		id: "table-class",
		title: "Generate Table Class",
		description: "A class or interface for the current table's columns, from your default table Template.",
		keywords: ["early bound", "typescript", "c#"],
	},
} satisfies Record<string, UtilityDefinition>;
