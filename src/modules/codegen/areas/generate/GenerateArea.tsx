import {
	Button,
	Dropdown,
	Field,
	makeStyles,
	MessageBar,
	MessageBarBody,
	Option,
	OptionGroup,
	Spinner,
	Switch,
	Tab,
	TabList,
	Text,
	tokens,
} from "@fluentui/react-components";
import { ArrowDownload20Regular } from "@fluentui/react-icons";
import { useEffect, useMemo } from "react";

import { usePageQuery } from "@/messaging/client";
import { AreaContainer, CodeBlock, CopyButton, FormRow, FormStack, Grow } from "@/shared/components";
import { downloadTextFile } from "@/shared/lib";
import { type CodegenChoice, type TemplateKind } from "@/shared/types";

import { SettingCombobox } from "./SettingCombobox";
import { TableCombobox } from "./TableCombobox";
import { useCodegenPreferences, useCodeTemplates, useGlobalChoices, useTableModel } from "../../hooks";
import { generate, type GenerationSource, localChoicesOf, resolveSettings } from "../../lib";
import { useCodegenStore } from "../../store";

const useStyles = makeStyles({
	fileName: {
		fontFamily: tokens.fontFamilyMonospace,
		color: tokens.colorNeutralForeground3,
	},
});

const choiceLabel = (choice: CodegenChoice): string => (choice.isGlobal ? `${choice.displayName} (global)` : choice.displayName);

export const GenerateArea = () => {
	const styles = useStyles();
	const kind = useCodegenStore((state) => state.kind);
	const tableLogicalName = useCodegenStore((state) => state.tableLogicalName);
	const choiceName = useCodegenStore((state) => state.choiceName);
	const templateIds = useCodegenStore((state) => state.templateIds);
	const settingOverrides = useCodegenStore((state) => state.settingOverrides);
	const includeSystemColumns = useCodegenStore((state) => state.includeSystemColumns);
	const setKind = useCodegenStore((state) => state.setKind);
	const setTable = useCodegenStore((state) => state.setTable);
	const setChoice = useCodegenStore((state) => state.setChoice);
	const setTemplate = useCodegenStore((state) => state.setTemplate);
	const setSetting = useCodegenStore((state) => state.setSetting);
	const setIncludeSystemColumns = useCodegenStore((state) => state.setIncludeSystemColumns);
	const { templates, byId, defaultFor } = useCodeTemplates();
	const preferences = useCodegenPreferences();
	const target = usePageQuery("utilities.getPageTarget", undefined);
	const pageTable = target.data?.entityLogicalName ?? null;

	useEffect(() => {
		if (tableLogicalName === null && pageTable) {
			setTable(pageTable);
		}
	}, [tableLogicalName, pageTable, setTable]);

	const model = useTableModel(tableLogicalName);
	const globals = useGlobalChoices(kind === "choice");
	const kindTemplates = templates.filter((template) => template.kind === kind);
	const chosenId = templateIds[kind];
	const template = (chosenId ? byId[chosenId] : undefined) ?? defaultFor(kind);
	const localChoices = useMemo(() => (model.data ? localChoicesOf(model.data) : []), [model.data]);
	const choices = useMemo(() => [...localChoices, ...(globals.data ?? [])], [localChoices, globals.data]);
	const choice = choices.find((candidate) => candidate.name === choiceName) ?? localChoices[0] ?? choices[0] ?? null;
	const settings = useMemo(
		() => (template ? resolveSettings(template, { ...preferences.settingsFor(template.id), ...settingOverrides[template.id] }) : {}),
		[template, settingOverrides, preferences]
	);
	const source = useMemo<GenerationSource | null>(() => {
		if (kind === "table") {
			return model.data ? { kind: "table", table: model.data } : null;
		}
		return choice ? { kind: "choice", choice } : null;
	}, [kind, model.data, choice]);
	const generation = useMemo(
		() => (template && source ? generate(template, source, { settings, includeSystemColumns }) : null),
		[template, source, settings, includeSystemColumns]
	);
	const loading = model.isLoading || (kind === "choice" && globals.isLoading);

	return (
		<AreaContainer>
			<FormStack>
				<TabList selectedValue={kind} onTabSelect={(_, data) => setKind(data.value as TemplateKind)}>
					<Tab value="table">Table class</Tab>
					<Tab value="choice">Choice</Tab>
				</TabList>
				<TableCombobox value={tableLogicalName} pageTable={pageTable} onChange={setTable} />
				{kind === "choice" ? (
					<Field label="Choice">
						<Dropdown
							placeholder={loading ? "Loading choices..." : "Select a choice..."}
							value={choice ? choiceLabel(choice) : ""}
							selectedOptions={choice ? [choice.name] : []}
							onOptionSelect={(_, data) => data.optionValue && setChoice(data.optionValue)}>
							{localChoices.length > 0 ? (
								<OptionGroup label="This table">
									{localChoices.map((candidate) => (
										<Option key={candidate.name} value={candidate.name} text={choiceLabel(candidate)}>
											{candidate.displayName}
										</Option>
									))}
								</OptionGroup>
							) : null}
							<OptionGroup label="Global">
								{(globals.data ?? []).map((candidate) => (
									<Option key={candidate.name} value={candidate.name} text={choiceLabel(candidate)}>
										{candidate.displayName}
									</Option>
								))}
							</OptionGroup>
						</Dropdown>
					</Field>
				) : null}
				<FormRow>
					<Grow>
						<Field label="Template">
							<Dropdown
								placeholder="Select a template..."
								value={template?.name ?? ""}
								selectedOptions={template ? [template.id] : []}
								onOptionSelect={(_, data) => data.optionValue && setTemplate(kind, data.optionValue)}>
								{kindTemplates.map((candidate) => (
									<Option key={candidate.id} value={candidate.id} text={candidate.name}>
										{candidate.builtIn ? `${candidate.name} (built-in)` : candidate.name}
									</Option>
								))}
							</Dropdown>
						</Field>
					</Grow>
					{kind === "table" ? (
						<Switch label="Show system columns" checked={includeSystemColumns} onChange={(_, data) => setIncludeSystemColumns(data.checked)} />
					) : null}
				</FormRow>
				{template && template.settings.length > 0 ? (
					<FormRow>
						{template.settings.map((setting) => (
							<Grow key={setting.key}>
								<SettingCombobox
									label={setting.label}
									value={settings[setting.key] ?? ""}
									history={preferences.historyFor(setting.key)}
									onChange={(value) => {
										setSetting(template.id, setting.key, value);
										void preferences.setSetting(template.id, setting.key, value);
									}}
									onCommit={(value) => void preferences.remember(setting.key, value)}
									onForget={(value) => void preferences.forget(setting.key, value)}
								/>
							</Grow>
						))}
					</FormRow>
				) : null}
				{model.isError ? (
					<MessageBar intent="error">
						<MessageBarBody>{model.error.message}</MessageBarBody>
					</MessageBar>
				) : null}
				{!template ? (
					<MessageBar intent="warning">
						<MessageBarBody>There is no {kind} Template yet. Create one under Templates.</MessageBarBody>
					</MessageBar>
				) : null}
				{generation?.error ? (
					<MessageBar intent="error">
						<MessageBarBody>{generation.error}</MessageBarBody>
					</MessageBar>
				) : null}
				{generation && generation.unresolved.length > 0 ? (
					<MessageBar intent="warning">
						<MessageBarBody>Unresolved in the Template: {generation.unresolved.join(", ")}</MessageBarBody>
					</MessageBar>
				) : null}
				{loading ? <Spinner label="Reading metadata..." /> : null}
				{template && generation && !generation.error ? (
					<>
						<FormRow>
							<Grow>
								<Text size={200} className={styles.fileName}>
									{generation.fileName}
								</Text>
							</Grow>
							<CopyButton text={generation.output} label="Copy" successMessage="Code copied to clipboard" />
							<Button icon={<ArrowDownload20Regular />} onClick={() => downloadTextFile(generation.fileName, generation.output)}>
								Save file
							</Button>
						</FormRow>
						<CodeBlock value={generation.output} language={template.language} height="360px" />
					</>
				) : null}
			</FormStack>
		</AreaContainer>
	);
};
