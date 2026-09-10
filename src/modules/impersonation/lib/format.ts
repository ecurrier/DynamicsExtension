export const formatStartedAt = (iso: string): string => {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? iso : date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};
