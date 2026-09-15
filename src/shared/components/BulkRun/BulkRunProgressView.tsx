import { Field, makeStyles, ProgressBar, Text, tokens } from "@fluentui/react-components";

import { type BulkRunProgress } from "@/shared/types";

import { FormStack } from "../Layout";

const useStyles = makeStyles({
	caption: {
		color: tokens.colorNeutralForeground3,
	},
});

interface BulkRunProgressViewProps {
	progress: BulkRunProgress;
	action: string;
}

export const BulkRunProgressView = ({ progress, action }: BulkRunProgressViewProps) => {
	const styles = useStyles();
	return (
		<FormStack>
			<Field validationMessage={progress.caption} validationState="none">
				<ProgressBar value={progress.percent} max={1} thickness="large" />
			</Field>
			<Text size={200} className={styles.caption}>
				{action} in progress. Closing this window stops the run; whatever has not been applied can be retried.
			</Text>
		</FormStack>
	);
};
