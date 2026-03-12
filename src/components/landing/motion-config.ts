export const REVEAL_SLOW = { duration: 1.0, ease: [0.25, 0.1, 0.25, 1.0] as const };

export const STAGGER_DELAY = 0.12;

export const FADE_UP = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
};
