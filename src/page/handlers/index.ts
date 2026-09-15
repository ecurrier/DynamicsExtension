import { type HandlerMap } from "@/messaging/page";

import { alertHandlers } from "./alerts";
import { codegenHandlers } from "./codegen";
import { environmentVariablesHandlers } from "./environmentVariables";
import { formPresetsHandlers } from "./formPresets";
import { formsHandlers } from "./forms";
import { globalHandlers } from "./global";
import { investigateHandlers } from "./investigate";
import { pluginPackagesHandlers } from "./pluginPackages";
import { pluginStepsHandlers } from "./pluginSteps";
import { schemaHandlers } from "./schema";
import { securityHandlers } from "./security";
import { settingsHandlers } from "./settings";
import { tracesHandlers } from "./traces";
import { transportHandlers } from "./transport";
import { utilitiesHandlers } from "./utilities";
import { webApiHandlers } from "./webapi";

export const handlers: HandlerMap = {
	...globalHandlers,
	...settingsHandlers,
	...utilitiesHandlers,
	...formPresetsHandlers,
	...webApiHandlers,
	...formsHandlers,
	...schemaHandlers,
	...securityHandlers,
	...tracesHandlers,
	...environmentVariablesHandlers,
	...pluginStepsHandlers,
	...pluginPackagesHandlers,
	...alertHandlers,
	...transportHandlers,
	...investigateHandlers,
	...codegenHandlers,
};
