import { makeStyles, Spinner, Text, tokens } from "@fluentui/react-components";
import { useMemo } from "react";

import { WebApiResult } from "@/shared/components";
import { tablesNamedIn, toWebApi, type WebApiWarning } from "@/shared/lib/fetchxml";
import { useSessionStore } from "@/shared/stores";

import { useQueryEditing } from "./editors";
import { connectionApiBaseUrl, rowPathOf } from "./lib";
import { useQueryBuilder } from "./store";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		minHeight: 0,
		height: "100%",
		overflowY: "auto",
		boxSizing: "border-box",
		padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
	},
	note: {
		color: tokens.colorNeutralForeground3,
	},
});

export const WebApiPane = () => {
	const styles = useStyles();
	const query = useQueryBuilder((state) => state.query);
	const stale = useQueryBuilder((state) => state.errors.length > 0);
	const connection = useQueryBuilder((state) => state.connection);
	const select = useQueryBuilder((state) => state.select);
	const tabUrl = useSessionStore((state) => state.tabUrl);
	const { gateway, metadata } = useQueryEditing();
	const baseUrl = connectionApiBaseUrl(connection, { environmentUrl: gateway.environment?.modelDrivenAppUrl ?? null, tabUrl });

	const loading = useMemo(() => (query ? tablesNamedIn(query).some((name) => metadata(name).state === "pending") : false), [query, metadata]);
	const conversion = useMemo(() => (query && !loading ? toWebApi(query, metadata) : null), [query, metadata, loading]);

	const selectWarning = (warning: WebApiWarning) => {
		if (query) {
			select(rowPathOf(query, warning.path), "tree");
		}
	};

	return (
		<div className={styles.root}>
			{query === null ? (
				<Text className={styles.note}>There is no Query. Start one in the tree or in the Fetch XML tab.</Text>
			) : loading || conversion === null ? (
				<Spinner size="tiny" label="Loading the Table metadata" labelPosition="after" />
			) : (
				<WebApiResult conversion={conversion} baseUrl={baseUrl} stale={stale} onSelectWarning={selectWarning} />
			)}
		</div>
	);
};
