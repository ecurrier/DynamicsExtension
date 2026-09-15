import { defineBackground } from "wxt/utils/define-background";

import {
	backgroundHandlers,
	ensureTokenOriginRule,
	reconcileEnvironmentAlerts,
	reconcileImpersonation,
	reconcileSidePanelBehavior,
	watchEnvironmentAlerts,
	watchImpersonatedTabs,
	watchSidePanelBehavior,
} from "@/background";
import { registerBackgroundHandlers } from "@/messaging/background";

export default defineBackground(() => {
	registerBackgroundHandlers(backgroundHandlers);
	watchImpersonatedTabs();
	watchEnvironmentAlerts();
	watchSidePanelBehavior();
	void reconcileImpersonation();
	void reconcileSidePanelBehavior();
	void ensureTokenOriginRule();
	void reconcileEnvironmentAlerts();
});
