export type FeatureItem = {
  id: number;
  title: string;
  description?: string;
  icon?: string;
};

type Props = {
  data: FeatureItem[];
  heading: string;
  intro: string;
};

export default function FeaturesSection({ data, heading, intro }: Props) {
  const h = heading.trim();
  const introT = intro.trim();
  const showCopy = Boolean(h || introT);

  return (
    <section className="bg-[#EEF3F8] px-6 py-12 md:px-12 md:py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[1.1fr_1.1fr]">
        {showCopy ? (
          <div>
            {h ? <h2 className="text-2xl font-bold leading-snug text-gray-900 md:text-3xl">{h}</h2> : null}
            {introT ? <p className="mt-4 text-gray-600">{introT}</p> : null}
          </div>
        ) : (
          <div />
        )}
        {data.length > 0 ? (
          <div className="space-y-3">
            {data.slice(0, 4).map((f, i) => (
              <div
                key={`${f.id}-${i}`}
                className="flex items-start gap-3 rounded-lg border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2f5fa8]/10 text-xs font-bold text-[#2f5fa8]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                  {f.description ? <p className="mt-0.5 text-xs text-slate-500">{f.description}</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div />
        )}
      </div>
    </section>
  );
}
