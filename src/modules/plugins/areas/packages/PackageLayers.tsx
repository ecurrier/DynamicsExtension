import { Badge, makeStyles, Spinner, Text, tokens } from "@fluentui/react-components";

import { type PluginPackage } from "@/shared/types";

import { type PluginPackagesGateway, usePackageLayers } from "../../hooks";

const useStyles = makeStyles({
	caption: {
		color: tokens.colorNeutralForeground3,
	},
});

interface PackageLayersProps {
	gateway: PluginPackagesGateway;
	package: PluginPackage;
	enabled: boolean;
}

export const PackageLayerBadge = ({ gateway, package: pkg, enabled }: PackageLayersProps) => {
	const layers = usePackageLayers(gateway, pkg.id, enabled);
	if (!pkg.isManaged || !layers.data?.hasUnmanagedLayer) {
		return null;
	}
	return (
		<Badge appearance="tint" size="small" color="warning">
			Active layer
		</Badge>
	);
};

export const PackageLayersLine = ({ gateway, package: pkg, enabled }: PackageLayersProps) => {
	const styles = useStyles();
	const layers = usePackageLayers(gateway, pkg.id, enabled);
	if (layers.isLoading) {
		return <Spinner size="tiny" label="Loading solution layers..." labelPosition="after" />;
	}
	if (layers.isError) {
		return (
			<Text size={200} className={styles.caption}>
				Solution layers unavailable: {layers.error.message}
			</Text>
		);
	}
	if (!layers.data) {
		return null;
	}
	if (layers.data.unavailable) {
		return (
			<Text size={200} className={styles.caption}>
				Solution layers unavailable: {layers.data.unavailable}
			</Text>
		);
	}
	if (layers.data.layers.length === 0) {
		return (
			<Text size={200} className={styles.caption}>
				No solution layer information was returned for this package.
			</Text>
		);
	}
	return (
		<Text size={200} className={styles.caption}>
			Layers: {layers.data.layers.map((layer) => `${layer.solutionName}${layer.isManaged ? "" : " (unmanaged)"}`).join(" › ")}
		</Text>
	);
};
