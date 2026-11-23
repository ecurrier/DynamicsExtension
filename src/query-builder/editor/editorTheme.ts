import { type Extension, Prec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tokens } from "@fluentui/react-components";

export const xmlPaneTheme: Extension = Prec.highest(
	EditorView.theme({
		"&.cm-editor .cm-tooltip": {
			backgroundColor: tokens.colorNeutralBackground1,
			color: tokens.colorNeutralForeground1,
			border: `1px solid ${tokens.colorNeutralStroke1}`,
			borderRadius: tokens.borderRadiusMedium,
			boxShadow: tokens.shadow8,
			overflow: "hidden",
		},
		"&.cm-editor .cm-tooltip-autocomplete > ul": {
			fontFamily: tokens.fontFamilyMonospace,
			maxHeight: "16em",
		},
		"&.cm-editor .cm-tooltip-autocomplete > ul > li": {
			padding: `2px ${tokens.spacingHorizontalS}`,
		},
		"&.cm-editor .cm-tooltip-autocomplete > ul > li[aria-selected]": {
			backgroundColor: tokens.colorBrandBackground,
			color: tokens.colorNeutralForegroundOnBrand,
		},
		"&.cm-editor .cm-completionDetail": {
			marginLeft: tokens.spacingHorizontalS,
			fontFamily: tokens.fontFamilyBase,
			fontStyle: "normal",
			opacity: 0.8,
		},
		"&.cm-editor .cm-completionInfo": {
			maxWidth: "320px",
			padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
			fontFamily: tokens.fontFamilyBase,
		},
		"&.cm-editor .cm-diagnostic": {
			padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
			fontFamily: tokens.fontFamilyBase,
			fontSize: tokens.fontSizeBase200,
		},
	})
);
