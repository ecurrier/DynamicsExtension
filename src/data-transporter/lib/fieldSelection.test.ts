import { describe, expect, it } from "vitest";

import { type TransportAttribute } from "@/shared/types";

import { defaultSelection, selectableFields, sourceColumns } from "./fieldSelection";

const attribute = (logicalName: string, overrides: Partial<TransportAttribute> = {}): TransportAttribute => ({
	logicalName,
	displayName: logicalName,
	attributeType: "String",
	attributeOf: null,
	isPrimaryId: false,
	isValidForCreate: true,
	isValidForUpdate: true,
	isLogical: false,
	targets: [],
	...overrides,
});

describe("field selection", () => {
	it("collects source columns without annotations", () => {
		expect(
			sourceColumns([
				{ accountid: "1", name: "A", "_ownerid_value@OData.Community.Display.V1.FormattedValue": "Jane" },
				{ _ownerid_value: "u1", "@odata.etag": "x" },
			])
		).toEqual(new Set(["accountid", "name", "_ownerid_value"]));
	});

	it("keeps writable, non-system attributes that exist in the source", () => {
		const attributes = [
			attribute("name"),
			attribute("accountid", { isPrimaryId: true }),
			attribute("createdon"),
			attribute("ownerid", { attributeType: "Owner" }),
			attribute("address1_composite", { isValidForCreate: false, isValidForUpdate: false }),
			attribute("name_base", { attributeOf: "name" }),
			attribute("missing"),
			attribute("statecode", { attributeType: "State" }),
		];
		const columns = new Set(["name", "accountid", "createdon", "_ownerid_value", "address1_composite", "statecode"]);
		const fields = selectableFields(attributes, columns);
		expect(fields.map((field) => field.logicalName)).toEqual(["name", "ownerid", "statecode"]);
		expect(defaultSelection(fields)).toEqual(new Set(["name"]));
	});
});
