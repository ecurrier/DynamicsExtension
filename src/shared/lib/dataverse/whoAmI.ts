import { type WhoAmIResponse } from "@/shared/types";

import { type DataverseHttp } from "./http";

export const whoAmI = (http: DataverseHttp): Promise<WhoAmIResponse> => http.get<WhoAmIResponse>("WhoAmI");
