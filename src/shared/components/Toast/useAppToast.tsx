import { Button, Toast, ToastBody, ToastTitle, ToastTrigger, useToastController } from "@fluentui/react-components";
import { Dismiss16Regular } from "@fluentui/react-icons";
import { type ReactNode, useMemo } from "react";

import { isPageCommandError } from "@/messaging/client";

export const APP_TOASTER_ID = "app-toaster";

const describe = (error: unknown): string => {
	if (isPageCommandError(error)) {
		return error.message;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
};

/** Fluent's `ToastContainer` has no click-to-dismiss and no swipe, so every toast carries a close button. */
const close = (
	<ToastTrigger>
		<Button appearance="transparent" size="small" icon={<Dismiss16Regular />} aria-label="Close" />
	</ToastTrigger>
);

const content = (title: string, body?: ReactNode) => (
	<Toast>
		<ToastTitle action={close}>{title}</ToastTitle>
		{body !== undefined && body !== null ? <ToastBody>{body}</ToastBody> : null}
	</Toast>
);

export const useAppToast = () => {
	const { dispatchToast } = useToastController(APP_TOASTER_ID);
	return useMemo(
		() => ({
			success: (title: string, body?: string) => dispatchToast(content(title, body), { intent: "success" }),
			info: (title: string, body?: string) => dispatchToast(content(title, body), { intent: "info" }),
			error: (title: string, error?: unknown) => dispatchToast(content(title, error === undefined ? undefined : describe(error)), { intent: "error" }),
		}),
		[dispatchToast]
	);
};
