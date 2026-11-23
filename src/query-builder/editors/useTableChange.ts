import { useConfirm } from "@/shared/components";
import { attributeValue, type NodePath, nodeAtPath } from "@/shared/lib/fetchxml";

import { changeRootTable, setAttributes } from "../lib";
import { useQueryBuilder, useQueryBuilderStoreApi } from "../store";
import { useQueryEditing } from "./EditingContext";

export const useTableChange = (path: NodePath): ((logicalName: string | null) => Promise<void>) => {
	const store = useQueryBuilderStoreApi();
	const edit = useQueryBuilder((state) => state.edit);
	const confirm = useConfirm();
	const { loadTable } = useQueryEditing();

	return async (logicalName) => {
		const query = store.getState().query;
		const node = query ? nodeAtPath(query, path) : undefined;
		if (!query || node?.kind !== "element") {
			return;
		}
		const isRoot = path.length === 1 && node.name === "entity" && query.root.name === "fetch";
		if (!isRoot || logicalName === null) {
			edit((current) => setAttributes(current, path, { name: logicalName }));
			return;
		}
		const current = (attributeValue(node, "name") ?? "").trim();
		if (current !== "") {
			const agreed = await confirm({
				title: "Change the root Table?",
				content: `The Query will read ${logicalName} instead of ${current}. Columns, conditions, orders and link-entities that do not exist on ${logicalName} are removed; everything else is kept.`,
				confirmLabel: "Change Table",
			});
			if (!agreed) {
				return;
			}
		}
		const table = await loadTable(logicalName);
		edit((latest) => changeRootTable(latest, logicalName, table));
	};
};
