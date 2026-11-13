import type { DecisionCard } from '../engine/types';

const mayor = (card: Omit<DecisionCard, 'context' | 'levels'>): DecisionCard => ({ ...card, context: 'office', levels: ['mayor'] });

/** Bills and executive actions on a mayor's desk (DESIGN §6.3). */
export const MAYOR_OFFICE_CARDS: DecisionCard[] = [
  // Budget & taxes
  mayor({ id: 'of_tax_hike_services', title: 'Raise property tax 3% for services', text: 'The budget office proposes a 3% levy increase to restore library hours and fix parks.', tags: [{ issue: 'taxes', stance: -1 }, { issue: 'education', stance: -1 }] }),
  mayor({ id: 'of_tax_cut_trim', title: 'Cut property tax, trim services', text: 'Council conservatives want a 5% levy cut paid for by closing two branch libraries.', tags: [{ issue: 'taxes', stance: 2 }] }),
  mayor({ id: 'of_water_bond', title: 'Emergency water-main bond', text: 'A 90-year-old main burst downtown. Engineers want an emergency bond to replace it.', tags: [{ issue: 'taxes', stance: -1 }], rejectCost: 0.04 }),
  mayor({ id: 'of_stadium', title: 'Minor-league stadium deal', text: 'The team will stay if the city builds it a new ballpark with public money.', tags: [{ issue: 'industry', stance: -1 }, { issue: 'taxes', stance: -1 }] }),
  // Policing
  mayor({ id: 'of_hire_police', title: 'Hire 50 police officers', text: 'The chief says response times are slipping. Funding 50 new officers means cuts elsewhere.', tags: [{ issue: 'policing', stance: 2 }] }),
  mayor({ id: 'of_body_cams', title: 'Body cameras & de-escalation training', text: 'Reform advocates want body cameras on every officer and mandatory de-escalation courses.', tags: [{ issue: 'policing', stance: -1 }] }),
  mayor({ id: 'of_crisis_teams', title: 'Mental-health crisis teams', text: 'Send social workers, not police, to some 911 calls. Funded by moving money from the police budget.', tags: [{ issue: 'policing', stance: -2 }] }),
  // Housing
  mayor({ id: 'of_upzone_downtown', title: 'Upzone downtown for apartments', text: 'Allow six-story apartment buildings across the downtown core.', tags: [{ issue: 'housing', stance: -2 }] }),
  mayor({ id: 'of_historic_district', title: 'Historic district: no new towers', text: 'Preservationists want height limits across the old neighborhoods.', tags: [{ issue: 'housing', stance: 2 }] }),
  mayor({ id: 'of_rent_control', title: 'Rent-control ordinance', text: 'Cap annual rent increases at 3% for buildings older than 20 years.', tags: [{ issue: 'housing', stance: -2 }, { issue: 'small_biz', stance: -1 }] }),
  mayor({ id: 'of_shelter', title: 'Open a downtown shelter', text: 'Winter is coming and the shelters are full. A church offers a building downtown.', tags: [{ issue: 'housing', stance: -1 }], rejectCost: 0.02 }),
  // Transport
  mayor({ id: 'of_brt', title: 'Bus rapid transit line', text: 'A dedicated busway on the main avenue, with federal matching funds.', tags: [{ issue: 'transit', stance: -2 }] }),
  mayor({ id: 'of_repave_parking', title: 'Repave and add parking downtown', text: 'Merchants want resurfaced streets and a new parking garage.', tags: [{ issue: 'transit', stance: 2 }, { issue: 'small_biz', stance: 1 }] }),
  mayor({ id: 'of_snow_overtime', title: 'Blizzard: overtime for plow crews', text: 'Two feet of snow overnight. Clearing it fast means paying a lot of overtime.', tags: [], rejectCost: 0.05 }),
  // Economy & labor
  mayor({ id: 'of_factory_abatement', title: 'Tax abatement for a new factory', text: 'A manufacturer will bring 400 jobs for a 10-year tax break.', tags: [{ issue: 'industry', stance: -2 }] }),
  mayor({ id: 'of_permit_fast_track', title: 'Small-business permit fast track', text: 'Any permit not answered in 30 days is approved automatically.', tags: [{ issue: 'small_biz', stance: 2 }] }),
  mayor({ id: 'of_living_wage', title: 'Living wage for city contractors', text: 'Companies with city contracts must pay at least $18 an hour.', tags: [{ issue: 'min_wage', stance: -2 }, { issue: 'labor', stance: -1 }] }),
  mayor({ id: 'of_outsource_trash', title: 'Outsource garbage collection', text: 'A private hauler bids 20% below the unionized city crews.', tags: [{ issue: 'labor', stance: 2 }, { issue: 'taxes', stance: 1 }] }),
  mayor({ id: 'of_sell_golf', title: 'Sell the city golf course', text: 'A developer offers top dollar for the municipal course to build homes and shops.', tags: [{ issue: 'small_biz', stance: 1 }, { issue: 'housing', stance: -1 }] }),
  // Energy & environment
  mayor({ id: 'of_solar_farm', title: 'City solar farm', text: 'Cover the old landfill with solar panels to power city buildings.', tags: [{ issue: 'climate', stance: -2 }] }),
  mayor({ id: 'of_pipeline', title: 'Permit a gas pipeline extension', text: 'A utility wants to run a new gas line through the east side.', tags: [{ issue: 'climate', stance: 2 }] }),
  // Schools
  mayor({ id: 'of_pre_k', title: 'Universal pre-K', text: 'Free pre-kindergarten for every 4-year-old, paid for with a small sales tax.', tags: [{ issue: 'education', stance: -2 }, { issue: 'taxes', stance: -1 }] }),
  mayor({ id: 'of_charter_lease', title: 'Lease empty schools to charters', text: 'Two closed school buildings could be leased to charter operators.', tags: [{ issue: 'education', stance: 2 }] }),
  // Social issues
  mayor({ id: 'of_pride_flag', title: 'Fly the Pride flag at City Hall', text: 'Advocates ask you to raise the flag for Pride month.', tags: [{ issue: 'lgbtq', stance: -1 }] }),
  mayor({ id: 'of_nondiscrimination', title: 'Expand the non-discrimination ordinance', text: 'Add gender identity to the city’s housing and employment protections.', tags: [{ issue: 'lgbtq', stance: -2 }] }),
  mayor({ id: 'of_ice_detainers', title: 'Honor ICE detainers at the jail', text: 'Federal agents ask the city jail to hold people for immigration pickup.', tags: [{ issue: 'immigration', stance: 2 }] }),
  mayor({ id: 'of_municipal_id', title: 'Municipal ID card', text: 'A city ID any resident can get, regardless of immigration status.', tags: [{ issue: 'immigration', stance: -2 }] }),
  mayor({ id: 'of_gun_buyback', title: 'Gun buyback program', text: 'Pay cash for guns turned in at churches, no questions asked.', tags: [{ issue: 'guns', stance: -1 }] }),
  mayor({ id: 'of_park_gun_ban', title: 'Ban guns in city parks', text: 'After a shooting at a playground, parents want parks declared gun-free.', tags: [{ issue: 'guns', stance: -2 }] }),
  mayor({ id: 'of_carry_city_buildings', title: 'Allow permit holders to carry in city buildings', text: 'Gun-rights groups want concealed-carry permit holders allowed in City Hall.', tags: [{ issue: 'guns', stance: 2 }] }),
  mayor({ id: 'of_cannabis_lounges', title: 'License cannabis lounges', text: 'Allow a handful of licensed consumption lounges downtown.', tags: [{ issue: 'cannabis', stance: -2 }, { issue: 'small_biz', stance: 1 }] }),
  // Ethics
  mayor({ id: 'of_hire_manager', title: 'Hire your campaign manager as chief of staff', text: 'Loyal and effective — and they’ll keep your donors happy. Critics call it cronyism.', tags: [], effects: { funds: 8000, integrity: -4 } }),
  mayor({ id: 'of_open_records', title: 'Open-records reform', text: 'Publish every city contract and your own calendar online.', tags: [], effects: { integrity: 4 } }),
];
