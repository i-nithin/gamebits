"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4 text-error" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "#151515",
          "--normal-text": "#ffffff",
          "--normal-border": "#34353c",
          "--success-bg": "#151515",
          "--success-text": "#ffffff",
          "--success-border": "#34353c",
          "--error-bg": "#151515",
          "--error-text": "#ffffff",
          "--error-border": "#34353c",
          "--border-radius": "0.75rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          title: "text-sm font-medium",
          description: "text-sm text-fog",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
