import { makeStyles, MessageBar, MessageBarBody, MessageBarTitle, tokens } from "@fluentui/react-components";

import { describeParseError } from "./lib";
import { useQueryBuilder } from "./store";

const useStyles = makeStyles({
	banner: {
		flexShrink: 0,
		margin: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS} 0`,
	},
});

export const ParseErrorBanner = () => {
	const styles = useStyles();
	const parsedText = useQueryBuilder((state) => state.parsedText);
	const firstError = useQueryBuilder((state) => state.errors[0]);
	if (!firstError) {
		return null;
	}
	return (
		<MessageBar intent="error" layout="multiline" className={styles.banner}>
			<MessageBarBody>
				<MessageBarTitle>The Fetch XML does not parse</MessageBarTitle>
				{describeParseError(parsedText, firstError)}
			</MessageBarBody>
		</MessageBar>
	);
};
