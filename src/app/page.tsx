import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { ScrollingTicker } from "@/components/landing/scrolling-ticker";
import { ConversationShowcase } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { TeamSection } from "@/components/landing/team-section";
import { Channels } from "@/components/landing/channels";
import { TrustSection } from "@/components/landing/trust-section";
import { SocialProof } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { FinalCTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <>
      <Nav />
      <Hero />
      <ScrollingTicker />
      <ConversationShowcase />
      <HowItWorks />
      <TeamSection />
      <Channels />
      <TrustSection />
      <SocialProof />
      <Pricing />
      <FinalCTA />
      <Footer />
    </>
  );
}
