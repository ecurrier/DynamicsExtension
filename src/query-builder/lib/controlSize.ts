export type ControlKind = "table" | "column" | "operator" | "value" | "number" | "date" | "alias" | "enum" | "relationship" | "lookup";

export type ControlShape = "picker" | "input" | "number" | "date";

export interface ControlSize {
	readonly min: number;
	readonly max: number;
	readonly monospace: boolean;
}

export interface FittedControl {
	readonly width: number;
	readonly clipped: boolean;
}

export const CONTROL_SIZES: Readonly<Record<ControlKind, ControlSize>> = {
	table: { min: 72, max: 240, monospace: false },
	column: { min: 72, max: 220, monospace: false },
	operator: { min: 20, max: 150, monospace: true },
	enum: { min: 28, max: 160, monospace: true },
	alias: { min: 40, max: 160, monospace: true },
	value: { min: 48, max: 260, monospace: true },
	number: { min: 32, max: 160, monospace: true },
	date: { min: 96, max: 96, monospace: true },
	relationship: { min: 96, max: 280, monospace: false },
	lookup: { min: 140, max: 260, monospace: false },
};

export const CONTROL_CHROME: Readonly<Record<ControlShape, number>> = {
	picker: 34,
	input: 20,
	number: 40,
	date: 44,
};

export const fitControl = (kind: ControlKind, textWidth: number, shape: ControlShape): FittedControl => {
	const { min, max } = CONTROL_SIZES[kind];
	const measured = Math.ceil(Math.max(0, textWidth));
	return { width: Math.min(Math.max(measured, min), max) + CONTROL_CHROME[shape], clipped: measured > max };
};

export const maxControlWidth = (kind: ControlKind, shape: ControlShape): number => CONTROL_SIZES[kind].max + CONTROL_CHROME[shape];
