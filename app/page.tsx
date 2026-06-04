import dynamic from "next/dynamic";

// استدعاء المكون بشكل ديناميكي وإلغاء الـ SSR له
const CinematicExperience = dynamic(
  () => import("@/components/cinematic/cinematic-experience"),
  { ssr: false }
);

export default function Home() {
  return <CinematicExperience />;
}