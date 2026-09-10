export const downloadTextFile = (fileName: string, text: string, type = "text/plain"): void => {
	const url = URL.createObjectURL(new Blob([text], { type }));
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	URL.revokeObjectURL(url);
};
