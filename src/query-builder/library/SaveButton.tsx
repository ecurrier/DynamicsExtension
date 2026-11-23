import { Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, SplitButton, type MenuButtonProps } from "@fluentui/react-components";
import { Save20Regular, SaveCopy20Regular } from "@fluentui/react-icons";
import { useState } from "react";

import { useAppToast } from "@/shared/components";

import { useStoredQueries } from "../remembered";
import { useQueryBuilder, useQueryBuilderStoreApi } from "../store";
import { NameDialog, type NameSubmitResult } from "./NameDialog";
import { useCurrentStoredQuery } from "./useCurrentStoredQuery";

type NameRequest = "save" | "save-as";

interface SaveButtonProps {
	className?: string;
	labelClassName?: string;
}

export const SaveButton = ({ className, labelClassName }: SaveButtonProps) => {
	const store = useQueryBuilderStoreApi();
	const toast = useAppToast();
	const empty = useQueryBuilder((state) => state.text.trim() === "");
	const { add, overwrite } = useStoredQueries();
	const { storedQuery, changed } = useCurrentStoredQuery();
	const [request, setRequest] = useState<NameRequest | null>(null);

	const save = () => {
		if (!storedQuery) {
			setRequest("save");
			return;
		}
		if (!changed) {
			toast.info(`"${storedQuery.name}" has no changes`);
			return;
		}
		void overwrite(storedQuery.name, store.getState().text).then(
			(result) => (result.ok ? toast.success(`Stored "${result.storedQuery.name}"`) : toast.error("Cannot store the Query", result.reason)),
			(error: unknown) => toast.error("Cannot store the Query", error)
		);
	};

	const submit = async (name: string, replace: boolean): Promise<NameSubmitResult> => {
		const text = store.getState().text;
		const result = replace ? await overwrite(name, text) : await add(name, text);
		if (result.ok) {
			store.getState().setStoredQuery(result.storedQuery.id);
			toast.success(`Stored "${result.storedQuery.name}"`);
			return { kind: "done" };
		}
		if (result.refusal === "name-taken") {
			return { kind: "taken", message: `${result.reason}. Select Replace to store the Query under this name.` };
		}
		return { kind: "error", message: result.reason };
	};

	const saveLabel = storedQuery ? `Save the changes to "${storedQuery.name}"` : "Save the Query in My queries";

	return (
		<>
			<Menu positioning="below-end">
				<MenuTrigger disableButtonEnhancement>
					{(triggerProps: MenuButtonProps) => (
						<SplitButton
							appearance="subtle"
							className={className}
							icon={<Save20Regular />}
							disabled={empty}
							menuButton={{ ...triggerProps, "aria-label": "More save options" }}
							primaryActionButton={{ onClick: save, "aria-label": "Save", title: saveLabel, className }}>
							<span className={labelClassName}>Save</span>
						</SplitButton>
					)}
				</MenuTrigger>
				<MenuPopover>
					<MenuList>
						<MenuItem icon={<SaveCopy20Regular />} onClick={() => setRequest("save-as")}>
							Save as
						</MenuItem>
					</MenuList>
				</MenuPopover>
			</Menu>
			<NameDialog
				open={request !== null}
				title={request === "save-as" ? "Save a copy" : "Save the Query"}
				initialName={request === "save-as" && storedQuery ? `${storedQuery.name} (copy)` : ""}
				confirmLabel="Save"
				onSubmit={submit}
				onClose={() => setRequest(null)}
			/>
		</>
	);
};
