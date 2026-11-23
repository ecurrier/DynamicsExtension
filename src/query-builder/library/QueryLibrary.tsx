import { makeStyles, mergeClasses, Tab, TabList, tokens } from "@fluentui/react-components";
import { useState } from "react";

import { HistoryList } from "./HistoryList";
import { StoredQueryList } from "./StoredQueryList";

export type LibraryTab = "history" | "stored";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalS,
		minHeight: 0,
	},
	tabs: {
		marginLeft: `calc(-1 * ${tokens.spacingHorizontalS})`,
	},
});

interface QueryLibraryProps {
	initialTab?: LibraryTab;
	className?: string;
	onOpened?: () => void;
}

export const QueryLibrary = ({ initialTab = "history", className, onOpened }: QueryLibraryProps) => {
	const styles = useStyles();
	const [tab, setTab] = useState<LibraryTab>(initialTab);
	return (
		<div className={mergeClasses(styles.root, className)}>
			<TabList className={styles.tabs} selectedValue={tab} onTabSelect={(_, data) => setTab(data.value as LibraryTab)}>
				<Tab value="history">History</Tab>
				<Tab value="stored">My queries</Tab>
			</TabList>
			{tab === "history" ? <HistoryList onOpened={onOpened} /> : <StoredQueryList onOpened={onOpened} />}
		</div>
	);
};
