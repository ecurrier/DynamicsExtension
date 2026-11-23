import { Input, makeStyles, mergeClasses, Textarea, tokens } from "@fluentui/react-components";
import { type KeyboardEvent, useRef, useState } from "react";

import { type ControlKind, CONTROL_SIZES } from "../lib";
import { useQueryBuilder } from "../store";
import { useInPane } from "./EditingContext";
import { fittedControl } from "./measureText";

const useStyles = makeStyles({
	inline: {
		minWidth: "unset",
		flexShrink: 0,
	},
	full: {
		width: "100%",
		minWidth: 0,
	},
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
	},
	input: {
		minWidth: 0,
		textOverflow: "ellipsis",
	},
	invalid: {
		borderBottomColor: tokens.colorPaletteRedBorder2,
	},
});

export type DraftInputType = "text" | "number" | "date";

export interface DraftInputProps {
	label: string;
	value: string;
	kind: ControlKind;
	type?: DraftInputType;
	placeholder?: string;
	multiline?: boolean;
	required?: boolean;
	onCommit: (value: string) => void;
}

export const DraftInput = ({ label, value, kind, type = "text", placeholder, multiline = false, required = false, onCommit }: DraftInputProps) => {
	const styles = useStyles();
	const inPane = useInPane();
	const registerDraft = useQueryBuilder((state) => state.registerDraft);
	const [draft, setDraft] = useState<string | null>(null);
	const release = useRef<(() => void) | null>(null);
	const shown = draft ?? value;
	const fitted = fittedControl(kind, shown || placeholder || "", type === "number" ? "number" : type === "date" ? "date" : "input");
	const monospace = CONTROL_SIZES[kind].monospace;

	const commit = () => {
		if (draft !== null && draft !== value) {
			onCommit(draft);
		}
		setDraft(null);
	};

	const onFocus = (element: HTMLInputElement | HTMLTextAreaElement) => {
		release.current?.();
		release.current = registerDraft(() => {
			element.blur();
			element.focus();
		});
	};

	const onBlur = () => {
		release.current?.();
		release.current = null;
		commit();
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !multiline && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			commit();
			return;
		}
		if (event.key === "Escape" && draft !== null) {
			event.preventDefault();
			event.stopPropagation();
			setDraft(null);
		}
	};

	if (multiline) {
		return (
			<Textarea
				aria-label={label}
				value={shown}
				placeholder={placeholder}
				resize="vertical"
				className={mergeClasses(styles.full, monospace && styles.mono)}
				textarea={{ className: mergeClasses(monospace && styles.mono) }}
				onChange={(_, data) => setDraft(data.value)}
				onFocus={(event) => onFocus(event.currentTarget)}
				onBlur={onBlur}
				onKeyDown={onKeyDown}
			/>
		);
	}

	return (
		<Input
			size={inPane ? "medium" : "small"}
			appearance={inPane ? "outline" : "underline"}
			aria-label={label}
			type={type}
			value={shown}
			placeholder={placeholder}
			title={!inPane && fitted.clipped ? shown : undefined}
			className={mergeClasses(inPane ? styles.full : styles.inline, required && shown.trim() === "" && styles.invalid)}
			style={inPane ? undefined : { width: `${fitted.width}px` }}
			input={{ className: mergeClasses(styles.input, monospace && styles.mono) }}
			onChange={(_, data) => setDraft(data.value)}
			onFocus={(event) => onFocus(event.currentTarget)}
			onBlur={onBlur}
			onKeyDown={onKeyDown}
		/>
	);
};
