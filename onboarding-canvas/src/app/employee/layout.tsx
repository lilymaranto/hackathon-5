"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  );
}
