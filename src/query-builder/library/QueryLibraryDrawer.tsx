import { Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, OverlayDrawer } from "@fluentui/react-components";
import { Dismiss20Regular } from "@fluentui/react-icons";

import { QueryLibrary } from "./QueryLibrary";

interface QueryLibraryDrawerProps {
	open: boolean;
	onClose: () => void;
}

export const QueryLibraryDrawer = ({ open, onClose }: QueryLibraryDrawerProps) => (
	<OverlayDrawer position="end" size="medium" open={open} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
		<DrawerHeader>
			<DrawerHeaderTitle action={<Button appearance="subtle" aria-label="Close" icon={<Dismiss20Regular />} onClick={onClose} />}>
				History and My queries
			</DrawerHeaderTitle>
		</DrawerHeader>
		<DrawerBody>
			<QueryLibrary onOpened={onClose} />
		</DrawerBody>
	</OverlayDrawer>
);
