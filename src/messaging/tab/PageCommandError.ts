export class PageCommandError extends Error {
	constructor(
		readonly command: string,
		readonly code: string,
		message: string,
		readonly details?: unknown
	) {
		super(message);
		this.name = "PageCommandError";
	}
}

export const isPageCommandError = (error: unknown): error is PageCommandError => error instanceof PageCommandError;
