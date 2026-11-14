import { Button, Card, makeStyles, Text, tokens } from "@fluentui/react-components";
import { ArrowClockwise20Regular, PersonFeedback20Regular } from "@fluentui/react-icons";

import { FEEDBACK_AREA_ID, FEEDBACK_ISSUES_URL, toCrashNote } from "@/shared/lib";
import { useCrashStore, useNavigationStore } from "@/shared/stores";

import { CopyButton } from "../CopyButton";
import { ExternalLinkButton } from "../ExternalLinkButton";
import { FormRow } from "../Layout";

const useStyles = makeStyles({
	card: {
		margin: "16px",
		padding: "16px",
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		gap: "12px",
	},
	reason: {
		color: tokens.colorNeutralForeground3,
	},
});

interface AreaCrashFallbackProps {
	error: Error;
	areaLabel: string;
	onReset: () => void;
}

/**
 * What an Area shows after it crashes. Before this existed the whole extension went white with
 * nothing captured, which is the one failure a user cannot describe to you.
 */
export const AreaCrashFallback = ({ error, areaLabel, onReset }: AreaCrashFallbackProps) => {
	const styles = useStyles();
	const capture = useCrashStore((state) => state.capture);
	const navigate = useNavigationStore((state) => state.navigate);

	const onReport = () => {
		capture(toCrashNote(error));
		navigate(FEEDBACK_AREA_ID);
	};

	return (
		<Card className={styles.card}>
			<Text weight="semibold">{areaLabel} stopped working</Text>
			<Text size={200} className={styles.reason}>
				Nothing was sent anywhere. Try the screen again, or send a report with the error attached: you will see exactly what it contains before it goes.
			</Text>
			<FormRow>
				<Button appearance="primary" icon={<PersonFeedback20Regular />} onClick={onReport}>
					Report this
				</Button>
				<Button icon={<ArrowClockwise20Regular />} onClick={onReset}>
					Try again
				</Button>
			</FormRow>
		</Card>
	);
};

interface AppCrashFallbackProps {
	error: Error;
}

/**
 * The backstop, for a crash above any single Area. There is no navigating out of this one, so it
 * offers a reload and a way to carry the details to GitHub by hand.
 */
export const AppCrashFallback = ({ error }: AppCrashFallbackProps) => {
	const styles = useStyles();
	const note = toCrashNote(error);
	const details = note.stack === "" ? note.detail : `${note.detail}\n\n${note.stack}`;

	return (
		<Card className={styles.card}>
			<Text weight="semibold">Power Tools stopped working</Text>
			<Text size={200} className={styles.reason}>
				Nothing was sent anywhere. Reload to carry on. If it keeps happening, copy the details and open an issue: they name Power Tools&apos; own code
				and carry nothing from your environment.
			</Text>
			<FormRow>
				<Button appearance="primary" icon={<ArrowClockwise20Regular />} onClick={() => window.location.reload()}>
					Reload
				</Button>
				<CopyButton text={details} label="Copy error details" />
				<ExternalLinkButton url={FEEDBACK_ISSUES_URL}>Open an issue</ExternalLinkButton>
			</FormRow>
		</Card>
	);
};
