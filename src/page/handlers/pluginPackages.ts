import { defineHandlers } from "@/messaging/page";
import { pageHttp, requireModelDrivenApp, runOperation } from "@/page/xrm";
import { pluginPackageOperations } from "@/shared/lib";

const operations = () => {
	requireModelDrivenApp();
	return pluginPackageOperations(pageHttp());
};

export const pluginPackagesHandlers = defineHandlers({
	"pluginPackages.list": () => runOperation(() => operations().list()),
	"pluginPackages.get": (request) => runOperation(() => operations().get(request)),
	"pluginPackages.update": (request) => runOperation(() => operations().update(request)),
	"pluginPackages.getLayers": (request) => runOperation(() => operations().getLayers(request)),
});
