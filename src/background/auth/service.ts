import { browser } from "wxt/browser";

import { buildTokenOriginRule, TOKEN_ORIGIN_RULE_ID } from "@/shared/lib";

export const ensureTokenOriginRule = async (): Promise<void> => {
	const rule = buildTokenOriginRule(browser.runtime.id);
	await browser.declarativeNetRequest.updateSessionRules({
		removeRuleIds: [TOKEN_ORIGIN_RULE_ID],
		addRules: [rule as never],
	});
};
