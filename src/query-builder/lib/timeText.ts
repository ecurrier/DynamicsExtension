export const timeText = (time: number, locale?: string): string => new Date(time).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
