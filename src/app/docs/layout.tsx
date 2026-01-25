import { Suspense } from "react";
import { DocsLayout } from "@/components/layout/docs";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";
import { ConfigProvider } from "@/components/config-builder";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <Suspense fallback={null}>
      <ConfigProvider>
        <DocsLayout
          tree={source.pageTree}
          {...baseOptions()}
          sidebar={{ defaultOpenLevel: 10 }}
        >
          {children}
        </DocsLayout>
      </ConfigProvider>
    </Suspense>
  );
}
