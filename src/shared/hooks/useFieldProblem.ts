import { useMemo, useState } from "react";

export interface FieldProblem<F extends string> {
	field: F;
	message: string;
}

/** The message a Fluent `Field` shows, which is empty unless the problem is about that field. */
export const fieldMessage = <F extends string>(problem: FieldProblem<F> | null, field: F): string | undefined =>
	problem?.field === field ? problem.message : undefined;

/**
 * One validation message at a time, shown at the control it is about. A guard raised as a red toast
 * in the top corner is not where the user is looking when a field is empty.
 */
export const useFieldProblem = <F extends string>() => {
	const [problem, setProblem] = useState<FieldProblem<F> | null>(null);
	return useMemo(
		() => ({
			problem,
			messageFor: (field: F) => fieldMessage(problem, field),
			/** Raises the message and returns false, so a guard reads `if (!x) { return raise(...); }`. */
			raise: (field: F, message: string) => {
				setProblem({ field, message });
				return false;
			},
			clear: () => setProblem(null),
		}),
		[problem]
	);
};
