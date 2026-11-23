import { Badge, makeStyles, tokens } from "@fluentui/react-components";

import { nodeAtPath } from "@/shared/lib/fetchxml";

import { PENDING_SCOPE, ROW_EDITORS, useQueryEditing, Word } from "./editors";
import { isAggregateQuery, rowBadges, tableScope, type TreeRow } from "./lib";
import { RowSummaryText } from "./RowSummaryText";
import { useQueryBuilder } from "./store";

const LEAD_INS: Partial<Record<string, string>> = {
	fetch: "fetch",
	entity: "entity",
	order: "order",
	filter: "filter",
	"link-entity": "link-entity",
	"all-attributes": "all-attributes",
};

const useStyles = makeStyles({
	badge: {
		flexShrink: 0,
		fontFamily: tokens.fontFamilyMonospace,
	},
});

interface RowContentProps {
	row: TreeRow;
}

export const RowContent = ({ row }: RowContentProps) => {
	const styles = useStyles();
	const query = useQueryBuilder((state) => state.query);
	const edit = useQueryBuilder((state) => state.edit);
	const { metadata, tables } = useQueryEditing();
	const node = query ? nodeAtPath(query, row.path) : undefined;
	const summary = <RowSummaryText summary={row.summary} comment={row.kind === "comment"} />;
	if (!query || node?.kind !== "element" || row.kind === "comment" || row.kind === "unknown") {
		return summary;
	}
	const leadIn = LEAD_INS[node.name];
	const Editor = ROW_EDITORS[node.name];
	const scopeAttribute = PENDING_SCOPE[node.name];
	const pending =
		(scopeAttribute !== undefined && tableScope(query, row.path, scopeAttribute, metadata).state === "pending") ||
		(node.name === "entity" && tables === undefined);
	const badges = rowBadges(node, isAggregateQuery(query));
	return (
		<>
			{leadIn ? <Word>{leadIn}</Word> : null}
			{!Editor || pending ? node.name === "all-attributes" ? null : summary : <Editor document={query} path={row.path} element={node} edit={edit} />}
			{badges.map((badge) => (
				<Badge key={badge.name} size="small" appearance={badge.known ? "tint" : "outline"} color="informative" className={styles.badge}>
					{badge.text}
				</Badge>
			))}
		</>
	);
};
