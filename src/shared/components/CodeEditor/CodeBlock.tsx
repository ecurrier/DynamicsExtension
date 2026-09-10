import { CodeEditor, type CodeEditorProps } from "./CodeEditor";

type CodeBlockProps = Omit<CodeEditorProps, "onChange" | "readOnly">;

export const CodeBlock = (props: CodeBlockProps) => <CodeEditor {...props} readOnly />;
