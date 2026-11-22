import { describe, expect, it } from "vitest";

import { connectionLabel } from "./connectionLabel";

describe("connectionLabel", () => {
	const names = { "env-dev": { name: "Contoso Dev" } };

	it("names the page Connection", () => {
		expect(connectionLabel({ kind: "page" }, names)).toBe("Current page");
	});

	it("names an Environment Connection by its Environment", () => {
		expect(connectionLabel({ kind: "environment", environmentId: "env-dev" }, names)).toBe("Contoso Dev");
	});

	it("says when the Environment has been removed", () => {
		expect(connectionLabel({ kind: "environment", environmentId: "gone" }, names)).toBe("Removed environment");
	});
});
