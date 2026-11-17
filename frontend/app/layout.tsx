import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CasePilot AI · Support workspace",
  description: "Customer support, with a human at the helm.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
