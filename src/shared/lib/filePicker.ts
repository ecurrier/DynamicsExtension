export interface PickedFile {
	file: File;
	handle: FileSystemFileHandle | null;
}

export interface PickFileOptions {
	id: string;
	description: string;
	extensions: string[];
}

const isAbort = (error: unknown): boolean => error instanceof DOMException && error.name === "AbortError";

const pickWithInput = (extensions: string[]): Promise<PickedFile | null> =>
	new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = extensions.join(",");
		input.addEventListener("change", () => resolve(input.files?.[0] ? { file: input.files[0], handle: null } : null), { once: true });
		input.addEventListener("cancel", () => resolve(null), { once: true });
		input.click();
	});

export const pickFile = async ({ id, description, extensions }: PickFileOptions): Promise<PickedFile | null> => {
	if (typeof window.showOpenFilePicker !== "function") {
		return pickWithInput(extensions);
	}
	try {
		const [handle] = await window.showOpenFilePicker({
			id,
			multiple: false,
			excludeAcceptAllOption: false,
			types: [{ description, accept: { "application/octet-stream": extensions } }],
		});
		return handle ? { file: await handle.getFile(), handle } : null;
	} catch (error) {
		if (isAbort(error)) {
			return null;
		}
		throw error;
	}
};

export const droppedFile = async (transfer: DataTransfer): Promise<PickedFile | null> => {
	const item = transfer.items[0];
	if (!item || item.kind !== "file") {
		return null;
	}
	const pendingHandle = typeof item.getAsFileSystemHandle === "function" ? item.getAsFileSystemHandle().catch(() => null) : null;
	const file = item.getAsFile();
	const handle = pendingHandle ? await pendingHandle : null;
	if (handle && handle.kind === "file") {
		const fileHandle = handle as FileSystemFileHandle;
		return { file: file ?? (await fileHandle.getFile()), handle: fileHandle };
	}
	return file ? { file, handle: null } : null;
};

export const readFileFromHandle = async (handle: FileSystemFileHandle): Promise<File | null> => {
	if (typeof handle.requestPermission === "function") {
		const state = await handle.requestPermission({ mode: "read" });
		if (state !== "granted") {
			return null;
		}
	}
	return handle.getFile();
};
