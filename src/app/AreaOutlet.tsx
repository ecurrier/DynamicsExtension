import { Spinner } from "@fluentui/react-components";
import { Suspense } from "react";

import { type AreaDefinition } from "@/modules";
import { AreaCrashFallback, AreaShell, ErrorBoundary, PageRequirementGate } from "@/shared/components";

import { SurfaceFitGate } from "./SurfaceFitGate";

interface AreaOutletProps {
	area: AreaDefinition;
}

export const AreaOutlet = ({ area }: AreaOutletProps) => {
	const Component = area.component;
	const content = Component ? (
		<Suspense fallback={<Spinner style={{ padding: "24px" }} />}>
			<Component />
		</Suspense>
	) : null;
	const gated = area.requires ? <PageRequirementGate requires={area.requires}>{content}</PageRequirementGate> : content;
	// Every Area renders inside an AreaShell, including the ones with nothing to put in the row.
	// This one fills no slot, so it renders nothing of its own; an Area that has a row renders its
	// own AreaShell inside this one and fills the slots from there.
	// The boundary is inside the outlet rather than around the app, so a crashing Area leaves the
	// shell, the nav and the route to the feedback screen standing. App keys this outlet by Area,
	// so going somewhere else clears the crash on its own.
	return (
		<ErrorBoundary fallback={(error, reset) => <AreaCrashFallback error={error} areaLabel={area.label} onReset={reset} />}>
			<SurfaceFitGate area={area}>
				<AreaShell>{gated}</AreaShell>
			</SurfaceFitGate>
		</ErrorBoundary>
	);
};
