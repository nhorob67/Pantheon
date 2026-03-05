import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FarmClaw — AI That Works Your Farm";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0f1209",
          padding: "60px",
        }}
      >
        {/* Green accent bar at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            backgroundColor: "#5a8a3c",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              color: "#D98C2E",
              lineHeight: 1,
              display: "flex",
            }}
          >
            FarmClaw
          </div>

          <div
            style={{
              fontSize: "36px",
              fontWeight: 600,
              color: "#f0ece4",
              lineHeight: 1.2,
              display: "flex",
            }}
          >
            AI That Works Your Farm
          </div>

          <div
            style={{
              fontSize: "20px",
              color: "#f0ece4",
              opacity: 0.6,
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.5,
              display: "flex",
            }}
          >
            Managed AI assistant for Upper Midwest row crop farmers.
            Grain bids, weather, scale tickets, and more — right in Discord.
          </div>
        </div>

        {/* Amber accent bar at bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "6px",
            backgroundColor: "#D98C2E",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
