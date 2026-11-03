import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "پاورق — امانت کتاب بین دوستان", template: "%s | پاورق" },
  description: "کتاب‌های کاغذی‌ات را ثبت کن، به دوستان و هم‌حلقه‌ای‌هایت امانت بده و سفر هر کتاب را دنبال کن.",
  applicationName: "پاورق",
  appleWebApp: { capable: true, title: "پاورق", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#15120e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved (or system) theme before first paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem("varaq_theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
