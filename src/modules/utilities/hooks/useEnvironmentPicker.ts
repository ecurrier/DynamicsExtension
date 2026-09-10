import { useCallback } from "react";

import { usePageFetcher } from "@/messaging/client";
import { useEnvironments } from "@/modules/settings";
import { useSelectDialog } from "@/shared/components";
import { type CloudType } from "@/shared/types";

export interface PickedEnvironment {
	environmentType: CloudType;
	environmentId: string | null;
}

export const useEnvironmentPicker = () => {
	const select = useSelectDialog();
	const fetchPage = usePageFetcher();
	const { environments } = useEnvironments();

	return useCallback(
		async (useCurrent: boolean): Promise<PickedEnvironment | null> => {
			const current = await fetchPage("settings.getEnvironmentDetails", undefined).catch(() => null);
			const saved = environments.filter((environment) => environment.environmentId);
			if (useCurrent || saved.length === 0) {
				if (!current) {
					throw new Error("The current environment could not be determined. Open a model-driven app or save an environment in Settings.");
				}
				return { environmentType: current.environmentType, environmentId: current.environmentId || null };
			}
			const items = [
				...(current
					? [
							{
								key: "current",
								label: "Current Environment",
								value: { environmentType: current.environmentType, environmentId: current.environmentId || null },
							},
						]
					: []),
				...saved.map((environment) => ({
					key: environment.id,
					label: environment.name,
					value: { environmentType: environment.environmentType, environmentId: environment.environmentId },
				})),
			];
			return select<PickedEnvironment>({
				title: "Select an environment",
				items,
				placeholder: "Select an environment...",
			});
		},
		[environments, fetchPage, select]
	);
};
