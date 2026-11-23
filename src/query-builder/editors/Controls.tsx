import { Button, Checkbox, Dropdown, makeStyles, mergeClasses, Option, Switch, Text, tokens } from "@fluentui/react-components";
import { ArrowSortDown16Regular, ArrowSortUp16Regular } from "@fluentui/react-icons";
import { type ReactNode } from "react";

import { type PickerOption } from "../lib";
import { useInPane } from "./EditingContext";
import { fittedControl } from "./measureText";

const useStyles = makeStyles({
	segmented: {
		display: "inline-flex",
		alignSelf: "center",
		flexShrink: 0,
		padding: "1px",
		columnGap: "1px",
		borderRadius: tokens.borderRadiusMedium,
		border: `1px solid ${tokens.colorNeutralStroke1}`,
	},
	segment: {
		minWidth: "unset",
		height: "22px",
		fontFamily: tokens.fontFamilyMonospace,
		paddingLeft: tokens.spacingHorizontalS,
		paddingRight: tokens.spacingHorizontalS,
	},
	direction: {
		flexShrink: 0,
		minWidth: "unset",
		fontFamily: tokens.fontFamilyMonospace,
		fontWeight: tokens.fontWeightRegular,
	},
	flagLabel: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		paddingLeft: tokens.spacingHorizontalXXS,
	},
	flag: {
		flexShrink: 0,
	},
	word: {
		flexShrink: 0,
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		color: tokens.colorNeutralForeground3,
	},
	inline: {
		minWidth: "unset",
		flexShrink: 0,
	},
	full: {
		minWidth: 0,
		width: "100%",
	},
	listbox: {
		minWidth: "200px",
		maxWidth: "380px",
		maxHeight: "320px",
	},
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
	},
});

export const Word = ({ children }: { children: ReactNode }) => {
	const styles = useStyles();
	return <Text className={styles.word}>{children}</Text>;
};

interface SegmentedProps {
	label: string;
	value: string;
	options: readonly { value: string; text: string }[];
	onChange: (value: string) => void;
}

export const Segmented = ({ label, value, options, onChange }: SegmentedProps) => {
	const styles = useStyles();
	return (
		<span className={styles.segmented} role="radiogroup" aria-label={label}>
			{options.map((option) => (
				<Button
					key={option.value}
					size="small"
					role="radio"
					aria-checked={option.value === value}
					appearance={option.value === value ? "primary" : "subtle"}
					className={styles.segment}
					onClick={() => {
						if (option.value !== value) {
							onChange(option.value);
						}
					}}>
					{option.text}
				</Button>
			))}
		</span>
	);
};

interface DirectionToggleProps {
	descending: boolean;
	onChange: (descending: boolean) => void;
}

export const DirectionToggle = ({ descending, onChange }: DirectionToggleProps) => {
	const styles = useStyles();
	const inPane = useInPane();
	return (
		<Button
			size={inPane ? "medium" : "small"}
			appearance={inPane ? "outline" : "subtle"}
			aria-label="descending"
			aria-pressed={descending}
			className={styles.direction}
			icon={descending ? <ArrowSortDown16Regular /> : <ArrowSortUp16Regular />}
			onClick={() => onChange(!descending)}>
			{descending ? "descending" : "ascending"}
		</Button>
	);
};

interface FlagProps {
	name: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}

export const Flag = ({ name, checked, onChange }: FlagProps) => {
	const styles = useStyles();
	const inPane = useInPane();
	if (inPane) {
		return (
			<Switch
				aria-label={name}
				checked={checked}
				label={{ children: checked ? "true" : "(not set)", className: styles.flagLabel }}
				onChange={(_, data) => onChange(data.checked)}
			/>
		);
	}
	return (
		<Checkbox
			size="medium"
			className={styles.flag}
			checked={checked}
			label={{ children: name, className: styles.flagLabel }}
			onChange={(_, data) => onChange(data.checked === true)}
		/>
	);
};

interface MultiPickerProps {
	label: string;
	values: readonly string[];
	options: readonly PickerOption[];
	onChange: (values: string[]) => void;
}

export const MultiPicker = ({ label, values, options, onChange }: MultiPickerProps) => {
	const styles = useStyles();
	const inPane = useInPane();
	const shown = values.map((value) => options.find((option) => option.value === value)?.text ?? value).join(", ");
	const fitted = fittedControl("value", shown || "(select)", "picker");
	return (
		<Dropdown
			multiselect
			size={inPane ? "medium" : "small"}
			appearance={inPane ? "outline" : "underline"}
			aria-label={label}
			title={!inPane && fitted.clipped ? shown : undefined}
			className={inPane ? styles.full : styles.inline}
			style={inPane ? undefined : { width: `${fitted.width}px` }}
			listbox={{ className: styles.listbox }}
			positioning={{ matchTargetSize: undefined }}
			value={shown}
			placeholder="(select)"
			selectedOptions={[...values]}
			onOptionSelect={(_, data) => onChange(data.selectedOptions)}>
			{options.map((option) => (
				<Option key={option.value} value={option.value} text={option.text}>
					<span className={mergeClasses(styles.mono)}>{option.text}</span>
				</Option>
			))}
		</Dropdown>
	);
};
