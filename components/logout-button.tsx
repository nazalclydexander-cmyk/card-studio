"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type LogoutButtonProps = Omit<ComponentProps<typeof Button>, "onClick">;

export function LogoutButton(props: LogoutButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} {...props}>
        Logout
      </Button>
      <AdminConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Log out of Card Studio?"
        description="You will need to sign in again to access the admin dashboard."
        confirmLabel={isLoggingOut ? "Logging out..." : "Log out"}
        cancelLabel="Stay signed in"
        isLoading={isLoggingOut}
        disableClose={isLoggingOut}
        onConfirm={logout}
      />
    </>
  );
}
