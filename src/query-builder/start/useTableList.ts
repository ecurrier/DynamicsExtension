import { useQuery } from "@tanstack/react-query";

import { type QueryGateway } from "../hooks";

export const useTableList = (gateway: QueryGateway) =>
	useQuery({
		queryKey: gateway.key("listTables"),
		queryFn: () => gateway.ops.listTables(),
		enabled: gateway.ready,
		staleTime: Infinity,
		retry: false,
	});
