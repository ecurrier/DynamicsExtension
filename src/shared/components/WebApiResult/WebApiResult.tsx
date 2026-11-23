import { Caption1Strong, Link, makeStyles, MessageBar, MessageBarBody, MessageBarTitle, Text, tokens } from "@fluentui/react-components";

import { webApiOptionRows, webApiUrl } from "@/shared/lib";
import type { WebApiConversion, WebApiWarning } from "@/shared/lib/fetchxml";

import { CopyButton } from "../CopyButton";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalM,
		minWidth: 0,
	},
	section: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXS,
		minWidth: 0,
	},
	valueRow: {
		display: "flex",
		alignItems: "flex-start",
		columnGap: tokens.spacingHorizontalXS,
		minWidth: 0,
	},
	code: {
		flexGrow: 1,
		minWidth: 0,
		margin: 0,
		padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		lineHeight: tokens.lineHeightBase300,
		whiteSpace: "pre-wrap",
		overflowWrap: "anywhere",
		backgroundColor: tokens.colorNeutralBackground3,
		borderRadius: tokens.borderRadiusMedium,
		userSelect: "text",
	},
	options: {
		display: "grid",
		gridTemplateColumns: "max-content minmax(0, 1fr)",
		columnGap: tokens.spacingHorizontalM,
		rowGap: tokens.spacingVerticalXXS,
		margin: 0,
	},
	optionPair: {
		display: "contents",
	},
	optionLabel: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		color: tokens.colorNeutralForeground3,
	},
	optionValue: {
		margin: 0,
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		whiteSpace: "pre-wrap",
		overflowWrap: "anywhere",
	},
	note: {
		color: tokens.colorNeutralForeground3,
	},
	warnings: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXS,
		margin: 0,
		paddingLeft: tokens.spacingHorizontalL,
	},
	warningLink: {
		textAlign: "start",
	},
});

interface CodeValueProps {
	label: string;
	value: string;
	copyLabel: string;
	copiedMessage: string;
}

const CodeValue = ({ label, value, copyLabel, copiedMessage }: CodeValueProps) => {
	const styles = useStyles();
	return (
		<div className={styles.section}>
			<Caption1Strong>{label}</Caption1Strong>
			<div className={styles.valueRow}>
				<pre className={styles.code}>{value}</pre>
				<CopyButton text={value} label={copyLabel} successMessage={copiedMessage} appearance="subtle" size="small" iconOnly />
			</div>
		</div>
	);
};

export interface WebApiResultProps {
	conversion: WebApiConversion;
	baseUrl: string | null;
	stale?: boolean;
	onSelectWarning?: (warning: WebApiWarning) => void;
}

export const WebApiResult = ({ conversion, baseUrl, stale = false, onSelectWarning }: WebApiResultProps) => {
	const styles = useStyles();
	const url = webApiUrl(baseUrl, conversion.path);
	const options = webApiOptionRows(conversion.options);
	return (
		<div className={styles.root}>
			{stale ? (
				<MessageBar intent="warning" layout="multiline">
					<MessageBarBody>
						<MessageBarTitle>Out of date</MessageBarTitle>
						The Fetch XML does not parse. This is the result for the last valid Query.
					</MessageBarBody>
				</MessageBar>
			) : null}
			{conversion.path === null ? (
				<MessageBar intent="warning" layout="multiline">
					<MessageBarBody>
						<MessageBarTitle>No Web API URL</MessageBarTitle>
						The Web API cannot express this Query. The warnings give the reason.
					</MessageBarBody>
				</MessageBar>
			) : (
				<>
					{url ? (
						<CodeValue label="URL" value={url} copyLabel="Copy the URL" copiedMessage="Copied the URL." />
					) : (
						<div className={styles.section}>
							<Caption1Strong>URL</Caption1Strong>
							<Text size={200} className={styles.note}>
								The address of the Connection is not known. Use the path below.
							</Text>
						</div>
					)}
					<CodeValue label="Path" value={conversion.path} copyLabel="Copy the path" copiedMessage="Copied the path." />
					{options.length > 0 ? (
						<div className={styles.section}>
							<Caption1Strong>Query options</Caption1Strong>
							<dl className={styles.options}>
								{options.map((option) => (
									<div key={option.label} className={styles.optionPair}>
										<dt className={styles.optionLabel}>{option.label}</dt>
										<dd className={styles.optionValue}>{option.value}</dd>
									</div>
								))}
							</dl>
						</div>
					) : null}
				</>
			)}
			{conversion.warnings.length > 0 ? (
				<div className={styles.section}>
					<Caption1Strong>{conversion.warnings.length === 1 ? "1 warning" : `${conversion.warnings.length} warnings`}</Caption1Strong>
					<ul className={styles.warnings}>
						{conversion.warnings.map((warning, index) => (
							<li key={`${warning.path.join(".")}-${warning.attribute ?? ""}-${index}`}>
								{onSelectWarning ? (
									<Link as="button" className={styles.warningLink} onClick={() => onSelectWarning(warning)}>
										{warning.message}
									</Link>
								) : (
									<Text size={300}>{warning.message}</Text>
								)}
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
};
