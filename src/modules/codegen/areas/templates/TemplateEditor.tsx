import { Dropdown, Field, Input, MessageBar, MessageBarBody, Option, Text } from "@fluentui/react-components";

import { CodeBlock, CodeEditor, FormRow, FormStack, Grow } from "@/shared/components";
import { type Template, TEMPLATE_KIND_LABELS, TEMPLATE_KINDS, TEMPLATE_LANGUAGES, type TemplateKind, type TemplateLanguage } from "@/shared/types";

import { SettingsEditor } from "./SettingsEditor";
import { type Generation } from "../../lib";

const SYNTAX_HINT =
	"Write {{table.identifier}} or {{choice.identifier}} for values, {{#columns}}...{{/columns}} to repeat a block per column, {{^isLast}}...{{/isLast}} to skip it on the last one, and {{settings.key}} for a setting. The built-in Templates show the full data model.";

interface TemplateEditorProps {
	draft: Template;
	readOnly: boolean;
	isSample: boolean;
	generation: Generation;
	onChange: (draft: Template) => void;
}

export const TemplateEditor = ({ draft, readOnly, isSample, generation, onChange }: TemplateEditorProps) => {
	const languageLabel = TEMPLATE_LANGUAGES.find((language) => language.value === draft.language)?.label ?? "";
	return (
		<FormStack>
			{readOnly ? (
				<MessageBar intent="info">
					<MessageBarBody>Built-in Templates are read-only. Use Actions &gt; Clone Template to edit a copy.</MessageBarBody>
				</MessageBar>
			) : null}
			<FormRow>
				<Grow>
					<Field label="Name" required>
						<Input
							value={draft.name}
							placeholder="Enter a template name..."
							disabled={readOnly}
							onChange={(_, data) => onChange({ ...draft, name: data.value })}
						/>
					</Field>
				</Grow>
				<Field label="Kind">
					<Dropdown
						value={TEMPLATE_KIND_LABELS[draft.kind]}
						selectedOptions={[draft.kind]}
						disabled={readOnly}
						onOptionSelect={(_, data) => data.optionValue && onChange({ ...draft, kind: data.optionValue as TemplateKind })}>
						{TEMPLATE_KINDS.map((kind) => (
							<Option key={kind} value={kind} text={TEMPLATE_KIND_LABELS[kind]}>
								{TEMPLATE_KIND_LABELS[kind]}
							</Option>
						))}
					</Dropdown>
				</Field>
				<Field label="Language">
					<Dropdown
						value={languageLabel}
						selectedOptions={[draft.language]}
						disabled={readOnly}
						onOptionSelect={(_, data) => data.optionValue && onChange({ ...draft, language: data.optionValue as TemplateLanguage })}>
						{TEMPLATE_LANGUAGES.map((language) => (
							<Option key={language.value} value={language.value} text={language.label}>
								{language.label}
							</Option>
						))}
					</Dropdown>
				</Field>
			</FormRow>
			<Field label="File name pattern" hint="Rendered with the same data, for Save file in Generate.">
				<Input
					value={draft.filenamePattern}
					placeholder={draft.kind === "table" ? "{{table.identifier}}.cs" : "{{choice.identifier}}.cs"}
					disabled={readOnly}
					onChange={(_, data) => onChange({ ...draft, filenamePattern: data.value })}
				/>
			</Field>
			<SettingsEditor settings={draft.settings} readOnly={readOnly} onChange={(settings) => onChange({ ...draft, settings })} />
			<Field label="Template">
				<CodeEditor value={draft.text} language={draft.language} readOnly={readOnly} height="260px" onChange={(text) => onChange({ ...draft, text })} />
			</Field>
			<Text size={200}>{SYNTAX_HINT}</Text>
			<Field label={isSample ? "Preview (sample data, open a model-driven app to preview a real table)" : "Preview"}>
				<FormStack>
					{generation.error ? (
						<MessageBar intent="error">
							<MessageBarBody>{generation.error}</MessageBarBody>
						</MessageBar>
					) : null}
					{generation.unresolved.length > 0 ? (
						<MessageBar intent="warning">
							<MessageBarBody>Unresolved: {generation.unresolved.join(", ")}</MessageBarBody>
						</MessageBar>
					) : null}
					<CodeBlock value={generation.output} language={draft.language} height="220px" />
				</FormStack>
			</Field>
		</FormStack>
	);
};
