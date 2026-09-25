import { Database20Regular } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

import { RecordColumnsArea } from "./areas/record-columns";
import { RetrieveRecordsArea } from "./areas/retrieve-records";

export const webApiModule: ModuleDefinition = {
	id: "webapi",
	label: "Web API",
	icon: Database20Regular,
	order: 4,
	areas: [
		{
			id: "webapi.record-columns",
			label: "Record Columns",
			breadcrumb: ["Web API", "Record Columns"],
			tooltip: "View every column of the open record and update several at once through the Web API",
			requires: "model-driven-app",
			component: RecordColumnsArea,
		},
		{
			id: "webapi.retrieve-records",
			label: "Retrieve Records",
			breadcrumb: ["Web API", "Retrieve Records"],
			tooltip: "Execute Fetch XML against the current environment and view the results",
			requires: "model-driven-app",
			component: RetrieveRecordsArea,
		},
	],
};
