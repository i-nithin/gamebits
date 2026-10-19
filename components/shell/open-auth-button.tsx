"use client";

import { useAuthDialog } from "@/components/shell/auth-dialog";
import { Button } from "@/components/ui/button";

export function OpenAuthButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const openAuth = useAuthDialog();

  return (
    <Button type="button" variant="outline" className={className} onClick={openAuth}>
      {children}
    </Button>
  );
}
