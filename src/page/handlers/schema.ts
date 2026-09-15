import { defineHandlers } from "@/messaging/page";
import { pageHttp, requireModelDrivenApp, runOperation } from "@/page/xrm";
import { attributeSearchOperations, publishOperations } from "@/shared/lib";

const operations = () => {
	requireModelDrivenApp();
	return { ...attributeSearchOperations(pageHttp()), ...publishOperations(pageHttp()) };
};

export const schemaHandlers = defineHandlers({
	"schema.findAttributeAcrossTables": (args) => runOperation(() => operations().findAttributeAcrossTables(args)),
	"schema.updateAttribute": (args) => runOperation(() => operations().updateAttribute(args)),
	"schema.publishTables": (args) => runOperation(() => operations().publishTables(args)),
});
