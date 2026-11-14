import { Button, Input, type InputProps, makeStyles, mergeClasses } from "@fluentui/react-components";
import { DismissRegular, Search20Regular } from "@fluentui/react-icons";
import { type ReactNode } from "react";

import { clearsOnEscape } from "./clearOnEscape";

const useStyles = makeStyles({
	root: {
		flex: 1,
		minWidth: 0,
		// A column-direction parent reads flex-grow on the vertical axis, which stretched the field
		// to the height of the list below it. It is 32px tall at every size we use.
		maxHeight: "32px",
	},
	after: {
		display: "inline-flex",
		alignItems: "center",
		gap: "2px",
	},
});

export interface SearchFieldProps extends Omit<InputProps, "value" | "onChange" | "size" | "type" | "contentBefore" | "contentAfter"> {
	value: string;
	onChange: (value: string) => void;
	/** Required: a placeholder is not an accessible name. Name what is searched, as the placeholder does. */
	"aria-label": string;
	clearLabel?: string;
	/** An `InfoTip`, or anything else that explains the field, shown at the end of it. */
	hint?: ReactNode;
}

/** The one search and filter control in the extension. It fills its row and never shrinks its placeholder away. */
export const SearchField = ({ value, onChange, className, clearLabel = "Clear search", hint, onKeyDown, ...props }: SearchFieldProps) => {
	const styles = useStyles();
	const clear =
		value === "" ? null : <Button appearance="transparent" size="small" icon={<DismissRegular />} aria-label={clearLabel} onClick={() => onChange("")} />;
	return (
		<Input
			{...props}
			className={mergeClasses(styles.root, className)}
			size="medium"
			value={value}
			contentBefore={<Search20Regular />}
			contentAfter={
				clear === null && hint === undefined ? undefined : (
					<span className={styles.after}>
						{clear}
						{hint}
					</span>
				)
			}
			onChange={(_, data) => onChange(data.value)}
			onKeyDown={(event) => {
				onKeyDown?.(event);
				if (clearsOnEscape(event.key, value)) {
					event.stopPropagation();
					onChange("");
				}
			}}
		/>
	);
};
