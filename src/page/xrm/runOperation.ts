import { PageError } from "@/messaging/page";
import { DataverseOperationError } from "@/shared/lib";

export const runOperation = async <T>(action: () => Promise<T>): Promise<T> => {
	try {
		return await action();
	} catch (error) {
		if (error instanceof DataverseOperationError) {
			throw new PageError(error.code, error.message);
		}
		throw error;
	}
};
