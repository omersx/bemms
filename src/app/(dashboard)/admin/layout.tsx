"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");

  const adminNav = [
    { key: "dashboard", title: t("dashboard"), href: "/admin" },
    { key: "general", title: t("general"), href: "/admin/general" },
    { key: "users", title: t("users"), href: "/admin/users" },
    { key: "roles", title: t("roles"), href: "/admin/roles" },
    { key: "settings", title: t("settings"), href: "/admin/settings" },
    { key: "dataManagement", title: t("dataManagement"), href: "/admin/data" },
    { key: "auditLogs", title: t("auditLogs"), href: "/admin/audit-logs" },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] gap-6 p-4 md:p-6 lg:p-8">
      <aside className="w-full md:w-64 shrink-0">
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {adminNav.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}

