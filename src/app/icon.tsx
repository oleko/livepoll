import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#4f46e5",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 7,
          gap: 3,
        }}
      >
        <div style={{ width: 5, height: 8,  background: "rgba(255,255,255,0.6)", borderRadius: "2px 2px 1px 1px" }} />
        <div style={{ width: 5, height: 14, background: "#ffffff",               borderRadius: "2px 2px 1px 1px" }} />
        <div style={{ width: 5, height: 11, background: "rgba(255,255,255,0.85)", borderRadius: "2px 2px 1px 1px" }} />
      </div>
    ),
    { ...size }
  );
}
