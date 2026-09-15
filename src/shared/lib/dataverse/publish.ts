import { type DataverseHttp } from "./http";
import { buildPublishXml } from "./systemForms";

export interface PublishRequest {
	logicalNames: string[];
}

export interface PublishOperations {
	publishTables: (request: PublishRequest) => Promise<void>;
}

export const publishOperations = (http: DataverseHttp): PublishOperations => ({
	publishTables: async ({ logicalNames }) => {
		const parameterXml = buildPublishXml(logicalNames);
		if (parameterXml === null) {
			return;
		}
		await http.post("PublishXml", { ParameterXml: parameterXml });
	},
});
