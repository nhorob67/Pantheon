import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Pantheon — Build and Deploy Your AI Agent Team";
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
          backgroundColor: "#0E0C0A",
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
            backgroundColor: "#5E8C61",
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
              color: "#C4883F",
              lineHeight: 1,
              display: "flex",
            }}
          >
            Pantheon
          </div>

          <div
            style={{
              fontSize: "36px",
              fontWeight: 600,
              color: "#EDE6DB",
              lineHeight: 1.2,
              display: "flex",
            }}
          >
            Build Your AI Agent Team
          </div>

          <div
            style={{
              fontSize: "20px",
              color: "#EDE6DB",
              opacity: 0.6,
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.5,
              display: "flex",
            }}
          >
            Build and deploy your AI agent team.
            Skills, schedules, knowledge, and more — right in Discord.
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
            backgroundColor: "#C4883F",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
