export const HISTORY_LIMIT = 20;

export const rememberValue = (history: string[], value: string): string[] => {
	const trimmed = value.trim();
	if (!trimmed) {
		return history;
	}
	return [trimmed, ...history.filter((entry) => entry !== trimmed)].slice(0, HISTORY_LIMIT);
};

export const forgetValue = (history: string[], value: string): string[] => history.filter((entry) => entry !== value.trim());
