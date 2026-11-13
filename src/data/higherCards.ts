import type { DecisionCard, OfficeLevel } from '../engine/types';

const STATEWIDE_AND_HOUSE: OfficeLevel[] = ['house', 'senate', 'governor'];
const FEDERAL: OfficeLevel[] = ['house', 'senate'];

const campaign = (card: Omit<DecisionCard, 'context' | 'levels'>): DecisionCard => ({ ...card, context: 'campaign', levels: STATEWIDE_AND_HOUSE });
const federal = (card: Omit<DecisionCard, 'context' | 'levels'>): DecisionCard => ({ ...card, context: 'office', levels: FEDERAL });
const governor = (card: Omit<DecisionCard, 'context' | 'levels'>): DecisionCard => ({ ...card, context: 'office', levels: ['governor'] });

/** Campaign moments for House, Senate and Governor races. */
export const HIGHER_CAMPAIGN_CARDS: DecisionCard[] = [
  campaign({ id: 'hc_abortion_question', title: 'Debate question: abortion', text: 'The moderator asks whether you’d support a national standard protecting abortion access.', tags: [{ issue: 'abortion', stance: -2 }] }),
  campaign({ id: 'hc_abortion_limits', title: 'Pro-life coalition pledge', text: 'A pro-life coalition offers its volunteers if you pledge to back a 15-week limit.', tags: [{ issue: 'abortion', stance: 1 }] }),
  campaign({ id: 'hc_nra_rating', title: 'Gun-rights group questionnaire', text: 'An A rating is on offer if you oppose any new federal gun restrictions.', tags: [{ issue: 'guns', stance: 2 }] }),
  campaign({ id: 'hc_assault_ban', title: 'Endorse an assault-weapons ban', text: 'Survivors of a mass shooting ask every candidate to endorse a ban.', tags: [{ issue: 'guns', stance: -2 }] }),
  campaign({ id: 'hc_border', title: 'Border security pledge', text: 'Will you vote to fund more border agents and a faster deportation process?', tags: [{ issue: 'immigration', stance: 2 }] }),
  campaign({ id: 'hc_dreamers', title: 'Protect the Dreamers', text: 'Immigrant-rights groups ask you to back a path to citizenship for those brought here as children.', tags: [{ issue: 'immigration', stance: -1 }] }),
  campaign({ id: 'hc_medicare_for_all', title: 'Medicare for All pledge', text: 'Progressive groups want you to co-sponsor a single-payer bill.', tags: [{ issue: 'healthcare', stance: -2 }] }),
  campaign({ id: 'hc_tax_pledge', title: 'No-new-taxes pledge', text: 'A taxpayer group asks you to sign its pledge never to raise income taxes.', tags: [{ issue: 'taxes', stance: 2 }] }),
  campaign({ id: 'hc_union_endorsement', title: 'Building-trades endorsement', text: 'The building trades will endorse you if you back prevailing wages on public projects.', tags: [{ issue: 'labor', stance: -1 }, { issue: 'industry', stance: -1 }] }),
  campaign({ id: 'hc_drilling', title: 'Natural-gas drilling', text: 'Should the state allow fracking in the Southern Tier?', tags: [{ issue: 'climate', stance: 2 }, { issue: 'industry', stance: 1 }] }),
  campaign({ id: 'hc_green_jobs', title: 'Green New Deal town hall', text: 'Climate activists want you on stage to endorse their jobs-and-climate plan.', tags: [{ issue: 'climate', stance: -2 }] }),
  campaign({ id: 'hc_super_pac', title: 'Super PAC support', text: 'A super PAC wants to run $50k of ads for you. You can’t coordinate — officially.', tags: [], effects: { funds: 50000, integrity: -4 } }),
  campaign({ id: 'hc_trans_athletes', title: 'Debate question: trans athletes', text: 'Should trans girls be allowed to compete on girls’ school teams?', tags: [{ issue: 'lgbtq', stance: 2 }] }),
  campaign({ id: 'hc_legalize', title: 'Federal cannabis legalization', text: 'Do you support removing cannabis from the federal controlled-substances list?', tags: [{ issue: 'cannabis', stance: -2 }] }),
];

/** Federal votes for House members and Senators. Whip votes are marked with partyPriority. */
export const FEDERAL_OFFICE_CARDS: DecisionCard[] = [
  federal({ id: 'fd_du_budget', title: 'Democratic Union budget resolution', text: 'Leadership’s budget: higher taxes on top earners to fund childcare and clean energy.', tags: [{ issue: 'taxes', stance: -2 }, { issue: 'climate', stance: -1 }], partyPriority: 'DU' }),
  federal({ id: 'fd_rp_tax_cut', title: 'Republic Party tax cut', text: 'Leadership’s signature bill: lower rates for everyone, paid for later.', tags: [{ issue: 'taxes', stance: 2 }, { issue: 'small_biz', stance: 1 }], partyPriority: 'RP' }),
  federal({ id: 'fd_public_option', title: 'Public health-insurance option', text: 'Let anyone buy into a government-run insurance plan.', tags: [{ issue: 'healthcare', stance: -1 }], partyPriority: 'DU' }),
  federal({ id: 'fd_repeal_mandates', title: 'Repeal insurance mandates', text: 'Strip federal coverage requirements to let cheaper plans compete.', tags: [{ issue: 'healthcare', stance: 2 }], partyPriority: 'RP' }),
  federal({ id: 'fd_background_checks', title: 'Universal background checks', text: 'Require a background check on every gun sale, including private ones.', tags: [{ issue: 'guns', stance: -1 }] }),
  federal({ id: 'fd_concealed_reciprocity', title: 'National concealed-carry reciprocity', text: 'A carry permit from any state would be valid in every state.', tags: [{ issue: 'guns', stance: 2 }], partyPriority: 'RP' }),
  federal({ id: 'fd_border_bill', title: 'Border enforcement bill', text: 'More agents, more detention beds, faster removals.', tags: [{ issue: 'immigration', stance: 2 }], partyPriority: 'RP' }),
  federal({ id: 'fd_dream_act', title: 'Dream Act', text: 'Citizenship for those brought to the country as children.', tags: [{ issue: 'immigration', stance: -1 }], partyPriority: 'DU' }),
  federal({ id: 'fd_abortion_rights', title: 'Women’s Health Protection Act', text: 'Write abortion access into federal law.', tags: [{ issue: 'abortion', stance: -2 }], partyPriority: 'DU' }),
  federal({ id: 'fd_abortion_ban', title: 'Fifteen-week abortion limit', text: 'A national limit on abortion after 15 weeks, with exceptions.', tags: [{ issue: 'abortion', stance: 1 }], partyPriority: 'RP' }),
  federal({ id: 'fd_chips', title: 'Semiconductor manufacturing subsidies', text: 'Billions to build chip fabs at home — one could land upstate.', tags: [{ issue: 'industry', stance: -2 }] }),
  federal({ id: 'fd_pro_act', title: 'PRO Act', text: 'Make it easier to form unions and ban right-to-work laws.', tags: [{ issue: 'labor', stance: -2 }], partyPriority: 'DU' }),
  federal({ id: 'fd_farm_bill', title: 'Farm bill', text: 'Crop insurance and dairy support — and food assistance for families.', tags: [{ issue: 'industry', stance: -1 }] }),
  federal({ id: 'fd_infrastructure', title: 'Bipartisan infrastructure bill', text: 'Roads, bridges, broadband and rail. Both leaders quietly support it.', tags: [{ issue: 'transit', stance: -1 }] }),
  federal({ id: 'fd_pipeline', title: 'Fast-track pipeline permits', text: 'Speed up federal approval of gas pipelines.', tags: [{ issue: 'climate', stance: 2 }] }),
  federal({ id: 'fd_equality_act', title: 'Equality Act', text: 'Federal anti-discrimination protections based on sexual orientation and gender identity.', tags: [{ issue: 'lgbtq', stance: -2 }], partyPriority: 'DU' }),
  federal({ id: 'fd_disaster_aid', title: 'Disaster aid package', text: 'Flooding hit the Southern Tier. The aid bill must pass now.', tags: [], rejectCost: 0.05 }),
  federal({ id: 'fd_stock_ban', title: 'Ban members from trading stocks', text: 'Popular with voters, unpopular with colleagues.', tags: [], effects: { integrity: 4 } }),
];

/** A governor's desk. */
export const GOVERNOR_OFFICE_CARDS: DecisionCard[] = [
  governor({ id: 'gv_budget_tax_rich', title: 'Millionaires’ tax', text: 'A surcharge on incomes over $1M to fund schools and the subway.', tags: [{ issue: 'taxes', stance: -2 }, { issue: 'transit', stance: -1 }], partyPriority: 'DU' }),
  governor({ id: 'gv_cap_property_tax', title: 'Cap local property taxes at 2%', text: 'Suburbs and upstate love it; cities say it starves services.', tags: [{ issue: 'taxes', stance: 2 }], partyPriority: 'RP' }),
  governor({ id: 'gv_bail_reform', title: 'Roll back bail reform', text: 'Give judges more power to hold people accused of serious crimes.', tags: [{ issue: 'policing', stance: 2 }] }),
  governor({ id: 'gv_police_accountability', title: 'Police accountability law', text: 'Make police disciplinary records public statewide.', tags: [{ issue: 'policing', stance: -1 }] }),
  governor({ id: 'gv_housing_compact', title: 'Statewide housing compact', text: 'Require every town to allow more homes near transit.', tags: [{ issue: 'housing', stance: -2 }] }),
  governor({ id: 'gv_congestion_pricing', title: 'Congestion pricing for Manhattan', text: 'Toll drivers entering Midtown to fund the subway.', tags: [{ issue: 'transit', stance: -2 }] }),
  governor({ id: 'gv_gas_tax_holiday', title: 'Gas-tax holiday', text: 'Suspend the state gas tax for the summer.', tags: [{ issue: 'transit', stance: 2 }, { issue: 'taxes', stance: 1 }] }),
  governor({ id: 'gv_gas_ban', title: 'Ban gas hookups in new buildings', text: 'All new construction goes electric from 2030.', tags: [{ issue: 'climate', stance: -2 }], partyPriority: 'DU' }),
  governor({ id: 'gv_fracking', title: 'Lift the fracking moratorium', text: 'Allow drilling in the Southern Tier’s shale.', tags: [{ issue: 'climate', stance: 2 }, { issue: 'industry', stance: 1 }], partyPriority: 'RP' }),
  governor({ id: 'gv_chip_fab', title: 'Incentives for a chip fab upstate', text: 'A $5B factory and 3,000 jobs near Syracuse — for big tax breaks.', tags: [{ issue: 'industry', stance: -2 }] }),
  governor({ id: 'gv_min_wage', title: 'Index the minimum wage to inflation', text: 'Automatic raises every year.', tags: [{ issue: 'min_wage', stance: -2 }] }),
  governor({ id: 'gv_school_choice', title: 'Tax credits for private-school tuition', text: 'Parents get a credit for tuition at private and religious schools.', tags: [{ issue: 'education', stance: 2 }], partyPriority: 'RP' }),
  governor({ id: 'gv_school_aid', title: 'Raise foundation aid to schools', text: 'Billions more for high-need districts.', tags: [{ issue: 'education', stance: -2 }] }),
  governor({ id: 'gv_safe_act', title: 'Strengthen the SAFE Act', text: 'Tighter rules on magazines and ghost guns.', tags: [{ issue: 'guns', stance: -2 }] }),
  governor({ id: 'gv_carry_permits', title: 'Ease concealed-carry permits', text: 'Shall-issue permits statewide.', tags: [{ issue: 'guns', stance: 2 }] }),
  governor({ id: 'gv_migrant_shelters', title: 'Fund shelters for new arrivals', text: 'NYC is overwhelmed by asylum seekers and asks the state to pay.', tags: [{ issue: 'immigration', stance: -1 }] }),
  governor({ id: 'gv_snowstorm', title: 'State of emergency: lake-effect storm', text: 'Buffalo is buried. Send the National Guard and pay for it later.', tags: [], rejectCost: 0.06 }),
  governor({ id: 'gv_pardon_donor', title: 'Pardon request from a big donor', text: 'A longtime donor asks you to pardon his son’s fraud conviction.', tags: [], effects: { funds: 30000, integrity: -8 } }),
];
