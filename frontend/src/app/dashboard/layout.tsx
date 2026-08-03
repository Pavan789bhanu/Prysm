"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  FileSpreadsheet,
  Gem,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  User,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload", icon: FileSpreadsheet },
  { href: "/dashboard/analyze", label: "Analyze", icon: MessageSquare },
  { href: "/dashboard/history", label: "History", icon: History },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const next = `${pathname}${window.location.search || ""}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-fuchsia-400/40 border-t-fuchsia-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-white/10 bg-white/5 text-sidebar-foreground backdrop-blur-xl lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-6">
          <span className="bg-sunset flex h-8 w-8 items-center justify-center rounded-lg shadow-[0_4px_14px_rgba(236,72,153,0.45)]">
            <Gem className="h-4 w-4 text-white" />
          </span>
          <span className="font-semibold text-white">Prysm</span>
        </div>

        <nav className="flex gap-1 overflow-x-auto p-4 lg:flex-1 lg:flex-col">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200",
                  active
                    ? "border border-white/10 bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    : "text-slate-300 hover:bg-white/8 hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="bg-sunset flex h-9 w-9 items-center justify-center rounded-full text-white">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.username}</p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:bg-white/8 hover:text-white"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
