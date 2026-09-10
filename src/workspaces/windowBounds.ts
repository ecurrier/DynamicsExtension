export interface WindowBounds {
	width: number;
	height: number;
}

export const WORKSPACE_WINDOW_MINIMUM: WindowBounds = { width: 1100, height: 720 };

export const growToFit = (current: WindowBounds, available: WindowBounds, minimum: WindowBounds = WORKSPACE_WINDOW_MINIMUM): WindowBounds | null => {
	const width = Math.max(current.width, Math.min(minimum.width, available.width));
	const height = Math.max(current.height, Math.min(minimum.height, available.height));
	return width === current.width && height === current.height ? null : { width, height };
};
