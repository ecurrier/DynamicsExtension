import { defineHandlers } from "@/messaging/page";
import { pageHttp, runOperation } from "@/page/xrm";
import { investigateOperations } from "@/shared/lib";

const operations = () => investigateOperations(pageHttp());

export const investigateHandlers = defineHandlers({
	"investigate.getTableAutomation": (args) => runOperation(() => operations().getTableAutomation(args)),
	"investigate.getRecordAccess": (args) => runOperation(() => operations().getRecordAccess(args)),
	"investigate.getRecordHistory": (args) => runOperation(() => operations().getRecordHistory(args)),
	"investigate.getAuditDetail": (args) => runOperation(() => operations().getAuditDetail(args)),
	"investigate.getSolutionLayers": (args) => runOperation(() => operations().getSolutionLayers(args)),
	"investigate.getColumnUsage": (args) => runOperation(() => operations().getColumnUsage(args)),
	"investigate.getTableMetadata": (args) => runOperation(() => operations().getTableMetadata(args)),
	"investigate.getRecordCounts": (args) => runOperation(() => operations().getRecordCounts(args)),
	"investigate.listTables": () => runOperation(() => operations().listTables()),
	"investigate.getTableColumns": (args) => runOperation(() => operations().getTableColumns(args)),
});
