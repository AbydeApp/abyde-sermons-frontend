import { cn } from "@/utils/cn";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}
export const TableHeader = (p: React.ComponentProps<"thead">) => (
  <thead {...p} className={cn("border-b border-border bg-muted/50", p.className)} />
);
export const TableBody = (p: React.ComponentProps<"tbody">) => <tbody {...p} />;
export const TableRow = ({ className, ...p }: React.ComponentProps<"tr">) => (
  <tr className={cn("border-b border-border last:border-0 hover:bg-muted/40", className)} {...p} />
);
export const TableHead = ({ className, ...p }: React.ComponentProps<"th">) => (
  <th scope="col" className={cn("h-9 px-4 text-left text-xs font-medium text-muted-foreground", className)} {...p} />
);
export const TableCell = ({ className, ...p }: React.ComponentProps<"td">) => (
  <td className={cn("px-4 py-3 align-middle", className)} {...p} />
);
