import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, makeStyles, Text, tokens } from "@fluentui/react-components";
import { Fragment } from "react";

import { CopyButton, EmptyState, FormStack } from "@/shared/components";
import { type EnvironmentDetails, type SessionSnapshot } from "@/shared/types";

import { EMPTY_VALUE, snapshotSections, snapshotToMarkdown } from "../lib";

const useStyles = makeStyles({
	surface: {
		maxWidth: "680px",
	},
	content: {
		maxHeight: "60vh",
		overflowY: "auto",
	},
	grid: {
		display: "grid",
		gridTemplateColumns: "max-content minmax(0, 1fr) auto",
		columnGap: "16px",
		rowGap: "2px",
		alignItems: "center",
	},
	label: {
		color: tokens.colorNeutralForeground3,
		whiteSpace: "nowrap",
	},
	value: {
		minWidth: 0,
		overflowWrap: "anywhere",
		fontFamily: tokens.fontFamilyMonospace,
	},
	heading: {
		marginTop: "4px",
	},
});

interface EnvironmentDetailsDialogProps {
	details: EnvironmentDetails | null;
	snapshot: SessionSnapshot | null;
	loading?: boolean;
	onClose: () => void;
}

export const EnvironmentDetailsDialog = ({ details, snapshot, loading, onClose }: EnvironmentDetailsDialogProps) => {
	const styles = useStyles();
	const sections = snapshotSections(details, snapshot);
	return (
		<Dialog open={!!details} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
			<DialogSurface className={styles.surface}>
				<DialogBody>
					<DialogTitle>Environment &amp; Session</DialogTitle>
					<DialogContent className={styles.content}>
						<FormStack>
							{snapshot?.warnings.map((warning) => (
								<EmptyState key={warning} intent="warning" title={warning} />
							))}
							{sections.map((section) => (
								<Fragment key={section.title}>
									<Text size={300} weight="semibold" className={styles.heading}>
										{section.title}
									</Text>
									<div className={styles.grid}>
										{section.rows.map((row) => (
											<Fragment key={`${section.title}:${row.label}`}>
												<Text size={200} className={styles.label}>
													{row.label}
												</Text>
												<Text size={200} className={styles.value}>
													{row.value}
												</Text>
												<CopyButton
													text={row.value === EMPTY_VALUE ? null : row.value}
													label={`Copy ${row.label}`}
													successMessage={`${row.label} copied`}
													appearance="subtle"
													size="small"
													iconOnly
												/>
											</Fragment>
										))}
									</div>
								</Fragment>
							))}
							{loading && !snapshot ? <Text size={200}>Reading the session...</Text> : null}
						</FormStack>
					</DialogContent>
					<DialogActions>
						<CopyButton text={snapshotToMarkdown(sections)} label="Copy as Markdown" successMessage="Environment and session details copied" />
						<Button appearance="primary" onClick={onClose}>
							Close
						</Button>
					</DialogActions>
				</DialogBody>
			</DialogSurface>
		</Dialog>
	);
};
