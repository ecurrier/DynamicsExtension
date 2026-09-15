import { describe, expect, it } from "vitest";

import { createFakeHttp } from "@/test/fakeHttp";

import { publishOperations } from "./publish";

describe("publishOperations", () => {
	it("posts PublishXml with one table", async () => {
		const { http, calls } = createFakeHttp();
		await publishOperations(http).publishTables({ logicalNames: ["account"] });
		expect(calls).toEqual([
			{
				method: "POST",
				path: "PublishXml",
				body: { ParameterXml: "<importexportxml><entities><entity>account</entity></entities></importexportxml>" },
				headers: undefined,
			},
		]);
	});

	it("publishes several tables in one request", async () => {
		const { http, calls } = createFakeHttp();
		await publishOperations(http).publishTables({ logicalNames: ["account", "contact", "lead"] });
		expect(calls[0]?.body).toEqual({
			ParameterXml: "<importexportxml><entities><entity>account</entity><entity>contact</entity><entity>lead</entity></entities></importexportxml>",
		});
	});

	it("collapses duplicates so a table is not published twice", async () => {
		const { http, calls } = createFakeHttp();
		await publishOperations(http).publishTables({ logicalNames: ["account", "account", "contact"] });
		expect(calls[0]?.body).toEqual({
			ParameterXml: "<importexportxml><entities><entity>account</entity><entity>contact</entity></entities></importexportxml>",
		});
	});

	it("sends nothing when there is nothing to publish", async () => {
		const { http, calls } = createFakeHttp();
		await publishOperations(http).publishTables({ logicalNames: [] });
		await publishOperations(http).publishTables({ logicalNames: ["", "  "] });
		expect(calls).toEqual([]);
	});
});
