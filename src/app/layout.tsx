import type { Metadata } from "next";
import "./globals.css";

import { DialogProvider } from "@/components/ui/Dialog";
import { ToastProvider } from "@/components/ui/Toast";
import { WhatsNewProvider } from "@/components/ui/WhatsNewModal";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

export const metadata: Metadata = {
  title: "TOSM Boss Tracking By PonderingTH",
  description: "Fast boss phase and spawn countdown tracking app.",
  applicationName: "Boss Tracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Boss Tracker",
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <LocaleProvider>
          <ToastProvider>
            <DialogProvider>
              <WhatsNewProvider>{children}</WhatsNewProvider>
            </DialogProvider>
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
