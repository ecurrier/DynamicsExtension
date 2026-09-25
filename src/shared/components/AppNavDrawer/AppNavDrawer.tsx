import {
	makeStyles,
	NavCategory,
	NavCategoryItem,
	NavDivider,
	NavDrawer,
	NavDrawerBody,
	NavDrawerFooter,
	NavDrawerHeader,
	NavItem,
	NavSectionHeader,
	NavSubItem,
	NavSubItemGroup,
	SearchBox,
	Text,
	tokens,
	useFocusFinders,
	useId,
} from "@fluentui/react-components";
import { type KeyboardEvent, type RefObject, useEffect, useMemo, useRef, useState } from "react";

import { type AreaDefinition, type ModuleDefinition } from "@/modules/types";

import { Keycap } from "./Keycap";
import { EMPTY_NAV_SEARCH, searchNav } from "./navSearch";
import { NavSearchResults } from "./NavSearchResults";
import { isNavSearchShortcut, NAV_SEARCH_KEYSHORTCUTS, NAV_SEARCH_SHORTCUT } from "./navShortcut";

const RECENT_PREFIX = "recent:";
const RECENT_LIMIT = 3;

const useStyles = makeStyles({
	header: {
		paddingInlineStart: tokens.spacingHorizontalMNudge,
		paddingInlineEnd: tokens.spacingHorizontalM,
		paddingBlockEnd: tokens.spacingVerticalS,
	},
	title: {
		padding: "0 16px",
	},
	search: {
		width: "100%",
		maxWidth: "none",
		boxSizing: "border-box",
	},
	recentLabel: {
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	recentModule: {
		marginInlineStart: "auto",
		flexShrink: 0,
		fontSize: tokens.fontSizeBase200,
		lineHeight: tokens.lineHeightBase200,
		color: tokens.colorNeutralForeground3,
	},
	footer: {
		display: "flex",
		flexDirection: "row",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalM,
		padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM} ${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
		borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
		fontSize: tokens.fontSizeBase200,
		lineHeight: tokens.lineHeightBase200,
		color: tokens.colorNeutralForeground3,
	},
	hint: {
		display: "inline-flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXS,
	},
});

interface AppNavDrawerProps {
	modules: ModuleDefinition[];
	open: boolean;
	selectedAreaId: string;
	recentAreaIds: string[];
	onOpenChange: (open: boolean) => void;
	onNavigate: (areaId: string, utilityId?: string) => void;
}

interface FoundArea {
	area: AreaDefinition;
	module: ModuleDefinition;
}

const moduleForArea = (modules: ModuleDefinition[], areaId: string) => modules.find((module) => module.areas.some((area) => area.id === areaId));

const findArea = (modules: ModuleDefinition[], areaId: string): FoundArea | null => {
	for (const module of modules) {
		const area = module.areas.find((candidate) => candidate.id === areaId);
		if (area) {
			return { area, module };
		}
	}
	return null;
};

interface NavTreeProps {
	modules: ModuleDefinition[];
	recent: FoundArea[];
}

const NavTree = ({ modules, recent }: NavTreeProps) => {
	const styles = useStyles();
	return (
		<>
			{recent.length > 0 ? (
				<>
					<NavSectionHeader>Recent</NavSectionHeader>
					{recent.map(({ area, module }) => {
						const Icon = module.icon;
						return (
							<NavItem key={area.id} value={`${RECENT_PREFIX}${area.id}`} icon={<Icon />}>
								<span className={styles.recentLabel}>{area.label}</span>
								{area.label === module.label ? null : <span className={styles.recentModule}>{module.label}</span>}
							</NavItem>
						);
					})}
					<NavDivider />
					<NavSectionHeader>All tools</NavSectionHeader>
				</>
			) : null}
			{modules.map((module) => {
				const Icon = module.icon;
				if (module.areas.length === 1 && module.areas[0]) {
					return (
						<NavItem key={module.id} value={module.areas[0].id} icon={<Icon />}>
							{module.label}
						</NavItem>
					);
				}
				return (
					<NavCategory key={module.id} value={module.id}>
						<NavCategoryItem icon={<Icon />}>{module.label}</NavCategoryItem>
						<NavSubItemGroup>
							{module.areas.map((area) => (
								<NavSubItem key={area.id} value={area.id}>
									{area.label}
								</NavSubItem>
							))}
						</NavSubItemGroup>
					</NavCategory>
				);
			})}
		</>
	);
};

interface DrawerContentsProps {
	modules: ModuleDefinition[];
	selectedAreaId: string;
	recentAreaIds: string[];
	searchRef: RefObject<HTMLInputElement | null>;
	onNavigate: (areaId: string, utilityId?: string) => void;
}

const DrawerContents = ({ modules, selectedAreaId, recentAreaIds, searchRef, onNavigate }: DrawerContentsProps) => {
	const styles = useStyles();
	const baseId = useId("nav-search");
	const bodyRef = useRef<HTMLDivElement>(null);
	const { findFirstFocusable } = useFocusFinders();
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const searching = query.trim() !== "";
	const results = useMemo(() => (searching ? searchNav(modules, query) : EMPTY_NAV_SEARCH), [modules, query, searching]);
	const active = Math.min(activeIndex, Math.max(results.hits.length - 1, 0));
	const listboxId = `${baseId}-results`;
	const optionId = (index: number) => `${baseId}-option-${index}`;

	const recent = recentAreaIds
		.filter((id) => id !== selectedAreaId)
		.flatMap((id) => {
			const found = findArea(modules, id);
			return found ? [found] : [];
		})
		.slice(0, RECENT_LIMIT);

	const open = (index: number) => {
		const hit = results.hits[index];
		if (hit) {
			onNavigate(hit.areaId, hit.utilityId ?? undefined);
		}
	};

	const move = (step: number) => {
		const count = results.hits.length;
		if (count === 0) {
			return;
		}
		const next = (active + step + count) % count;
		setActiveIndex(next);
		document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" });
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Escape") {
			if (query !== "") {
				event.preventDefault();
				event.stopPropagation();
				setQuery("");
				setActiveIndex(0);
			}
			return;
		}
		if (!searching) {
			if (event.key === "ArrowDown" && bodyRef.current) {
				const first = findFirstFocusable(bodyRef.current);
				if (first) {
					event.preventDefault();
					first.focus();
				}
			}
			return;
		}
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			move(event.key === "ArrowDown" ? 1 : -1);
		} else if (event.key === "Enter") {
			event.preventDefault();
			open(active);
		}
	};

	return (
		<>
			<NavDrawerHeader className={styles.header}>
				<Text weight="semibold" size={400} className={styles.title}>
					Power Tools
				</Text>
				<SearchBox
					ref={searchRef}
					className={styles.search}
					placeholder="Search tools"
					aria-label="Search tools"
					role="combobox"
					aria-autocomplete="list"
					aria-expanded={searching}
					aria-controls={searching ? listboxId : undefined}
					aria-activedescendant={searching && results.hits.length > 0 ? optionId(active) : undefined}
					aria-keyshortcuts={NAV_SEARCH_KEYSHORTCUTS}
					value={query}
					onChange={(_, data) => {
						setQuery(data.value);
						setActiveIndex(0);
					}}
					onKeyDown={onKeyDown}
					dismiss={searching ? undefined : null}
					contentAfter={searching ? undefined : <Keycap aria-hidden>{NAV_SEARCH_SHORTCUT}</Keycap>}
				/>
			</NavDrawerHeader>
			<NavDrawerBody ref={bodyRef}>
				{searching ? (
					<NavSearchResults listboxId={listboxId} query={query} results={results} activeIndex={active} optionId={optionId} onSelect={open} />
				) : (
					<NavTree modules={modules} recent={recent} />
				)}
			</NavDrawerBody>
			{searching ? (
				<NavDrawerFooter className={styles.footer} aria-hidden>
					<span className={styles.hint}>
						<Keycap>↑</Keycap>
						<Keycap>↓</Keycap>
						Move
					</span>
					<span className={styles.hint}>
						<Keycap>Enter</Keycap>
						Open
					</span>
					<span className={styles.hint}>
						<Keycap>Esc</Keycap>
						Clear
					</span>
				</NavDrawerFooter>
			) : null}
		</>
	);
};

export const AppNavDrawer = ({ modules, open, selectedAreaId, recentAreaIds, onOpenChange, onNavigate }: AppNavDrawerProps) => {
	const searchRef = useRef<HTMLInputElement>(null);
	const currentModule = moduleForArea(modules, selectedAreaId);

	useEffect(() => {
		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			if (!isNavSearchShortcut(event)) {
				return;
			}
			event.preventDefault();
			if (!open) {
				onOpenChange(true);
				return;
			}
			searchRef.current?.focus();
			searchRef.current?.select();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, onOpenChange]);

	return (
		<NavDrawer
			type="overlay"
			open={open}
			onOpenChange={(_, data) => onOpenChange(data.open)}
			selectedValue={selectedAreaId}
			defaultOpenCategories={currentModule ? [currentModule.id] : []}
			onNavItemSelect={(_, data) => {
				if (typeof data.value !== "string") {
					return;
				}
				const areaId = data.value.startsWith(RECENT_PREFIX) ? data.value.slice(RECENT_PREFIX.length) : data.value;
				if (areaId.includes(".")) {
					onNavigate(areaId);
				}
			}}
			size="small">
			<DrawerContents modules={modules} selectedAreaId={selectedAreaId} recentAreaIds={recentAreaIds} searchRef={searchRef} onNavigate={onNavigate} />
		</NavDrawer>
	);
};
