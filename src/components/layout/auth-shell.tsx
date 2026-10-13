import { Logo } from "./logo";

export function AuthShell({
  title,
  description,
  children,
  footer,
  wide,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo href="/login" />
        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className={wide ? "w-full max-w-xl" : "w-full max-w-sm"}>
            <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
            {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </main>
      </div>
      <aside className="relative hidden overflow-hidden bg-foreground text-background lg:flex lg:flex-col lg:justify-end lg:p-14">
        <div aria-hidden className="absolute -right-24 -top-24 size-[28rem] rounded-full bg-accent/30 blur-3xl" />
        <div aria-hidden className="absolute -left-10 bottom-10 size-72 rounded-full bg-accent/20 blur-3xl" />
        <p className="relative font-serif text-4xl leading-tight tracking-tight">
          One Sunday sermon.
          <br />
          <span className="text-background/60">A whole week of ministry.</span>
        </p>
        <p className="relative mt-5 max-w-sm text-sm text-background/60">
          Turn the message you&apos;ve already prepared into devotionals, posts, prayers and study guides — reviewed by you, grounded in your sermon.
        </p>
      </aside>
    </div>
  );
}
