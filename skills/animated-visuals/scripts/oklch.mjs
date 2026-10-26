// sRGB <-> OKLCH, exact: sRGB -> linear sRGB -> LMS -> OKLab -> OKLCH and back.
// The matrices are the ones CSS Color 4 publishes (the same ones browsers implement): linear sRGB -> XYZ (D65)
// as exact fractions, then XYZ -> LMS and LMS -> OKLab. The sRGB -> LMS step is their product, and every
// inverse is computed from its forward matrix, so a round trip only loses what the printed digits round away.
// Used by build-themes.mjs, hex-to-oklch.mjs and verify-oklch.mjs. No dependencies.

const SRGB_TO_XYZ = [
  [506752 / 1228815, 87881 / 245763, 12673 / 70218],
  [87098 / 409605, 175762 / 245763, 12673 / 175545],
  [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
];
const XYZ_TO_LMS = [
  [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
  [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
  [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
];
const LMS_TO_OKLAB = [
  [0.210454268309314, 0.7936177747023054, -0.0040720430116193],
  [1.9779985324311684, -2.42859224204858, 0.450593709617411],
  [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
];

const multiply = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((sum, a, k) => sum + a * B[k][j], 0)));
const apply = (M, v) => M.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
function invert(M) {
  const [[a, b, c], [d, e, f], [g, h, i]] = M;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

const SRGB_TO_LMS = multiply(XYZ_TO_LMS, SRGB_TO_XYZ);
const LMS_TO_SRGB = invert(SRGB_TO_LMS);
const OKLAB_TO_LMS = invert(LMS_TO_OKLAB);

const toLinear = (c) => (Math.abs(c) <= 0.04045 ? c / 12.92 : Math.sign(c) * ((Math.abs(c) + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (Math.abs(c) <= 0.0031308 ? 12.92 * c : Math.sign(c) * (1.055 * Math.abs(c) ** (1 / 2.4) - 0.055));

/** "#rrggbb" -> [r, g, b] in 0..1 */
export const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
/** [r, g, b] in 0..1 -> "#rrggbb", rounded and clamped to 8 bits */
export const rgbToHex = (rgb) =>
  `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0")).join("")}`;

/** [r, g, b] in 0..1 -> [L, C, H] (L 0..1, H in degrees) */
export function rgbToOklch(rgb) {
  const lms = apply(SRGB_TO_LMS, rgb.map(toLinear)).map(Math.cbrt);
  const [L, a, b] = apply(LMS_TO_OKLAB, lms);
  const C = Math.hypot(a, b);
  const H = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return [L, C, H];
}

/** [L, C, H] -> [r, g, b] in 0..1 (unclamped) */
export function oklchToRgb([L, C, H]) {
  const h = (H * Math.PI) / 180;
  const lms = apply(OKLAB_TO_LMS, [L, C * Math.cos(h), C * Math.sin(h)]).map((v) => v ** 3);
  return apply(LMS_TO_SRGB, lms).map(toGamma);
}

// Printed precision: L and C to 5 decimals, H to 3. Checked over all 16,777,216 8-bit sRGB colors: every one
// converts back to itself, the worst within 0.09 of an 8-bit step (4/4/2 decimals loses about 13,600 of them).
// Grays print with C 0 and H 0.
const trim = (x, digits) => {
  const s = x.toFixed(digits).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
};
export function formatOklch([L, C, H], alpha) {
  const gray = C < 0.000005;
  const body = `${trim(L, 5)} ${gray ? "0" : trim(C, 5)} ${gray ? "0" : trim(H, 3)}`;
  return alpha == null ? `oklch(${body})` : `oklch(${body} / ${alpha})`;
}

/** "#rrggbb" -> "oklch(L C H)"; throws if the printed value does not convert back to the same 8-bit color. */
export function hexToOklch(hex) {
  const value = formatOklch(rgbToOklch(hexToRgb(hex)));
  const back = rgbToHex(oklchToRgb(parseOklch(value)));
  if (back !== hex.toLowerCase()) throw new Error(`${hex} -> ${value} -> ${back}: round trip lost the color`);
  return value;
}

/** "oklch(L C H)" (L as 0..1 or percent) -> [L, C, H] */
export function parseOklch(text) {
  const m = /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/.exec(text);
  if (!m) throw new Error(`not an oklch() color: ${text}`);
  return [m[2] ? Number(m[1]) / 100 : Number(m[1]), Number(m[3]), Number(m[4])];
}
