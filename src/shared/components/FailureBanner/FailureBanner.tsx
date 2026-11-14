import { Button, MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle } from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";

import { useBannerStore } from "@/shared/stores";

/**
 * The failure the user must act on, in the `AppShell` banner slot. Fluent's `MessageBar` renders
 * `role="group"`, which announces nothing, so the wrapper carries `role="alert"`.
 */
export const FailureBanner = () => {
	const banner = useBannerStore((state) => state.banner);
	const clearBanner = useBannerStore((state) => state.clearBanner);
	if (!banner) {
		return null;
	}
	return (
		<div role="alert" key={banner.id}>
			<MessageBar intent="error">
				<MessageBarBody>
					<MessageBarTitle>{banner.title}</MessageBarTitle>
					{banner.body}
				</MessageBarBody>
				<MessageBarActions
					containerAction={<Button appearance="transparent" icon={<DismissRegular />} aria-label="Close this message" onClick={clearBanner} />}
				/>
			</MessageBar>
		</div>
	);
};
