import { useState } from "react";

import { usePageQuery } from "@/messaging/client";
import { pickDefaultSolution, useAsyncAction, useSolutionPicker } from "@/shared/hooks";
import { type Solution } from "@/shared/types";

export interface SchemaSolution {
	current: Solution | null;
	uniqueName: string | null;
	prefix: string | null;
	name: string;
	choose: () => void;
}

export const useSchemaSolution = (): SchemaSolution => {
	const pickSolution = useSolutionPicker();
	const picking = useAsyncAction("Could not load the solutions");
	const solutions = usePageQuery("global.getSolutions", undefined);
	const [chosen, setChosen] = useState<Solution | null>(null);
	const current = chosen ?? (solutions.data ? pickDefaultSolution(solutions.data) : null);

	return {
		current,
		uniqueName: chosen?.uniqueName ?? null,
		prefix: current?.publisherPrefix || null,
		name: current?.name ?? "the default solution",
		choose: () =>
			void picking.run(async () => {
				const picked = await pickSolution(false, "Select the solution these schema changes should be made in");
				if (picked) {
					setChosen(picked);
				}
			}),
	};
};
