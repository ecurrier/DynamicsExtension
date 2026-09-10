# File helpers and the Update dialog

Status: resolved
Type: task

See `../spec.md`, "Update dialog" and "File handling".

- `src/shared/lib/base64.ts` (`encodeBase64`, `decodeBase64`, tested), `filePicker.ts` (`pickFile`, `droppedFile`, `readFileFromHandle`), `fileHandles.ts` (IndexedDB `getFileHandle`, `setFileHandle`, `deleteFileHandle`, `fileHandleKey`), and the ambient `src/shared/types/fileSystemAccess.d.ts`.
- `UpdatePackageDialog`: facts line, managed warning, drop zone, Choose file, Update again from a remembered handle, preflight line, inline errors, encoding and uploading phases, silent mutation so the toast bridge does not double-report, refetch and invalidation on success.
- Drag and drop on the row opens the dialog pre-filled.
- Harness: a dropped file reaches the PATCH stub, the toast shows the new modified time, and the row refreshes.

Blocked by: 03
