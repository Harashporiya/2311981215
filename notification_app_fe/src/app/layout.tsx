import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campus Notifications | Affordmed",
  description: "Real-time campus notification platform for students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
