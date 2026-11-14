import { type CrashNote } from "./types";

/** Deep React trees produce very long stacks, and the top frames are the ones that matter. */
const STACK_FRAME_LIMIT = 25;

/**
 * The stack, reduced to its frames.
 *
 * V8 puts the error message on the first line of `stack`, so handing the raw stack over would
 * smuggle the message back in after the user had deleted it from the editable field. Keeping only
 * the `at ...` lines means the attached stack is file, function and line and nothing else.
 */
export const stackFrames = (stack: string): string => {
	const frames = stack
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("at "));
	const kept = frames.slice(0, STACK_FRAME_LIMIT);
	if (frames.length > kept.length) {
		kept.push(`... ${frames.length - kept.length} more frames`);
	}
	return kept.join("\n");
};

/**
 * Splits a caught error into the part the user reviews and the part that is safe to attach.
 *
 * `detail` can carry anything an upstream `throw` interpolated into the message, so it is shown as
 * editable text. The frames are a walk through our own bundle, which is public.
 */
export const toCrashNote = (error: unknown): CrashNote => {
	if (error instanceof Error) {
		return { detail: `${error.name}: ${error.message}`, stack: stackFrames(error.stack ?? "") };
	}
	return { detail: String(error), stack: "" };
};
