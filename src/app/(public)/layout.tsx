import React from "react";
import { PublicLayout } from "@/components/layout/public-layout";
import { PublicFooter } from "@/components/layout/public-footer";

export default function PublicRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout footer={<PublicFooter />}>{children}</PublicLayout>;
}
