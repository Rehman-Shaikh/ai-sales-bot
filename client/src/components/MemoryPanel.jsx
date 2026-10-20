const Row = ({ k, v }) => v && v.length ? <div className="flex justify-between gap-4 text-sm"><dt className="muted">{k}</dt><dd className="text-right font-medium">{Array.isArray(v) ? v.join(', ') : v}</dd></div> : null;

export default function MemoryPanel({ memory }) {
  return (
    <section className="card" aria-labelledby="mem-h">
      <h2 id="mem-h" className="mb-2 text-lg font-bold">Customer memory</h2>
      {!memory?.callCount ? <p className="muted text-sm">New customer. Enter a phone or email you used before and the AI will remember your last conversation.</p> : (
        <dl className="space-y-1.5">
          <Row k="Name" v={memory.name} />
          <Row k="Previous calls" v={String(memory.callCount)} />
          <Row k="Last status" v={memory.lastStatus} />
          <Row k="Business" v={Object.values(memory.profile || {}).filter(Boolean)} />
          <Row k="Requirements" v={memory.requirements} />
          <Row k="Budget" v={memory.budget} />
          <Row k="Objections" v={memory.objections} />
          <Row k="Last plan" v={memory.lastRecommendedPlan} />
          <Row k="Follow-up" v={memory.followUpStatus} />
          <Row k="Next action" v={memory.nextAction} />
        </dl>
      )}
    </section>
  );
}
