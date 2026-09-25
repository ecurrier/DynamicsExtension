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
	list: {
		minWidth: 0,
	},
	item: {
		minWidth: 0,
	},
	button: {
		minWidth: 0,
		maxWidth: "100%",
		"@container (max-width: 480px)": {
			paddingLeft: "4px",
			paddingRight: "4px",
		},
	},
	switcher: {
		display: "inline-flex",
		alignItems: "center",
		gap: "4px",
		minWidth: 0,
	},
	label: {
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	fixed: {
		flexShrink: 0,
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
		<Breadcrumb size="medium" aria-label="Current area" list={{ className: styles.list }}>
			{path.map((segment, index) => {
				const last = index === path.length - 1;
				return (
					<Fragment key={`${segment}-${index}`}>
						<BreadcrumbItem className={styles.item}>
							{switchable && index === 0 ? (
								<Menu positioning="below-start" checkedValues={{ area: currentAreaId ? [currentAreaId] : [] }}>
									<MenuTrigger disableButtonEnhancement>
										<BreadcrumbButton className={styles.button} aria-label={`${segment}: switch area`} title={segment}>
											<span className={styles.switcher}>
												<span className={styles.label}>{segment}</span>
												<ChevronDown12Regular className={styles.fixed} />
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
								<BreadcrumbButton className={styles.button} current={last} title={segment}>
									<span className={styles.label}>{segment}</span>
								</BreadcrumbButton>
							)}
						</BreadcrumbItem>
						{last ? null : <BreadcrumbDivider className={styles.fixed} />}
					</Fragment>
				);
			})}
			{tooltip ? (
				<BreadcrumbItem className={styles.fixed}>
					<Tooltip content={tooltip} relationship="description">
						<Info16Regular aria-label="Area description" />
					</Tooltip>
				</BreadcrumbItem>
			) : null}
		</Breadcrumb>
	);
};
