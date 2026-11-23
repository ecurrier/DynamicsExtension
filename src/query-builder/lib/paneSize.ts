export type SplitterOrientation = "vertical" | "horizontal";

export interface PaneBounds {
	min: number;
	max: number;
}

export const clampPaneSize = (size: number, { min, max }: PaneBounds): number => Math.round(Math.max(min, Math.min(size, Math.max(min, max))));

export const paneBounds = (containerExtent: number, min: number, otherMin: number, thickness: number): PaneBounds => ({
	min,
	max: Math.max(min, containerExtent - otherMin - thickness),
});

export interface DragResize {
	startSize: number;
	startPointer: number;
	pointer: number;
	reverse: boolean;
	bounds: PaneBounds;
}

export const dragResize = ({ startSize, startPointer, pointer, reverse, bounds }: DragResize): number =>
	clampPaneSize(startSize + (reverse ? startPointer - pointer : pointer - startPointer), bounds);

export interface KeyboardResize {
	key: string;
	shiftKey: boolean;
	orientation: SplitterOrientation;
	reverse: boolean;
	size: number;
	bounds: PaneBounds;
	step: number;
}

const GROW_KEYS: Record<SplitterOrientation, { grow: string; shrink: string }> = {
	vertical: { grow: "ArrowRight", shrink: "ArrowLeft" },
	horizontal: { grow: "ArrowDown", shrink: "ArrowUp" },
};

export const keyboardResize = ({ key, shiftKey, orientation, reverse, size, bounds, step }: KeyboardResize): number | null => {
	if (key === "Home") {
		return bounds.min;
	}
	if (key === "End") {
		return clampPaneSize(bounds.max, bounds);
	}
	const keys = GROW_KEYS[orientation];
	const amount = shiftKey ? step * 4 : step;
	if (key === keys.grow) {
		return clampPaneSize(size + (reverse ? -amount : amount), bounds);
	}
	if (key === keys.shrink) {
		return clampPaneSize(size + (reverse ? amount : -amount), bounds);
	}
	return null;
};
