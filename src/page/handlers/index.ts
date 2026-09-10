import { type HandlerMap } from "@/messaging/page";

import { alertHandlers } from "./alerts";
import { codegenHandlers } from "./codegen";
import { environmentVariablesHandlers } from "./environmentVariables";
import { formPresetsHandlers } from "./formPresets";
import { formsHandlers } from "./forms";
import { globalHandlers } from "./global";
import { investigateHandlers } from "./investigate";
import { pluginStepsHandlers } from "./pluginSteps";
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
	...securityHandlers,
	...tracesHandlers,
	...environmentVariablesHandlers,
	...pluginStepsHandlers,
	...alertHandlers,
	...transportHandlers,
	...investigateHandlers,
	...codegenHandlers,
};
