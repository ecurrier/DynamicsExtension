import { Button, Checkbox, makeStyles, Text, tokens } from "@fluentui/react-components";
import { useMemo, useState } from "react";

import { pageKeys, usePageFetcher, usePageMutation, usePageQuery } from "@/messaging/client";
import { AreaContainer, AreaToolbar, FormStack, Grow, type RecordLookupServices, useAppToast } from "@/shared/components";
import { useSessionStore } from "@/shared/stores";
import { type AttributeDefinition } from "@/shared/types";

import { AttributePicker } from "./AttributePicker";
import { FieldValueInput } from "./FieldValueInput";
import {
	attributeTypeLabel,
	buildUpdatePayload,
	currentLookupTarget,
	displayRecordValue,
	draftToFieldValue,
	type FieldDraft,
	initialDraft,
	isLookupAttribute,
} from "../../lib";

const SEARCH_TOP = 25;

const useStyles = makeStyles({
	info: {
		display: "grid",
		gridTemplateColumns: "max-content 1fr",
		columnGap: "16px",
		rowGap: "4px",
		padding: "12px",
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: tokens.colorNeutralBackground1,
		border: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	label: {
		color: tokens.colorNeutralForeground3,
	},
	actions: {
		display: "flex",
		justifyContent: "flex-end",
	},
});

export const UpdateFieldsArea = () => {
	const styles = useStyles();
	const toast = useAppToast();
	const tabId = useSessionStore((state) => state.tabId);
	const fetchPage = usePageFetcher();
	const metadata = usePageQuery("webapi.getAttributeMetadata", undefined, { enabled: false });
	const recordValues = usePageQuery("webapi.getRecordValues", undefined, { enabled: metadata.isSuccess });
	const [selected, setSelected] = useState<AttributeDefinition | null>(null);
	const [draft, setDraft] = useState<FieldDraft | null>(null);
	const [validationMessage, setValidationMessage] = useState<string | null>(null);

	const lookupServices = useMemo<RecordLookupServices>(
		() => ({
			search: (entityLogicalName, query) => fetchPage("webapi.searchRecords", { entityLogicalName, query, top: SEARCH_TOP }, { fresh: query === "" }),
			getEntityInfo: (logicalName) => fetchPage("webapi.getEntityInfo", { logicalName }),
		}),
		[fetchPage]
	);

	const invalidates = () => (tabId === null ? [] : [pageKeys.command(tabId, "webapi.getRecordValues", null)]);
	const resetDraft = () => {
		if (selected) {
			setDraft(initialDraft(selected));
		}
	};

	const updateField = usePageMutation("webapi.updateField", {
		invalidates,
		onSuccess: () => {
			toast.success("Field updated");
			resetDraft();
		},
	});
	const clearLookup = usePageMutation("webapi.clearLookup", {
		invalidates,
		onSuccess: () => {
			toast.success("Field cleared");
			resetDraft();
		},
	});

	const select = (attribute: AttributeDefinition | null) => {
		setSelected(attribute);
		setDraft(attribute ? initialDraft(attribute) : null);
		setValidationMessage(null);
	};

	const submit = () => {
		if (!selected || !draft) {
			return;
		}
		const result = draftToFieldValue(selected, draft);
		if (!result.ok) {
			setValidationMessage(result.message);
			return;
		}
		setValidationMessage(null);
		if (result.value.kind === "clear" && isLookupAttribute(selected)) {
			if (!recordValues.data) {
				setValidationMessage("Wait for the current value to load before clearing the field");
				return;
			}
			const target = currentLookupTarget(selected, recordValues.data);
			if (!target) {
				setValidationMessage("The field is already empty");
				return;
			}
			clearLookup.mutate({ navigationProperty: target.navigationProperty });
			return;
		}
		updateField.mutate({ payload: buildUpdatePayload(selected, result.value) });
	};

	const pending = updateField.isPending || clearLookup.isPending;
	const currentValue = selected && recordValues.data ? displayRecordValue(selected, recordValues.data) : null;

	return (
		<AreaContainer>
			<AreaToolbar>
				<Button appearance="primary" disabled={metadata.isFetching} onClick={() => void metadata.refetch()}>
					{metadata.isFetching ? "Loading..." : metadata.isSuccess ? "Reload Attribute Metadata" : "Load Attribute Metadata"}
				</Button>
				<Grow>
					<AttributePicker attributes={metadata.data?.attributes ?? []} selected={selected} disabled={!metadata.isSuccess} onSelect={select} />
				</Grow>
			</AreaToolbar>
			{metadata.isError ? <Text size={200}>{metadata.error.message}</Text> : null}
			{!metadata.isSuccess && !metadata.isError ? (
				<Text size={200}>Load the attribute metadata for the current record, then pick a field to update.</Text>
			) : null}
			{selected && draft ? (
				<FormStack>
					<div className={styles.info}>
						<Text size={200} className={styles.label}>
							Display Name
						</Text>
						<Text size={200}>{selected.displayName}</Text>
						<Text size={200} className={styles.label}>
							Logical Name
						</Text>
						<Text size={200}>{selected.logicalName}</Text>
						<Text size={200} className={styles.label}>
							Type
						</Text>
						<Text size={200}>{attributeTypeLabel(selected.attributeType)}</Text>
						<Text size={200} className={styles.label}>
							Current Value
						</Text>
						<Text size={200}>{recordValues.isFetching && !recordValues.data ? "Loading..." : (currentValue ?? "—")}</Text>
					</div>
					<Checkbox label="Clear field" checked={draft.clear} onChange={(_, data) => setDraft({ ...draft, clear: data.checked === true })} />
					<FieldValueInput
						definition={selected}
						draft={draft}
						validationMessage={validationMessage}
						lookupServices={lookupServices}
						onChange={setDraft}
					/>
					<div className={styles.actions}>
						<Button appearance="primary" disabled={pending} onClick={submit}>
							{pending ? "Updating..." : "Update Field"}
						</Button>
					</div>
				</FormStack>
			) : null}
		</AreaContainer>
	);
};
