import React from "react";
import { PublicNavBar } from "./public-nav-bar";

interface PublicLayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function PublicLayout({ children, footer }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavBar />
      <main className="flex-1">{children}</main>
      {footer && footer}
    </div>
  );
}
