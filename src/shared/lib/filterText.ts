export const matchesFilter = (haystacks: (string | null | undefined)[], query: string): boolean => {
	const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (terms.length === 0) {
		return true;
	}
	const text = haystacks
		.filter((value): value is string => typeof value === "string")
		.join(" ")
		.toLowerCase();
	return terms.every((term) => text.includes(term));
};
