# Cinematic Graduation Experience

Luxury sequential graduation website built with Next.js App Router, Framer Motion, GSAP, Lenis, Web Audio API, and React Three Fiber.

## Setup

1. Add your media assets:

- `public/audio/sound1.mp3`
- `public/audio/sound2.mp3`
- `public/audio/sound3.mp3`
- `public/models/graduation_hat.glb` (optional)

2. Install dependencies:

```bash
npm install
```

3. Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Experience Flow

1. Music consent (`ولعي الهايك`)
2. Years cinematic counter (`2018 → 2026`)
3. Cinematic 3D hat + `Masara` particle reveal
4. Final Arabic poem with typing animation + celebration modal

Navigate between sections using scroll, swipe up, or `ArrowDown` / `Space`.

## Tech

- Next.js 16 + React 19 + TypeScript strict
- Tailwind CSS v4 theme variables
- Framer Motion + GSAP + Lenis
- Three.js + R3F + postprocessing (Bloom, DOF, Vignette)
- Web Audio API gain-node crossfade (`sound1` → `sound2`)
