import { Button, Field, Input, Text } from "@fluentui/react-components";
import { Add20Regular, Delete20Regular } from "@fluentui/react-icons";

import { FormRow, FormStack, Grow } from "@/shared/components";
import { type TemplateSetting } from "@/shared/types";

interface SettingsEditorProps {
	settings: TemplateSetting[];
	readOnly: boolean;
	onChange: (settings: TemplateSetting[]) => void;
}

export const SettingsEditor = ({ settings, readOnly, onChange }: SettingsEditorProps) => {
	const update = (index: number, patch: Partial<TemplateSetting>) =>
		onChange(settings.map((setting, candidate) => (candidate === index ? { ...setting, ...patch } : setting)));
	const remove = (index: number) => onChange(settings.filter((_, candidate) => candidate !== index));
	const add = () => onChange([...settings, { key: "", label: "", default: "" }]);

	return (
		<Field label="Settings" hint="Values the Template reads as {{settings.key}}; Generate shows them as inputs.">
			<FormStack>
				{settings.length === 0 ? <Text size={200}>No settings.</Text> : null}
				{settings.map((setting, index) => (
					<FormRow key={index}>
						<Grow>
							<Input
								value={setting.key}
								placeholder="key"
								disabled={readOnly}
								aria-label="Setting key"
								onChange={(_, data) => update(index, { key: data.value })}
							/>
						</Grow>
						<Grow>
							<Input
								value={setting.label}
								placeholder="Label"
								disabled={readOnly}
								aria-label="Setting label"
								onChange={(_, data) => update(index, { label: data.value })}
							/>
						</Grow>
						<Grow>
							<Input
								value={setting.default}
								placeholder="Default"
								disabled={readOnly}
								aria-label="Setting default"
								onChange={(_, data) => update(index, { default: data.value })}
							/>
						</Grow>
						{readOnly ? null : <Button icon={<Delete20Regular />} aria-label="Remove setting" onClick={() => remove(index)} />}
					</FormRow>
				))}
				{readOnly ? null : (
					<FormRow>
						<Button size="small" icon={<Add20Regular />} onClick={add}>
							Add setting
						</Button>
					</FormRow>
				)}
			</FormStack>
		</Field>
	);
};
