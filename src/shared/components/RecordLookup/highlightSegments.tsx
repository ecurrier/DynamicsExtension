import { type ReactNode } from "react";

export const highlightSegments = (text: string, query: string, className?: string): ReactNode => {
	const needle = query.trim().toLowerCase();
	if (!needle) {
		return text;
	}
	const lower = text.toLowerCase();
	const segments: ReactNode[] = [];
	let index = 0;
	let position = lower.indexOf(needle);
	while (position >= 0) {
		if (position > index) {
			segments.push(text.slice(index, position));
		}
		segments.push(
			<mark key={position} className={className}>
				{text.slice(position, position + needle.length)}
			</mark>
		);
		index = position + needle.length;
		position = lower.indexOf(needle, index);
	}
	if (index < text.length) {
		segments.push(text.slice(index));
	}
	return segments;
};
