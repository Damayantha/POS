import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { DownloadSection } from "@/components/DownloadSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-accent selection:text-white">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <DownloadSection />
      <Footer />
    </main>
  );
}
