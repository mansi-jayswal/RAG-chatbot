export default function SectionHeading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="max-w-2xl" data-reveal>
      <p className="flex items-center gap-2.5 text-[0.7rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        <span
          className="inline-block h-px w-6 bg-marigold"
          aria-hidden="true"
        />
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {lede ? (
        <p className="mt-3.5 text-[1.02rem] leading-8 text-muted-foreground">
          {lede}
        </p>
      ) : null}
    </div>
  );
}
