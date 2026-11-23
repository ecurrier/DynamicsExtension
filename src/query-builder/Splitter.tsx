import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";

import { clampPaneSize, dragResize, keyboardResize, type PaneBounds, paneBounds, type SplitterOrientation } from "./lib";

export const SPLITTER_THICKNESS = 6;

const KEYBOARD_STEP = 16;

const useStyles = makeStyles({
	root: {
		position: "relative",
		flexShrink: 0,
		boxSizing: "border-box",
		backgroundColor: "transparent",
		touchAction: "none",
		outlineStyle: "none",
		"::after": {
			content: '""',
			position: "absolute",
			backgroundColor: tokens.colorNeutralStroke2,
		},
		":hover::after": {
			backgroundColor: tokens.colorBrandStroke1,
		},
		":focus-visible::after": {
			backgroundColor: tokens.colorBrandStroke1,
		},
		":focus-visible": {
			outline: `2px solid ${tokens.colorStrokeFocus2}`,
			outlineOffset: "-2px",
		},
	},
	vertical: {
		width: `${SPLITTER_THICKNESS}px`,
		cursor: "col-resize",
		"::after": {
			top: 0,
			bottom: 0,
			left: `${(SPLITTER_THICKNESS - 2) / 2}px`,
			width: "2px",
		},
	},
	horizontal: {
		height: `${SPLITTER_THICKNESS}px`,
		cursor: "row-resize",
		"::after": {
			left: 0,
			right: 0,
			top: `${(SPLITTER_THICKNESS - 2) / 2}px`,
			height: "2px",
		},
	},
	dragging: {
		"::after": {
			backgroundColor: tokens.colorBrandStroke1,
		},
	},
});

export interface SplitterProps {
	orientation: SplitterOrientation;
	size: number | null;
	min: number;
	otherMin: number | (() => number);
	reverse?: boolean;
	label: string;
	controls?: string;
	className?: string;
	onResize: (size: number) => void;
	onToggle?: () => void;
}

interface DragStart {
	startSize: number;
	startPointer: number;
	bounds: PaneBounds;
}

export const Splitter = ({ orientation, size, min, otherMin, reverse = false, label, controls, className, onResize, onToggle }: SplitterProps) => {
	const styles = useStyles();
	const drag = useRef<DragStart | null>(null);
	const [dragging, setDragging] = useState(false);

	const extentOf = (element: Element | null | undefined): number | null => {
		const rect = element?.getBoundingClientRect();
		return rect ? (orientation === "vertical" ? rect.width : rect.height) : null;
	};
	const currentSize = (): number => extentOf(controls ? globalThis.document.getElementById(controls) : null) ?? size ?? min;
	const boundsFor = (element: HTMLElement): PaneBounds => {
		const other = typeof otherMin === "function" ? otherMin() : otherMin;
		const extent = extentOf(element.parentElement) ?? currentSize() + other + SPLITTER_THICKNESS;
		return paneBounds(extent, min, other, SPLITTER_THICKNESS);
	};
	const pointerAt = (event: PointerEvent<HTMLDivElement>): number => (orientation === "vertical" ? event.clientX : event.clientY);

	const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) {
			return;
		}
		event.preventDefault();
		event.currentTarget.focus();
		event.currentTarget.setPointerCapture(event.pointerId);
		const bounds = boundsFor(event.currentTarget);
		drag.current = { startSize: clampPaneSize(currentSize(), bounds), startPointer: pointerAt(event), bounds };
		setDragging(true);
	};
	const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
		if (drag.current) {
			onResize(dragResize({ ...drag.current, pointer: pointerAt(event), reverse }));
		}
	};
	const endDrag = (event: PointerEvent<HTMLDivElement>) => {
		if (!drag.current) {
			return;
		}
		drag.current = null;
		setDragging(false);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};
	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" && onToggle) {
			event.preventDefault();
			onToggle();
			return;
		}
		const bounds = boundsFor(event.currentTarget);
		const next = keyboardResize({
			key: event.key,
			shiftKey: event.shiftKey,
			orientation,
			reverse,
			size: clampPaneSize(currentSize(), bounds),
			bounds,
			step: KEYBOARD_STEP,
		});
		if (next !== null) {
			event.preventDefault();
			onResize(next);
		}
	};

	return (
		<div
			role="separator"
			tabIndex={0}
			aria-orientation={orientation}
			aria-label={label}
			aria-controls={controls}
			aria-valuenow={size ?? undefined}
			aria-valuemin={min}
			className={mergeClasses(styles.root, orientation === "vertical" ? styles.vertical : styles.horizontal, dragging && styles.dragging, className)}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={endDrag}
			onPointerCancel={endDrag}
			onLostPointerCapture={endDrag}
			onDoubleClick={onToggle}
			onKeyDown={onKeyDown}
		/>
	);
};
