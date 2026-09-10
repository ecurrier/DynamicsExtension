import { defineHandlers } from "@/messaging/page";
import { getEntityId, getFormContext, getGlobalContext, getPageKind, WEB_API_PATH } from "@/page/xrm";
import { type GeneratedUrl } from "@/shared/types";

import { currentEntityName, isLookupControl } from "./pageQuery";

const DEBUG_FLAGS: { name: string; suffix: string }[] = [
	{ name: "Command checker (ribbon)", suffix: "&ribbondebug=true" },
	{ name: "Forms monitor", suffix: "&flags=easyreproautomation=true" },
	{ name: "Performance center", suffix: "&perf=true" },
	{ name: "Chrome-less (no nav or command bar)", suffix: "&navbar=off&cmdbar=false" },
];

const buildRecordUrl = (appUrl: string, entityName: string, id: string): string => `${appUrl}&pagetype=entityrecord&etn=${entityName}&id=${id}`;

const generateRecordUrls = (formContext: Xrm.Page, appUrl: string): GeneratedUrl[] => {
	const current: GeneratedUrl = {
		name: "Current Record/View",
		url: buildRecordUrl(appUrl, formContext.data.entity.getEntityName(), getEntityId(formContext)),
		group: "Record",
	};
	const lookupUrls = formContext
		.getControl()
		.filter(isLookupControl)
		.flatMap<GeneratedUrl>((control) => {
			const value = control.getAttribute()?.getValue()?.[0];
			if (!value) {
				return [];
			}
			return [
				{
					name: `${control.getLabel()} (${value.entityType})`,
					url: buildRecordUrl(appUrl, value.entityType, value.id.replace(/[{}]/g, "").toLowerCase()),
					group: "Lookups",
				},
			];
		});
	const unique = new Map<string, GeneratedUrl>();
	for (const url of [current, ...lookupUrls]) {
		if (!unique.has(url.url)) {
			unique.set(url.url, url);
		}
	}
	return [...unique.values()];
};

const generatePlatformUrls = (baseUrl: string, entityName: string | null, recordId: string | null): GeneratedUrl[] => {
	const clientUrl = getGlobalContext().getClientUrl();
	const urls: GeneratedUrl[] = DEBUG_FLAGS.map((flag) => ({
		name: flag.name,
		url: `${baseUrl}${flag.suffix}`,
		group: "Debug",
	}));
	if (entityName && recordId) {
		urls.push({
			name: "Web API record",
			url: `${clientUrl}${WEB_API_PATH}${entityName}s(${recordId})`,
			group: "Developer",
		});
		urls.push({
			name: "Audit history",
			url: `${baseUrl}&pagetype=entityrecord&etn=${entityName}&id=${recordId}&navbar=off#auditHistory`,
			group: "Developer",
		});
	}
	return urls;
};

export const recordUrlsHandlers = defineHandlers({
	"utilities.generateUrls": () => {
		const appUrl = getGlobalContext().getCurrentAppUrl();
		const isForm = getPageKind() === "form";
		const formContext = isForm ? getFormContext() : null;
		const urls = formContext ? generateRecordUrls(formContext, appUrl) : [{ name: "Current Record/View", url: window.location.href, group: "Record" }];
		const baseUrl = urls[0]?.url ?? window.location.href;
		const platform = generatePlatformUrls(
			baseUrl,
			formContext ? formContext.data.entity.getEntityName() : currentEntityName(),
			formContext ? getEntityId(formContext) : null
		);
		return { appUrl, urls: [...urls, ...platform] };
	},
	"utilities.getWebApiUrl": () => `${getGlobalContext().getClientUrl()}${WEB_API_PATH}`,
});
