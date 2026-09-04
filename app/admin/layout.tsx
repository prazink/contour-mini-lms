import { ApplicationShell } from "@/components/application-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ApplicationShell>{children}</ApplicationShell>;
}
