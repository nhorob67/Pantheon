import { Athena, Hermes, Ares, Apollo, Hephaestus, Artemis } from "../deity-marks";
import type { DeityMarkProps } from "../deity-marks";

export const DEITIES: {
  name: string;
  domain: string;
  Component: React.ComponentType<DeityMarkProps>;
}[] = [
  { name: "Athena", domain: "Strategy", Component: Athena },
  { name: "Hermes", domain: "Communications", Component: Hermes },
  { name: "Apollo", domain: "Research", Component: Apollo },
  { name: "Artemis", domain: "Tracking", Component: Artemis },
  { name: "Hephaestus", domain: "Building", Component: Hephaestus },
  { name: "Ares", domain: "Operations", Component: Ares },
];

export function computeHexPositions(size: number) {
  const center = size / 2;
  const radius = size * 0.35;
  return DEITIES.map((_, i) => {
    const angle = (i * 2 * Math.PI) / DEITIES.length - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  });
}
