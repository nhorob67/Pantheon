import "./landing-v2.css";
import { CommandBar } from "@/components/landing-v2/command-bar";
import { HeroCommand } from "@/components/landing-v2/hero-command";
import { OperationsConsole } from "@/components/landing-v2/operations-console";
import { OperationalDomains } from "@/components/landing-v2/operational-domains";
import { DivineRegistry } from "@/components/landing-v2/divine-registry";
import { WarRoom } from "@/components/landing-v2/war-room";
import { SwornProtocols } from "@/components/landing-v2/sworn-protocols";
import { CommandersLog } from "@/components/landing-v2/commanders-log";
import { FormationsBoard } from "@/components/landing-v2/formations-board";
import { MissionLaunch } from "@/components/landing-v2/mission-launch";
import { FooterV2 } from "@/components/landing-v2/footer";
import { InscriptionDivider, ScanlineDivider } from "@/components/landing-v2/section-dividers";

export const metadata = {
  title: "Pantheon — The Digital Pantheon",
  description: "Assemble your council. Deploy a team of AI agents, each sovereign over its own domain.",
};

export default function V2LandingPage() {
  return (
    <div className="landing-v2">
      <CommandBar />
      <HeroCommand />
      <InscriptionDivider numeral="I" label="Field Operations" />
      <OperationsConsole />
      <ScanlineDivider />
      <OperationalDomains />
      <InscriptionDivider numeral="II" label="The Roster" />
      <DivineRegistry />
      <InscriptionDivider numeral="III" label="Deployment" />
      <WarRoom />
      <InscriptionDivider numeral="IV" label="Theater of Operations" />
      <SwornProtocols />
      <ScanlineDivider />
      <CommandersLog />
      <InscriptionDivider numeral="V" label="Formations" />
      <FormationsBoard />
      <MissionLaunch />
      <FooterV2 />
    </div>
  );
}
