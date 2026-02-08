import Navbar from "@/components/Navbar";
import AboutSection from "@/components/sections/AboutSection";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <AboutSection className="pt-5 pt-lg-5" />
      </main>
    </>
  );
}
