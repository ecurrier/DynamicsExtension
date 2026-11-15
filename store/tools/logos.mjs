// The three logo directions, as self-contained SVG at a 0 0 300 300 viewBox.
// One level of detail each, so the mark survives being shrunk to a 16px favicon.

const BOLT = "M170 28 L78 158 L140 158 L124 272 L224 134 L162 134 Z";

const defs = (from, to) => `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>`;

const wrap = (inner, { radius = 66, from = "#2563EB", to = "#7C3AED" } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  ${defs(from, to)}
  <rect width="300" height="300" rx="${radius}" fill="url(#g)"/>
  ${inner}
</svg>`;

// A: the bolt alone, as big as the tile will carry.
export const boltTile = (o = {}) => wrap(`<path d="${BOLT}" fill="#FFFFFF"/>`, o);

// B: a solid hex socket with the bolt knocked straight through it.
export const socketBolt = (o = {}) => {
	const hex = "M150 34 L251 92 L251 208 L150 266 L49 208 L49 92 Z";
	const hole = `<path d="${BOLT}" transform="translate(57,57.8) scale(0.615)"/>`;
	return wrap(
		`<g fill="#FFFFFF" fill-rule="evenodd">
       <path d="${hex}"/>
       ${hole.replace("<path", '<path fill="url(#g)"')}
     </g>`,
		{ from: "#1E40AF", to: "#6D28D9", ...o }
	);
};

// C: the bolt between two code brackets.
export const bracketBolt = (o = {}) =>
	wrap(
		`<g stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" fill="none">
       <path d="M96 92 L50 150 L96 208"/>
       <path d="M204 92 L250 150 L204 208"/>
     </g>
     <path d="${BOLT}" transform="translate(67.3,67.7) scale(0.548)" fill="#FFFFFF"/>`,
		{ from: "#0F4FD8", to: "#8B2FE0", ...o }
	);

// At 16px the three white shapes of bracketBolt sit closer together than a pixel can show,
// so the toolbar icon drops the brackets and keeps the bolt. Same tile, same gradient.
export const bracketBoltSmall = (o = {}) =>
	wrap(`<path d="${BOLT}" transform="translate(150,150) scale(0.92) translate(-150,-150)" fill="#FFFFFF"/>`, {
		from: "#0F4FD8",
		to: "#8B2FE0",
		...o,
	});
