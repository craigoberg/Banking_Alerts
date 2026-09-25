import { Shell } from "@/components/shell";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return <Shell>{children}</Shell>;
}
