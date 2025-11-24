import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { LogoutButton } from "@/components/LogoutButton";
import { TokenExpiryBanner } from "@/components/TokenExpiryBanner";
import { getAuthenticatedUser } from "@/lib/api/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentic Dashboard",
  description: "AI-powered dashboard with real-time Event Mesh",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get authenticated user (if any)
  const authContext = await getAuthenticatedUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Global token expiry banner (only shows for expired tokens) */}
        {authContext && <TokenExpiryBanner />}

        {/* Show user info and logout button if authenticated */}
        {authContext && (
          <div className="border-b bg-muted/30">
            <div className="flex items-center justify-end gap-4 px-4 py-2">
              <span className="text-sm text-muted-foreground">
                {authContext.email}
              </span>
              <LogoutButton />
            </div>
          </div>
        )}

        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
