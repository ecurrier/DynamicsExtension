import { usePageQuery } from "@/messaging/client";

export const usePageTarget = () => usePageQuery("utilities.getPageTarget", undefined);
