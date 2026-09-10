import { describe, expect, it } from "vitest";

import { type EnvironmentAlert } from "@/shared/types";

import { activeAlertFor, findEnvironmentByOrigin } from "./environmentMatch";

const alert = (overrides: Partial<EnvironmentAlert> = {}): EnvironmentAlert => ({
	enabled: true,
	level: 3,
	message: "You are in Dev",
	showCloseButton: true,
	...overrides,
});

const environments = [
	{ id: "dev", modelDrivenAppUrl: "https://dev.crm.dynamics.com/", alert: alert({ enabled: false }) },
	{ id: "dev-2", modelDrivenAppUrl: "https://DEV.crm.dynamics.com/main.aspx", alert: alert() },
	{ id: "prod", modelDrivenAppUrl: "https://prod.crm.dynamics.com/", alert: alert({ message: "  " }) },
	{ id: "broken", modelDrivenAppUrl: "not a url", alert: alert() },
];

describe("environment matching", () => {
	it("matches environments by origin regardless of path or case", () => {
		expect(findEnvironmentByOrigin(environments, "https://dev.crm.dynamics.com/main.aspx?appid=1")?.id).toBe("dev");
		expect(findEnvironmentByOrigin(environments, "https://other.crm.dynamics.com/")).toBeNull();
		expect(findEnvironmentByOrigin(environments, null)).toBeNull();
		expect(findEnvironmentByOrigin(environments, "garbage")).toBeNull();
	});

	it("returns the first enabled alert with a message for the origin", () => {
		expect(activeAlertFor(environments, "https://dev.crm.dynamics.com/")?.environment.id).toBe("dev-2");
		expect(activeAlertFor(environments, "https://prod.crm.dynamics.com/")).toBeNull();
		expect(activeAlertFor(environments, "https://nowhere.crm.dynamics.com/")).toBeNull();
	});
});
