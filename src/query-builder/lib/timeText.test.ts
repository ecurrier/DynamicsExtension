import { describe, expect, it } from "vitest";

import { timeText } from "./timeText";

describe("timeText", () => {
	it("gives the date and the time", () => {
		const text = timeText(Date.UTC(2026, 10, 22, 14, 5), "en-US");
		expect(text).toContain("2026");
		expect(text).toMatch(/\d{1,2}:\d{2}/);
	});
});
