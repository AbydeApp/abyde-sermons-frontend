import { cn } from "@/utils/cn";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("rounded-md bg-muted [animation:sf-pulse_1.6s_ease-in-out_infinite]", className)}
      {...props}
    />
  );
}
