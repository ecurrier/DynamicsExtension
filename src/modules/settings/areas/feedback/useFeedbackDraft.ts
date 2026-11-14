import { useCallback, useEffect, useState } from "react";

import { EMPTY_FEEDBACK_DRAFT, type FeedbackDraft } from "@/shared/lib/feedback";
import { feedbackDraftItem } from "@/shared/storage";

/**
 * The draft, held in extension storage rather than component state.
 *
 * Every change is written straight through, with no debounce. An extension popup closes the moment
 * it loses focus, and the user will click back to the Dynamics page mid-sentence to check what they
 * are describing, so there is no safe window to batch writes into. Storage writes are cheap; a lost
 * report is not.
 */
export const useFeedbackDraft = () => {
	const [draft, setDraft] = useState<FeedbackDraft | null>(null);

	useEffect(() => {
		let active = true;
		void feedbackDraftItem.getValue().then((stored) => {
			if (active) {
				setDraft(stored);
			}
		});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (draft !== null) {
			void feedbackDraftItem.setValue(draft);
		}
	}, [draft]);

	const patch = useCallback((next: Partial<FeedbackDraft>) => {
		setDraft((current) => (current === null ? current : { ...current, ...next }));
	}, []);

	const clear = useCallback(() => setDraft(EMPTY_FEEDBACK_DRAFT), []);

	return { draft, patch, clear };
};
