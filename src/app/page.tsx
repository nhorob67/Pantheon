import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { ConversationShowcase } from "@/components/landing/features";
import { PlatformGrid } from "@/components/landing/platform-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { AgentRoster } from "@/components/landing/team-section";
import { Channels } from "@/components/landing/channels";
import { TrustSection } from "@/components/landing/trust-section";
import { SocialProof } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { FinalCTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { InscriptionDivider, ConstellationDivider } from "@/components/landing/section-dividers";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <Nav />
      <Hero />
      <InscriptionDivider numeral="I" label="COMMAND CENTER" />
      <ConversationShowcase />
      <ConstellationDivider />
      <PlatformGrid />
      <InscriptionDivider numeral="II" label="AGENT ROSTER" />
      <AgentRoster />
      <InscriptionDivider numeral="III" label="MISSION BRIEFING" />
      <HowItWorks />
      <InscriptionDivider numeral="IV" label="YOUR COMMAND CENTER" />
      <Channels />
      <ConstellationDivider />
      <TrustSection />
      <SocialProof />
      <InscriptionDivider numeral="V" label="FORMATIONS" />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}
