import StatusBadge from './StatusBadge';

const List = ({ title, items }) => items?.length ? (
  <div><h4 className="mb-1 text-sm font-bold">{title}</h4><ul className="muted list-disc space-y-0.5 pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
) : null;
const Field = ({ title, value }) => value ? <div><h4 className="text-sm font-bold">{title}</h4><p className="muted text-sm">{value}</p></div> : null;

export default function SummaryPanel({ call, bare }) {
  if (!call?.summary) return (
    bare ? null : <section className="card"><h2 className="mb-2 text-lg font-bold">Call summary</h2><p className="muted text-sm">The AI summary and sales status appear here as soon as the call ends.</p></section>
  );
  const s = call.summary;
  const p = Object.entries(s.profile || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ');
  return (
    <section className={bare ? 'space-y-3' : 'card space-y-3'}>
      <div className="flex items-center justify-between">
        {!bare && <h2 className="text-lg font-bold">Call summary</h2>}
        <StatusBadge status={call.status} />
      </div>
      <List title="Summary" items={s.bullets} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field title="Customer profile" value={p} />
        <Field title="Budget signals" value={s.budgetSignals} />
        <Field title="Recommended plan" value={s.recommendedPlan} />
        <Field title="Next action" value={s.nextAction} />
      </div>
      <List title="Requirements" items={s.requirements} />
      <List title="Objections" items={s.objections} />
      <List title="Opportunities" items={s.opportunities} />
      <Field title="Follow-up notes" value={s.followUpNotes} />
    </section>
  );
}
