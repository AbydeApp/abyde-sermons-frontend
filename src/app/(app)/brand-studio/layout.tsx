import { BrandStudioShell } from "@/features/brand-studio/shell";

export default function BrandStudioLayout({ children }: LayoutProps<"/brand-studio">) {
  return <BrandStudioShell>{children}</BrandStudioShell>;
}
