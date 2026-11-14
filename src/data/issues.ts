import type { Issue, IssueId } from '../engine/types';

export const ISSUES: Issue[] = [
  { id: 'taxes', name: 'Taxes', negLabel: 'Raise taxes on high earners', posLabel: 'Cut taxes broadly', mayorRelevance: 'full' },
  { id: 'min_wage', name: 'Minimum wage', negLabel: 'Raise the minimum wage', posLabel: 'Leave it to the market', mayorRelevance: 'full' },
  { id: 'healthcare', name: 'Healthcare', negLabel: 'Public option / single payer', posLabel: 'Private market', mayorRelevance: 'none' },
  { id: 'guns', name: 'Guns', negLabel: 'Stricter gun control', posLabel: 'Protect gun rights', mayorRelevance: 'partial' },
  { id: 'abortion', name: 'Abortion', negLabel: 'Protect abortion access', posLabel: 'Restrict abortion', mayorRelevance: 'none' },
  {
    id: 'lgbtq',
    name: 'LGBTQ rights',
    negLabel: 'Expand LGBTQ protections',
    posLabel: 'Limit / roll back protections',
    mayorRelevance: 'partial',
  },
  { id: 'immigration', name: 'Immigration', negLabel: 'Path to citizenship', posLabel: 'Enforcement first', mayorRelevance: 'partial' },
  { id: 'climate', name: 'Climate & energy', negLabel: 'Green transition', posLabel: 'Expand fossil energy', mayorRelevance: 'partial' },
  {
    id: 'industry',
    name: 'Industry',
    negLabel: 'Industrial policy & subsidies',
    posLabel: 'Deregulate, let markets pick',
    mayorRelevance: 'full',
  },
  { id: 'policing', name: 'Policing', negLabel: 'Reform & reinvest', posLabel: 'Fund & expand police', mayorRelevance: 'full' },
  { id: 'education', name: 'Education', negLabel: 'Fund public schools', posLabel: 'School choice / vouchers', mayorRelevance: 'full' },
  {
    id: 'housing',
    name: 'Housing',
    negLabel: 'Build more & rent protections',
    posLabel: 'Local control / single-family',
    mayorRelevance: 'full',
  },
  { id: 'transit', name: 'Transit', negLabel: 'Invest in transit', posLabel: 'Prioritise roads & cars', mayorRelevance: 'full' },
  { id: 'labor', name: 'Labor', negLabel: 'Strengthen unions', posLabel: 'Right-to-work', mayorRelevance: 'partial' },
  { id: 'cannabis', name: 'Cannabis', negLabel: 'Legalise', posLabel: 'Keep prohibited', mayorRelevance: 'partial' },
  { id: 'small_biz', name: 'Small business', negLabel: 'Regulate business', posLabel: 'Cut red tape', mayorRelevance: 'full' },
];

export const ISSUE_IDS: IssueId[] = ISSUES.map((i) => i.id);

export const ISSUES_BY_ID: Record<IssueId, Issue> = Object.fromEntries(ISSUES.map((i) => [i.id, i])) as Record<IssueId, Issue>;

/** Jurisdiction relevance multiplier (DESIGN §4.4). */
export const MAYOR_RELEVANCE_FACTOR = { full: 1, partial: 0.6, none: 0.3 } as const;
