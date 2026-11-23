import { makeStyles, Text, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
	root: {
		padding: tokens.spacingHorizontalM,
		color: tokens.colorNeutralForeground3,
	},
});

export const BlankStart = () => (
	<div className={useStyles().root}>
		<Text size={200}>The tree shows the Query when the Fetch XML is correct.</Text>
	</div>
);
