import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";

import { createBridge } from "@/messaging/page";
import { handlers } from "@/page";

export default defineUnlistedScript(() => {
	window.__powerTools = createBridge(handlers, __APP_VERSION__);
});
