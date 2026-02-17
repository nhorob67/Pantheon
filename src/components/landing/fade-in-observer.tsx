"use client";

import { useEffect } from "react";

export function FadeInObserver() {
  useEffect(() => {
    const elements = document.querySelectorAll(".fade-in");

    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -50px 0px" }
    );

    elements.forEach((el) => observer.observe(el));

    // Fallback: reveal all sections after a short delay in case
    // observer doesn't fire (e.g. user doesn't scroll)
    const timeout = setTimeout(() => {
      elements.forEach((el) => el.classList.add("visible"));
    }, 1500);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return null;
}
