import { codegenModule } from "./codegen";
import { environmentVariablesModule } from "./environmentvariables";
import { formPresetsModule } from "./formpresets";
import { formsModule } from "./forms";
import { impersonationModule } from "./impersonation";
import { investigateModule } from "./investigate";
import { pluginsModule } from "./plugins";
import { securityModule } from "./security";
import { settingsModule } from "./settings";
import { transporterModule } from "./transporter";
import { type AreaDefinition, type ModuleDefinition } from "./types";
import { utilitiesModule } from "./utilities";
import { webApiModule } from "./webapi";

export const modules: ModuleDefinition[] = [
	utilitiesModule,
	investigateModule,
	formPresetsModule,
	webApiModule,
	codegenModule,
	formsModule,
	securityModule,
	impersonationModule,
	pluginsModule,
	environmentVariablesModule,
	transporterModule,
	settingsModule,
].sort((left, right) => left.order - right.order);

export const areasById: Record<string, AreaDefinition> = Object.fromEntries(modules.flatMap((module) => module.areas.map((area) => [area.id, area])));

const LEGACY_AREA_IDS: Record<string, string> = {
	"pluginsteps.steps": "plugins.steps",
	"plugintraces.viewer": "plugins.traces",
};

export const moduleForArea = (areaId: string): ModuleDefinition | undefined => modules.find((module) => module.areas.some((area) => area.id === areaId));

export const DEFAULT_AREA = "utilities.admin";

export const resolveArea = (areaId: string | null | undefined): AreaDefinition => {
	const id = areaId ?? "";
	return areasById[LEGACY_AREA_IDS[id] ?? id] ?? (areasById[DEFAULT_AREA] as AreaDefinition);
};
