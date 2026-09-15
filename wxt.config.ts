import { readFileSync } from "node:fs";

import { defineConfig } from "wxt";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
	srcDir: "src",
	imports: false,
	modules: ["@wxt-dev/module-react"],
	manifest: {
		name: "Power Tools for Power Platform/Dynamics 365",
		description: "Boost productivity & streamline workflows on Power Platform/Dynamics 365. Custom functionality & quality-of-life features.",
		permissions: ["activeTab", "scripting", "storage", "webNavigation", "sidePanel", "declarativeNetRequestWithHostAccess"],
		host_permissions: [
			"https://*.dynamics.com/*",
			"https://*.microsoftdynamics.us/*",
			"https://*.appsplatform.us/*",
			"https://login.microsoftonline.com/*",
			"https://login.microsoftonline.us/*",
		],
		action: { default_title: "Power Tools" },
		side_panel: { default_path: "sidepanel.html" },
	},
	vite: () => ({
		define: { __APP_VERSION__: JSON.stringify(version) },
	}),
});
