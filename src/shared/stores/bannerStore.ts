import { create } from "zustand";

export interface BannerMessage {
	/** A new id for every failure, so the same message announces again. */
	id: number;
	title: string;
	body?: string;
}

export interface BannerState {
	banner: BannerMessage | null;
	showBanner: (title: string, body?: string) => void;
	clearBanner: () => void;
}

let nextId = 0;

/**
 * The failures the user must act on. One banner at a time and the newest wins, because a stack of
 * failures is a stack the user has to clear before working.
 */
export const useBannerStore = create<BannerState>()((set) => ({
	banner: null,
	showBanner: (title, body) => {
		nextId += 1;
		set({ banner: { id: nextId, title, body } });
	},
	clearBanner: () => set({ banner: null }),
}));
