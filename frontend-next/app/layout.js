import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AdminNotificationCenter from "@/components/admin/AdminNotificationCenter";
import HeaderNav from "@/components/layout/HeaderNav";
import Footer from "@/components/layout/Footer";
import FloatingSupportChat from "@/components/support/FloatingSupportChat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "VibePlan AI",
  description: "AI planning workspace untuk PRD, next step planner, dan coding prompt.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="min-h-full overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] text-slate-900">
        <div className="flex min-h-full w-full flex-col overflow-x-hidden">
          <HeaderNav />
          <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            {children}
          </main>
          <Footer />
          <AdminNotificationCenter />
          <FloatingSupportChat />
        </div>
      </body>
    </html>
  );
}
