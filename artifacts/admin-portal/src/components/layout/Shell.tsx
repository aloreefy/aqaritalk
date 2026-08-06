import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background/50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl h-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
