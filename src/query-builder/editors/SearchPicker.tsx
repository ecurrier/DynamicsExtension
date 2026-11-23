import { Combobox, makeStyles, mergeClasses, Option, tokens } from "@fluentui/react-components";
import { type MouseEvent, useState } from "react";

import { type ControlKind, CONTROL_SIZES, matchRange, moreOptionsText, type PickerOption, searchPicker } from "../lib";
import { useInPane } from "./EditingContext";
import { fittedControl } from "./measureText";

const NO_MATCHES = "\u0000no-matches";
const MORE = "\u0000more";

const useStyles = makeStyles({
	inline: {
		minWidth: "unset",
		flexShrink: 0,
	},
	full: {
		minWidth: 0,
		width: "100%",
	},
	input: {
		width: "100%",
		minWidth: 0,
		textOverflow: "ellipsis",
	},
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
	},
	listbox: {
		minWidth: "220px",
		maxWidth: "420px",
		maxHeight: "320px",
	},
	option: {
		display: "flex",
		flexDirection: "column",
		minWidth: 0,
	},
	secondary: {
		color: tokens.colorNeutralForeground3,
		fontSize: tokens.fontSizeBase100,
		lineHeight: tokens.lineHeightBase100,
	},
	match: {
		backgroundColor: tokens.colorBrandBackground2,
		color: "inherit",
		fontWeight: tokens.fontWeightSemibold,
		borderRadius: tokens.borderRadiusSmall,
	},
});

interface HighlightedProps {
	text: string;
	query: string;
	className: string;
}

const Highlighted = ({ text, query, className }: HighlightedProps) => {
	const range = matchRange(text, query);
	if (!range) {
		return <>{text}</>;
	}
	return (
		<>
			{text.slice(0, range.start)}
			<mark className={className}>{text.slice(range.start, range.end)}</mark>
			{text.slice(range.end)}
		</>
	);
};

export interface SearchPickerProps {
	label: string;
	value: string | null;
	options: readonly PickerOption[];
	kind: ControlKind;
	text?: string;
	placeholder?: string;
	disabled?: boolean;
	onPick: (value: string) => void;
}

export const SearchPicker = ({ label, value, options, kind, text, placeholder = "(choose)", disabled = false, onPick }: SearchPickerProps) => {
	const styles = useStyles();
	const inPane = useInPane();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState<string | null>(null);
	const selected = value === null ? undefined : options.find((option) => option.value === value);
	const shown = selected?.text ?? text ?? value ?? "";
	const search = searchPicker(options, query ?? "", value);
	const fitted = fittedControl(kind, shown || placeholder, "picker");
	const monospace = CONTROL_SIZES[kind].monospace;

	const startSearch = () => {
		setQuery("");
		setOpen(true);
	};

	const close = () => {
		setOpen(false);
		setQuery(null);
	};

	return (
		<Combobox
			freeform
			disabled={disabled}
			size={inPane ? "medium" : "small"}
			appearance={inPane ? "outline" : "underline"}
			aria-label={label}
			title={!inPane && fitted.clipped ? shown : undefined}
			className={inPane ? styles.full : styles.inline}
			style={inPane ? undefined : { width: `${fitted.width}px` }}
			input={{ className: mergeClasses(styles.input, monospace && styles.mono) }}
			listbox={{ className: styles.listbox }}
			positioning={{ matchTargetSize: undefined }}
			open={open}
			value={query ?? shown}
			placeholder={query === null ? placeholder : shown || placeholder}
			selectedOptions={selected ? [selected.value] : []}
			onOpenChange={(event, data) => {
				if (data.open) {
					if (query === null) {
						setQuery("");
					}
					setOpen(true);
					return;
				}
				if (event.type === "click" && (event as MouseEvent).currentTarget instanceof HTMLInputElement) {
					return;
				}
				close();
			}}
			onFocus={startSearch}
			onClick={() => {
				if (query === null) {
					startSearch();
				}
			}}
			onChange={(event) => {
				const typed = event.target.value;
				setQuery(query === null && shown !== "" && typed.startsWith(shown) ? typed.slice(shown.length) : typed);
				setOpen(true);
			}}
			onOptionSelect={(event, data) => {
				const picked = data.optionValue;
				if (picked === undefined || picked === NO_MATCHES || picked === MORE || ("key" in event && event.key === "Tab")) {
					return;
				}
				close();
				if (picked !== value) {
					onPick(picked);
				}
			}}>
			{search.visible.map((option) => (
				<Option key={`${search.needle}\u0000${option.value}`} value={option.value} text="">
					<span className={styles.option}>
						<span className={mergeClasses(monospace && styles.mono)}>
							<Highlighted text={option.text} query={search.needle} className={styles.match} />
						</span>
						{option.secondary ? <span className={styles.secondary}>{option.secondary}</span> : null}
					</span>
				</Option>
			))}
			{search.matches === 0 ? (
				<Option key={`${search.needle}\u0000${NO_MATCHES}`} value={NO_MATCHES} text="" disabled>
					No matches
				</Option>
			) : null}
			{search.more > 0 ? (
				<Option key={`${search.needle}\u0000${MORE}`} value={MORE} text="" disabled>
					{moreOptionsText(search.more)}
				</Option>
			) : null}
		</Combobox>
	);
};
