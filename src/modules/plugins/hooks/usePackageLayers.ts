import { useQuery } from "@tanstack/react-query";

import { type SolutionLayers } from "@/shared/types";

import { type PluginPackagesGateway } from "./usePluginPackagesGateway";

export const usePackageLayers = (gateway: PluginPackagesGateway, packageId: string | null, enabled: boolean) =>
	useQuery<SolutionLayers>({
		queryKey: gateway.key("getLayers", { id: packageId }),
		queryFn: () => gateway.ops.getLayers({ id: packageId ?? "" }),
		enabled: gateway.ready && enabled && packageId !== null,
		staleTime: 60_000,
		retry: false,
	});
