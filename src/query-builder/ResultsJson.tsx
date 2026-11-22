import { makeStyles } from "@fluentui/react-components";
import { useMemo } from "react";

import { CodeEditor } from "@/shared/components";

import { type QueryRunPage } from "./store";

const useStyles = makeStyles({
	root: {
		flexGrow: 1,
		minHeight: 0,
	},
});

const responseBody = (page: QueryRunPage) => ({ ...page.annotations, value: page.rows });

interface ResultsJsonProps {
	pages: readonly QueryRunPage[];
}

export const ResultsJson = ({ pages }: ResultsJsonProps) => {
	const styles = useStyles();
	const json = useMemo(() => JSON.stringify(pages.length === 1 && pages[0] ? responseBody(pages[0]) : pages.map(responseBody), null, 2), [pages]);
	return (
		<div className={styles.root}>
			<CodeEditor value={json} language="json" readOnly fill lineWrapping={false} />
		</div>
	);
};
