export type SourceRange = { readonly from: number; readonly to: number };

export type XmlAttribute = { readonly name: string; readonly value: string; readonly range?: SourceRange };

export type XmlElement = {
	readonly kind: "element";
	readonly name: string;
	readonly attributes: readonly XmlAttribute[];
	readonly children: readonly XmlNode[];
	readonly switchedOff: boolean;
	readonly range?: SourceRange;
};

export type XmlComment = { readonly kind: "comment"; readonly content: string; readonly range?: SourceRange };

export type XmlText = { readonly kind: "text"; readonly value: string; readonly range?: SourceRange };

export type XmlNode = XmlElement | XmlComment | XmlText;

export type FetchXmlDocument = {
	readonly root: XmlElement;
	readonly leading: readonly XmlComment[];
	readonly trailing: readonly XmlComment[];
};

export type NodePath = readonly number[];

export type FetchXmlParseError = { readonly message: string; readonly range: SourceRange };

export type FetchXmlParseResult =
	{ readonly ok: true; readonly document: FetchXmlDocument } | { readonly ok: false; readonly errors: readonly FetchXmlParseError[] };

export type FetchXmlEditResult = { readonly ok: true; readonly document: FetchXmlDocument } | { readonly ok: false; readonly reason: string };
