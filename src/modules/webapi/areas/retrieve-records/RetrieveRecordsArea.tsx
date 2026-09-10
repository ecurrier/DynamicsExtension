import { AccordionHeader, Button, makeStyles, Text } from "@fluentui/react-components";
import { useState } from "react";

import { usePageMutation } from "@/messaging/client";
import { AreaContainer, CodeEditor, FillAccordion, FillAccordionItem, FillAccordionPanel, useAppToast } from "@/shared/components";

import { ResultsPreview } from "./ResultsPreview";
import { extractEntityName, type ResultRow } from "../../lib";
import { useWebApiStore } from "../../store";

const useStyles = makeStyles({
	panel: {
		display: "flex",
		flexDirection: "column",
		gap: "12px",
		flex: 1,
		minHeight: 0,
	},
	editor: {
		flex: 1,
		minHeight: "160px",
	},
	actions: {
		display: "flex",
		justifyContent: "flex-end",
	},
});

type Section = "editor" | "results";

export const RetrieveRecordsArea = () => {
	const styles = useStyles();
	const toast = useAppToast();
	const fetchXml = useWebApiStore((state) => state.fetchXml);
	const setFetchXml = useWebApiStore((state) => state.setFetchXml);
	const [openItems, setOpenItems] = useState<Section[]>(["editor"]);
	const [results, setResults] = useState<{ entityName: string; rows: ResultRow[] } | null>(null);

	const execute = usePageMutation("webapi.executeFetchXml", {
		onSuccess: (rows, args) => {
			setResults({ entityName: extractEntityName(args.fetchXml) ?? "record", rows });
			setOpenItems(["results"]);
			toast.success(`Retrieved ${rows.length} record${rows.length === 1 ? "" : "s"}`);
		},
	});

	return (
		<AreaContainer fill>
			<FillAccordion grow multiple collapsible openItems={openItems} onToggle={(_, data) => setOpenItems(data.openItems as Section[])}>
				<FillAccordionItem value="editor">
					<AccordionHeader>Fetch XML Editor</AccordionHeader>
					<FillAccordionPanel grow>
						<div className={styles.panel}>
							<div className={styles.editor}>
								<CodeEditor fill value={fetchXml} language="xml" placeholder="Enter Fetch XML..." onChange={setFetchXml} />
							</div>
							<div className={styles.actions}>
								<Button appearance="primary" disabled={!fetchXml.trim() || execute.isPending} onClick={() => execute.mutate({ fetchXml })}>
									{execute.isPending ? "Executing..." : "Execute"}
								</Button>
							</div>
						</div>
					</FillAccordionPanel>
				</FillAccordionItem>
				<FillAccordionItem value="results">
					<AccordionHeader>View Results</AccordionHeader>
					<FillAccordionPanel grow>
						<div className={styles.panel}>
							{results ? (
								<ResultsPreview entityName={results.entityName} rows={results.rows} />
							) : (
								<Text size={200}>Execute a Fetch XML query to view records.</Text>
							)}
						</div>
					</FillAccordionPanel>
				</FillAccordionItem>
			</FillAccordion>
		</AreaContainer>
	);
};
