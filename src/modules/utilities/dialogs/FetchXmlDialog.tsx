import {
	Button,
	Dialog,
	DialogActions,
	DialogBody,
	DialogContent,
	DialogSurface,
	DialogTitle,
	Dropdown,
	Field,
	makeStyles,
	Option,
	Spinner,
	Switch,
	Tab,
	TabList,
} from "@fluentui/react-components";
import { lazy, Suspense, useMemo, useState } from "react";

import { CodeBlock, CopyButton, FormRow, FormStack, Grow } from "@/shared/components";
import { formatXml, toggleQuotes } from "@/shared/lib";
import { type NamedFetchXml } from "@/shared/types";

type OutputFormat = "fetchxml" | "odata" | "javascript";

const WebApiQueryTab = lazy(() => import("./conversions").then((module) => ({ default: module.WebApiQueryTab })));
const JavaScriptTab = lazy(() => import("./conversions").then((module) => ({ default: module.JavaScriptTab })));

const useStyles = makeStyles({
	output: {
		minHeight: "120px",
	},
});

interface FetchXmlDialogBodyProps {
	queries: NamedFetchXml[];
	onClose: () => void;
	onRetrieveRecords: (fetchXml: string) => void;
	onOpenInQueryBuilder?: (fetchXml: string) => void;
}

const FetchXmlDialogBody = ({ queries, onClose, onRetrieveRecords, onOpenInQueryBuilder }: FetchXmlDialogBodyProps) => {
	const styles = useStyles();
	const [selectedIndex, setSelectedIndex] = useState("0");
	const [doubleQuotes, setDoubleQuotes] = useState(true);
	const [format, setFormat] = useState<OutputFormat>("fetchxml");

	const formatted = useMemo(() => queries.map((query) => ({ name: query.name, fetchXml: formatXml(query.fetchXml) })), [queries]);
	const selected = formatted[Number(selectedIndex)];
	const fetchXml = selected ? toggleQuotes(selected.fetchXml, doubleQuotes) : "";
	const loadingConverter = <Spinner size="tiny" label="Loading" labelPosition="after" />;

	return (
		<DialogBody>
			<DialogTitle>Generated Query</DialogTitle>
			<DialogContent>
				<FormStack>
					<FormRow>
						<Grow>
							<Field label="Query">
								<Dropdown
									value={selected?.name ?? ""}
									selectedOptions={[selectedIndex]}
									onOptionSelect={(_, data) => data.optionValue && setSelectedIndex(data.optionValue)}>
									{formatted.map((query, index) => (
										<Option key={`${index}-${query.name}`} value={String(index)} text={query.name}>
											{query.name}
										</Option>
									))}
								</Dropdown>
							</Field>
						</Grow>
						{format === "fetchxml" ? (
							<Switch label="Double quotes" checked={doubleQuotes} onChange={(_, data) => setDoubleQuotes(data.checked)} />
						) : null}
					</FormRow>
					<TabList selectedValue={format} onTabSelect={(_, data) => setFormat(data.value as OutputFormat)} size="small">
						<Tab value="fetchxml">Fetch XML</Tab>
						<Tab value="odata">Web API query</Tab>
						<Tab value="javascript">JavaScript</Tab>
					</TabList>
					<div className={styles.output}>
						{format === "fetchxml" ? <CodeBlock value={fetchXml} language="xml" height="280px" /> : null}
						{format === "odata" && selected ? (
							<Suspense fallback={loadingConverter}>
								<WebApiQueryTab fetchXml={selected.fetchXml} />
							</Suspense>
						) : null}
						{format === "javascript" && selected ? (
							<Suspense fallback={loadingConverter}>
								<JavaScriptTab fetchXml={selected.fetchXml} />
							</Suspense>
						) : null}
					</div>
				</FormStack>
			</DialogContent>
			{onOpenInQueryBuilder ? (
				<DialogActions position="start">
					<Button appearance="subtle" disabled={!selected} onClick={() => selected && onOpenInQueryBuilder(selected.fetchXml)}>
						Open in Query Builder
					</Button>
				</DialogActions>
			) : null}
			<DialogActions>
				<Button appearance="secondary" onClick={onClose}>
					Close
				</Button>
				{format === "fetchxml" ? <CopyButton text={fetchXml} label="Copy" successMessage="Copied to clipboard" /> : null}
				<Button appearance="primary" disabled={!fetchXml} onClick={() => onRetrieveRecords(fetchXml)}>
					Retrieve Records
				</Button>
			</DialogActions>
		</DialogBody>
	);
};

interface FetchXmlDialogProps {
	queries: NamedFetchXml[] | null;
	onClose: () => void;
	onRetrieveRecords: (fetchXml: string) => void;
	onOpenInQueryBuilder?: (fetchXml: string) => void;
}

export const FetchXmlDialog = ({ queries, onClose, onRetrieveRecords, onOpenInQueryBuilder }: FetchXmlDialogProps) => (
	<Dialog open={queries !== null} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
		<DialogSurface style={{ maxWidth: "680px" }}>
			{queries ? (
				<FetchXmlDialogBody queries={queries} onClose={onClose} onRetrieveRecords={onRetrieveRecords} onOpenInQueryBuilder={onOpenInQueryBuilder} />
			) : null}
		</DialogSurface>
	</Dialog>
);
