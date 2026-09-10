import { Dropdown, Field, Input, Menu, MenuButton, MenuDivider, MenuItem, MenuList, MenuPopover, MenuTrigger, Option, Text } from "@fluentui/react-components";
import { ArrowDownload20Regular, ArrowUpload20Regular, Delete20Regular, DocumentAdd20Regular, Play20Regular, Save20Regular } from "@fluentui/react-icons";
import { useRef, useState } from "react";

import { usePageMutation, usePageQuery } from "@/messaging/client";
import { AreaContainer, AreaToolbar, CodeEditor, FormStack, Grow, useAppToast, useConfirm } from "@/shared/components";
import { generateGuid } from "@/shared/lib";

import { useFormPresets } from "../../hooks";
import { exportFileName, formatFields, parseFields, parseFormPresetFile, serializeFormPreset } from "../../lib";

const NEW_PRESET = "__new__";

interface Draft {
	name: string;
	json: string;
}

export const FormPresetsArea = () => {
	const toast = useAppToast();
	const confirm = useConfirm();
	const pageContext = usePageQuery("global.getPageContext", undefined);
	const context = pageContext.data ?? null;
	const { presets, byId, upsert, remove, isSaving } = useFormPresets(context);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [draft, setDraft] = useState<Draft | null>(null);
	const [jsonError, setJsonError] = useState<string | null>(null);
	const fileInput = useRef<HTMLInputElement>(null);

	const capture = usePageMutation("formPresets.captureFormValues", {
		onSuccess: (fields) => {
			setSelectedId(NEW_PRESET);
			setDraft({ name: "", json: formatFields(fields) });
			setJsonError(null);
		},
	});
	const apply = usePageMutation("formPresets.applyFormValues", {
		onSuccess: (result) =>
			result.skipped.length > 0
				? toast.info(`Applied ${result.applied} field${result.applied === 1 ? "" : "s"}`, `Skipped: ${result.skipped.join(", ")}`)
				: toast.success(`Applied ${result.applied} field${result.applied === 1 ? "" : "s"}`),
	});

	const select = (id: string) => {
		const preset = byId[id];
		setSelectedId(id);
		setDraft(preset ? { name: preset.name, json: formatFields(preset.fields) } : null);
		setJsonError(null);
	};

	const readFields = (): Record<string, unknown> | null => {
		if (!draft) {
			return null;
		}
		try {
			const fields = parseFields(draft.json);
			setJsonError(null);
			return fields;
		} catch (error) {
			setJsonError(error instanceof Error ? error.message : "Invalid JSON");
			return null;
		}
	};

	const onApply = () => {
		const fields = readFields();
		if (!fields || Object.keys(fields).length === 0) {
			toast.error("No preset fields to apply");
			return;
		}
		apply.mutate({ fields });
	};

	const onSave = async () => {
		if (!draft) {
			toast.error("Generate or select a preset first");
			return;
		}
		if (!draft.name.trim()) {
			toast.error("Enter a preset name");
			return;
		}
		const fields = readFields();
		if (!fields) {
			return;
		}
		const id = selectedId && selectedId !== NEW_PRESET ? selectedId : generateGuid();
		try {
			await upsert({ id, name: draft.name.trim(), fields });
			setSelectedId(id);
			toast.success(`Saved preset ${draft.name.trim()}`);
		} catch (error) {
			toast.error("Could not save the preset", error);
		}
	};

	const onDelete = async () => {
		const preset = selectedId ? byId[selectedId] : undefined;
		if (!preset) {
			toast.error("Select a saved preset to delete");
			return;
		}
		if (!(await confirm({ content: `Delete the preset "${preset.name}"?`, confirmLabel: "Delete" }))) {
			return;
		}
		try {
			await remove(preset.id);
			setSelectedId(null);
			setDraft(null);
			toast.success("Preset deleted");
		} catch (error) {
			toast.error("Could not delete the preset", error);
		}
	};

	const onExport = () => {
		const fields = readFields();
		if (!draft || !fields || Object.keys(fields).length === 0) {
			toast.error("No preset to export");
			return;
		}
		const blob = new Blob([serializeFormPreset({ name: draft.name, fields })], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = exportFileName(draft.name);
		anchor.click();
		URL.revokeObjectURL(url);
	};

	const onImportFile = async (file: File | undefined) => {
		if (!file) {
			return;
		}
		try {
			const preset = parseFormPresetFile(await file.text());
			setSelectedId(NEW_PRESET);
			setDraft({ name: preset.name, json: formatFields(preset.fields) });
			setJsonError(null);
		} catch (error) {
			toast.error("Could not import the preset", error);
		}
	};

	const selectedLabel = selectedId === NEW_PRESET ? "New preset" : (selectedId && byId[selectedId]?.name) || "";

	return (
		<AreaContainer>
			<AreaToolbar>
				<Grow>
					<Dropdown
						placeholder={context ? "Select a preset..." : "Form presets are available on model-driven apps and Power Pages"}
						value={selectedLabel}
						selectedOptions={selectedId ? [selectedId] : []}
						disabled={!context}
						onOptionSelect={(_, data) => data.optionValue && select(data.optionValue)}>
						{selectedId === NEW_PRESET ? (
							<Option value={NEW_PRESET} text="New preset">
								New preset
							</Option>
						) : null}
						{presets.map((preset) => (
							<Option key={preset.id} value={preset.id} text={preset.name}>
								{preset.name}
							</Option>
						))}
					</Dropdown>
				</Grow>
				<Menu>
					<MenuTrigger disableButtonEnhancement>
						<MenuButton appearance="primary">Actions</MenuButton>
					</MenuTrigger>
					<MenuPopover>
						<MenuList>
							<MenuItem icon={<DocumentAdd20Regular />} disabled={!context || capture.isPending} onClick={() => capture.mutate(undefined)}>
								Capture Current Form
							</MenuItem>
							<MenuItem icon={<Play20Regular />} disabled={!draft || apply.isPending} onClick={onApply}>
								Apply Preset
							</MenuItem>
							<MenuDivider />
							<MenuItem icon={<Save20Regular />} disabled={!draft || isSaving} onClick={() => void onSave()}>
								Save Preset
							</MenuItem>
							<MenuItem icon={<Delete20Regular />} disabled={!selectedId || selectedId === NEW_PRESET} onClick={() => void onDelete()}>
								Delete Preset
							</MenuItem>
							<MenuDivider />
							<MenuItem icon={<ArrowDownload20Regular />} disabled={!draft} onClick={onExport}>
								Export Preset
							</MenuItem>
							<MenuItem icon={<ArrowUpload20Regular />} onClick={() => fileInput.current?.click()}>
								Import Preset
							</MenuItem>
						</MenuList>
					</MenuPopover>
				</Menu>
				<input
					ref={fileInput}
					type="file"
					accept="application/json,.json"
					hidden
					onChange={(event) => {
						void onImportFile(event.target.files?.[0]);
						event.target.value = "";
					}}
				/>
			</AreaToolbar>
			{draft ? (
				<FormStack>
					<Field label="Preset Name" required>
						<Input value={draft.name} placeholder="Enter a preset name..." onChange={(_, data) => setDraft({ ...draft, name: data.value })} />
					</Field>
					<Field label="Fields" validationMessage={jsonError ?? undefined}>
						<CodeEditor value={draft.json} language="json" height="300px" onChange={(json) => setDraft({ ...draft, json })} />
					</Field>
				</FormStack>
			) : (
				<Text size={200}>
					{presets.length === 0
						? "No presets saved yet. Use Actions > Capture Current Form to start one from the open form."
						: "Select a preset to edit or apply it, or capture a new one from the open form."}
				</Text>
			)}
		</AreaContainer>
	);
};
