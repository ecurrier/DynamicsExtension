import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, makeStyles, Radio, RadioGroup, Switch, Text, tokens } from "@fluentui/react-components";

import { InfoTip, useAppToast } from "@/shared/components";
import { type ThemePreference } from "@/shared/storage";

import { useExtensionSettings } from "../../hooks";
import { SETTING_DEFINITIONS, SETTING_SECTIONS, type SettingDefinition } from "../../lib";

const useStyles = makeStyles({
	group: {
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		paddingBottom: "12px",
	},
	title: {
		fontWeight: tokens.fontWeightSemibold,
	},
	label: {
		color: tokens.colorNeutralForeground3,
		fontSize: tokens.fontSizeBase200,
	},
});

export const ExtensionSettingsArea = () => {
	const styles = useStyles();
	const toast = useAppToast();
	const { settings, setSetting } = useExtensionSettings();

	const save = (action: Promise<unknown>) => action.catch((error: unknown) => toast.error("Could not save the setting", error));

	const renderSetting = (definition: SettingDefinition) => {
		if (definition.kind === "choice") {
			return (
				<>
					<Text className={styles.label}>
						{definition.label}
						<InfoTip content={definition.tooltip} />
					</Text>
					<RadioGroup
						layout="horizontal"
						value={settings[definition.key]}
						onChange={(_, data) => void save(setSetting(definition.key, data.value as ThemePreference))}>
						{definition.options.map((option) => (
							<Radio key={option.value} value={option.value} label={option.label} title={option.description} />
						))}
					</RadioGroup>
				</>
			);
		}
		return (
			<Switch
				checked={settings[definition.key]}
				label={
					<>
						{definition.label}
						<InfoTip content={definition.tooltip} />
					</>
				}
				onChange={(_, data) => void save(setSetting(definition.key, data.checked))}
			/>
		);
	};

	return (
		<Accordion multiple collapsible defaultOpenItems={[...SETTING_SECTIONS]}>
			{SETTING_SECTIONS.map((section) => (
				<AccordionItem key={section} value={section}>
					<AccordionHeader>{section}</AccordionHeader>
					<AccordionPanel>
						{SETTING_DEFINITIONS.filter((definition) => definition.section === section).map((definition) => (
							<div key={definition.key} className={styles.group}>
								<Text className={styles.title}>{definition.title}</Text>
								{renderSetting(definition)}
							</div>
						))}
					</AccordionPanel>
				</AccordionItem>
			))}
		</Accordion>
	);
};
