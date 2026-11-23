import { Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from "@fluentui/react-components";
import { Add20Regular } from "@fluentui/react-icons";

import { useStart } from "./StartContext";

interface NewQueryMenuProps {
	className?: string;
	labelClassName?: string;
	disabled?: boolean;
}

export const NewQueryMenu = ({ className, labelClassName, disabled = false }: NewQueryMenuProps) => {
	const { startingPoints, start } = useStart();
	return (
		<Menu>
			<MenuTrigger disableButtonEnhancement>
				<Button appearance="subtle" icon={<Add20Regular />} className={className} aria-label="New Query" disabled={disabled}>
					<span className={labelClassName}>New</span>
				</Button>
			</MenuTrigger>
			<MenuPopover>
				<MenuList>
					{startingPoints.map((point) => (
						<MenuItem key={point.kind} icon={<point.icon />} onClick={() => start(point.kind)}>
							{point.title}
						</MenuItem>
					))}
				</MenuList>
			</MenuPopover>
		</Menu>
	);
};
