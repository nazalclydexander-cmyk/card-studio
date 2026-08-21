import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type AdminAccess = {
  isAdmin: boolean;
  userId: string | null;
};

export async function getAdminAccess(): Promise<AdminAccess> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (error || !userId) {
    return {
      isAdmin: false,
      userId: null,
    };
  }

  const { data: adminMembership, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminError) {
    console.error("Failed to verify admin membership", {
      code: adminError.code,
      message: adminError.message,
      details: adminError.details,
      hint: adminError.hint,
    });

    return {
      isAdmin: false,
      userId,
    };
  }

  return {
    isAdmin: Boolean(adminMembership),
    userId,
  };
}

export async function isAdmin() {
  const access = await getAdminAccess();
  return access.isAdmin;
}

export async function requireAdmin() {
  const access = await getAdminAccess();

  if (!access.userId) {
    redirect("/auth/login");
  }

  return access;
}
