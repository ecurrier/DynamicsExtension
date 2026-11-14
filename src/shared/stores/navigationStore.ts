import { create } from "zustand";

import { lastVisitedAreaItem, recentAreasItem } from "@/shared/storage";
import { type WorkspaceLaunch } from "@/shared/types";

import { useBannerStore } from "./bannerStore";

const RECENT_AREA_LIMIT = 6;

export interface NavigationState {
	currentAreaId: string;
	recentAreaIds: string[];
	highlightedUtilityId: string | null;
	drawerOpen: boolean;
	workspace: WorkspaceLaunch | null;
	navigate: (areaId: string, utilityId?: string) => void;
	clearHighlightedUtility: () => void;
	setDrawerOpen: (open: boolean) => void;
	openWorkspace: (workspace: WorkspaceLaunch) => void;
	closeWorkspace: () => void;
}

export const useNavigationStore = create<NavigationState>()((set, get) => ({
	currentAreaId: "",
	recentAreaIds: [],
	highlightedUtilityId: null,
	drawerOpen: false,
	workspace: null,
	navigate: (areaId, utilityId) => {
		const recentAreaIds = [areaId, ...get().recentAreaIds.filter((id) => id !== areaId)].slice(0, RECENT_AREA_LIMIT);
		set({ currentAreaId: areaId, recentAreaIds, highlightedUtilityId: utilityId ?? null, drawerOpen: false, workspace: null });
		// A banner that follows the user to another screen is only a slower toast.
		useBannerStore.getState().clearBanner();
		void lastVisitedAreaItem.setValue(areaId);
		void recentAreasItem.setValue(recentAreaIds);
	},
	clearHighlightedUtility: () => set({ highlightedUtilityId: null }),
	setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
	openWorkspace: (workspace) => {
		set({ workspace, drawerOpen: false });
		useBannerStore.getState().clearBanner();
	},
	closeWorkspace: () => {
		set({ workspace: null });
		useBannerStore.getState().clearBanner();
	},
}));
