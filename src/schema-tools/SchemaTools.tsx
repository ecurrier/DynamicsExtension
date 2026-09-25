import { Divider, makeStyles, mergeClasses, Spinner, Tab, TabList, Text, tokens } from "@fluentui/react-components";
import { Database16Regular, Table20Regular } from "@fluentui/react-icons";
import { useState } from "react";

import { usePageQuery } from "@/messaging/client";
import { useSchemaGateway } from "@/modules/schema/hooks";
import { EmptyState } from "@/shared/components";
import { type SchemaTool, type SchemaToolsLaunch } from "@/shared/types";

import { CrossTableColumns } from "./CrossTableColumns";
import { PolymorphicLookups } from "./PolymorphicLookups";
import { SolutionButton } from "./SolutionButton";
import { useSchemaSolution } from "./useSchemaSolution";
import { connectionFor, type SchemaBootstrapStatus } from "./useSchemaToolsBootstrap";

const useStyles = makeStyles({
	root: {
		containerType: "inline-size",
		display: "flex",
		flexDirection: "column",
		height: "100%",
		minHeight: 0,
		backgroundColor: tokens.colorNeutralBackground2,
	},
	bar: {
		display: "flex",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalM,
		minWidth: 0,
		padding: `0 ${tokens.spacingHorizontalL} 0 ${tokens.spacingHorizontalXL}`,
		backgroundColor: tokens.colorNeutralBackground1,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	hostedBar: {
		paddingLeft: tokens.spacingHorizontalS,
		paddingRight: tokens.spacingHorizontalM,
	},
	brand: {
		display: "flex",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalSNudge,
	},
	brandIcon: {
		fontSize: "20px",
		color: tokens.colorBrandForeground1,
	},
	brandText: {
		"@container (max-width: 900px)": {
			display: "none",
		},
	},
	divider: {
		flexGrow: 0,
		height: "20px",
	},
	tabs: {
		flexShrink: 0,
	},
	spacer: {
		flexGrow: 1,
	},
	environment: {
		display: "flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXS,
		minWidth: 0,
		overflow: "hidden",
		whiteSpace: "nowrap",
		color: tokens.colorNeutralForeground3,
		"@container (max-width: 900px)": {
			display: "none",
		},
	},
	body: {
		flexGrow: 1,
		minHeight: 0,
		overflow: "auto",
	},
	tool: {
		height: "100%",
	},
});

interface SchemaToolsProps {
	launch: SchemaToolsLaunch;
	hosted?: boolean;
}

export const SchemaTools = ({ launch, hosted = false }: SchemaToolsProps) => {
	const styles = useStyles();
	const [tool, setTool] = useState<SchemaTool>(launch.tool);
	const [opened, setOpened] = useState<SchemaTool[]>([launch.tool]);
	const gateway = useSchemaGateway(connectionFor(launch));
	const solution = useSchemaSolution();
	const environment = usePageQuery("settings.getEnvironmentDetails", undefined, { enabled: !hosted });
	const environmentName = hosted ? null : (environment.data?.environmentName ?? null);

	const select = (next: SchemaTool) => {
		setTool(next);
		setOpened((current) => (current.includes(next) ? current : [...current, next]));
	};

	return (
		<div className={styles.root}>
			<div className={mergeClasses(styles.bar, hosted && styles.hostedBar)}>
				{hosted ? null : (
					<>
						<div className={styles.brand}>
							<Table20Regular className={styles.brandIcon} />
							<Text weight="semibold" size={400} className={styles.brandText}>
								Schema tools
							</Text>
						</div>
						<Divider vertical className={styles.divider} />
					</>
				)}
				<TabList className={styles.tabs} selectedValue={tool} onTabSelect={(_, data) => select(data.value as SchemaTool)}>
					<Tab value="columns">Cross-Table Columns</Tab>
					<Tab value="polymorphic">Polymorphic Lookups</Tab>
				</TabList>
				<div className={styles.spacer} />
				{environmentName ? (
					<Text size={200} className={styles.environment} title={environmentName}>
						<Database16Regular />
						{environmentName}
					</Text>
				) : null}
				<SolutionButton solution={solution} compact={hosted} />
			</div>
			<div className={styles.body}>
				{opened.includes("columns") ? (
					<div className={styles.tool} hidden={tool !== "columns"}>
						<CrossTableColumns gateway={gateway} solution={solution} />
					</div>
				) : null}
				{opened.includes("polymorphic") ? (
					<div className={styles.tool} hidden={tool !== "polymorphic"}>
						<PolymorphicLookups gateway={gateway} solution={solution} />
					</div>
				) : null}
			</div>
		</div>
	);
};

export const SchemaToolsApp = ({ status }: { status: SchemaBootstrapStatus }) => {
	if (status.kind === "loading") {
		return <Spinner style={{ padding: "24px" }} />;
	}
	if (status.kind === "missing") {
		return (
			<EmptyState title="No schema tools session" intent="warning">
				{status.reason}
			</EmptyState>
		);
	}
	return <SchemaTools launch={status.launch} />;
};
