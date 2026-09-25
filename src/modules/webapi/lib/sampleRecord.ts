import { SAMPLE_TABLE } from "@/modules/codegen/lib";
import { type CodegenTable } from "@/shared/types";

import { buildRecordColumns, type RecordColumn } from "./recordColumns";

export const SAMPLE_VALUES: Record<string, unknown> = {
	accountid: "id-1",
	name: "Contoso",
	new_creditlimit: 5000,
	"new_creditlimit@OData.Community.Display.V1.FormattedValue": "$5,000.00",
	new_customerscore: null,
	new_status: 100000001,
	"new_status@OData.Community.Display.V1.FormattedValue": "In Progress",
	industrycode: null,
	new_tags: "1,2",
	"new_tags@OData.Community.Display.V1.FormattedValue": "Key Account; Partner",
	new_renewaldate: "2026-01-31",
	createdon: "2026-01-01T09:30:00Z",
	"createdon@OData.Community.Display.V1.FormattedValue": "1/1/2026 9:30 AM",
	_parentaccountid_value: "id-2",
	"_parentaccountid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "account",
	"_parentaccountid_value@OData.Community.Display.V1.FormattedValue": "Parent Ltd",
	_ownerid_value: "team-1",
	"_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "team",
	"_ownerid_value@OData.Community.Display.V1.FormattedValue": "Sales Team",
	donotemail: true,
	"donotemail@OData.Community.Display.V1.FormattedValue": "Do Not Allow",
	numberofemployees: 12,
	versionnumber: 99,
	entityimage: "base64",
};

export const sampleRows = (formAttributes: ReadonlySet<string> | null = null, table: CodegenTable = SAMPLE_TABLE): RecordColumn[] =>
	buildRecordColumns(table, SAMPLE_VALUES, formAttributes);

export const sampleRow = (logicalName: string): RecordColumn => {
	const row = sampleRows().find((candidate) => candidate.logicalName === logicalName);
	if (!row) {
		throw new Error(`No sample row ${logicalName}`);
	}
	return row;
};
