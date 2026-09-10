export {};

declare global {
	interface FileSystemHandlePermissionDescriptor {
		mode?: "read" | "readwrite";
	}

	interface FileSystemHandle {
		queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
		requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
	}

	interface DataTransferItem {
		getAsFileSystemHandle?(): Promise<FileSystemHandle | null>;
	}

	interface OpenFilePickerType {
		description?: string;
		accept: Record<string, string[]>;
	}

	interface OpenFilePickerOptions {
		id?: string;
		multiple?: boolean;
		excludeAcceptAllOption?: boolean;
		types?: OpenFilePickerType[];
	}

	interface Window {
		showOpenFilePicker?(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
	}
}
