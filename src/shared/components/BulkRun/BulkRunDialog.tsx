import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, makeStyles } from "@fluentui/react-components";
import { useRef, useState } from "react";

import { bulkRunProgress, retryPlan, runBulkPlan } from "@/shared/lib";
import { type BulkRunItem, type BulkRunPlan, type BulkRunProgress, type BulkRunResult } from "@/shared/types";

import { BulkRunPreview } from "./BulkRunPreview";
import { BulkRunProgressView } from "./BulkRunProgressView";
import { BulkRunResultView } from "./BulkRunResultView";

const useStyles = makeStyles({
	surface: {
		maxWidth: "760px",
	},
});

type Step = "preview" | "running" | "result";

interface BulkRunDialogProps<TArgs> {
	plan: BulkRunPlan<TArgs> | null;
	execute: (item: BulkRunItem<TArgs>) => Promise<void>;
	warning?: string;
	concurrency?: number;
	onClose: () => void;
	onFinished?: (result: BulkRunResult<TArgs>) => void;
}

export const BulkRunDialog = <TArgs,>({ plan, execute, warning, concurrency, onClose, onFinished }: BulkRunDialogProps<TArgs>) => {
	const styles = useStyles();
	const [step, setStep] = useState<Step>("preview");
	const [activePlan, setActivePlan] = useState<BulkRunPlan<TArgs> | null>(null);
	const [progress, setProgress] = useState<BulkRunProgress>(bulkRunProgress(0, 0));
	const [result, setResult] = useState<BulkRunResult<TArgs> | null>(null);
	const abort = useRef<AbortController | null>(null);

	const current = activePlan ?? plan;

	const start = async (target: BulkRunPlan<TArgs>) => {
		const controller = new AbortController();
		abort.current = controller;
		setActivePlan(target);
		setResult(null);
		setProgress(bulkRunProgress(0, target.items.length));
		setStep("running");
		const outcome = await runBulkPlan(target, execute, {
			concurrency,
			signal: controller.signal,
			onProgress: (completed, total) => setProgress(bulkRunProgress(completed, total)),
		});
		abort.current = null;
		setResult(outcome);
		setStep("result");
		onFinished?.(outcome);
	};

	const close = () => {
		abort.current?.abort();
		abort.current = null;
		setStep("preview");
		setActivePlan(null);
		setResult(null);
		onClose();
	};

	const retry = result ? retryPlan(result) : null;

	return (
		<Dialog open={plan !== null} onOpenChange={(_, data) => (data.open ? undefined : close())}>
			<DialogSurface className={styles.surface}>
				<DialogBody>
					<DialogTitle>{current?.title ?? "Apply changes"}</DialogTitle>
					<DialogContent>
						{current === null ? null : step === "preview" ? (
							<BulkRunPreview plan={current} warning={warning} />
						) : step === "running" ? (
							<BulkRunProgressView progress={progress} action={current.action} />
						) : result ? (
							<BulkRunResultView result={result} />
						) : null}
					</DialogContent>
					<DialogActions>
						{step === "preview" ? (
							<>
								<Button appearance="secondary" onClick={close}>
									Cancel
								</Button>
								<Button appearance="primary" disabled={!current || current.items.length === 0} onClick={() => void (current && start(current))}>
									{current ? `${current.action} ${current.items.length}` : "Apply"}
								</Button>
							</>
						) : step === "running" ? (
							<Button appearance="secondary" onClick={() => abort.current?.abort()}>
								Stop
							</Button>
						) : (
							<>
								{retry ? (
									<Button appearance="secondary" onClick={() => void start(retry)}>
										Retry {retry.items.length} unfinished
									</Button>
								) : null}
								<Button appearance="primary" onClick={close}>
									Close
								</Button>
							</>
						)}
					</DialogActions>
				</DialogBody>
			</DialogSurface>
		</Dialog>
	);
};
