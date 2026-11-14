import { Divider, Field, makeStyles, Text, tokens } from "@fluentui/react-components";

import { ExternalLinkButton, FormRow } from "@/shared/components";
import { FEEDBACK_PRIVACY_URL, FEEDBACK_REPO_URL } from "@/shared/lib";

import { CopyableLink } from "./CopyableLink";

const useStyles = makeStyles({
	heading: {
		fontWeight: tokens.fontWeightSemibold,
	},
	version: {
		color: tokens.colorNeutralForeground3,
		fontSize: tokens.fontSizeBase200,
	},
});

/**
 * The version has always been built into the bundle and never shown, so until now a user could not
 * tell you which build they were running. It belongs here, next to the thing that asks them.
 */
export const AboutBlock = () => {
	const styles = useStyles();
	return (
		<>
			<Divider />
			<Text className={styles.heading}>About</Text>
			<Text className={styles.version}>Power Tools {__APP_VERSION__}</Text>
			<Field label="Share Power Tools" hint="Copy this and send it to anyone who might want the extension.">
				<CopyableLink url={FEEDBACK_REPO_URL} label="Copy the Power Tools link" />
			</Field>
			<FormRow>
				<ExternalLinkButton url={FEEDBACK_REPO_URL}>Source code</ExternalLinkButton>
				<ExternalLinkButton url={FEEDBACK_PRIVACY_URL}>Privacy policy</ExternalLinkButton>
			</FormRow>
		</>
	);
};
