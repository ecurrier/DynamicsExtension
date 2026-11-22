import { makeStyles, MessageBar, MessageBarBody, MessageBarTitle, tokens } from "@fluentui/react-components";
import { PanelRightContract20Regular } from "@fluentui/react-icons";

import { CodeEditor } from "@/shared/components";

import { describeParseError } from "./lib";
import { PaneHeader } from "./PaneChrome";
import { useQueryBuilder } from "./store";

const useStyles = makeStyles({
	banner: {
		flexShrink: 0,
		margin: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS} 0`,
	},
	editor: {
		flexGrow: 1,
		minHeight: 0,
		padding: tokens.spacingHorizontalS,
	},
});

interface XmlPaneProps {
	onCollapse: () => void;
}

export const XmlPane = ({ onCollapse }: XmlPaneProps) => {
	const styles = useStyles();
	const text = useQueryBuilder((state) => state.text);
	const parsedText = useQueryBuilder((state) => state.parsedText);
	const errors = useQueryBuilder((state) => state.errors);
	const setText = useQueryBuilder((state) => state.setText);
	const firstError = errors[0];

	return (
		<>
			<PaneHeader title="Fetch XML" toggleIcon={PanelRightContract20Regular} toggleLabel="Collapse the Fetch XML" onToggle={onCollapse} />
			{firstError ? (
				<MessageBar intent="error" layout="multiline" className={styles.banner}>
					<MessageBarBody>
						<MessageBarTitle>The Fetch XML does not parse</MessageBarTitle>
						{describeParseError(parsedText, firstError)}
					</MessageBarBody>
				</MessageBar>
			) : null}
			<div className={styles.editor}>
				<CodeEditor value={text} language="xml" fill onChange={setText} placeholder="Paste a Fetch XML query here, then press Ctrl+Enter to run it" />
			</div>
		</>
	);
};
