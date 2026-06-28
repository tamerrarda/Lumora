import type { ReactNode } from "react";
import { DocsSidebar } from "@/components/DocsSidebar";
import { DocsPrevNext } from "@/components/DocsPrevNext";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-12">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <DocsSidebar />
      </aside>
      <div className="min-w-0">
        <article className="doc-prose max-w-3xl">{children}</article>
        <div className="max-w-3xl">
          <DocsPrevNext />
        </div>
      </div>
    </div>
  );
}
