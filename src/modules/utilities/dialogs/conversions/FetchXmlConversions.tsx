import { makeStyles, MessageBar, MessageBarBody, MessageBarTitle, Spinner, tokens } from "@fluentui/react-components";
import { useMemo } from "react";

import { useQueryGateway, useQueryTables } from "@/query-builder/hooks";
import { CodeBlock, CopyButton, WebApiResult } from "@/shared/components";
import { PAGE_CONNECTION } from "@/shared/connections";
import { webApiBaseUrl } from "@/shared/lib";
import { parseFetchXml, tablesNamedIn, toWebApi } from "@/shared/lib/fetchxml";
import { useSessionStore } from "@/shared/stores";

import { xrmFetchXmlSnippet } from "./javaScriptSnippet";

const useStyles = makeStyles({
	result: {
		maxHeight: "320px",
		overflowY: "auto",
		paddingRight: tokens.spacingHorizontalXS,
	},
	stack: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalS,
	},
	actions: {
		display: "flex",
		justifyContent: "flex-end",
	},
});

const Problem = ({ title, children }: { title: string; children: string }) => (
	<MessageBar intent="warning" layout="multiline">
		<MessageBarBody>
			<MessageBarTitle>{title}</MessageBarTitle>
			{children}
		</MessageBarBody>
	</MessageBar>
);

interface ConversionTabProps {
	fetchXml: string;
}

export const WebApiQueryTab = ({ fetchXml }: ConversionTabProps) => {
	const styles = useStyles();
	const parsed = useMemo(() => parseFetchXml(fetchXml), [fetchXml]);
	const document = parsed.ok ? parsed.document : null;
	const gateway = useQueryGateway(PAGE_CONNECTION);
	const tabUrl = useSessionStore((state) => state.tabUrl);
	const tableNames = useMemo(() => (document ? tablesNamedIn(document) : []), [document]);
	const { metadata, loading, failures } = useQueryTables(gateway, tableNames);
	const ready = document !== null && !loading && failures.length === 0;
	const conversion = useMemo(() => (ready && document ? toWebApi(document, metadata) : null), [ready, document, metadata]);

	if (document === null) {
		return <Problem title="No Web API URL">The Fetch XML does not parse.</Problem>;
	}
	const failure = failures[0];
	if (failure) {
		return <Problem title="No Web API URL">{`The metadata for Table ${failure.logicalName} could not be loaded. ${failure.message}`}</Problem>;
	}
	if (conversion === null) {
		return <Spinner size="tiny" label="Loading the Table metadata" labelPosition="after" />;
	}
	return (
		<div className={styles.result}>
			<WebApiResult conversion={conversion} baseUrl={webApiBaseUrl(tabUrl)} />
		</div>
	);
};

export const JavaScriptTab = ({ fetchXml }: ConversionTabProps) => {
	const styles = useStyles();
	const snippet = useMemo(() => {
		const parsed = parseFetchXml(fetchXml);
		return parsed.ok ? xrmFetchXmlSnippet(parsed.document) : undefined;
	}, [fetchXml]);

	if (snippet === undefined) {
		return <Problem title="No JavaScript">The Fetch XML does not parse.</Problem>;
	}
	if (snippet === null) {
		return <Problem title="No JavaScript">The entity element has no name.</Problem>;
	}
	return (
		<div className={styles.stack}>
			<CodeBlock value={snippet} language="javascript" height="280px" />
			<div className={styles.actions}>
				<CopyButton text={snippet} label="Copy the JavaScript" successMessage="Copied the JavaScript." size="small" />
			</div>
		</div>
	);
};
