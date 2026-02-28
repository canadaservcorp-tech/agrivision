"use client";

import AuthGuard from "../../components/ui/AuthGuard";
import AdminPanel from "../../components/admin/AdminPanel";

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminPanel />
    </AuthGuard>
  );
}
