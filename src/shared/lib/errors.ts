export const describeError = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}
	const text = String(error);
	return text === "[object Object]" ? "Unknown error" : text;
};
