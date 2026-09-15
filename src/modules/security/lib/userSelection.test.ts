import { describe, expect, it } from "vitest";

import { type SystemUser } from "@/shared/types";

import { applyVisibleSelection, mergeSelection, selectedUsers, selectionSummary, toggleSelection } from "./userSelection";

const user = (id: string): SystemUser => ({ id, fullName: `User ${id}`, azureAdObjectId: null, domainName: `${id}@contoso.com`, isDisabled: false });

describe("toggleSelection", () => {
	it("adds then removes", () => {
		expect(toggleSelection([], "a")).toEqual(["a"]);
		expect(toggleSelection(["a", "b"], "a")).toEqual(["b"]);
	});
});

describe("applyVisibleSelection", () => {
	it("keeps selections that the current filter hides", () => {
		const selected = ["a", "b"];
		expect(applyVisibleSelection(selected, ["c", "d"], ["c"])).toEqual(["a", "b", "c"]);
	});

	it("removes a visible row that was unticked, without touching hidden ones", () => {
		expect(applyVisibleSelection(["a", "b", "c"], ["b", "c"], ["c"])).toEqual(["a", "c"]);
	});

	it("is the whole point: assembling a set over several filters", () => {
		let selected: string[] = [];
		selected = applyVisibleSelection(selected, ["a1", "a2"], ["a1"]);
		selected = applyVisibleSelection(selected, ["b1", "b2"], ["b2"]);
		selected = applyVisibleSelection(selected, ["c1"], ["c1"]);
		expect(selected).toEqual(["a1", "b2", "c1"]);
	});

	it("ignores ids that are not currently visible, so a stale tick cannot sneak in", () => {
		expect(applyVisibleSelection(["a"], ["b"], ["b", "zzz"])).toEqual(["a", "b"]);
	});
});

describe("mergeSelection", () => {
	it("adds a whole filtered page without duplicating what was already picked", () => {
		expect(mergeSelection(["a"], ["a", "b", "c"])).toEqual(["a", "b", "c"]);
	});
});

describe("selectionSummary", () => {
	it("counts with the right plural", () => {
		expect(selectionSummary([])).toBe("No users selected.");
		expect(selectionSummary(["a"])).toBe("1 user selected.");
		expect(selectionSummary(["a", "b"])).toBe("2 users selected.");
	});
});

describe("selectedUsers", () => {
	it("returns the chosen users in the order they were picked", () => {
		const users = [user("a"), user("b"), user("c")];
		expect(selectedUsers(users, ["c", "a"]).map((entry) => entry.id)).toEqual(["c", "a"]);
	});

	it("drops ids with no matching user", () => {
		expect(selectedUsers([user("a")], ["a", "gone"]).map((entry) => entry.id)).toEqual(["a"]);
	});
});
