import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Input } from "@fluentui/react-components";
import { type FormEvent, useState } from "react";

export type NameSubmitResult = { kind: "done" } | { kind: "error"; message: string } | { kind: "taken"; message: string };

interface NameFormProps {
	title: string;
	initialName: string;
	confirmLabel: string;
	onSubmit: (name: string, replace: boolean) => Promise<NameSubmitResult>;
	onClose: () => void;
}

const NameForm = ({ title, initialName, confirmLabel, onSubmit, onClose }: NameFormProps) => {
	const [name, setName] = useState(initialName);
	const [message, setMessage] = useState<string | null>(null);
	const [taken, setTaken] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const replacing = taken !== null && taken === name.trim();

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		setBusy(true);
		try {
			const result = await onSubmit(name, replacing);
			if (result.kind === "done") {
				onClose();
				return;
			}
			setMessage(result.message);
			setTaken(result.kind === "taken" ? name.trim() : null);
		} finally {
			setBusy(false);
		}
	};

	return (
		<form onSubmit={(event) => void submit(event)}>
			<DialogBody>
				<DialogTitle>{title}</DialogTitle>
				<DialogContent>
					<Field label="Name" validationMessage={message ?? undefined} validationState={message ? (replacing ? "warning" : "error") : "none"}>
						<Input
							autoFocus
							value={name}
							onChange={(_, data) => {
								setName(data.value);
								setMessage(null);
							}}
						/>
					</Field>
				</DialogContent>
				<DialogActions>
					<Button appearance="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button appearance="primary" type="submit" disabled={busy || name.trim() === ""}>
						{replacing ? "Replace" : confirmLabel}
					</Button>
				</DialogActions>
			</DialogBody>
		</form>
	);
};

interface NameDialogProps extends NameFormProps {
	open: boolean;
}

export const NameDialog = ({ open, ...props }: NameDialogProps) => (
	<Dialog open={open} onOpenChange={(_, data) => (data.open ? undefined : props.onClose())}>
		<DialogSurface style={{ maxWidth: "420px" }}>{open ? <NameForm {...props} /> : null}</DialogSurface>
	</Dialog>
);
