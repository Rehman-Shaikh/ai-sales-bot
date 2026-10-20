// The SaaS product the bot sells. Edit freely.
export const PRODUCT = {
  name: 'SalesPilot',
  tagline: 'Cloud CRM + sales automation for growing teams',
  plans: [
    { name: 'Starter', price: 'Rs.999 per month (up to 3 users)', features: ['Contact and lead management', 'Email templates', 'Basic pipeline board', 'Email support'], bestFor: 'Freelancers and small shops with 1-3 people', upsell: 'Add WhatsApp integration (+Rs.499) or move to Professional once the team grows past 3 users' },
    { name: 'Professional', price: 'Rs.2,999 per month (up to 15 users)', features: ['Everything in Starter', 'Automated follow-ups', 'WhatsApp and email integration', 'Reports and analytics', 'Priority chat support'], bestFor: 'Growing teams of 4-15 people who lose leads in follow-up', upsell: 'AI lead scoring add-on, extra users at Rs.150 per user' },
    { name: 'Enterprise', price: 'From Rs.9,999 per month (unlimited users)', features: ['Everything in Professional', 'Custom workflows and API access', 'SSO and role-based access', 'Dedicated account manager', 'Data migration help'], bestFor: 'Companies with 15+ users, compliance needs, or custom integrations', upsell: 'Onboarding and training package' },
  ],
  extras: 'All plans have a 14-day free trial, a free live demo on request, and 20 percent off on yearly billing.',
};
