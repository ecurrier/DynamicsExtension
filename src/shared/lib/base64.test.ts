import { describe, expect, it } from "vitest";

import { decodeBase64, encodeBase64 } from "./base64";

describe("encodeBase64", () => {
	it("encodes known values", () => {
		expect(encodeBase64(new Uint8Array())).toBe("");
		expect(encodeBase64(new TextEncoder().encode("Man"))).toBe("TWFu");
		expect(encodeBase64(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe("UEsDBA==");
	});

	it("round-trips binary data across chunk boundaries", () => {
		const bytes = new Uint8Array(0x8000 * 3 + 1);
		let seed = 7;
		for (let index = 0; index < bytes.length; index += 1) {
			seed = (seed * 1103515245 + 12345) % 2147483648;
			bytes[index] = seed & 0xff;
		}
		const encoded = encodeBase64(bytes);
		expect(encoded.length).toBe(Math.ceil(bytes.length / 3) * 4);
		expect(decodeBase64(encoded)).toEqual(bytes);
	});
});
