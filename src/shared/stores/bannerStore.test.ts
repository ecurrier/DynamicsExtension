import { beforeEach, describe, expect, it } from "vitest";

import { useBannerStore } from "./bannerStore";

describe("bannerStore", () => {
	beforeEach(() => {
		useBannerStore.getState().clearBanner();
	});

	it("starts with no banner", () => {
		expect(useBannerStore.getState().banner).toBeNull();
	});

	it("shows a failure with a title and a body", () => {
		useBannerStore.getState().showBanner("Could not save the record", "The record is read-only");
		expect(useBannerStore.getState().banner).toMatchObject({ title: "Could not save the record", body: "The record is read-only" });
	});

	it("keeps only the newest failure", () => {
		useBannerStore.getState().showBanner("First");
		useBannerStore.getState().showBanner("Second");
		expect(useBannerStore.getState().banner?.title).toBe("Second");
	});

	it("gives each failure a new id, so the same message announces again", () => {
		useBannerStore.getState().showBanner("Could not save the record");
		const first = useBannerStore.getState().banner?.id;
		useBannerStore.getState().showBanner("Could not save the record");
		expect(useBannerStore.getState().banner?.id).not.toBe(first);
	});

	it("clears the banner", () => {
		useBannerStore.getState().showBanner("Could not save the record");
		useBannerStore.getState().clearBanner();
		expect(useBannerStore.getState().banner).toBeNull();
	});
});
