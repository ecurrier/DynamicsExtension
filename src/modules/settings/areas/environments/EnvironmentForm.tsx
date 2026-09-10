import { Button, Dropdown, Field, Input, Option, Switch, Textarea } from "@fluentui/react-components";
import { Eye20Regular, PlugConnected20Regular, Settings20Regular } from "@fluentui/react-icons";

import { CopyButton, ExternalLinkButton, FormRow, FormStack, Grow, InfoTip } from "@/shared/components";
import { type ServicePrincipal } from "@/shared/storage";
import { ALERT_LEVEL_LABELS, ALERT_LEVELS, CLOUD_TYPES, type CloudType, type EnvironmentAlert, type EnvironmentAlertLevel } from "@/shared/types";

import { CLOUD_TYPE_LABELS, defaultAlert, type DraftValidation, type EnvironmentDraft } from "../../lib";

const NO_PRINCIPAL = "__none__";

interface EnvironmentFormProps {
	draft: EnvironmentDraft;
	validation: DraftValidation | null;
	principals: ServicePrincipal[];
	testingConnection: boolean;
	canPreviewAlert: boolean;
	previewingAlert: boolean;
	onChange: (draft: EnvironmentDraft) => void;
	onTestConnection: () => void;
	onManagePrincipals: () => void;
	onPreviewAlert: () => void;
}

export const EnvironmentForm = ({
	draft,
	validation,
	principals,
	testingConnection,
	canPreviewAlert,
	previewingAlert,
	onChange,
	onTestConnection,
	onManagePrincipals,
	onPreviewAlert,
}: EnvironmentFormProps) => {
	const set = <K extends keyof EnvironmentDraft>(key: K, value: EnvironmentDraft[K]) => onChange({ ...draft, [key]: value });
	const setAlert = (patch: Partial<EnvironmentAlert>) => set("alert", { ...(draft.alert ?? defaultAlert(draft.name)), ...patch });
	const messageFor = (field: DraftValidation["field"]) => (validation?.field === field ? validation.message : undefined);
	const principalLabel = draft.servicePrincipalId
		? (principals.find((principal) => principal.id === draft.servicePrincipalId)?.name ?? "Removed service principal")
		: "None";

	return (
		<FormStack>
			<Field label="Environment Name" required validationMessage={messageFor("name")}>
				<Input value={draft.name} placeholder="Enter an environment name..." onChange={(_, data) => set("name", data.value)} />
			</Field>
			<Field label="Environment Type">
				<Dropdown
					value={CLOUD_TYPE_LABELS[draft.environmentType]}
					selectedOptions={[draft.environmentType]}
					onOptionSelect={(_, data) => data.optionValue && set("environmentType", data.optionValue as CloudType)}>
					{CLOUD_TYPES.map((cloudType) => (
						<Option key={cloudType} value={cloudType}>
							{CLOUD_TYPE_LABELS[cloudType]}
						</Option>
					))}
				</Dropdown>
			</Field>
			<FormRow>
				<Grow>
					<Field label="Model-Driven Base URL" validationMessage={messageFor("modelDrivenAppUrl")}>
						<Input
							value={draft.modelDrivenAppUrl}
							placeholder="https://xxxxxxxxx.crm.dynamics.com/"
							onChange={(_, data) => set("modelDrivenAppUrl", data.value)}
						/>
					</Field>
				</Grow>
				<CopyButton text={draft.modelDrivenAppUrl} label="Copy URL" iconOnly />
				<ExternalLinkButton url={draft.modelDrivenAppUrl} />
			</FormRow>
			<FormRow>
				<Grow>
					<Field label="Power Pages Base URL">
						<Input
							value={draft.powerPagesUrl}
							placeholder="https://xxxxxxxxx.powerappsportals.com/"
							onChange={(_, data) => set("powerPagesUrl", data.value)}
						/>
					</Field>
				</Grow>
				<CopyButton text={draft.powerPagesUrl} label="Copy URL" iconOnly />
				<ExternalLinkButton url={draft.powerPagesUrl} />
			</FormRow>
			<FormRow>
				<Grow>
					<Field
						label={
							<>
								Environment Id
								<InfoTip content="The environment id can be found by opening the maker portal, selecting the environment, and copying it from the URL" />
							</>
						}>
						<Input value={draft.environmentId} placeholder="Enter an environment id" onChange={(_, data) => set("environmentId", data.value)} />
					</Field>
				</Grow>
				<CopyButton text={draft.environmentId} label="Copy id" iconOnly />
			</FormRow>
			<FormRow>
				<Grow>
					<Field
						label={
							<>
								Service Principal
								<InfoTip content="Tools that run against this saved environment sign in as the selected app registration instead of you. Register it as an application user in the environment first" />
							</>
						}>
						<Dropdown
							value={principalLabel}
							selectedOptions={[draft.servicePrincipalId ?? NO_PRINCIPAL]}
							onOptionSelect={(_, data) =>
								set("servicePrincipalId", !data.optionValue || data.optionValue === NO_PRINCIPAL ? null : data.optionValue)
							}>
							<Option value={NO_PRINCIPAL} text="None">
								None
							</Option>
							{principals.map((principal) => (
								<Option key={principal.id} value={principal.id} text={principal.name}>
									{principal.name}
								</Option>
							))}
						</Dropdown>
					</Field>
				</Grow>
				<Button appearance="subtle" icon={<Settings20Regular />} onClick={onManagePrincipals}>
					Manage
				</Button>
				<Button icon={<PlugConnected20Regular />} disabled={testingConnection || !draft.servicePrincipalId} onClick={onTestConnection}>
					{testingConnection ? "Testing..." : "Test Connection"}
				</Button>
			</FormRow>
			<Field
				label={
					<>
						Environment banner
						<InfoTip content="Shows a notification bar at the top of the app whenever you browse this environment, so tabs for different environments are easy to tell apart" />
					</>
				}>
				<Switch
					label="Show a banner while browsing this environment"
					checked={draft.alert?.enabled ?? false}
					onChange={(_, data) => {
						if (data.checked) {
							setAlert({ enabled: true });
						} else if (draft.alert) {
							setAlert({ enabled: false });
						}
					}}
				/>
			</Field>
			{draft.alert?.enabled ? (
				<>
					<FormRow>
						<Field label="Level">
							<Dropdown
								style={{ minWidth: "150px" }}
								value={ALERT_LEVEL_LABELS[draft.alert.level]}
								selectedOptions={[String(draft.alert.level)]}
								onOptionSelect={(_, data) => data.optionValue && setAlert({ level: Number(data.optionValue) as EnvironmentAlertLevel })}>
								{ALERT_LEVELS.map((level) => (
									<Option key={level} value={String(level)} text={ALERT_LEVEL_LABELS[level]}>
										{ALERT_LEVEL_LABELS[level]}
									</Option>
								))}
							</Dropdown>
						</Field>
						<Grow>
							<Field label="Message">
								<Input
									value={draft.alert.message}
									placeholder="You are in Production"
									onChange={(_, data) => setAlert({ message: data.value })}
								/>
							</Field>
						</Grow>
					</FormRow>
					<FormRow>
						<Switch
							label="Users can close the banner"
							checked={draft.alert.showCloseButton}
							onChange={(_, data) => setAlert({ showCloseButton: data.checked })}
						/>
						<Grow>
							<span />
						</Grow>
						<Button icon={<Eye20Regular />} disabled={!canPreviewAlert || previewingAlert || !draft.alert.message.trim()} onClick={onPreviewAlert}>
							{previewingAlert ? "Showing..." : "Preview on this page"}
						</Button>
					</FormRow>
				</>
			) : null}
			<Field label="Notes">
				<Textarea
					value={draft.notes}
					rows={2}
					placeholder="Anything worth remembering about this environment..."
					onChange={(_, data) => set("notes", data.value)}
				/>
			</Field>
		</FormStack>
	);
};
