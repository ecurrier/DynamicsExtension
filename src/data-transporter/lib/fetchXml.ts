const TAG = /<\/?([A-Za-z][\w-]*)\b[^>]*?\/?>/g;
const PAGING_ATTRIBUTES = /\s+(page|paging-cookie|count|returntotalrecordcount)\s*=\s*("[^"]*"|'[^']*')/gi;

export const stripPagingAttributes = (fetchXml: string): string =>
	fetchXml.replace(/<fetch\b([^>]*)>/i, (_, attributes: string) => `<fetch${attributes.replace(PAGING_ATTRIBUTES, "")}>`);

export const restrictFetchXmlToId = (fetchXml: string, primaryIdAttribute: string): string => {
	let linkDepth = 0;
	let insideEntity = false;
	let inserted = false;
	const restricted = stripPagingAttributes(fetchXml).replace(TAG, (tag: string, name: string) => {
		const lower = name.toLowerCase();
		const closing = tag.startsWith("</");
		const selfClosing = tag.endsWith("/>");
		if (lower === "link-entity") {
			if (closing) {
				linkDepth = Math.max(0, linkDepth - 1);
			} else if (!selfClosing) {
				linkDepth += 1;
			}
			return tag;
		}
		if (lower === "entity") {
			insideEntity = !closing;
			if (!closing && !inserted) {
				inserted = true;
				return `${tag}<attribute name="${primaryIdAttribute}" />`;
			}
			return tag;
		}
		if (linkDepth === 0 && insideEntity && (lower === "attribute" || lower === "all-attributes")) {
			return "";
		}
		return tag;
	});
	return inserted ? restricted : fetchXml;
};
