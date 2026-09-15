import { useCallback } from "react";

import { usePageFetcher } from "@/messaging/client";
import { useSelectDialog } from "@/shared/components";
import { defaultSolutionName, DEFAULT_SOLUTION_ID, DEFAULT_SOLUTION_UNIQUE_NAME } from "@/shared/lib";
import { type Solution } from "@/shared/types";

export const DEFAULT_SOLUTION: Solution = { id: DEFAULT_SOLUTION_ID, name: "Default Solution", uniqueName: DEFAULT_SOLUTION_UNIQUE_NAME };

export const pickDefaultSolution = (solutions: Solution[]): Solution => solutions.find((solution) => defaultSolutionName(solution.name)) ?? DEFAULT_SOLUTION;

export const useSolutionPicker = () => {
	const select = useSelectDialog();
	const fetchPage = usePageFetcher();

	return useCallback(
		async (useDefault: boolean, description = "Select the solution the change should be made in"): Promise<Solution | null> => {
			const solutions = await fetchPage("global.getSolutions", undefined);
			if (useDefault) {
				return pickDefaultSolution(solutions);
			}
			const id = await select<string>({
				title: "Select a solution",
				description,
				items: solutions.map((solution) => ({ key: solution.id, label: solution.name, value: solution.id })),
				placeholder: "Select a solution...",
			});
			return solutions.find((solution) => solution.id === id) ?? null;
		},
		[fetchPage, select]
	);
};
