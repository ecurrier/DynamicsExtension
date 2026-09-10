import {
	Button,
	Dialog,
	DialogActions,
	DialogBody,
	DialogContent,
	DialogSurface,
	DialogTitle,
	makeStyles,
	mergeClasses,
	MessageBar,
	MessageBarBody,
	MessageBarTitle,
	Spinner,
	Text,
	tokens,
} from "@fluentui/react-components";
import { ArrowUpload20Regular, FolderOpen20Regular, History20Regular } from "@fluentui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type DragEvent, useState } from "react";

import { FormStack, useAppToast } from "@/shared/components";
import { droppedFile, encodeBase64, fileHandleKey, getFileHandle, pickFile, type PickedFile, readFileFromHandle, setFileHandle } from "@/shared/lib";
import { type PluginPackage } from "@/shared/types";

import { type PluginPackagesGateway, usePackageLayers } from "../../hooks";
import { describeUpdate, fileNameMatchesPackage, formatFileSize, formatTimestamp, isPackageFileName } from "../../lib";

const useStyles = makeStyles({
	surface: {
		maxWidth: "560px",
	},
	caption: {
		color: tokens.colorNeutralForeground3,
	},
	dropZone: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "8px",
		padding: "16px",
		border: `1px dashed ${tokens.colorNeutralStroke1}`,
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: tokens.colorNeutralBackground2,
		textAlign: "center",
	},
	dropping: {
		border: `1px dashed ${tokens.colorBrandStroke1}`,
		backgroundColor: tokens.colorBrandBackground2,
	},
	buttons: {
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "center",
		gap: "8px",
	},
	file: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		wordBreak: "break-all",
	},
});

const PICKER_OPTIONS = { id: "plugin-packages", description: "NuGet package", extensions: [".nupkg"] };

type Phase = "idle" | "encoding" | "uploading";

const PHASE_LABELS: Record<Exclude<Phase, "idle">, string> = {
	encoding: "Encoding the package...",
	uploading: "Uploading to Dataverse. Large packages can take a minute...",
};

export interface UpdatePackageTarget {
	package: PluginPackage;
	initialFile: PickedFile | null;
}

interface UpdatePackageDialogProps {
	target: UpdatePackageTarget | null;
	gateway: PluginPackagesGateway;
	origin: string | null;
	onClose: () => void;
}

const hasFiles = (transfer: DataTransfer): boolean => Array.from(transfer.types).includes("Files");

export const UpdatePackageDialog = ({ target, gateway, origin, onClose }: UpdatePackageDialogProps) => {
	const styles = useStyles();
	const toast = useAppToast();
	const queryClient = useQueryClient();
	const pkg = target?.package ?? null;
	const handleKey = pkg && origin ? fileHandleKey(origin, pkg.id) : null;
	const [picked, setPicked] = useState<PickedFile | null>(target?.initialFile ?? null);
	const [fileError, setFileError] = useState<string | null>(null);
	const [dropping, setDropping] = useState(false);
	const [phase, setPhase] = useState<Phase>("idle");
	const layers = usePackageLayers(gateway, pkg?.id ?? null, pkg !== null);

	const rememberedHandle = useQuery({
		queryKey: ["fileHandle", handleKey],
		queryFn: () => getFileHandle(handleKey ?? ""),
		enabled: handleKey !== null,
		staleTime: 0,
		gcTime: 0,
	});
	const remembered = rememberedHandle.data ?? null;

	const update = useMutation({
		mutationFn: async ({ file, id }: { file: File; id: string }) => {
			setPhase("encoding");
			const content = encodeBase64(new Uint8Array(await file.arrayBuffer()));
			setPhase("uploading");
			await gateway.ops.update({ id, content });
			return gateway.ops.get({ id });
		},
		meta: { silent: true },
		onSettled: () => setPhase("idle"),
		onSuccess: async (refreshed, { id }) => {
			if (picked?.handle && handleKey) {
				await setFileHandle(handleKey, picked.handle);
			}
			await queryClient.invalidateQueries({ queryKey: gateway.key("list") });
			await queryClient.invalidateQueries({ queryKey: gateway.key("getLayers", { id }) });
			await queryClient.invalidateQueries({ queryKey: ["fileHandle", handleKey] });
			if (pkg) {
				toast.success(`${pkg.name} updated`, describeUpdate(pkg, refreshed));
			}
			onClose();
		},
	});

	const accept = (candidate: PickedFile | null) => {
		if (!candidate) {
			return;
		}
		if (!isPackageFileName(candidate.file.name)) {
			setFileError(`${candidate.file.name} is not a .nupkg file`);
			return;
		}
		setFileError(null);
		update.reset();
		setPicked(candidate);
	};

	const choose = async () => {
		try {
			accept(await pickFile(PICKER_OPTIONS));
		} catch (error) {
			setFileError(error instanceof Error ? error.message : String(error));
		}
	};

	const reuse = async () => {
		if (!remembered) {
			return;
		}
		try {
			const file = await readFileFromHandle(remembered);
			if (!file) {
				setFileError("Permission to read the remembered file was not granted");
				return;
			}
			accept({ file, handle: remembered });
		} catch (error) {
			setFileError(error instanceof Error ? error.message : `${remembered.name} could not be read. Choose the file again.`);
		}
	};

	const onDragOver = (event: DragEvent<HTMLDivElement>) => {
		if (!hasFiles(event.dataTransfer)) {
			return;
		}
		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
		setDropping(true);
	};

	const onDrop = (event: DragEvent<HTMLDivElement>) => {
		setDropping(false);
		if (!hasFiles(event.dataTransfer)) {
			return;
		}
		event.preventDefault();
		void droppedFile(event.dataTransfer).then(accept);
	};

	const pending = update.isPending;
	const file = picked?.file ?? null;
	const activeLayer = pkg?.isManaged === true && layers.data?.hasUnmanagedLayer === true;

	return (
		<Dialog
			open={pkg !== null}
			onOpenChange={(_, data) => {
				if (!data.open && !pending) {
					onClose();
				}
			}}>
			<DialogSurface className={styles.surface}>
				<DialogBody>
					<DialogTitle>{pkg ? `Update ${pkg.name}` : "Update package"}</DialogTitle>
					<DialogContent>
						{pkg ? (
							<FormStack>
								<Text size={200} className={styles.caption}>
									{`Version ${pkg.version ?? "unknown"} · modified ${formatTimestamp(pkg.modifiedOn) || "unknown"}${pkg.modifiedBy ? ` by ${pkg.modifiedBy}` : ""}`}
								</Text>
								{pkg.isManaged ? (
									<MessageBar intent="warning" layout="multiline">
										<MessageBarBody>
											<MessageBarTitle>This package is managed</MessageBarTitle>
											Updating it here adds an Active layer on top of its solution. Later imports of that solution will not replace this
											build until the layer is removed.
										</MessageBarBody>
									</MessageBar>
								) : null}
								{activeLayer ? (
									<MessageBar intent="warning" layout="multiline">
										<MessageBarBody>
											<MessageBarTitle>This package already has an Active layer</MessageBarTitle>
											Solution imports will not override it. The build you upload now becomes that layer.
										</MessageBarBody>
									</MessageBar>
								) : null}
								{layers.data?.unavailable ? (
									<Text size={200} className={styles.caption}>
										Solution layers could not be checked: {layers.data.unavailable}
									</Text>
								) : null}
								<div
									className={mergeClasses(styles.dropZone, dropping && styles.dropping)}
									onDragOver={onDragOver}
									onDragLeave={() => setDropping(false)}
									onDrop={onDrop}>
									<Text>Drop the built .nupkg here</Text>
									<div className={styles.buttons}>
										<Button icon={<FolderOpen20Regular />} disabled={pending} onClick={() => void choose()}>
											Choose file
										</Button>
										{remembered ? (
											<Button icon={<History20Regular />} disabled={pending} onClick={() => void reuse()}>
												{`Update again from ${remembered.name}`}
											</Button>
										) : null}
									</div>
								</div>
								{file ? (
									<Text size={200} className={styles.file}>
										{`${file.name} · ${formatFileSize(file.size)} · built ${new Date(file.lastModified).toLocaleString()}`}
									</Text>
								) : null}
								{file && !fileNameMatchesPackage(file.name, pkg) ? (
									<MessageBar intent="info" layout="multiline">
										<MessageBarBody>
											The file name does not look like this package. Dataverse rejects an upload whose package id differs from the
											registered one.
										</MessageBarBody>
									</MessageBar>
								) : null}
								{fileError ? (
									<MessageBar intent="error" layout="multiline">
										<MessageBarBody>{fileError}</MessageBarBody>
									</MessageBar>
								) : null}
								{update.isError ? (
									<MessageBar intent="error" layout="multiline">
										<MessageBarBody>
											<MessageBarTitle>The update was rejected</MessageBarTitle>
											{update.error.message}
										</MessageBarBody>
									</MessageBar>
								) : null}
								{phase !== "idle" ? <Spinner size="small" label={PHASE_LABELS[phase]} labelPosition="after" /> : null}
							</FormStack>
						) : null}
					</DialogContent>
					<DialogActions>
						<Button appearance="secondary" disabled={pending} onClick={onClose}>
							Cancel
						</Button>
						<Button
							appearance="primary"
							icon={<ArrowUpload20Regular />}
							disabled={!file || !pkg || pending || !gateway.ready}
							onClick={() => {
								if (file && pkg) {
									update.mutate({ file, id: pkg.id });
								}
							}}>
							Update package
						</Button>
					</DialogActions>
				</DialogBody>
			</DialogSurface>
		</Dialog>
	);
};
