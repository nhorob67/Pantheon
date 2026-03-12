import "../landing-v2.css";
import "./concepts.css";
import {
  ConstellationMap,
  PantheonForge,
  OrbitalThreads,
  CommandTerminal,
  AscendingSmoke,
} from "@/components/landing-v2/concepts";

export const metadata = {
  title: "Pantheon — Hero Graphic Concepts",
  description: "Five alternative hero graphic concepts for the Pantheon landing page.",
};

const CONCEPTS = [
  {
    name: "Constellation Map",
    description: "Line draw-on with traveling light pulses between deity nodes",
    Component: ConstellationMap,
  },
  {
    name: "Pantheon Forge",
    description: "Staggered ember glow with molten threads converging on a central nexus",
    Component: PantheonForge,
  },
  {
    name: "Orbital Threads",
    description: "Curved arcs that trace and fade between deity pairs in shifting patterns",
    Component: OrbitalThreads,
  },
  {
    name: "Command Terminal",
    description: "Auto-typing terminal feed of agent commands across the pantheon",
    Component: CommandTerminal,
  },
  {
    name: "Ascending Smoke",
    description: "Rising golden particle wisps with floating deity icons",
    Component: AscendingSmoke,
  },
];

export default function ConceptsPage() {
  return (
    <div className="landing-v2 concepts-page">
      {CONCEPTS.map(({ name, description, Component }) => (
        <section key={name}>
          <h1 className="concept-heading">{name}</h1>
          <p className="concept-description">{description}</p>
          <div className="concept-viewport">
            <Component />
          </div>
        </section>
      ))}
    </div>
  );
}
