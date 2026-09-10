import {
	Dropdown,
	Menu,
	MenuButton,
	MenuDivider,
	MenuItem,
	MenuList,
	MenuPopover,
	MenuTrigger,
	MessageBar,
	MessageBarBody,
	MessageBarTitle,
	Option,
	OptionGroup,
	Text,
} from "@fluentui/react-components";
import {
	ArrowDownload20Regular,
	ArrowUpload20Regular,
	Copy20Regular,
	Delete20Regular,
	DocumentAdd20Regular,
	Save20Regular,
	Star20Regular,
} from "@fluentui/react-icons";
import { useMemo, useRef, useState } from "react";

import { AreaContainer, AreaToolbar, Grow, useAppToast, useConfirm } from "@/shared/components";
import { downloadTextFile, generateGuid } from "@/shared/lib";
import { type Template, TEMPLATE_KIND_LABELS, TEMPLATE_KINDS } from "@/shared/types";

import { TemplateEditor } from "./TemplateEditor";
import { useCodeTemplates, usePreviewSource } from "../../hooks";
import { generate, parseTemplateFile, serializeTemplateFile, settingDefaults, templateExportFileName } from "../../lib";
import { useCodegenStore } from "../../store";

const NEW_TEMPLATE = "__new__";

const now = () => new Date().toISOString();

const blankTemplate = (): Template => ({
	id: generateGuid(),
	name: "",
	kind: "table",
	language: "csharp",
	text: "",
	settings: [],
	filenamePattern: "",
	builtIn: false,
	updatedAt: now(),
});

export const TemplatesArea = () => {
	const toast = useAppToast();
	const confirm = useConfirm();
	const { templates, byId, defaults, upsert, remove, setDefault, isSaving } = useCodeTemplates();
	const editingId = useCodegenStore((state) => state.editingTemplateId);
	const setEditing = useCodegenStore((state) => state.setEditingTemplate);
	const [edits, setEdits] = useState<Template | null>(null);
	const [isNew, setIsNew] = useState(false);
	const fileInput = useRef<HTMLInputElement>(null);
	const selected = editingId !== null ? (byId[editingId] ?? null) : null;
	const draft = edits ?? selected;
	const preview = usePreviewSource(draft?.kind ?? "table");

	const generation = useMemo(
		() => (draft ? generate(draft, preview.source, { settings: settingDefaults(draft), includeSystemColumns: false }) : null),
		[draft, preview.source]
	);

	const select = (id: string) => {
		setEditing(id);
		setEdits(null);
		setIsNew(false);
	};

	const startDraft = (template: Template) => {
		setEditing(null);
		setEdits(template);
		setIsNew(true);
	};

	const addNew = () => startDraft(blankTemplate());

	const clone = () => {
		if (draft) {
			startDraft({ ...draft, id: generateGuid(), name: `${draft.name} (copy)`, builtIn: false, updatedAt: now() });
		}
	};

	const save = async () => {
		if (!draft) {
			toast.error("Select a template or add a new one first");
			return;
		}
		if (!draft.name.trim()) {
			toast.error("Enter a template name");
			return;
		}
		const saved = { ...draft, name: draft.name.trim(), updatedAt: now() };
		try {
			await upsert(saved);
			setEdits(saved);
			setIsNew(false);
			setEditing(saved.id);
			toast.success(`Saved template ${saved.name}`);
		} catch (error) {
			toast.error("Could not save the template", error);
		}
	};

	const onDelete = async () => {
		if (!draft || isNew || draft.builtIn) {
			toast.error("Select a saved template to delete");
			return;
		}
		if (!(await confirm({ content: `Delete the template "${draft.name}"?`, confirmLabel: "Delete" }))) {
			return;
		}
		try {
			await remove(draft.id);
			setEdits(null);
			setEditing(null);
			toast.success("Template deleted");
		} catch (error) {
			toast.error("Could not delete the template", error);
		}
	};

	const star = async () => {
		if (!draft || isNew) {
			toast.error("Save the template before making it the default");
			return;
		}
		try {
			await setDefault(draft.kind, draft.id);
			toast.success(`${draft.name} is now the default ${TEMPLATE_KIND_LABELS[draft.kind].toLowerCase()} template`);
		} catch (error) {
			toast.error("Could not set the default template", error);
		}
	};

	const onExport = () => {
		if (!draft) {
			toast.error("No template to export");
			return;
		}
		downloadTextFile(templateExportFileName(draft.name), serializeTemplateFile(draft), "application/json");
	};

	const onImportFile = async (file: File | undefined) => {
		if (!file) {
			return;
		}
		try {
			startDraft(parseTemplateFile(await file.text(), { newId: generateGuid, now }));
		} catch (error) {
			toast.error("Could not import the template", error);
		}
	};

	const optionLabel = (template: Template): string => {
		const suffix = [template.builtIn ? "built-in" : null, defaults[template.kind] === template.id ? "default" : null]
			.filter((part) => part !== null)
			.join(", ");
		return suffix ? `${template.name} (${suffix})` : template.name;
	};

	const selectedId = isNew ? NEW_TEMPLATE : (draft?.id ?? null);
	const selectedLabel = isNew ? "New template" : draft ? optionLabel(draft) : "";

	return (
		<AreaContainer>
			<MessageBar intent="info" layout="multiline">
				<MessageBarBody>
					<MessageBarTitle>Templates</MessageBarTitle>A Template is the pattern Generate fills in with a table, its columns, or a choice, so the
					output matches how your codebase is written. Clone a built-in one to start, star the one your team uses as the default, and export it to
					share.
				</MessageBarBody>
			</MessageBar>
			<AreaToolbar>
				<Grow>
					<Dropdown
						placeholder="Select a template..."
						value={selectedLabel}
						selectedOptions={selectedId ? [selectedId] : []}
						onOptionSelect={(_, data) => data.optionValue && data.optionValue !== NEW_TEMPLATE && select(data.optionValue)}>
						{isNew ? (
							<Option value={NEW_TEMPLATE} text="New template">
								New template
							</Option>
						) : null}
						{TEMPLATE_KINDS.map((kind) => (
							<OptionGroup key={kind} label={TEMPLATE_KIND_LABELS[kind]}>
								{templates
									.filter((template) => template.kind === kind)
									.map((template) => (
										<Option key={template.id} value={template.id} text={optionLabel(template)}>
											{optionLabel(template)}
										</Option>
									))}
							</OptionGroup>
						))}
					</Dropdown>
				</Grow>
				<Menu>
					<MenuTrigger disableButtonEnhancement>
						<MenuButton appearance="primary">Actions</MenuButton>
					</MenuTrigger>
					<MenuPopover>
						<MenuList>
							<MenuItem icon={<DocumentAdd20Regular />} onClick={addNew}>
								New Template
							</MenuItem>
							<MenuItem icon={<Copy20Regular />} disabled={!draft} onClick={clone}>
								Clone Template
							</MenuItem>
							<MenuDivider />
							<MenuItem icon={<Save20Regular />} disabled={!draft || draft.builtIn || isSaving} onClick={() => void save()}>
								Save Template
							</MenuItem>
							<MenuItem icon={<Star20Regular />} disabled={!draft || isNew || isSaving} onClick={() => void star()}>
								Use as Default
							</MenuItem>
							<MenuItem icon={<Delete20Regular />} disabled={!draft || isNew || draft.builtIn} onClick={() => void onDelete()}>
								Delete Template
							</MenuItem>
							<MenuDivider />
							<MenuItem icon={<ArrowDownload20Regular />} disabled={!draft} onClick={onExport}>
								Export Template
							</MenuItem>
							<MenuItem icon={<ArrowUpload20Regular />} onClick={() => fileInput.current?.click()}>
								Import Template
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
			{draft && generation ? (
				<TemplateEditor draft={draft} readOnly={draft.builtIn} isSample={preview.isSample} generation={generation} onChange={setEdits} />
			) : (
				<Text size={200}>Select a template to view or edit it, or use Actions to start a new one.</Text>
			)}
		</AreaContainer>
	);
};
