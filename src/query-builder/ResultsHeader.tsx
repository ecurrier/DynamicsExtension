import { makeStyles, Spinner, Text, tokens } from "@fluentui/react-components";
import { ArrowMaximize20Regular, ArrowMinimize20Regular, PanelBottomContract20Regular, PanelBottomExpand20Regular } from "@fluentui/react-icons";

import { PaneButton, PaneHeader } from "./PaneChrome";

const useStyles = makeStyles({
	status: {
		minWidth: 0,
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
		color: tokens.colorNeutralForeground3,
	},
});

export interface ResultsFrameProps {
	collapsed: boolean;
	maximised: boolean;
	onToggle: () => void;
	onMaximisedChange: (maximised: boolean) => void;
}

interface ResultsHeaderProps extends ResultsFrameProps {
	status: string;
	busy: boolean;
}

export const ResultsHeader = ({ status, busy, collapsed, maximised, onToggle, onMaximisedChange }: ResultsHeaderProps) => {
	const styles = useStyles();
	return (
		<PaneHeader
			title="Results"
			toggleIcon={collapsed ? PanelBottomExpand20Regular : PanelBottomContract20Regular}
			toggleLabel={collapsed ? "Restore the results" : "Collapse the results"}
			onToggle={maximised ? undefined : onToggle}
			actions={
				<PaneButton
					icon={maximised ? ArrowMinimize20Regular : ArrowMaximize20Regular}
					label={maximised ? "Restore the tree and the Fetch XML (Escape)" : "Maximise the results"}
					onClick={() => onMaximisedChange(!maximised)}
				/>
			}>
			{busy ? <Spinner size="extra-tiny" /> : null}
			<Text size={200} className={styles.status} title={status}>
				{status}
			</Text>
		</PaneHeader>
	);
};
