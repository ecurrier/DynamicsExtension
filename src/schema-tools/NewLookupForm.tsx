import { Button, Divider, Field, Input, makeStyles, Text, Textarea, tokens } from "@fluentui/react-components";
import { Add20Regular } from "@fluentui/react-icons";
import { useMemo, useState } from "react";

import { lookupCreatePreview, schemaNameFromLabel, schemaNameProblem } from "@/modules/schema/lib";
import { MultiSelectPicker, type PickerOption } from "@/shared/components";
import { type EntitySummary } from "@/shared/types";

import { usePanelStyles } from "./panelStyles";

const useStyles = makeStyles({
	container: {
		containerType: "inline-size",
		flexGrow: 1,
		minHeight: 0,
		overflowY: "auto",
	},
	layout: {
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr) 300px",
		alignItems: "start",
		columnGap: tokens.spacingHorizontalXXXL,
		rowGap: tokens.spacingVerticalXL,
		padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalXXL}`,
		"@container (max-width: 720px)": {
			gridTemplateColumns: "minmax(0, 1fr)",
		},
	},
	form: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalL,
		maxWidth: "520px",
	},
	prefix: {
		marginRight: `calc(${tokens.spacingHorizontalXS} * -1)`,
		fontFamily: tokens.fontFamilyMonospace,
		color: tokens.colorNeutralForeground3,
	},
	schemaInput: {
		paddingLeft: 0,
		fontFamily: tokens.fontFamilyMonospace,
	},
	actions: {
		display: "flex",
		columnGap: tokens.spacingHorizontalS,
		marginTop: tokens.spacingVerticalXS,
	},
	preview: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalL,
		padding: tokens.spacingHorizontalL,
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusXLarge,
		backgroundColor: tokens.colorNeutralBackground2,
	},
	previewGroup: {
		display: "flex",
		flexDirection: "column",
		rowGap: "2px",
		minWidth: 0,
	},
	previewName: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		overflowWrap: "anywhere",
	},
});

export interface NewLookupDraft {
	schemaName: string;
	label: string;
	description: string;
	targets: string[];
}

interface NewLookupFormProps {
	tableLogicalName: string;
	tableLabel: string;
	tables: EntitySummary[];
	prefix: string | null;
	solutionName: string;
	creating: boolean;
	onCreate: (draft: NewLookupDraft) => void;
	onCancel: () => void;
}

export const NewLookupForm = ({ tableLogicalName, tableLabel, tables, prefix, solutionName, creating, onCreate, onCancel }: NewLookupFormProps) => {
	const styles = useStyles();
	const panel = usePanelStyles();
	const [displayName, setDisplayName] = useState("");
	const [schemaName, setSchemaName] = useState<string | null>(null);
	const [targets, setTargets] = useState<string[]>([]);
	const [description, setDescription] = useState("");
	const schema = schemaName ?? schemaNameFromLabel(displayName);
	const problem = schemaNameProblem(schema);
	const preview = prefix && schema && !problem ? lookupCreatePreview(tableLogicalName, prefix, schema, targets) : null;
	const ready = preview !== null && displayName.trim() !== "" && targets.length > 0 && !creating;
	const options = useMemo<PickerOption[]>(
		() => tables.map((table) => ({ value: table.logicalName, label: table.displayName || table.logicalName, description: table.logicalName })),
		[tables]
	);

	return (
		<section aria-label="New polymorphic lookup" className={panel.panel}>
			<div className={panel.header}>
				<Text as="h2" size={500} weight="semibold" className={panel.heading}>
					New polymorphic lookup
				</Text>
				<Text size={200} className={panel.muted}>
					On {tableLabel}, created in {solutionName}
				</Text>
			</div>
			<div className={styles.container}>
				<div className={styles.layout}>
					<div className={styles.form}>
						<Field label="Display name" required>
							<Input value={displayName} placeholder="Related to" autoFocus onChange={(_, data) => setDisplayName(data.value)} />
						</Field>
						<Field
							label="Schema name"
							required
							validationState={problem ? "error" : "none"}
							validationMessage={problem ?? undefined}
							hint={
								problem
									? undefined
									: prefix
										? "Filled in from the display name. The prefix comes from the solution's publisher."
										: "Choose a solution in the header to set the publisher prefix."
							}>
							<Input
								input={{ className: styles.schemaInput }}
								contentBefore={<span className={styles.prefix}>{prefix ? `${prefix}_` : "prefix_"}</span>}
								value={schema}
								onChange={(_, data) => setSchemaName(data.value)}
							/>
						</Field>
						<MultiSelectPicker
							label="Target tables"
							options={options}
							selected={targets}
							onChange={setTargets}
							placeholder="Search tables..."
							hint="A value in this column can point at a row in any of these tables. You can change targets later, but one must always remain."
						/>
						<Field label="Description" hint="Optional. Shown to makers in the column's properties.">
							<Textarea value={description} resize="vertical" onChange={(_, data) => setDescription(data.value)} />
						</Field>
						<div className={styles.actions}>
							<Button
								appearance="primary"
								icon={<Add20Regular />}
								disabled={!ready}
								onClick={() => onCreate({ schemaName: schema, label: displayName.trim(), description: description.trim(), targets })}>
								{creating ? "Creating..." : "Create lookup"}
							</Button>
							<Button disabled={creating} onClick={onCancel}>
								Cancel
							</Button>
						</div>
					</div>
					<aside aria-label="What gets created" className={styles.preview}>
						<Text size={200} weight="semibold">
							What gets created
						</Text>
						{preview ? (
							<>
								<div className={styles.previewGroup}>
									<Text size={200} className={panel.muted}>
										Lookup column on {tableLabel}
									</Text>
									<span className={styles.previewName}>{preview.columnLogicalName}</span>
								</div>
								<div className={styles.previewGroup}>
									<Text size={200} className={panel.muted}>
										{preview.relationshipSchemaNames.length < 2
											? "Relationships"
											: `${preview.relationshipSchemaNames.length} relationships, one per target`}
									</Text>
									{preview.relationshipSchemaNames.length === 0 ? (
										<Text size={200}>Pick at least one target table.</Text>
									) : (
										preview.relationshipSchemaNames.map((name) => (
											<span key={name} className={styles.previewName}>
												{name}
											</span>
										))
									)}
								</div>
								<div className={styles.previewGroup}>
									<Text size={200} className={panel.muted}>
										Solution
									</Text>
									<Text size={200}>{solutionName}</Text>
								</div>
							</>
						) : (
							<Text size={200} className={panel.muted}>
								Name the lookup to see the column and relationships it creates.
							</Text>
						)}
						<Divider />
						<Text size={200} className={panel.muted}>
							The maker portal can't create or edit polymorphic lookups, so changes to them happen here.
						</Text>
					</aside>
				</div>
			</div>
		</section>
	);
};
