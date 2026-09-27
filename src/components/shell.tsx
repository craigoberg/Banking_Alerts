"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Balances" },
  { href: "/accounts", label: "Accounts" },
  { href: "/settings", label: "Settings" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 xl:px-8">
          <div>
            <Link href="/" className="text-lg font-medium tracking-tight">
              Banking Alerts
            </Link>
            <p className="text-sm text-muted-foreground">Commonwealth Bank, checked once a day.</p>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            <Button
              variant="ghost"
              onClick={async () => {
                await fetch("/api/logout", { method: "POST" });
                router.push("/login");
                router.refresh();
              }}
            >
              Log out
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full flex-1 flex-col px-4 py-6 sm:px-6 xl:px-8">{children}</main>
    </div>
  );
}
