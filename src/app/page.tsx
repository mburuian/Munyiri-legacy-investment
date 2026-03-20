// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";

export default function DashboardPage() {
  // This will immediately redirect to the landing page
  redirect("/dashboards/landing");
}