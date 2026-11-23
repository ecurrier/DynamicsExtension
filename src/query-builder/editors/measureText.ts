import { webLightTheme } from "@fluentui/react-components";

import { type ControlKind, type ControlShape, CONTROL_SIZES, fitControl, type FittedControl } from "../lib";

const FONT_SIZE = webLightTheme.fontSizeBase200;

let context: CanvasRenderingContext2D | null | undefined;

const canvasContext = (): CanvasRenderingContext2D | null => {
	if (context === undefined) {
		context = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
	}
	return context;
};

export const textWidth = (text: string, monospace: boolean): number => {
	const target = canvasContext();
	if (!target) {
		return text.length * 7;
	}
	target.font = `${FONT_SIZE} ${monospace ? webLightTheme.fontFamilyMonospace : webLightTheme.fontFamilyBase}`;
	return target.measureText(text).width;
};

export const fittedControl = (kind: ControlKind, text: string, shape: ControlShape): FittedControl =>
	fitControl(kind, textWidth(text, CONTROL_SIZES[kind].monospace), shape);
