// Shared hero-layout options for the homepage Home section and its admin editor.

export const HERO_CONTENT_WIDTHS = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

// Bootstrap column spans (lg breakpoint) for the text block and the media block.
// The pair always sums to 12 so the two-column hero stays aligned.
const HERO_COLS = {
  sm: { text: "col-lg-6", media: "col-lg-6" },
  md: { text: "col-lg-7", media: "col-lg-5" },
  lg: { text: "col-lg-8", media: "col-lg-4" },
};

export function normalizeHeroContentWidth(value) {
  return HERO_COLS[value] ? value : "md";
}

export function heroTextColClass(value) {
  return HERO_COLS[normalizeHeroContentWidth(value)].text;
}

export function heroMediaColClass(value) {
  return HERO_COLS[normalizeHeroContentWidth(value)].media;
}

export const PROFILE_IMAGE_SCALE_MIN = 25;
export const PROFILE_IMAGE_SCALE_MAX = 100;
export const PROFILE_IMAGE_SCALE_DEFAULT = 100;

export function clampProfileImageScale(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return PROFILE_IMAGE_SCALE_DEFAULT;
  return Math.min(PROFILE_IMAGE_SCALE_MAX, Math.max(PROFILE_IMAGE_SCALE_MIN, n));
}
