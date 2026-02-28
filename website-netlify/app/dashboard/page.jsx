"use client";

import AuthGuard from "../../components/ui/AuthGuard";
import FarmerDashboard from "../../components/dashboard/FarmerDashboard";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <FarmerDashboard />
    </AuthGuard>
  );
}
