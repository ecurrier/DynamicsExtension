import { makeStyles, tokens } from "@fluentui/react-components";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
	type AttributeProperty,
	attributeEditFrom,
	type ColumnEditArgs,
	columnEditPlan,
	EMPTY_EDIT_VALUES,
	type EditValues,
	tablesToPublish,
} from "@/modules/schema/lib";
import { BulkRunDialog } from "@/shared/components";
import { type AttributeMatch, type BulkRunPlan } from "@/shared/types";

import { ColumnChangeFooter, ColumnChangePanel } from "./ColumnChangePanel";
import { ColumnMatchesCard } from "./ColumnMatchesCard";
import { ColumnSearchBar, type ColumnSearchProps, ColumnSearchStart } from "./ColumnSearch";
import { useAttributeDetails } from "./useAttributeDetails";
import { type SchemaSolution } from "./useSchemaSolution";
import { type SchemaGateway } from "./useSchemaToolsBootstrap";

const useStyles = makeStyles({
	container: {
		containerType: "inline-size",
		height: "100%",
	},
	layout: {
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr) 384px",
		gridTemplateRows: "minmax(0, 1fr) auto",
		gridTemplateAreas: '"main panel" "main footer"',
		columnGap: tokens.spacingHorizontalL,
		boxSizing: "border-box",
		height: "100%",
		padding: tokens.spacingHorizontalL,
		"@container (max-width: 880px)": {
			gridTemplateColumns: "minmax(0, 1fr)",
			gridTemplateRows: "auto",
			gridTemplateAreas: '"main" "panel" "footer"',
			rowGap: tokens.spacingVerticalL,
			height: "auto",
		},
	},
	main: {
		gridArea: "main",
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalM,
		minWidth: 0,
		minHeight: 0,
	},
	panel: {
		gridArea: "panel",
	},
	footer: {
		gridArea: "footer",
	},
});

interface ColumnSearchResult {
	logicalName: string;
	matches: AttributeMatch[];
}

interface CrossTableColumnsProps {
	gateway: SchemaGateway;
	solution: SchemaSolution;
}

export const CrossTableColumns = ({ gateway, solution }: CrossTableColumnsProps) => {
	const styles = useStyles();
	const [query, setQuery] = useState("");
	const [customOnly, setCustomOnly] = useState(false);
	const [result, setResult] = useState<ColumnSearchResult | null>(null);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [values, setValues] = useState<EditValues>(EMPTY_EDIT_VALUES);
	const [plan, setPlan] = useState<BulkRunPlan<ColumnEditArgs> | null>(null);

	const search = useMutation({
		mutationFn: (logicalName: string) => gateway.ops.findAttributeAcrossTables({ logicalName, customOnly }),
		onSuccess: (matches: AttributeMatch[], logicalName) => {
			setResult({ logicalName, matches });
			setSelectedIds([]);
		},
	});

	const matches = useMemo(() => result?.matches ?? [], [result]);
	const chosen = useMemo(() => matches.filter((match) => selectedIds.includes(match.tableLogicalName)), [matches, selectedIds]);
	const details = useAttributeDetails(gateway, chosen);
	const selected = details.selected;
	const edit = useMemo(() => attributeEditFrom(values), [values]);
	const planned = columnEditPlan(selected, edit);

	const find = () => {
		const logicalName = query.trim().toLowerCase();
		if (logicalName !== "" && gateway.ready && !search.isPending) {
			search.mutate(logicalName);
		}
	};

	const refresh = (logicalName: string) => {
		void gateway.ops
			.findAttributeAcrossTables({ logicalName, customOnly })
			.then((next) => setResult({ logicalName, matches: next }))
			.catch(() => undefined);
	};

	const searchProps: ColumnSearchProps = {
		query,
		onQueryChange: setQuery,
		customOnly,
		onCustomOnlyChange: setCustomOnly,
		onFind: find,
		finding: search.isPending,
		disabled: !gateway.ready,
		error: search.error,
	};

	if (!result) {
		return <ColumnSearchStart {...searchProps} />;
	}

	return (
		<div className={styles.container}>
			<div className={styles.layout}>
				<div className={styles.main}>
					<ColumnSearchBar {...searchProps} />
					<ColumnMatchesCard
						logicalName={result.logicalName}
						matches={matches}
						customOnly={customOnly}
						selectedIds={selectedIds}
						onSelectionChange={setSelectedIds}
					/>
				</div>
				<ColumnChangePanel
					className={styles.panel}
					selected={selected}
					values={values}
					edit={edit}
					detailsStatus={details.status}
					onChange={(property: AttributeProperty, value: string) => setValues((current) => ({ ...current, [property]: value }))}
				/>
				<ColumnChangeFooter
					className={styles.footer}
					selectedCount={selected.length}
					changeCount={planned.items.length}
					hasEdit={Object.keys(edit).length > 0}
					solutionName={solution.name}
					onReview={() => setPlan(planned)}
				/>
			</div>
			<BulkRunDialog
				plan={plan}
				execute={async (item: { args: ColumnEditArgs }) => {
					await gateway.ops.updateAttribute({ ...item.args, solutionUniqueName: solution.uniqueName });
				}}
				warning="Metadata changes are published after the run, for the tables that succeeded."
				onClose={() => setPlan(null)}
				onFinished={async (run) => {
					const succeeded = run.outcomes.filter((outcome) => outcome.kind === "succeeded").map((outcome) => outcome.id);
					const tables = tablesToPublish(succeeded);
					if (tables.length > 0) {
						await gateway.ops.publishTables({ logicalNames: tables }).catch(() => undefined);
						refresh(result.logicalName);
						details.refresh();
					}
				}}
			/>
		</div>
	);
};
