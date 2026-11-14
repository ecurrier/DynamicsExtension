import { describe, expect, it } from "vitest";

import { fieldMessage } from "./useFieldProblem";

describe("fieldMessage", () => {
	it("gives the message to the field it is about", () => {
		expect(fieldMessage({ field: "name", message: "Enter a preset name" }, "name")).toBe("Enter a preset name");
	});

	it("gives nothing to every other field", () => {
		expect(fieldMessage({ field: "name", message: "Enter a preset name" }, "fields")).toBeUndefined();
	});

	it("gives nothing when there is no problem", () => {
		expect(fieldMessage(null, "name")).toBeUndefined();
	});
});
