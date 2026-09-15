import { defineHandlers } from "@/messaging/page";
import { pageHttp, requireModelDrivenApp, runOperation } from "@/page/xrm";
import { attributeSearchOperations, polymorphicOperations, publishOperations } from "@/shared/lib";

const operations = () => {
	requireModelDrivenApp();
	return { ...attributeSearchOperations(pageHttp()), ...publishOperations(pageHttp()), ...polymorphicOperations(pageHttp()) };
};

export const schemaHandlers = defineHandlers({
	"schema.findAttributeAcrossTables": (args) => runOperation(() => operations().findAttributeAcrossTables(args)),
	"schema.updateAttribute": (args) => runOperation(() => operations().updateAttribute(args)),
	"schema.listPolymorphicLookups": (args) => runOperation(() => operations().listPolymorphicLookups(args)),
	"schema.createPolymorphicLookup": (args) => runOperation(() => operations().createPolymorphicLookup(args)),
	"schema.addPolymorphicTarget": (args) => runOperation(() => operations().addPolymorphicTarget(args)),
	"schema.removePolymorphicTarget": (args) => runOperation(() => operations().removePolymorphicTarget(args)),
	"schema.publishTables": (args) => runOperation(() => operations().publishTables(args)),
});
