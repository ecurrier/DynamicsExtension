import {
	Button,
	Field,
	makeStyles,
	MessageBar,
	MessageBarBody,
	MessageBarTitle,
	Radio,
	RadioGroup,
	Spinner,
	Text,
	Textarea,
	tokens,
} from "@fluentui/react-components";
import { ArrowReset20Regular, Dismiss20Regular, Open20Regular } from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";

import { usePageQuery } from "@/messaging/client";
import { AreaContainer, CopyButton, FormRow } from "@/shared/components";
import { openUrl } from "@/shared/extension";
import { useAsyncAction, usePopupLaunch } from "@/shared/hooks";
import {
	type BugAnswers,
	buildIssueUrl,
	buildSafeContext,
	bugPrompts,
	composeReport,
	composeTitle,
	FEEDBACK_AREA_ID,
	FEEDBACK_ISSUES_URL,
	type FeedbackKind,
	type IdeaAnswers,
	ideaPrompts,
	REPORT_COUNTER_FROM,
	REPORT_LIMIT,
} from "@/shared/lib";
import { useCrashStore, useNavigationStore } from "@/shared/stores";

import { AboutBlock } from "./AboutBlock";
import { CopyableLink } from "./CopyableLink";
import { useFeedbackDraft } from "./useFeedbackDraft";
import { useExtensionSettings } from "../../hooks";

const useStyles = makeStyles({
	hint: {
		color: tokens.colorNeutralForeground3,
		fontSize: tokens.fontSizeBase200,
	},
	counter: {
		color: tokens.colorNeutralForeground3,
		fontSize: tokens.fontSizeBase200,
	},
	counterOver: {
		color: tokens.colorPaletteRedForeground1,
		fontSize: tokens.fontSizeBase200,
	},
	preview: {
		fontFamily: tokens.fontFamilyMonospace,
	},
});

interface UserAgentData {
	platform?: string;
}

const readUaPlatform = (): string | null => (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData?.platform ?? null;

export const FeedbackArea = () => {
	const styles = useStyles();
	const { draft, patch, clear } = useFeedbackDraft();
	const launch = usePopupLaunch();
	const recentAreaIds = useNavigationStore((state) => state.recentAreaIds);
	const pendingCrash = useCrashStore((state) => state.pending);
	const clearCrash = useCrashStore((state) => state.clear);
	const pageContext = usePageQuery("global.getPageContext", undefined);
	const { settings } = useExtensionSettings();
	const openGitHub = useAsyncAction("Could not open GitHub");
	const [opened, setOpened] = useState(false);

	// A crash hands itself over once the draft has loaded, so the stored value arriving a tick
	// later cannot overwrite it.
	useEffect(() => {
		if (pendingCrash !== null && draft !== null) {
			patch({ kind: "bug", crash: pendingCrash, edited: null });
			clearCrash();
		}
	}, [pendingCrash, draft, patch, clearCrash]);

	// The Area the user was on when they hit the problem, not this one.
	const sourceAreaId = recentAreaIds.find((id) => id !== FEEDBACK_AREA_ID) ?? FEEDBACK_AREA_ID;

	const context = useMemo(
		() =>
			buildSafeContext({
				version: __APP_VERSION__,
				userAgent: navigator.userAgent,
				uaPlatform: readUaPlatform(),
				language: navigator.language,
				surface: launch.mode,
				areaId: sourceAreaId,
				pageContext: pageContext.data ?? null,
				theme: settings.themeMode,
			}),
		[launch.mode, sourceAreaId, pageContext.data, settings.themeMode]
	);

	const generated = useMemo(() => (draft === null ? "" : composeReport(draft, context)), [draft, context]);

	if (draft === null) {
		return <Spinner style={{ padding: "24px" }} />;
	}

	const crash = draft.crash;
	const report = draft.edited ?? generated;
	const link = buildIssueUrl(composeTitle(draft), report);
	const tooLong = !link.withinLimit;
	const ready = (draft.kind === "bug" ? draft.bug.doing : draft.idea.goal).trim() !== "";
	const empty = !ready && crash === null && draft.edited === null;

	const setBug = (key: keyof BugAnswers, value: string) => {
		const bug: BugAnswers = { ...draft.bug, [key]: value };
		patch({ bug });
	};

	const setIdea = (key: keyof IdeaAnswers, value: string) => {
		const idea: IdeaAnswers = { ...draft.idea, [key]: value };
		patch({ idea });
	};

	const onContinue = () =>
		void openGitHub.run(async () => {
			await openUrl(link.url);
			setOpened(true);
		});

	const onClear = () => {
		clear();
		setOpened(false);
	};

	return (
		<AreaContainer>
			<Field label="What kind of feedback is this?">
				<RadioGroup layout="horizontal" value={draft.kind} onChange={(_, data) => patch({ kind: data.value as FeedbackKind, edited: null })}>
					<Radio value="bug" label="Bug" />
					<Radio value="idea" label="Idea" />
				</RadioGroup>
			</Field>

			{draft.kind === "bug"
				? bugPrompts.map(([key, prompt], index) => (
						<Field key={key} label={prompt} required={index === 0}>
							<Textarea resize="vertical" value={draft.bug[key]} onChange={(_, data) => setBug(key, data.value)} />
						</Field>
					))
				: ideaPrompts.map(([key, prompt], index) => (
						<Field key={key} label={prompt} required={index === 0}>
							<Textarea resize="vertical" value={draft.idea[key]} onChange={(_, data) => setIdea(key, data.value)} />
						</Field>
					))}

			{draft.kind === "bug" && crash !== null ? (
				<>
					<Field
						label="Error details"
						hint="Shown so you can check it before it goes anywhere. Edit or clear it if anything here looks like it came from your environment.">
						<Textarea resize="vertical" value={crash.detail} onChange={(_, data) => patch({ crash: { ...crash, detail: data.value } })} />
					</Field>
					<Text className={styles.hint}>
						The stack trace is attached too. It points at Power Tools&apos; own code, which is public, and carries nothing from your environment.
					</Text>
					<FormRow>
						<Button size="small" icon={<Dismiss20Regular />} onClick={() => patch({ crash: null, edited: null })}>
							Remove the error details
						</Button>
					</FormRow>
				</>
			) : null}

			<Field label="Report preview" hint="This is exactly what gets posted. Edit it freely: nothing leaves Power Tools until you press the button below.">
				<Textarea className={styles.preview} resize="vertical" rows={10} value={report} onChange={(_, data) => patch({ edited: data.value })} />
			</Field>

			{draft.edited === null ? null : (
				<FormRow>
					<Text className={styles.hint}>You have edited this by hand, so it no longer follows the answers above.</Text>
					<Button size="small" icon={<ArrowReset20Regular />} onClick={() => patch({ edited: null })}>
						Use the generated report
					</Button>
				</FormRow>
			)}

			{report.length >= REPORT_COUNTER_FROM ? (
				<Text aria-live="polite" className={tooLong ? styles.counterOver : styles.counter}>
					{report.length.toLocaleString()} of {REPORT_LIMIT.toLocaleString()} characters
					{tooLong ? ". That is too long to prefill GitHub, so copy the report and paste it there instead." : null}
				</Text>
			) : null}

			{opened ? (
				<MessageBar intent="info" layout="multiline">
					<MessageBarBody>
						<MessageBarTitle>Opened on GitHub</MessageBarTitle>
						Your report is still here. Power Tools cannot tell whether you posted it, so nothing is cleared until you say so.
					</MessageBarBody>
				</MessageBar>
			) : null}

			<FormRow>
				{tooLong ? null : (
					<Button appearance="primary" icon={<Open20Regular />} disabled={!ready || openGitHub.running} onClick={onContinue}>
						{opened ? "Open again" : "Continue on GitHub"}
					</Button>
				)}
				<CopyButton text={report} label="Copy report" appearance={tooLong ? "primary" : "secondary"} disabled={!ready} />
				<Button icon={<Dismiss20Regular />} disabled={empty} onClick={onClear}>
					Clear
				</Button>
			</FormRow>
			<Text className={styles.hint}>
				You will need a GitHub account to post this. Power Tools sends nothing itself: it opens the issue form with your words already in it, and you
				submit it.
			</Text>
			<Field label="If you cannot post it yourself" hint="Copy the report above and this link, then send both to someone who can open an issue.">
				<CopyableLink url={FEEDBACK_ISSUES_URL} label="Copy the issues link" />
			</Field>

			<AboutBlock />
		</AreaContainer>
	);
};
