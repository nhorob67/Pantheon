import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { ScrollingTicker } from "@/components/landing/scrolling-ticker";
import { ConversationShowcase } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PlatformGrid } from "@/components/landing/platform-grid";
import { Channels } from "@/components/landing/channels";
import { SocialProof } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { FinalCTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { FadeInObserver } from "@/components/landing/fade-in-observer";

export default function LandingPage() {
  return (
    <>
      <FadeInObserver />
      <Nav />
      <Hero />
      <ScrollingTicker />
      <div className="fade-in">
        <ConversationShowcase />
      </div>
      <div className="fade-in">
        <HowItWorks />
      </div>
      <div className="fade-in">
        <PlatformGrid />
      </div>
      <div className="fade-in">
        <Channels />
      </div>
      <div className="fade-in">
        <SocialProof />
      </div>
      <div className="fade-in">
        <Pricing />
      </div>
      <div className="fade-in">
        <FinalCTA />
      </div>
      <Footer />
    </>
  );
}
