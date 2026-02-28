"use client";

import AuthGuard from "../../components/ui/AuthGuard";
import AdminDashboard from "../../components/admin/AdminDashboard";

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminDashboard />
    </AuthGuard>
  );
}
