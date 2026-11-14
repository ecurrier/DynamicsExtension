import { Input, makeStyles } from "@fluentui/react-components";
import { type FocusEvent } from "react";

import { CopyButton } from "@/shared/components";

const useStyles = makeStyles({
	input: {
		width: "100%",
	},
});

interface CopyableLinkProps {
	url: string;
	label: string;
}

/**
 * A link to take away rather than follow.
 *
 * On a managed laptop the browser that can reach GitHub is often not this one, so the useful thing
 * is text the user can paste into an email, not a button that opens a tab they cannot sign into.
 * The real URL is shown rather than a friendly label, because the URL is what gets copied.
 */
export const CopyableLink = ({ url, label }: CopyableLinkProps) => {
	const styles = useStyles();
	return (
		<Input
			className={styles.input}
			readOnly
			value={url}
			aria-label={label}
			// Tabbing to it selects the whole URL, so Ctrl+C works without reaching for the button.
			onFocus={(event: FocusEvent<HTMLInputElement>) => event.currentTarget.select()}
			contentAfter={<CopyButton text={url} label={label} iconOnly size="small" appearance="transparent" />}
		/>
	);
};
