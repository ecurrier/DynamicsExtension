import { Spinner } from "@fluentui/react-components";
import { Suspense } from "react";

import { type AreaDefinition } from "@/modules";
import { PageRequirementGate, SurfaceFitGate } from "@/shared/components";

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
	return <SurfaceFitGate area={area}>{gated}</SurfaceFitGate>;
};
