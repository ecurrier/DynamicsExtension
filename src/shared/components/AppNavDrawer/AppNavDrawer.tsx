import {
	NavCategory,
	NavCategoryItem,
	NavDrawer,
	NavDrawerBody,
	NavDrawerHeader,
	NavItem,
	NavSubItem,
	NavSubItemGroup,
	Text,
} from "@fluentui/react-components";

import { type ModuleDefinition } from "@/modules/types";

interface AppNavDrawerProps {
	modules: ModuleDefinition[];
	open: boolean;
	selectedAreaId: string;
	onOpenChange: (open: boolean) => void;
	onNavigate: (areaId: string) => void;
}

const moduleForArea = (modules: ModuleDefinition[], areaId: string) => modules.find((module) => module.areas.some((area) => area.id === areaId));

export const AppNavDrawer = ({ modules, open, selectedAreaId, onOpenChange, onNavigate }: AppNavDrawerProps) => {
	const currentModule = moduleForArea(modules, selectedAreaId);
	return (
		<NavDrawer
			type="overlay"
			open={open}
			onOpenChange={(_, data) => onOpenChange(data.open)}
			selectedValue={selectedAreaId}
			defaultOpenCategories={currentModule ? [currentModule.id] : []}
			onNavItemSelect={(_, data) => {
				if (typeof data.value === "string" && data.value.includes(".")) {
					onNavigate(data.value);
				}
			}}
			size="small">
			<NavDrawerHeader>
				<Text weight="semibold" size={400} style={{ padding: "0 12px" }}>
					Power Tools
				</Text>
			</NavDrawerHeader>
			<NavDrawerBody>
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
			</NavDrawerBody>
		</NavDrawer>
	);
};
