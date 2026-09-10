const DB_NAME = "power-tools";
const DB_VERSION = 1;
const STORE_NAME = "fileHandles";

const complete = <T>(request: IDBRequest<T>): Promise<T> =>
	new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error("The IndexedDB request failed"));
	});

const openDatabase = (): Promise<IDBDatabase> =>
	new Promise((resolve, reject) => {
		if (typeof indexedDB === "undefined") {
			reject(new Error("IndexedDB is not available"));
			return;
		}
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(STORE_NAME)) {
				request.result.createObjectStore(STORE_NAME);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB"));
	});

const withStore = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
	const database = await openDatabase();
	try {
		return await complete(run(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME)));
	} finally {
		database.close();
	}
};

const isFileHandle = (value: unknown): value is FileSystemFileHandle => typeof FileSystemFileHandle !== "undefined" && value instanceof FileSystemFileHandle;

export const fileHandleKey = (origin: string, packageId: string): string => `${origin}:${packageId}`;

export const getFileHandle = (key: string): Promise<FileSystemFileHandle | null> =>
	withStore<unknown>("readonly", (store) => store.get(key))
		.then((value) => (isFileHandle(value) ? value : null))
		.catch(() => null);

export const setFileHandle = (key: string, handle: FileSystemFileHandle): Promise<boolean> =>
	withStore("readwrite", (store) => store.put(handle, key))
		.then(() => true)
		.catch(() => false);

export const deleteFileHandle = (key: string): Promise<boolean> =>
	withStore("readwrite", (store) => store.delete(key))
		.then(() => true)
		.catch(() => false);
