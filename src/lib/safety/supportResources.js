/**
 * HOTMESS Safety v1.0 — verified support resources (UK).
 *
 * Brief explicitly forbids NEDA — National Alliance for Eating Disorders is
 * the fallback for any ED-adjacent resource.
 *
 * Last verified: 2026-05-20 against each org's published helpline page.
 * If you change a number here, also update the corresponding alt-text and
 * confirm against the source URL the same day.
 */

export const SUPPORT_RESOURCES = [
  {
    id: 'samaritans',
    name: 'Samaritans',
    summary: 'Free listening support, 24/7. You don\'t have to be suicidal.',
    tel: '116123',
    display: '116 123',
    hours: '24/7',
    url: 'https://www.samaritans.org/',
    tags: ['crisis', 'listening', 'general'],
  },
  {
    id: 'galop',
    name: 'Galop — National LGBT+ Domestic Abuse Helpline',
    summary: 'Anti-abuse support for LGBT+ people experiencing domestic abuse, sexual violence or hate crime.',
    tel: '08009995428',
    display: '0800 999 5428',
    hours: 'Mon–Tue 9.15am–8pm · Wed–Fri 9.15am–4.30pm (closed 1–2pm)',
    url: 'https://www.galop.org.uk/helpline',
    tags: ['lgbt', 'abuse', 'crisis'],
  },
  {
    id: 'lgbt-foundation',
    name: 'LGBT Foundation Helpline',
    summary: 'Information, advice and emotional support for LGBT+ people.',
    tel: '03453303030',
    display: '0345 330 3030',
    hours: 'Mon–Fri 9am–9pm · Sat–Sun 10am–5.30pm',
    url: 'https://lgbt.foundation/help/helpline-email-support/',
    tags: ['lgbt', 'support'],
  },
  {
    id: 'antidote',
    name: 'Antidote (London Friend) — LGBTQ+ Drug, Alcohol & Chemsex Support',
    summary: 'Non-judgemental, free advice and support — staff and volunteers all identify as LGBTQ+.',
    tel: '02078331674',
    display: '020 7833 1674',
    hours: 'Mon–Fri 10am–6pm',
    url: 'https://londonfriend.org.uk/antidote/',
    tags: ['lgbt', 'recovery', 'chemsex', 'london'],
  },
  {
    id: 'dean-street',
    name: '56 Dean Street',
    summary: 'NHS sexual health clinic in Soho — PrEP, PEP, STI screening, chemsex support.',
    tel: '02033155656',
    display: '020 3315 5656',
    hours: 'Mon/Tue/Thu 8am–7pm · Wed 12pm–7pm · Fri 9am–4pm · Sat 11am–4pm',
    url: 'https://www.dean.st/',
    tags: ['sexual-health', 'lgbt', 'london'],
  },
  {
    id: 'lgbt-switchboard',
    name: 'LGBT+ Switchboard',
    summary: 'Listening service for anyone identifying as LGBT+ or questioning.',
    tel: '03003300630',
    display: '0300 330 0630',
    hours: '10am–10pm, every day',
    url: 'https://switchboard.lgbt/',
    tags: ['lgbt', 'listening'],
  },
  {
    id: 'emergency',
    name: 'Police / ambulance — emergencies',
    summary: 'Immediate danger only. UK emergency services.',
    tel: '999',
    display: '999',
    hours: '24/7',
    url: null,
    tags: ['emergency'],
    emergency: true,
  },
];

/**
 * Eating-disorder fallback (per brief: NOT NEDA — that org is disconnected).
 * Not surfaced on Aftercare in v1 unless tag-matched; left here so any future
 * surface that needs ED resources pulls the correct number.
 */
export const ED_FALLBACK = {
  id: 'nationaledalliance',
  name: 'National Alliance for Eating Disorders',
  summary: 'US-based ED helpline. UK readers: Beat — beateatingdisorders.org.uk.',
  tel: null,
  display: 'beateatingdisorders.org.uk',
  url: 'https://www.allianceforeatingdisorders.com/find-treatment/',
};
