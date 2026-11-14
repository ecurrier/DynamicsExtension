import { describe, expect, it } from "vitest";

import { FEEDBACK_AREA_ID } from "@/shared/lib";

import { areasById, DEFAULT_AREA, modules, resolveArea } from "./registry";

describe("resolveArea", () => {
	it("sends a remembered Update Fields Area to Record Columns", () => {
		expect(resolveArea("webapi.update-fields").id).toBe("webapi.record-columns");
	});

	it("falls back to the default Area for unknown ids", () => {
		expect(resolveArea("nope").id).toBe(DEFAULT_AREA);
		expect(resolveArea(null).id).toBe(DEFAULT_AREA);
	});
});

describe("the Area registry", () => {
	it("gives every Area either a component or a Workspace to open", () => {
		for (const module of modules) {
			for (const area of module.areas) {
				if (area.fit === "workspace") {
					expect(area.workspace, `${area.id} must name the Workspace it opens`).toBeDefined();
					expect(area.component, `${area.id} opens a Workspace, so it has no component`).toBeUndefined();
				} else {
					expect(area.component, `${area.id} must have a component`).toBeDefined();
					expect(area.workspace, `${area.id} is not a Workspace Area`).toBeUndefined();
				}
			}
		}
	});

	it("has an Area at the id the nav drawer links to", () => {
		// The drawer footer sits in shared/components and cannot import a module without closing a
		// barrel cycle, so it navigates by the constant in shared/lib. This is the other end of
		// that contract: if the Area id in settings/module.ts ever drifts, this fails.
		expect(areasById[FEEDBACK_AREA_ID], `no Area is registered at ${FEEDBACK_AREA_ID}`).toBeDefined();
	});

	it("never remembers a Workspace Area as the last visited one, because it has nothing to render", () => {
		// rememberArea keeps those out of lastVisitedAreaItem; this guards the other end.
		const workspaceAreas = modules.flatMap((module) => module.areas.filter((area) => area.fit === "workspace"));
		expect(workspaceAreas.map((area) => area.id).sort()).toEqual([
			"plugins.traces",
			"schema.columns",
			"schema.polymorphic",
			"security.compare",
			"security.privileges",
			"transporter.launch",
		]);
	});
});
