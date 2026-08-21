"use client";

import type { ComponentProps } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type LogoutButtonProps = Omit<ComponentProps<typeof Button>, "onClick">;

export function LogoutButton(props: LogoutButtonProps) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button onClick={logout} {...props}>
      Logout
    </Button>
  );
}
