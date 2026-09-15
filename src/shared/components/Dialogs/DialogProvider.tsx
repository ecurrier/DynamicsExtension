import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Dropdown, Option } from "@fluentui/react-components";
import { createContext, type PropsWithChildren, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

export interface ConfirmOptions {
	title?: string;
	content: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
}

export interface SelectItem<T> {
	key: string;
	label: string;
	value: T;
}

export interface SelectOptions<T> {
	title: string;
	description?: ReactNode;
	items: SelectItem<T>[];
	placeholder?: string;
	confirmLabel?: string;
	defaultToFirst?: boolean;
}

interface DialogApi {
	confirm: (options: ConfirmOptions) => Promise<boolean>;
	select: <T>(options: SelectOptions<T>) => Promise<T | null>;
}

type ActiveDialog =
	| { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
	| { kind: "select"; options: SelectOptions<unknown>; resolve: (value: unknown) => void };

const DialogContext = createContext<DialogApi | null>(null);

export const DialogProvider = ({ children }: PropsWithChildren) => {
	const [active, setActive] = useState<ActiveDialog | null>(null);
	const [selectedKey, setSelectedKey] = useState<string | null>(null);

	const close = useCallback(() => {
		setActive(null);
		setSelectedKey(null);
	}, []);

	const api = useMemo<DialogApi>(
		() => ({
			confirm: (options) =>
				new Promise<boolean>((resolve) => {
					setActive({ kind: "confirm", options, resolve });
				}),
			select: <T,>(options: SelectOptions<T>) =>
				new Promise<T | null>((resolve) => {
					setSelectedKey(options.defaultToFirst || options.items.length === 1 ? (options.items[0]?.key ?? null) : null);
					setActive({
						kind: "select",
						options: options as SelectOptions<unknown>,
						resolve: resolve as (value: unknown) => void,
					});
				}),
		}),
		[]
	);

	const dismiss = () => {
		if (!active) {
			return;
		}
		if (active.kind === "confirm") {
			active.resolve(false);
		} else {
			active.resolve(null);
		}
		close();
	};

	const accept = () => {
		if (!active) {
			return;
		}
		if (active.kind === "confirm") {
			active.resolve(true);
		} else {
			const item = active.options.items.find((candidate) => candidate.key === selectedKey);
			active.resolve(item ? item.value : null);
		}
		close();
	};

	const selectedLabel = active?.kind === "select" ? (active.options.items.find((item) => item.key === selectedKey)?.label ?? "") : "";

	return (
		<DialogContext.Provider value={api}>
			{children}
			<Dialog open={active !== null} onOpenChange={(_, data) => (data.open ? undefined : dismiss())}>
				<DialogSurface>
					<DialogBody>
						<DialogTitle>{active?.kind === "confirm" ? (active.options.title ?? "Confirmation") : active?.options.title}</DialogTitle>
						<DialogContent>
							{active?.kind === "confirm" ? active.options.content : null}
							{active?.kind === "select" ? (
								<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
									{active.options.description ? <div>{active.options.description}</div> : null}
									<Dropdown
										placeholder={active.options.placeholder ?? "Select..."}
										value={selectedLabel}
										selectedOptions={selectedKey ? [selectedKey] : []}
										onOptionSelect={(_, data) => setSelectedKey(data.optionValue ?? null)}>
										{active.options.items.map((item) => (
											<Option key={item.key} value={item.key}>
												{item.label}
											</Option>
										))}
									</Dropdown>
								</div>
							) : null}
						</DialogContent>
						<DialogActions>
							<Button appearance="secondary" onClick={dismiss}>
								{active?.kind === "confirm" ? (active.options.cancelLabel ?? "Cancel") : "Cancel"}
							</Button>
							<Button appearance="primary" onClick={accept} disabled={active?.kind === "select" && selectedKey === null}>
								{active?.kind === "confirm" ? (active.options.confirmLabel ?? "Confirm") : (active?.options.confirmLabel ?? "Confirm")}
							</Button>
						</DialogActions>
					</DialogBody>
				</DialogSurface>
			</Dialog>
		</DialogContext.Provider>
	);
};

export const useDialogs = (): DialogApi => {
	const api = useContext(DialogContext);
	if (!api) {
		throw new Error("useDialogs must be used inside DialogProvider");
	}
	return api;
};

export const useConfirm = () => useDialogs().confirm;

export const useSelectDialog = () => useDialogs().select;
