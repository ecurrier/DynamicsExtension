import {
	Menu,
	type MenuButtonProps,
	MenuGroup,
	MenuGroupHeader,
	MenuItem,
	MenuList,
	MenuPopover,
	MenuTrigger,
	SplitButton,
	Tooltip,
} from "@fluentui/react-components";
import { Copy20Regular } from "@fluentui/react-icons";

import { useAppToast } from "@/shared/components";
import { copyToClipboard } from "@/shared/lib";

import { COPY_FORM_LABELS, COPY_MENU_FORMS, copyBlockedReason, type CopyForm, copyQuery, DOES_NOT_PARSE } from "./lib";
import { useQueryBuilder, useQueryBuilderStoreApi } from "./store";

export const XmlCopyButton = () => {
	const store = useQueryBuilderStoreApi();
	const toast = useAppToast();
	const hasText = useQueryBuilder((state) => state.text.trim() !== "");
	const parses = useQueryBuilder((state) => state.errors.length === 0);
	const copyState = { hasText, parses };

	const copy = async (form: CopyForm) => {
		const parsed = store.getState().parseNow();
		const { text } = store.getState();
		const outcome = copyQuery(form, { text, document: parsed.errors.length === 0 ? parsed.query : null });
		if (!outcome.ok) {
			toast.info(outcome.reason);
			return;
		}
		try {
			await copyToClipboard(outcome.text);
			toast.success(outcome.message);
		} catch (error) {
			toast.error("The copy failed.", error);
		}
	};

	const items = COPY_MENU_FORMS.map((form) => (
		<MenuItem key={form} disabled={copyBlockedReason(form, copyState) !== null} onClick={() => void copy(form)}>
			{COPY_FORM_LABELS[form]}
		</MenuItem>
	));

	return (
		<Menu positioning="below-end">
			<MenuTrigger disableButtonEnhancement>
				{(triggerProps: MenuButtonProps) => (
					<Tooltip content="Copy the Query as it runs, without Excluded rows" relationship="description">
						<SplitButton
							size="small"
							appearance="subtle"
							icon={<Copy20Regular />}
							menuButton={{ ...triggerProps, "aria-label": "More copy forms" }}
							primaryActionButton={{ disabled: !hasText, onClick: () => void copy("query") }}>
							{COPY_FORM_LABELS.query}
						</SplitButton>
					</Tooltip>
				)}
			</MenuTrigger>
			<MenuPopover>
				<MenuList>
					{parses ? (
						items
					) : (
						<MenuGroup>
							<MenuGroupHeader>{DOES_NOT_PARSE}</MenuGroupHeader>
							{items}
						</MenuGroup>
					)}
				</MenuList>
			</MenuPopover>
		</Menu>
	);
};
