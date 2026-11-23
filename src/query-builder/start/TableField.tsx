import { Field, Spinner } from "@fluentui/react-components";
import { useMemo } from "react";

import { describeError } from "@/shared/lib";

import { InPane, SearchPicker } from "../editors";
import { type QueryGateway } from "../hooks";
import { tableOptions } from "../lib";
import { useQueryBuilder } from "../store";
import { useTableList } from "./useTableList";

interface TableFieldProps {
	gateway: QueryGateway;
	value: string | null;
	onPick: (logicalName: string) => void;
}

export const TableField = ({ gateway, value, onPick }: TableFieldProps) => {
	const lead = useQueryBuilder((state) => state.namesLead);
	const tables = useTableList(gateway);
	const options = useMemo(() => tableOptions(tables.data ?? [], lead), [tables.data, lead]);
	const failed = tables.isError ? `Cannot read the Tables. ${describeError(tables.error)}` : null;
	const notReady = gateway.ready ? null : "The Connection is not ready.";
	return (
		<Field label="Table" validationMessage={failed ?? notReady ?? undefined} validationState={failed || notReady ? "error" : "none"}>
			{tables.isLoading ? (
				<Spinner size="tiny" label="Loading the Tables" labelPosition="after" />
			) : (
				<InPane>
					<SearchPicker label="Table" kind="table" value={value} options={options} placeholder="Type to find a Table" onPick={onPick} />
				</InPane>
			)}
		</Field>
	);
};
