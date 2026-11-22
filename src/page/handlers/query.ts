import { defineHandlers } from "@/messaging/page";
import { pageHttp, requireModelDrivenApp, runOperation } from "@/page/xrm";
import { queryOperations } from "@/shared/lib";

const operations = () => {
	requireModelDrivenApp();
	return queryOperations(pageHttp());
};

export const queryHandlers = defineHandlers({
	"query.listTables": () => runOperation(() => operations().listTables()),
	"query.getTable": (request) => runOperation(() => operations().getTable(request)),
	"query.runQuery": (request) => runOperation(() => operations().runQuery(request)),
});
