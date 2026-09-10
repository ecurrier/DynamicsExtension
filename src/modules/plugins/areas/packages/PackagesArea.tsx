import { Button, Input, makeStyles, Spinner, Text, tokens, Tooltip } from "@fluentui/react-components";
import { ArrowClockwise20Regular, Search20Regular } from "@fluentui/react-icons";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { AreaContainer, AreaToolbar, ConnectionPicker, FillAccordion, FormRow, FormStack, Grow, PageRequirementGate } from "@/shared/components";
import { environmentOrigin } from "@/shared/connections";
import { droppedFile, resolveOrgOrigin } from "@/shared/lib";
import { useSessionStore } from "@/shared/stores";
import { type PluginPackage } from "@/shared/types";

import { PackageLayerBadge, PackageLayersLine } from "./PackageLayers";
import { PACKAGE_GRID, PackageRow } from "./PackageRow";
import { UpdatePackageDialog, type UpdatePackageTarget } from "./UpdatePackageDialog";
import { usePluginPackagesGateway, usePluginsConnection } from "../../hooks";
import { packageMatches } from "../../lib";
import { usePluginsStore } from "../../store";

const useStyles = makeStyles({
	caption: {
		color: tokens.colorNeutralForeground3,
	},
	list: {
		flex: 1,
		minHeight: "160px",
		overflow: "auto",
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: tokens.colorNeutralBackground1,
	},
	labels: {
		position: "sticky",
		top: 0,
		zIndex: 1,
		display: "flex",
		alignItems: "center",
		gap: "8px",
		paddingTop: "6px",
		paddingBottom: "6px",
		paddingLeft: "40px",
		paddingRight: "8px",
		backgroundColor: tokens.colorNeutralBackground1,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
		color: tokens.colorNeutralForeground3,
		fontSize: tokens.fontSizeBase200,
		fontWeight: tokens.fontWeightSemibold,
	},
	labelGrid: {
		display: "grid",
		gridTemplateColumns: PACKAGE_GRID,
		gap: "8px",
		flex: 1,
		minWidth: 0,
	},
	labelSpacer: {
		width: "84px",
		flexShrink: 0,
	},
});

export const PackagesArea = () => {
	const styles = useStyles();
	const { connection, environments, switching, onConnectionChange } = usePluginsConnection();
	const packagesFilter = usePluginsStore((state) => state.packagesFilter);
	const setPackagesFilter = usePluginsStore((state) => state.setPackagesFilter);
	const packagesOpenItems = usePluginsStore((state) => state.packagesOpenItems);
	const setPackagesOpenItems = usePluginsStore((state) => state.setPackagesOpenItems);
	const tabUrl = useSessionStore((state) => state.tabUrl);
	const gateway = usePluginPackagesGateway(connection);
	const [target, setTarget] = useState<UpdatePackageTarget | null>(null);

	const packages = useQuery({
		queryKey: gateway.key("list"),
		queryFn: () => gateway.ops.list(),
		enabled: gateway.ready,
		staleTime: 60_000,
		retry: false,
	});
	const all = useMemo(() => packages.data ?? [], [packages.data]);
	const filtered = useMemo(() => all.filter((pkg) => packageMatches(pkg, packagesFilter)), [all, packagesFilter]);
	const filtering = packagesFilter.trim() !== "";
	const openItems = useMemo(() => (filtering ? filtered.map((pkg) => pkg.id) : packagesOpenItems), [filtering, filtered, packagesOpenItems]);
	const origin = gateway.mode === "environment" ? (gateway.environment ? environmentOrigin(gateway.environment) : null) : resolveOrgOrigin(null, tabUrl);

	const openDialog = (pkg: PluginPackage) => setTarget({ package: pkg, initialFile: null });

	const onDropFile = (pkg: PluginPackage, transfer: DataTransfer) => {
		const pending = droppedFile(transfer);
		void pending.then((file) => setTarget({ package: pkg, initialFile: file }));
	};

	const body = (
		<FormStack fill>
			<AreaToolbar>
				<Grow>
					<Input
						contentBefore={<Search20Regular />}
						placeholder="Filter by package, assembly, or plug-in type..."
						value={packagesFilter}
						onChange={(_, data) => setPackagesFilter(data.value)}
					/>
				</Grow>
				<Tooltip content="Reload packages" relationship="label">
					<Button
						icon={<ArrowClockwise20Regular />}
						disabled={!gateway.ready || packages.isFetching}
						onClick={() => void packages.refetch()}
						aria-label="Reload packages"
					/>
				</Tooltip>
			</AreaToolbar>
			{packages.isError ? <Text size={200}>{packages.error.message}</Text> : null}
			{packages.isLoading ? <Spinner size="small" label="Loading plug-in packages..." labelPosition="after" /> : null}
			{packages.isSuccess && filtered.length === 0 ? (
				<Text size={200}>{all.length === 0 ? "No plug-in packages are registered in this environment" : "No packages match the filter"}</Text>
			) : null}
			{filtered.length > 0 ? (
				<div className={styles.list}>
					<div className={styles.labels}>
						<div className={styles.labelGrid}>
							<span>Package</span>
							<span>Version</span>
							<span>Modified</span>
							<span>By</span>
						</div>
						<span className={styles.labelSpacer} />
					</div>
					<FillAccordion
						collapsible
						multiple
						openItems={openItems}
						onToggle={(_, data) => {
							if (!filtering) {
								setPackagesOpenItems([...data.openItems].map(String));
							}
						}}>
						{filtered.map((pkg) => {
							const open = openItems.includes(pkg.id);
							return (
								<PackageRow
									key={pkg.id}
									package={pkg}
									updateDisabled={!gateway.ready || target !== null}
									badges={<PackageLayerBadge gateway={gateway} package={pkg} enabled={open} />}
									details={<PackageLayersLine gateway={gateway} package={pkg} enabled={open} />}
									onUpdate={openDialog}
									onDropFile={onDropFile}
								/>
							);
						})}
					</FillAccordion>
				</div>
			) : null}
			<Text size={200} className={styles.caption}>
				{packages.isFetching ? "Loading..." : `${filtered.length} of ${all.length} packages · drop a .nupkg on a package to update it`}
			</Text>
			<UpdatePackageDialog key={target?.package.id ?? "closed"} target={target} gateway={gateway} origin={origin} onClose={() => setTarget(null)} />
		</FormStack>
	);

	return (
		<AreaContainer fill>
			<FormRow>
				<Grow>
					<ConnectionPicker
						value={connection}
						environments={environments}
						disabled={switching}
						onChange={(picked) => void onConnectionChange(picked)}
					/>
				</Grow>
			</FormRow>
			{gateway.environment ? (
				<Text size={200} className={styles.caption}>
					Packages are read and updated in {gateway.environment.name} as the configured application user.
				</Text>
			) : null}
			{gateway.mode === "page" ? <PageRequirementGate requires="model-driven-app">{body}</PageRequirementGate> : body}
		</AreaContainer>
	);
};
