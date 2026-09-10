import {
	Button,
	Combobox,
	Dialog,
	DialogActions,
	DialogBody,
	DialogContent,
	DialogSurface,
	DialogTitle,
	Field,
	makeStyles,
	MessageBar,
	MessageBarBody,
	Option,
	Text,
	tokens,
} from "@fluentui/react-components";
import { Eye20Regular, Search20Regular } from "@fluentui/react-icons";
import { Fragment, useEffect, useMemo, useState } from "react";

import { usePageMutation } from "@/messaging/client";
import { ControlStateBadges, FormRow, FormStack, Grow } from "@/shared/components";
import { controlStateTags } from "@/shared/lib";
import { type FormAttributeInfo, type FormColumnDetails } from "@/shared/types";

const MAX_OPTIONS = 40;

const useStyles = makeStyles({
	surface: {
		maxWidth: "640px",
	},
	grid: {
		display: "grid",
		gridTemplateColumns: "max-content minmax(0, 1fr)",
		columnGap: "16px",
		rowGap: "6px",
		alignItems: "baseline",
	},
	label: {
		color: tokens.colorNeutralForeground3,
		whiteSpace: "nowrap",
	},
	value: {
		minWidth: 0,
		overflowWrap: "anywhere",
	},
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
	},
});

interface FindColumnPanelProps {
	attributes: FormAttributeInfo[];
	initialLogicalName: string | null;
}

const attributeMatches = (attribute: FormAttributeInfo, term: string): boolean =>
	attribute.logicalName.includes(term) || attribute.displayName.toLowerCase().includes(term);

const FindColumnPanel = ({ attributes, initialLogicalName }: FindColumnPanelProps) => {
	const styles = useStyles();
	const [query, setQuery] = useState(initialLogicalName ?? "");
	const [details, setDetails] = useState<FormColumnDetails | null>(null);
	const reveal = usePageMutation("utilities.revealFormColumn", { onSuccess: setDetails });
	const { mutate } = reveal;

	useEffect(() => {
		if (initialLogicalName) {
			mutate({ logicalName: initialLogicalName, show: false });
		}
	}, [initialLogicalName, mutate]);

	const options = useMemo(() => {
		const term = query.trim().toLowerCase();
		const matches = term ? attributes.filter((attribute) => attributeMatches(attribute, term)) : attributes;
		return matches.slice(0, MAX_OPTIONS);
	}, [attributes, query]);

	const find = (logicalName: string, show: boolean) => {
		const trimmed = logicalName.trim().toLowerCase();
		if (trimmed) {
			setQuery(trimmed);
			mutate({ logicalName: trimmed, show });
		}
	};

	const hidden = details?.controls.some((control) => !control.visible) ?? false;

	return (
		<FormStack>
			<FormRow>
				<Grow>
					<Field label="Column">
						<Combobox
							freeform
							value={query}
							selectedOptions={details ? [details.logicalName] : []}
							placeholder="Type a logical or display name..."
							onChange={(event) => setQuery(event.target.value)}
							onOptionSelect={(_, data) => data.optionValue && find(data.optionValue, false)}>
							{options.map((attribute) => (
								<Option key={attribute.logicalName} value={attribute.logicalName} text={attribute.logicalName}>
									{`${attribute.displayName} (${attribute.logicalName})`}
								</Option>
							))}
						</Combobox>
					</Field>
				</Grow>
				<Button appearance="primary" icon={<Search20Regular />} disabled={!query.trim() || reveal.isPending} onClick={() => find(query, false)}>
					Find
				</Button>
			</FormRow>
			{reveal.isError ? (
				<MessageBar intent="error">
					<MessageBarBody>{reveal.error.message}</MessageBarBody>
				</MessageBar>
			) : null}
			{details && !details.onForm ? (
				<MessageBar intent="warning">
					<MessageBarBody>
						{details.attributeType
							? `${details.logicalName} is on the table but has no control on this form.`
							: `${details.logicalName} is not an attribute of this form's table.`}
					</MessageBarBody>
				</MessageBar>
			) : null}
			{details && details.onForm ? (
				<>
					<div className={styles.grid}>
						<Text size={200} className={styles.label}>
							Display name
						</Text>
						<Text size={200} className={styles.value}>
							{details.displayName}
						</Text>
						<Text size={200} className={styles.label}>
							Logical name
						</Text>
						<Text size={200} className={`${styles.value} ${styles.mono}`}>
							{details.logicalName}
						</Text>
						<Text size={200} className={styles.label}>
							Type
						</Text>
						<Text size={200} className={styles.value}>
							{details.attributeType}
						</Text>
						<Text size={200} className={styles.label}>
							Required
						</Text>
						<Text size={200} className={styles.value}>
							{details.requiredLevel}
						</Text>
						<Text size={200} className={styles.label}>
							Value
						</Text>
						<Text size={200} className={styles.value}>
							{details.value ?? "(empty)"}
						</Text>
						{details.controls.map((control) => (
							<Fragment key={control.name}>
								<Text size={200} className={styles.label}>
									Control
								</Text>
								<span className={styles.value}>
									<Text size={200}>
										{[control.tab, control.section].filter((part) => part !== null).join(" › ") || "Header or footer"}
										{" · "}
										{control.controlType}
									</Text>{" "}
									<ControlStateBadges tags={controlStateTags(control)} emptyLabel="Visible" />
								</span>
							</Fragment>
						))}
					</div>
					{hidden ? (
						<FormRow>
							<Grow>
								<Text size={200}>The control is hidden. Show it for this session to inspect it on the form.</Text>
							</Grow>
							<Button icon={<Eye20Regular />} disabled={reveal.isPending} onClick={() => find(details.logicalName, true)}>
								Show
							</Button>
						</FormRow>
					) : null}
				</>
			) : null}
		</FormStack>
	);
};

interface FindColumnDialogProps {
	open: boolean;
	attributes: FormAttributeInfo[];
	initialLogicalName: string | null;
	onClose: () => void;
}

export const FindColumnDialog = ({ open, attributes, initialLogicalName, onClose }: FindColumnDialogProps) => {
	const styles = useStyles();
	return (
		<Dialog open={open} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
			<DialogSurface className={styles.surface}>
				<DialogBody>
					<DialogTitle>Find Column on Form</DialogTitle>
					<DialogContent>
						{open ? <FindColumnPanel key={initialLogicalName ?? ""} attributes={attributes} initialLogicalName={initialLogicalName} /> : null}
					</DialogContent>
					<DialogActions>
						<Button appearance="secondary" onClick={onClose}>
							Close
						</Button>
					</DialogActions>
				</DialogBody>
			</DialogSurface>
		</Dialog>
	);
};
