import type { Metadata } from "next";
import { AccountsManager } from "@/components/accounts-manager";

export const metadata: Metadata = {
  title: "Accounts",
};

export default function AccountsPage() {
  return <AccountsManager />;
}
