const isClosingTag = (line: string): boolean => /^<\/\w/.test(line);

const isSelfContained = (line: string): boolean => /\/>$/.test(line) || /<\/\w[^>]*>$/.test(line);

const isOpeningTag = (line: string): boolean => /^<\w/.test(line);

export const formatXml = (xml: string): string => {
	const lines = xml.replace(/(>)(<)(\/*)/g, "$1\n$2$3").split("\n");
	let pad = 0;
	const formatted: string[] = [];
	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) {
			continue;
		}
		if (isClosingTag(line)) {
			pad = Math.max(pad - 1, 0);
		}
		formatted.push(`${"  ".repeat(pad)}${line}`);
		if (!isClosingTag(line) && !isSelfContained(line) && isOpeningTag(line)) {
			pad += 1;
		}
	}
	return formatted.join("\n");
};

export const toggleQuotes = (xml: string, useDoubleQuotes: boolean): string => (useDoubleQuotes ? xml.replace(/'/g, '"') : xml.replace(/"/g, "'"));
