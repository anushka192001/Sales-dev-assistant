'use client';
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NewSidebar } from "@/components/ui/new-sidebar";
import { usePathname } from "next/navigation";
import { AuthProvider } from "./providers/AuthProvider";
import SearchModal from "@/components/ui/global-search-modal";
import { Dialog } from "@/components/ui/dialog";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  console.log(pathname,"check here")
  // Add this line to check if you are on the AVA page
  const isAvaPage = pathname === "/ava";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-white`} suppressHydrationWarning>
        <AuthProvider>
          <Dialog>
            <ClientLayout>{children}</ClientLayout>
          </Dialog>
        </AuthProvider>
        <Toaster position="top-right" />
         {/* Only show SearchModal if not on /ava */}
        {!isAvaPage && <SearchModal />}
      </body>
    </html>
  );
}

function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/auth');

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return <NewSidebar>{children}</NewSidebar>;
}