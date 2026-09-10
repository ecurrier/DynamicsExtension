import {
	Breadcrumb,
	BreadcrumbButton,
	BreadcrumbDivider,
	BreadcrumbItem,
	makeStyles,
	Menu,
	MenuItemRadio,
	MenuList,
	MenuPopover,
	MenuTrigger,
	Tooltip,
} from "@fluentui/react-components";
import { ChevronDown12Regular, Info16Regular } from "@fluentui/react-icons";
import { Fragment } from "react";

const useStyles = makeStyles({
	switcher: {
		display: "inline-flex",
		alignItems: "center",
		gap: "4px",
	},
});

export interface BreadcrumbArea {
	id: string;
	label: string;
}

interface AreaBreadcrumbProps {
	path: string[];
	tooltip?: string;
	areas?: BreadcrumbArea[];
	currentAreaId?: string;
	onNavigate?: (areaId: string) => void;
}

export const AreaBreadcrumb = ({ path, tooltip, areas, currentAreaId, onNavigate }: AreaBreadcrumbProps) => {
	const styles = useStyles();
	const switchable = areas !== undefined && areas.length > 1 && onNavigate !== undefined && path.length > 1;
	return (
		<Breadcrumb size="medium" aria-label="Current area">
			{path.map((segment, index) => {
				const last = index === path.length - 1;
				return (
					<Fragment key={`${segment}-${index}`}>
						<BreadcrumbItem>
							{switchable && index === 0 ? (
								<Menu positioning="below-start" checkedValues={{ area: currentAreaId ? [currentAreaId] : [] }}>
									<MenuTrigger disableButtonEnhancement>
										<BreadcrumbButton aria-label={`${segment}: switch area`}>
											<span className={styles.switcher}>
												{segment}
												<ChevronDown12Regular />
											</span>
										</BreadcrumbButton>
									</MenuTrigger>
									<MenuPopover>
										<MenuList>
											{areas.map((area) => (
												<MenuItemRadio key={area.id} name="area" value={area.id} onClick={() => onNavigate(area.id)}>
													{area.label}
												</MenuItemRadio>
											))}
										</MenuList>
									</MenuPopover>
								</Menu>
							) : (
								<BreadcrumbButton current={last}>{segment}</BreadcrumbButton>
							)}
						</BreadcrumbItem>
						{last ? null : <BreadcrumbDivider />}
					</Fragment>
				);
			})}
			{tooltip ? (
				<BreadcrumbItem>
					<Tooltip content={tooltip} relationship="description">
						<Info16Regular aria-label="Area description" />
					</Tooltip>
				</BreadcrumbItem>
			) : null}
		</Breadcrumb>
	);
};
