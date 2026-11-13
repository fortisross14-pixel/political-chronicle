import type { DecisionCard } from '../engine/types';
import { MAYOR_OFFICE_CARDS } from './officeCards';

/** Campaign moments: questionnaires, endorsements, controversies (DESIGN §6.3). */
export const CAMPAIGN_CARDS: DecisionCard[] = [
  {
    id: 'cm_stadium_tax_break', title: 'Stadium tax break', context: 'campaign', levels: ['mayor'],
    text: 'The local team wants a tax break to renovate its stadium. Do you back it?',
    tags: [{ issue: 'industry', stance: -1 }, { issue: 'taxes', stance: -1 }],
  },
  {
    id: 'cm_police_union', title: 'Police union questionnaire', context: 'campaign', levels: ['mayor'],
    text: 'The police union will endorse candidates who pledge to grow the force by 10%.',
    tags: [{ issue: 'policing', stance: 2 }], rejectCost: 0.01,
  },
  {
    id: 'cm_civilian_oversight', title: 'Civilian oversight board', context: 'campaign', levels: ['mayor'],
    text: 'Activists ask you to support an elected civilian board with power over police discipline.',
    tags: [{ issue: 'policing', stance: -2 }],
  },
  {
    id: 'cm_rent_stabilization', title: 'Rent stabilization pledge', context: 'campaign', levels: ['mayor'],
    text: 'Tenant groups want a pledge to cap rent increases at 2% a year.',
    tags: [{ issue: 'housing', stance: -2 }],
  },
  {
    id: 'cm_upzoning', title: 'Upzone the transit corridors', context: 'campaign', levels: ['mayor'],
    text: 'A YIMBY coalition asks you to allow apartments near every bus and rail stop.',
    tags: [{ issue: 'housing', stance: -1 }, { issue: 'transit', stance: -1 }],
  },
  {
    id: 'cm_single_family', title: 'Protect single-family streets', context: 'campaign', levels: ['mayor'],
    text: 'Homeowner associations want a promise: no new apartment buildings in residential zones.',
    tags: [{ issue: 'housing', stance: 2 }],
  },
  {
    id: 'cm_property_tax_freeze', title: 'Property tax freeze', context: 'campaign', levels: ['mayor'],
    text: 'Will you freeze property taxes for your whole term, even if services get squeezed?',
    tags: [{ issue: 'taxes', stance: 2 }],
  },
  {
    id: 'cm_bus_lanes', title: 'Bus lanes on Main Street', context: 'campaign', levels: ['mayor'],
    text: 'Transit advocates want dedicated bus lanes — at the cost of parking spots.',
    tags: [{ issue: 'transit', stance: -2 }],
  },
  {
    id: 'cm_road_repair', title: 'Fix the potholes first', context: 'campaign', levels: ['mayor'],
    text: 'Drivers’ groups ask you to move transit money into road repair.',
    tags: [{ issue: 'transit', stance: 2 }],
  },
  {
    id: 'cm_local_wage', title: 'Local $20 minimum wage', context: 'campaign', levels: ['mayor'],
    text: 'Labor groups want a city minimum wage of $20 for large employers.',
    tags: [{ issue: 'min_wage', stance: -2 }, { issue: 'labor', stance: -1 }],
  },
  {
    id: 'cm_permit_reform', title: 'One-stop permit office', context: 'campaign', levels: ['mayor'],
    text: 'Small-business owners want permits approved in 30 days or automatically granted.',
    tags: [{ issue: 'small_biz', stance: 2 }],
  },
  {
    id: 'cm_plant_subsidy', title: 'Subsidize the battery plant', context: 'campaign', levels: ['mayor'],
    text: 'A battery maker will open a plant if the city offers land and tax credits.',
    tags: [{ issue: 'industry', stance: -2 }, { issue: 'climate', stance: -1 }],
  },
  {
    id: 'cm_charter_schools', title: 'Charter school expansion', context: 'campaign', levels: ['mayor'],
    text: 'Parents’ groups want you to back five new charter schools.',
    tags: [{ issue: 'education', stance: 2 }],
  },
  {
    id: 'cm_teachers_union', title: 'Teachers’ union endorsement', context: 'campaign', levels: ['mayor'],
    text: 'The teachers’ union offers its endorsement if you pledge smaller class sizes.',
    tags: [{ issue: 'education', stance: -2 }, { issue: 'labor', stance: -1 }],
  },
  {
    id: 'cm_pride_parade', title: 'March in the Pride parade', context: 'campaign', levels: ['mayor'],
    text: 'Organizers invite you to march at the front of this year’s parade.',
    tags: [{ issue: 'lgbtq', stance: -1 }],
  },
  {
    id: 'cm_gun_range', title: 'Sportsmen’s club dinner', context: 'campaign', levels: ['mayor'],
    text: 'The county sportsmen’s club invites you to speak and fire the first shot at their new range.',
    tags: [{ issue: 'guns', stance: 1 }],
  },
  {
    id: 'cm_sanctuary', title: 'Sanctuary city question', context: 'campaign', levels: ['mayor'],
    text: 'A debate moderator asks: will the city cooperate with federal immigration detainers?',
    tags: [{ issue: 'immigration', stance: -2 }], rejectCost: 0.01,
  },
  {
    id: 'cm_pac_money', title: 'Developer PAC check', context: 'campaign', levels: ['mayor'],
    text: 'A developers’ PAC offers $20k. No strings attached, they say.',
    tags: [{ issue: 'housing', stance: 1 }], effects: { funds: 20000, integrity: -3 },
  },
  {
    id: 'cm_clean_pledge', title: 'No-corporate-money pledge', context: 'campaign', levels: ['mayor'],
    text: 'Reform groups ask you to refuse all corporate PAC money for this race.',
    tags: [], effects: { funds: -5000, integrity: 4 },
  },
  {
    id: 'cm_cannabis_shops', title: 'Cannabis shops downtown', context: 'campaign', levels: ['mayor'],
    text: 'Should licensed dispensaries be allowed on the main shopping streets?',
    tags: [{ issue: 'cannabis', stance: -1 }, { issue: 'small_biz', stance: 1 }],
  },
];

export const DECISION_CARDS: DecisionCard[] = [...CAMPAIGN_CARDS, ...MAYOR_OFFICE_CARDS];

export const DECISION_CARDS_BY_ID: Record<string, DecisionCard> = Object.fromEntries(DECISION_CARDS.map((c) => [c.id, c]));

export function getDecisionCard(id: string): DecisionCard {
  const card = DECISION_CARDS_BY_ID[id];
  if (!card) throw new Error(`Unknown decision card: ${id}`);
  return card;
}
