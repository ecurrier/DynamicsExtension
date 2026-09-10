import { defineHandlers } from "@/messaging/page";
import { pageHttp, runOperation } from "@/page/xrm";
import { codegenOperations } from "@/shared/lib";

const operations = () => codegenOperations(pageHttp());

export const codegenHandlers = defineHandlers({
	"codegen.getTableModel": (args) => runOperation(() => operations().getTableModel(args)),
	"codegen.getGlobalChoices": () => runOperation(() => operations().getGlobalChoices()),
});
