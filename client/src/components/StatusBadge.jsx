const STYLES = {
  Converted: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Interested: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'Follow-up Required': 'bg-amber/20 text-amber-800 dark:text-amber',
  'Demo Requested': 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'Not Interested': 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'No Response': 'bg-ink/10 text-ink/70 dark:bg-white/10 dark:text-white/60',
};
export default function StatusBadge({ status }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status] || STYLES['No Response']}`}>{status}</span>;
}
