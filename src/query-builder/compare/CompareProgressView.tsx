import { Button, makeStyles, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle, Spinner, Text, tokens } from "@fluentui/react-components";
import { Stop20Regular } from "@fluentui/react-icons";

import { type CompareProgress, type ConnectionRunEntry, LOAD_ALL_CONFIRM_AT } from "../lib";

const useStyles = makeStyles({
	progress: {
		display: "flex",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalS,
	},
	counts: {
		color: tokens.colorNeutralForeground2,
		fontVariantNumeric: "tabular-nums",
	},
	banner: {
		flexShrink: 0,
	},
	message: {
		whiteSpace: "pre-wrap",
		wordBreak: "break-word",
	},
});

interface CompareProgressViewProps {
	progress: CompareProgress;
	sides: readonly [ConnectionRunEntry, ConnectionRunEntry];
	stopping: boolean;
	onStop: () => void;
	onKeepLoading: () => void;
	onCompareLoaded: () => void;
}

const loadedText = (sides: readonly ConnectionRunEntry[]): string => sides.map((side) => `${side.name}: ${side.run.rows.length.toLocaleString()}`).join(" · ");

export const CompareProgressView = ({ progress, sides, stopping, onStop, onKeepLoading, onCompareLoaded }: CompareProgressViewProps) => {
	const styles = useStyles();
	switch (progress.kind) {
		case "idle":
			return null;
		case "running":
			return (
				<div className={styles.progress}>
					<Spinner size="extra-tiny" />
					<Text size={200}>The Query is running on each Connection.</Text>
				</div>
			);
		case "loading":
			return (
				<div className={styles.progress}>
					<Spinner size="extra-tiny" />
					<Text size={200}>Loading all Records.</Text>
					<Text size={200} className={styles.counts}>
						{loadedText(sides)}
					</Text>
					<Button size="small" icon={<Stop20Regular />} disabled={stopping} onClick={onStop}>
						{stopping ? "Stopping" : "Stop"}
					</Button>
				</div>
			);
		case "confirm":
			return (
				<MessageBar intent="warning" layout="multiline" className={styles.banner}>
					<MessageBarBody>
						<MessageBarTitle>{`${loadedText(sides.filter((side) => progress.keys.includes(side.key)))}. More Records exist.`}</MessageBarTitle>
						{`If you load more than ${LOAD_ALL_CONFIRM_AT.toLocaleString()} Records, this tab can become slow.`}
					</MessageBarBody>
					<MessageBarActions>
						<Button size="small" onClick={onKeepLoading}>
							Keep loading
						</Button>
						<Button size="small" onClick={onCompareLoaded}>
							Compare the loaded Records
						</Button>
					</MessageBarActions>
				</MessageBar>
			);
		case "failed":
			return (
				<>
					{progress.failures.map((failure) => (
						<MessageBar key={failure.key} intent="error" layout="multiline" className={styles.banner}>
							<MessageBarBody>
								<MessageBarTitle>
									{failure.name ? `Cannot compare. The Query Run on ${failure.name} failed.` : "Cannot compare."}
								</MessageBarTitle>
								<span className={styles.message}>{failure.message}</span>
							</MessageBarBody>
						</MessageBar>
					))}
				</>
			);
	}
};
