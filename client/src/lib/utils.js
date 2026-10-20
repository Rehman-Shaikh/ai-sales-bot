export const fmt = (s = 0) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
export const fmtDate = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
