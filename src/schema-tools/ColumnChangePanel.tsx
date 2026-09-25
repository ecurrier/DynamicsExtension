import {
	Badge,
	Button,
	Dropdown,
	Input,
	Label,
	makeStyles,
	mergeClasses,
	MessageBar,
	MessageBarBody,
	Option,
	Text,
	Textarea,
	tokens,
	useId,
} from "@fluentui/react-components";
import { type ReactNode, useMemo } from "react";

import {
	type AttributeProperty,
	countPropertyChanges,
	describeCurrentValues,
	editablePropertiesFor,
	type EditValues,
	mixedTypeReason,
	PROPERTY_LABELS,
	TYPE_PROPERTIES,
} from "@/modules/schema/lib";
import { type AttributeEdit, type AttributeMatch, REQUIRED_LEVELS } from "@/shared/types";

import { type DetailsStatus } from "./useAttributeDetails";

const useStyles = makeStyles({
	panel: {
		display: "flex",
		flexDirection: "column",
		minHeight: 0,
		overflow: "hidden",
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderBottomWidth: 0,
		borderRadius: `${tokens.borderRadiusXLarge} ${tokens.borderRadiusXLarge} 0 0`,
		backgroundColor: tokens.colorNeutralBackground1,
		"@container (max-width: 880px)": {
			overflow: "visible",
			borderBottomWidth: "1px",
			borderRadius: tokens.borderRadiusXLarge,
		},
	},
	header: {
		display: "flex",
		flexDirection: "column",
		rowGap: "2px",
		padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL} ${tokens.spacingVerticalM}`,
		borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
	},
	heading: {
		margin: 0,
	},
	fields: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXL,
		flexGrow: 1,
		minHeight: 0,
		overflowY: "auto",
		padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL}`,
		"@container (max-width: 880px)": {
			display: "grid",
			gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
			columnGap: tokens.spacingHorizontalL,
			overflowY: "visible",
		},
	},
	wide: {
		"@container (max-width: 880px)": {
			gridColumn: "1 / -1",
		},
	},
	field: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXS,
		minWidth: 0,
	},
	fieldHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		columnGap: tokens.spacingHorizontalS,
	},
	unchanged: {
		color: tokens.colorNeutralForeground4,
	},
	hint: {
		color: tokens.colorNeutralForeground3,
	},
	section: {
		display: "flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalS,
		color: tokens.colorNeutralForeground3,
		whiteSpace: "nowrap",
	},
	rule: {
		flexGrow: 1,
		height: "1px",
		backgroundColor: tokens.colorNeutralStroke2,
	},
	number: {
		maxWidth: "180px",
	},
	empty: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXS,
		padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXL}`,
	},
	muted: {
		color: tokens.colorNeutralForeground3,
	},
	footer: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalM,
		padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL}`,
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: `0 0 ${tokens.borderRadiusXLarge} ${tokens.borderRadiusXLarge}`,
		backgroundColor: tokens.colorNeutralBackground1,
		"@container (max-width: 880px)": {
			position: "sticky",
			bottom: tokens.spacingVerticalL,
			zIndex: 1,
			flexDirection: "row",
			alignItems: "center",
			columnGap: tokens.spacingHorizontalL,
			borderRadius: tokens.borderRadiusXLarge,
			boxShadow: tokens.shadow16,
		},
	},
	footerText: {
		display: "flex",
		flexDirection: "column",
		rowGap: "2px",
		flexGrow: 1,
		minWidth: 0,
	},
	review: {
		"@container (max-width: 880px)": {
			flexShrink: 0,
		},
	},
});

interface FieldIds {
	control: string;
	hint: string;
}

interface ChangeFieldProps {
	label: string;
	changes: number | null;
	hint: string;
	className?: string;
	children: (ids: FieldIds) => ReactNode;
}

const ChangeCount = ({ changes }: { changes: number | null }) => {
	const styles = useStyles();
	if (changes === null || changes === 0) {
		return (
			<Text size={200} className={styles.unchanged}>
				{changes === null ? "No change" : "Already matches"}
			</Text>
		);
	}
	return (
		<Badge appearance="tint" color="brand">
			{changes === 1 ? "Changes 1 table" : `Changes ${changes} tables`}
		</Badge>
	);
};

const ChangeField = ({ label, changes, hint: hintText, className, children }: ChangeFieldProps) => {
	const styles = useStyles();
	const control = useId("change-field");
	const hint = `${control}-hint`;
	return (
		<div className={mergeClasses(styles.field, className)}>
			<div className={styles.fieldHeader}>
				<Label htmlFor={control}>{label}</Label>
				<ChangeCount changes={changes} />
			</div>
			{children({ control, hint })}
			<Text id={hint} size={200} className={styles.hint}>
				{hintText}
			</Text>
		</div>
	);
};

interface ColumnChangePanelProps {
	className?: string;
	selected: AttributeMatch[];
	values: EditValues;
	edit: AttributeEdit;
	detailsStatus: DetailsStatus;
	onChange: (property: AttributeProperty, value: string) => void;
}

const hintFor = (selected: AttributeMatch[], property: AttributeProperty, detailsStatus: DetailsStatus): string => {
	if (TYPE_PROPERTIES.includes(property) && detailsStatus === "loading") {
		return "Reading the current values...";
	}
	if (TYPE_PROPERTIES.includes(property) && detailsStatus === "error") {
		return "The current values could not be read.";
	}
	return `Now: ${describeCurrentValues(selected, property)}`;
};

export const ColumnChangePanel = ({ className, selected, values, edit, detailsStatus, onChange }: ColumnChangePanelProps) => {
	const styles = useStyles();
	const types = useMemo(() => selected.map((match) => match.attributeType), [selected]);
	const available = useMemo(() => editablePropertiesFor(types), [types]);
	const typeProperties = TYPE_PROPERTIES.filter((property) => available.includes(property));
	const mixed = mixedTypeReason(types);
	const distinctTypes = [...new Set(types)];
	const field = (property: AttributeProperty) => ({
		label: PROPERTY_LABELS[property],
		changes: countPropertyChanges(selected, edit, property),
		hint: hintFor(selected, property, detailsStatus),
	});

	if (selected.length === 0) {
		return (
			<section aria-label="Change the selected tables" className={mergeClasses(styles.panel, className)}>
				<div className={styles.empty}>
					<Text weight="semibold">Pick the tables to change</Text>
					<Text size={200} className={styles.muted}>
						Tick tables in the list to set their label, description, or requirement level together.
					</Text>
				</div>
			</section>
		);
	}

	return (
		<section aria-label="Change the selected tables" className={mergeClasses(styles.panel, className)}>
			<div className={styles.header}>
				<Text as="h2" size={400} weight="semibold" className={styles.heading}>
					{selected.length === 1 ? "Change 1 table" : `Change ${selected.length} tables`}
				</Text>
				<Text size={200} className={styles.muted}>
					Leave a field empty to keep each table's current value.
				</Text>
			</div>
			<div className={styles.fields}>
				<ChangeField {...field("label")}>
					{({ control, hint }) => (
						<Input
							id={control}
							aria-describedby={hint}
							placeholder="Keep current labels"
							value={values.label}
							onChange={(_, data) => onChange("label", data.value)}
						/>
					)}
				</ChangeField>
				<ChangeField {...field("requiredLevel")}>
					{({ control, hint }) => (
						<Dropdown
							id={control}
							aria-describedby={hint}
							selectedOptions={[values.requiredLevel]}
							value={values.requiredLevel || "Keep as is"}
							onOptionSelect={(_, data) => onChange("requiredLevel", data.optionValue ?? "")}>
							<Option value="">Keep as is</Option>
							{REQUIRED_LEVELS.map((level) => (
								<Option key={level} value={level}>
									{level}
								</Option>
							))}
						</Dropdown>
					)}
				</ChangeField>
				<ChangeField {...field("description")} className={styles.wide}>
					{({ control, hint }) => (
						<Textarea
							id={control}
							aria-describedby={hint}
							resize="vertical"
							placeholder="Keep current descriptions"
							value={values.description}
							onChange={(_, data) => onChange("description", data.value)}
						/>
					)}
				</ChangeField>
				{mixed ? (
					<MessageBar intent="warning" layout="multiline" className={styles.wide}>
						<MessageBarBody>{mixed}</MessageBarBody>
					</MessageBar>
				) : null}
				{typeProperties.length > 0 ? (
					<>
						<div className={mergeClasses(styles.section, styles.wide)}>
							<Text size={200} weight="semibold">
								{distinctTypes.length === 1 ? `${distinctTypes[0]} settings` : "Shared settings"}
							</Text>
							<div className={styles.rule} />
						</div>
						{typeProperties.map((property) => (
							<ChangeField key={property} {...field(property)}>
								{({ control, hint }) => (
									<Input
										id={control}
										aria-describedby={hint}
										className={styles.number}
										type="number"
										placeholder="Keep current"
										value={values[property]}
										onChange={(_, data) => onChange(property, data.value)}
									/>
								)}
							</ChangeField>
						))}
					</>
				) : null}
			</div>
		</section>
	);
};

interface ColumnChangeFooterProps {
	className?: string;
	selectedCount: number;
	changeCount: number;
	hasEdit: boolean;
	solutionName: string;
	onReview: () => void;
}

const footerTitle = ({ selectedCount, changeCount, hasEdit }: Pick<ColumnChangeFooterProps, "selectedCount" | "changeCount" | "hasEdit">): string => {
	if (selectedCount === 0) {
		return "No tables selected";
	}
	if (!hasEdit) {
		return "Nothing to change yet";
	}
	if (changeCount === 0) {
		return "The selected tables already match";
	}
	return changeCount === 1 ? "1 table will change" : `${changeCount} tables will change`;
};

export const ColumnChangeFooter = ({ className, selectedCount, changeCount, hasEdit, solutionName, onReview }: ColumnChangeFooterProps) => {
	const styles = useStyles();
	return (
		<div className={mergeClasses(styles.footer, className)}>
			<div className={styles.footerText}>
				<Text weight="semibold">{footerTitle({ selectedCount, changeCount, hasEdit })}</Text>
				<Text size={200} className={styles.muted}>
					Saved in {solutionName}, then published. You'll see each change before anything is written.
				</Text>
			</div>
			<Button appearance="primary" className={styles.review} disabled={changeCount === 0} onClick={onReview}>
				Review changes
			</Button>
		</div>
	);
};
