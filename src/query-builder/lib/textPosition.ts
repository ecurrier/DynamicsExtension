import { type FetchXmlParseError } from "@/shared/lib/fetchxml";

export interface TextPosition {
	line: number;
	column: number;
}

export const positionAt = (text: string, offset: number): TextPosition => {
	const end = Math.max(0, Math.min(offset, text.length));
	let line = 1;
	let lineStart = 0;
	for (let index = 0; index < end; index += 1) {
		if (text[index] === "\n") {
			line += 1;
			lineStart = index + 1;
		}
	}
	return { line, column: end - lineStart + 1 };
};

export const describeParseError = (text: string, error: FetchXmlParseError): string => {
	const { line, column } = positionAt(text, error.range.from);
	return `${error.message} (line ${line}, column ${column})`;
};
