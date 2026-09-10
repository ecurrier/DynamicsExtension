import { Button, Field, Input, makeStyles, MessageBar, MessageBarBody, Text, Textarea, tokens } from "@fluentui/react-components";
import { Eye20Regular, EyeOff20Regular } from "@fluentui/react-icons";
import { useState } from "react";

import { CopyButton, FormRow, FormStack, Grow } from "@/shared/components";
import { type Environment } from "@/shared/storage";

import { type PrincipalValidation, type ServicePrincipalDraft } from "../../lib";

const useStyles = makeStyles({
	caption: {
		color: tokens.colorNeutralForeground3,
	},
});

interface ServicePrincipalFormProps {
	draft: ServicePrincipalDraft;
	validation: PrincipalValidation | null;
	usedBy: Environment[];
	onChange: (draft: ServicePrincipalDraft) => void;
}

export const ServicePrincipalForm = ({ draft, validation, usedBy, onChange }: ServicePrincipalFormProps) => {
	const styles = useStyles();
	const [revealSecret, setRevealSecret] = useState(false);
	const set = <K extends keyof ServicePrincipalDraft>(key: K, value: ServicePrincipalDraft[K]) => onChange({ ...draft, [key]: value });
	const messageFor = (field: PrincipalValidation["field"]) => (validation?.field === field ? validation.message : undefined);

	return (
		<FormStack>
			<MessageBar intent="warning">
				<MessageBarBody>
					The client secret is stored unencrypted in this browser&apos;s extension storage. Use a dedicated app registration with the least privilege
					you need, and rotate the secret regularly.
				</MessageBarBody>
			</MessageBar>
			<Field label="Name" required validationMessage={messageFor("name")}>
				<Input
					value={draft.name}
					placeholder="How this app registration is referred to in Power Tools"
					onChange={(_, data) => set("name", data.value)}
				/>
			</Field>
			<FormRow>
				<Grow>
					<Field label="Tenant Id" required validationMessage={messageFor("tenantId")}>
						<Input value={draft.tenantId} placeholder="00000000-0000-0000-0000-000000000000" onChange={(_, data) => set("tenantId", data.value)} />
					</Field>
				</Grow>
				<CopyButton text={draft.tenantId} label="Copy tenant id" iconOnly />
			</FormRow>
			<FormRow>
				<Grow>
					<Field label="Client Id" required validationMessage={messageFor("clientId")}>
						<Input
							value={draft.clientId}
							placeholder="Application (client) id of the app registration"
							onChange={(_, data) => set("clientId", data.value)}
						/>
					</Field>
				</Grow>
				<CopyButton text={draft.clientId} label="Copy client id" iconOnly />
			</FormRow>
			<Field label="Client Secret" required validationMessage={messageFor("clientSecret")}>
				<Input
					type={revealSecret ? "text" : "password"}
					value={draft.clientSecret}
					placeholder="Client secret value"
					autoComplete="off"
					contentAfter={
						<Button
							appearance="transparent"
							size="small"
							icon={revealSecret ? <EyeOff20Regular /> : <Eye20Regular />}
							aria-label={revealSecret ? "Hide secret" : "Show secret"}
							onClick={() => setRevealSecret((current) => !current)}
						/>
					}
					onChange={(_, data) => set("clientSecret", data.value)}
				/>
			</Field>
			<Field label="Notes">
				<Textarea
					value={draft.notes}
					rows={2}
					placeholder="Which environments have this app registered as an application user, who owns it..."
					onChange={(_, data) => set("notes", data.value)}
				/>
			</Field>
			<Text size={200} className={styles.caption}>
				{usedBy.length === 0
					? "Not assigned to any environment yet. Pick it on an environment under Settings > Environments."
					: `Used by ${usedBy.map((environment) => environment.name).join(", ")}.`}
			</Text>
		</FormStack>
	);
};
