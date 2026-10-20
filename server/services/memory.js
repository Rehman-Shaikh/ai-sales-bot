import Customer from '../models/Customer.js';

const uniq = arr => [...new Set(arr.filter(Boolean))];

export async function updateMemory(customerId, summary, status, language) {
  const c = await Customer.findById(customerId);
  if (!c) return;
  c.profile = { ...(c.profile?.toObject?.() || {}), ...Object.fromEntries(Object.entries(summary.profile || {}).filter(([, v]) => v)) };
  c.requirements = uniq([...(c.requirements || []), ...(summary.requirements || [])]).slice(-10);
  c.objections = uniq([...(c.objections || []), ...(summary.objections || [])]).slice(-10);
  if (summary.budgetSignals && summary.budgetSignals !== 'Not discussed') c.budget = summary.budgetSignals;
  if (summary.recommendedPlan && summary.recommendedPlan !== 'None') c.lastRecommendedPlan = summary.recommendedPlan;
  c.lastStatus = status;
  c.followUpStatus = ['Follow-up Required', 'Demo Requested', 'Interested'].includes(status) ? 'Pending' : 'None';
  c.lastSummary = (summary.bullets || []).slice(0, 3).join(' ');
  c.nextAction = summary.nextAction;
  c.preferredLanguage = language;
  c.callCount += 1;
  c.lastCallAt = new Date();
  await c.save();
}
