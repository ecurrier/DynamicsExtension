export {};

declare global {
	namespace Xrm {
		interface OrganizationSettings {
			bapEnvironmentId?: string;
			isSovereignCloud?: boolean;
			organizationTenant?: string;
			attributes?: Record<string, unknown>;
		}

		namespace Controls {
			interface Control {
				controlDescriptor?: {
					Name?: string;
					Label?: string;
				};
				_defaultLabel?: string;
			}
		}
	}

	interface Window {
		Xrm?: Xrm.XrmStatic;
		portal?: unknown;
		__powerToolsAlert?: { key: string; id: string };
		__powerToolsAlertPending?: Promise<void>;
	}
}
