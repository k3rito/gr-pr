export const CINEMATIC_SECTIONS = [
  "consent",
  "years",
  "hat",
  "poem",
] as const;

export type CinematicSection = (typeof CINEMATIC_SECTIONS)[number];

export const SECTION_INDEX: Record<CinematicSection, number> = {
  consent: 0,
  years: 1,
  hat: 2,
  poem: 3,
};
