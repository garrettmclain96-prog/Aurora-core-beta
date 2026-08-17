export function MetricCard({ title, items }: { title: string; items: Array<[string, string | number]> }) {
  return (
    <div className="panel p-5">
      <div className="text-xs uppercase tracking-widest text-teal/70 mb-3">{title}</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {items.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line/60 py-1">
            <span className="text-teal/60">{k}</span>
            <span className="text-teal glow">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
