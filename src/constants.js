export const APP_VERSION = '0.3.0';
export const SCHEMA_VERSION = 3;
export const STARTING_POLITICIANS = 6200;

export const PARTIES = {
  union: {
    id: 'union', name: 'Union Party', short: 'UP', color: '#2f6ca3', pale: '#dbeaf7', symbol: 'U',
    description: 'A broad coalition of labor, urban, institutional, minority, and socially open constituencies.'
  },
  liberty: {
    id: 'liberty', name: 'Liberty Party', short: 'LP', color: '#a8443f', pale: '#f5dfdc', symbol: 'L',
    description: 'A broad coalition of business, rural, traditionalist, decentralist, and national-conservative constituencies.'
  }
};

export const RARITIES = {
  Generational: { color: '#cf3f3f', weight: 9.2, ability: 86, share: 0.00032, label: 'Generational' },
  Legend: { color: '#c89b2b', weight: 6.2, ability: 80, share: 0.0020, label: 'Legend' },
  Epic: { color: '#8657b8', weight: 4.0, ability: 73, share: 0.0100, label: 'Epic' },
  Rare: { color: '#3977bd', weight: 2.2, ability: 65, share: 0.0500, label: 'Rare' },
  Uncommon: { color: '#3e9364', weight: 1.0, ability: 56, share: 0.6500, label: 'Uncommon' },
  Common: { color: '#8b929b', weight: 0.30, ability: 48, share: 0.28768, label: 'Common' }
};

export const IDEOLOGY_DIMENSIONS = [
  { key: 'economy', label: 'Economic role', low: 'State-directed', high: 'Market liberal' },
  { key: 'social', label: 'Social values', low: 'Socially open', high: 'Traditionalist' },
  { key: 'federal', label: 'Federal power', low: 'National government', high: 'States’ rights' },
  { key: 'foreign', label: 'Foreign policy', low: 'Restraint', high: 'Interventionist' },
  { key: 'trade', label: 'Trade', low: 'Protectionist', high: 'Free trade' },
  { key: 'immigration', label: 'Immigration', low: 'Integration-oriented', high: 'Restrictive' },
  { key: 'environment', label: 'Environment', low: 'Aggressive transition', high: 'Production first' },
  { key: 'institutions', label: 'Institutions', low: 'Structural reform', high: 'Procedural continuity' },
  { key: 'style', label: 'Political style', low: 'Consensus', high: 'Populist' }
];

export const ABILITY_KEYS = [
  ['charisma', 'Charisma'], ['speech', 'Speech'], ['debating', 'Debating'], ['intelligence', 'Intelligence'],
  ['instinct', 'Political instinct'], ['organization', 'Organization'], ['fundraising', 'Fundraising'],
  ['media', 'Media skill'], ['discipline', 'Discipline'], ['empathy', 'Empathy'],
  ['coalition', 'Coalition building'], ['governance', 'Governance']
];

export const POPULATION_GROUPS = [
  { id: 'urbanProfessionals', name: 'Urban professionals', economy: 38, social: 24, institutions: 66, baseTurnout: 67, issue: 'institutions and housing' },
  { id: 'industrialWorkers', name: 'Industrial workers', economy: 30, social: 58, trade: 26, baseTurnout: 61, issue: 'wages and industrial jobs' },
  { id: 'ruralTraditionalists', name: 'Rural traditionalists', economy: 61, social: 82, federal: 80, baseTurnout: 74, issue: 'local autonomy and tradition' },
  { id: 'suburbanFamilies', name: 'Suburban families', economy: 58, social: 48, institutions: 70, baseTurnout: 72, issue: 'schools, safety, and stability' },
  { id: 'smallBusiness', name: 'Small-business owners', economy: 76, social: 58, federal: 63, baseTurnout: 76, issue: 'taxes and regulation' },
  { id: 'publicSector', name: 'Public-sector professionals', economy: 29, social: 31, institutions: 72, baseTurnout: 71, issue: 'public services and labor protections' },
  { id: 'youngGraduates', name: 'Young graduates', economy: 35, social: 14, environment: 18, baseTurnout: 47, issue: 'housing, climate, and opportunity' },
  { id: 'retirees', name: 'Retirees', economy: 54, social: 64, institutions: 76, baseTurnout: 84, issue: 'pensions, healthcare, and stability' },
  { id: 'religiousCommunities', name: 'Religious communities', economy: 55, social: 88, immigration: 62, baseTurnout: 78, issue: 'family, education, and community' },
  { id: 'immigrantCommunities', name: 'Recent immigrant communities', economy: 31, social: 28, immigration: 15, baseTurnout: 48, issue: 'opportunity and inclusion' },
  { id: 'energyWorkers', name: 'Energy and extraction workers', economy: 67, social: 67, environment: 91, baseTurnout: 66, issue: 'energy jobs and regional identity' },
  { id: 'independents', name: 'Anti-establishment independents', economy: 49, social: 52, institutions: 22, style: 84, baseTurnout: 55, issue: 'corruption and institutional distrust' }
];

export const COALITION_LABELS = {
  progressives: 'Progressives', conservatives: 'Conservatives', labor: 'Labor voters', business: 'Business voters',
  moderates: 'Moderates', populists: 'Populists'
};

export const STATE_BLUEPRINTS = [
  ['Alder','AD','Northeast','oldEstablishment',-9], ['Briar','BR','Northeast','oldEstablishment',-4],
  ['Calder','CA','Northeast','coastalMetro',-15], ['Dunwich','DU','Northeast','oldEstablishment',-8],
  ['Eastmere','EM','Northeast','coastalMetro',-12], ['Fairmont','FM','Northeast','industrial',-2],
  ['Granite','GR','Northeast','oldEstablishment',3], ['Hawthorne','HW','Northeast','coastalMetro',-6],
  ['Ironwood','IW','Great Lakes','industrial',-1], ['Jefferson','JF','Great Lakes','industrial',2],
  ['Keystone','KS','Great Lakes','industrial',0], ['Lakemont','LM','Great Lakes','industrial',-3],
  ['Marquette','MQ','Great Lakes','industrial',4], ['Northstar','NS','Great Lakes','oldEstablishment',-5],
  ['Orchard','OR','Great Lakes','industrial',1], ['Prairie','PR','Plains','agrarian',9],
  ['Quincy','QU','Plains','agrarian',5], ['Red River','RR','Plains','agrarian',11],
  ['Sagebrush','SB','Plains','frontier',12], ['Tallgrass','TG','Plains','agrarian',7],
  ['Union Plains','UP','Plains','agrarian',3], ['Valley Forge','VF','Mid-Atlantic','oldEstablishment',-1],
  ['Westhaven','WH','Mid-Atlantic','coastalMetro',-10], ['Yorkland','YL','Mid-Atlantic','industrial',-4],
  ['Appalachia','AP','South','industrial',8], ['Bayou','BY','South','sunbelt',10],
  ['Carolina','CR','South','sunbelt',5], ['Delta','DL','South','agrarian',12],
  ['Evergreen Gulf','EG','South','sunbelt',2], ['Franklin','FK','South','sunbelt',7],
  ['Gulfmark','GM','South','sunbelt',10], ['Highland','HL','South','agrarian',6],
  ['Indigo','IN','South','sunbelt',1], ['Jacksonia','JA','South','agrarian',13],
  ['Kingston','KG','South','oldEstablishment',-2], ['Lone Mesa','LO','Southwest','sunbelt',6],
  ['Mesa Verde','MV','Southwest','frontier',4], ['New Corinth','NC','Southwest','sunbelt',-1],
  ['Ocotillo','OC','Southwest','frontier',8], ['Pecos','PE','Southwest','energy',11],
  ['Rio Norte','RN','Southwest','sunbelt',0], ['Sierra','SI','West','coastalMetro',-14],
  ['Timberline','TI','West','frontier',3], ['Umber','UM','West','frontier',7],
  ['Vista','VI','West','coastalMetro',-8], ['Willamette','WI','West','coastalMetro',-10],
  ['Xanadu','XA','West','frontier',2], ['Yellow Pine','YP','Mountain','frontier',9],
  ['Zephyr','ZE','Mountain','sunbelt',-3], ['Crown Range','CG','Mountain','energy',5]
];

export const ARCHETYPE_GROUP_WEIGHTS = {
  industrial: { industrialWorkers: 24, suburbanFamilies: 17, urbanProfessionals: 11, retirees: 12, smallBusiness: 10, ruralTraditionalists: 8, publicSector: 7, youngGraduates: 5, independents: 6 },
  coastalMetro: { urbanProfessionals: 24, youngGraduates: 15, immigrantCommunities: 14, publicSector: 10, suburbanFamilies: 15, retirees: 8, smallBusiness: 7, independents: 7 },
  agrarian: { ruralTraditionalists: 28, smallBusiness: 16, retirees: 15, religiousCommunities: 15, energyWorkers: 8, suburbanFamilies: 8, industrialWorkers: 5, independents: 5 },
  sunbelt: { suburbanFamilies: 19, immigrantCommunities: 12, smallBusiness: 13, retirees: 13, religiousCommunities: 11, urbanProfessionals: 11, ruralTraditionalists: 9, youngGraduates: 6, independents: 6 },
  oldEstablishment: { urbanProfessionals: 18, publicSector: 14, suburbanFamilies: 18, retirees: 13, smallBusiness: 10, youngGraduates: 9, industrialWorkers: 8, religiousCommunities: 5, independents: 5 },
  frontier: { ruralTraditionalists: 20, energyWorkers: 17, smallBusiness: 15, independents: 13, retirees: 11, suburbanFamilies: 10, religiousCommunities: 8, youngGraduates: 6 },
  energy: { energyWorkers: 23, ruralTraditionalists: 19, smallBusiness: 14, suburbanFamilies: 12, retirees: 10, religiousCommunities: 10, independents: 7, industrialWorkers: 5 }
};

export const FIRST_NAMES = [
  'Miriam','Elias','Clara','Jonas','Nora','Marcus','Leah','Adrian','Helena','Caleb','Tessa','Julian','Naomi','Gideon','Elena','Samuel','Camila','Arthur','Rosa','Malcolm','Iris','Theo','Vivian','Gabriel','Amelia','Darius','Lucia','Nathaniel','Maya','Simon','Rebecca','Mateo','Cora','Isaac','Alicia','Bennett','Diana','Owen','Selena','Victor','June','Dominic','Marina','Felix','Ada','Wesley','Sofia','Grant','Lena','Xavier','Esther','Roman','Avery','Hector','Celeste','Emmett','Lydia','Miles','Anika','Reed','Jamal','Priya','Evelyn','Martin','Daniel','Grace','Luis','Nadia','Thomas','Olivia','Andre','Hannah','Rafael','Mei','Peter','Zoe','Diego','Fatima','Lucas','Ines'
];

export const LAST_NAMES = [
  'Vale','Ward','Marin','Bell','Okafor','Vargas','Mercer','Hale','Soto','Whitaker','Kerr','Monroe','Chen','Dawes','Bennett','Navarro','Price','Shaw','Mendoza','Carver','Ellison','Frost','Quinn','Brooks','Patel','Reyes','Hart','Calloway','Mills','Rhodes','Kline','Farrell','Morrow','Pierce','Atwood','Salazar','Bishop','Vega','Sterling','Hsu','Connelly','Ortega','Ramsey','Parks','Castillo','Vance','Morales','Nolan','Webster','Grant','Cross','Kim','Holloway','Liu','Serrano','Finch','Dunn','Rivers','Blackwell','Stone','Carter','Ali','Singh','Cooper','Flores','Mitchell','Turner','Rivera','Nguyen','Murphy','Torres','Evans','Collins','Stewart','Morris','Rogers','Cook','Morgan','Bailey','Reed'
];

export const BACKGROUNDS = [
  'attorney','business executive','military officer','professor','journalist','community organizer','mayor','legislative staffer',
  'physician','union leader','farmer','prosecutor','technology founder','public administrator','teacher','nonprofit director',
  'state legislator','county executive','small-business owner','diplomat','economist','civil-rights advocate','minister','police chief'
];

export const FACTIONS = {
  union: [
    { id: 'labor', name: 'Labor Coalition', economy: 20, social: 47, style: 48 },
    { id: 'progressive', name: 'Progressive Forum', economy: 18, social: 12, environment: 15 },
    { id: 'institutional', name: 'Institutional Liberals', economy: 38, social: 28, institutions: 76 },
    { id: 'growth', name: 'Growth Democrats', economy: 55, social: 31, trade: 68 },
    { id: 'regional', name: 'Regional Autonomy Caucus', economy: 37, federal: 72, social: 35 }
  ],
  liberty: [
    { id: 'business', name: 'Enterprise Conservatives', economy: 84, social: 54, trade: 73 },
    { id: 'traditional', name: 'Traditional Values Caucus', economy: 65, social: 91, immigration: 72 },
    { id: 'national', name: 'National Conservatives', economy: 57, social: 78, trade: 24, style: 83 },
    { id: 'libertarian', name: 'Liberty Forum', economy: 91, social: 38, federal: 88 },
    { id: 'institutional', name: 'Institutional Conservatives', economy: 73, social: 65, institutions: 83 }
  ]
};

export const ISSUE_LIBRARY = [
  'cost of living','industrial jobs','healthcare access','border security','public education','housing affordability',
  'abortion rights','crime and policing','energy prices','climate resilience','tax burden','institutional trust',
  'voting rights','regional inequality','pensions','foreign security'
];

export const POLICY_LIBRARY = [
  {
    id: 'abortion-restriction', name: 'Fetal Protection Act', level: 'state', issue: 'abortion rights',
    ideology: { key: 'social', min: 66 }, tags: ['social','rights'],
    effects: { rights: -7, conservative: 8, progressive: -10, nationalRecognition: 4, nationalPopularity: -1 },
    description: 'Restricts abortion access and empowers state enforcement.'
  },
  {
    id: 'abortion-protection', name: 'Reproductive Freedom Act', level: 'state', issue: 'abortion rights',
    ideology: { key: 'social', max: 36 }, tags: ['social','rights'],
    effects: { rights: 7, conservative: -9, progressive: 9, nationalRecognition: 4, nationalPopularity: 1 },
    description: 'Protects abortion access in state law and expands clinical access.'
  },
  {
    id: 'income-tax-cut', name: 'Growth and Tax Relief Package', level: 'both', issue: 'tax burden',
    ideology: { key: 'economy', min: 62 }, tags: ['economy','fiscal'],
    effects: { growth: 0.5, budget: -4, business: 7, labor: -3, nationalRecognition: 2 },
    description: 'Cuts income and business taxes while reducing projected revenue.'
  },
  {
    id: 'public-investment', name: 'Public Investment and Jobs Act', level: 'both', issue: 'industrial jobs',
    ideology: { key: 'economy', max: 44 }, tags: ['economy','infrastructure'],
    effects: { growth: 0.35, infrastructure: 6, budget: -5, labor: 7, business: -2, nationalRecognition: 2 },
    description: 'Funds transport, utilities, and public works through new borrowing and revenue.'
  },
  {
    id: 'right-to-work', name: 'Workplace Freedom Act', level: 'state', issue: 'industrial jobs',
    ideology: { key: 'economy', min: 66 }, tags: ['labor','economy'],
    effects: { business: 6, labor: -9, growth: 0.2, nationalRecognition: 2 },
    description: 'Restricts compulsory union arrangements and changes collective bargaining rules.'
  },
  {
    id: 'collective-bargaining', name: 'Collective Bargaining Restoration Act', level: 'state', issue: 'industrial jobs',
    ideology: { key: 'economy', max: 38 }, tags: ['labor','economy'],
    effects: { labor: 9, business: -6, budget: -2, nationalRecognition: 2 },
    description: 'Expands union bargaining rights and public-sector labor protections.'
  },
  {
    id: 'school-choice', name: 'Family Education Choice Act', level: 'state', issue: 'public education',
    ideology: { key: 'social', min: 58 }, tags: ['education','social'],
    effects: { education: 1, conservative: 5, progressive: -4, budget: -1 },
    description: 'Creates education savings accounts and expands charter access.'
  },
  {
    id: 'universal-pre-k', name: 'Universal Early Learning Act', level: 'state', issue: 'public education',
    ideology: { key: 'economy', max: 48 }, tags: ['education','social'],
    effects: { education: 6, budget: -4, labor: 3, progressive: 4 },
    description: 'Creates statewide pre-kindergarten and childcare support.'
  },
  {
    id: 'health-expansion', name: 'State Health Security Act', level: 'state', issue: 'healthcare access',
    ideology: { key: 'economy', max: 45 }, tags: ['health','fiscal'],
    effects: { health: 7, budget: -5, progressive: 4, labor: 3 },
    description: 'Expands public insurance eligibility and rural healthcare funding.'
  },
  {
    id: 'health-market', name: 'Competitive Health Markets Act', level: 'state', issue: 'healthcare access',
    ideology: { key: 'economy', min: 64 }, tags: ['health','economy'],
    effects: { health: 1, budget: 2, business: 4, progressive: -3 },
    description: 'Deregulates insurance products and emphasizes private competition.'
  },
  {
    id: 'clean-energy', name: 'Clean Energy Transition Standard', level: 'both', issue: 'climate resilience',
    ideology: { key: 'environment', max: 38 }, tags: ['environment','economy'],
    effects: { environment: 8, growth: 0.05, budget: -3, progressive: 5, conservative: -3 },
    description: 'Mandates a renewable transition and finances clean-industry investment.'
  },
  {
    id: 'energy-expansion', name: 'Domestic Energy Expansion Act', level: 'both', issue: 'energy prices',
    ideology: { key: 'environment', min: 64 }, tags: ['environment','economy'],
    effects: { environment: -6, growth: 0.4, business: 5, conservative: 4, progressive: -5 },
    description: 'Accelerates drilling, extraction, pipelines, and conventional generation.'
  },
  {
    id: 'police-funding', name: 'Safe Communities Funding Act', level: 'state', issue: 'crime and policing',
    ideology: { key: 'social', min: 58 }, tags: ['crime','social'],
    effects: { crime: -5, budget: -3, conservative: 5, progressive: -3 },
    description: 'Expands police staffing, sentencing capacity, and local security grants.'
  },
  {
    id: 'justice-reform', name: 'Justice and Rehabilitation Act', level: 'state', issue: 'crime and policing',
    ideology: { key: 'social', max: 42 }, tags: ['crime','rights'],
    effects: { crime: 1, rights: 5, progressive: 5, conservative: -4 },
    description: 'Reduces mandatory sentencing and expands diversion and rehabilitation.'
  },
  {
    id: 'voter-id', name: 'Election Integrity Act', level: 'state', issue: 'voting rights',
    ideology: { key: 'institutions', min: 60 }, tags: ['institutions','rights'],
    effects: { rights: -3, conservative: 5, progressive: -6, nationalRecognition: 3 },
    description: 'Adds identification and verification requirements to state elections.'
  },
  {
    id: 'voting-access', name: 'Voting Access and Participation Act', level: 'state', issue: 'voting rights',
    ideology: { key: 'institutions', max: 48 }, tags: ['institutions','rights'],
    effects: { rights: 4, progressive: 6, conservative: -4, nationalRecognition: 3 },
    description: 'Expands early voting, registration access, and mail ballots.'
  },
  {
    id: 'housing-zoning', name: 'Homes and Opportunity Act', level: 'state', issue: 'housing affordability',
    ideology: { key: 'economy', max: 60 }, tags: ['housing','economy'],
    effects: { growth: 0.25, infrastructure: 2, progressive: 3, moderates: 3 },
    description: 'Overrides local exclusionary zoning and finances new housing supply.'
  },
  {
    id: 'budget-discipline', name: 'Balanced Budget and Reserves Act', level: 'both', issue: 'tax burden',
    ideology: { key: 'economy', min: 54 }, tags: ['fiscal','institutions'],
    effects: { budget: 6, growth: -0.15, business: 3, moderates: 4 },
    description: 'Caps spending growth and directs surpluses into reserves.'
  }
];

export const EVENT_HEADLINES = {
  risingStar: ['A defeat that looked like a beginning', 'A new political name emerges', 'The candidate who lost—but arrived'],
  governor: ['A governorship changes the national map', 'The youngest governor in the republic', 'A state becomes a national showcase'],
  economyGood: ['Growth reshapes the political argument', 'Prosperity strengthens incumbents', 'A state economy becomes the national model'],
  economyBad: ['Economic anxiety moves to the center of politics', 'A downturn tests the governing party', 'Jobs data darkens the political mood'],
  scandal: ['Questions surround a rising political figure', 'An ethics inquiry shakes the capital', 'A private controversy becomes public'],
  retirement: ['A political era closes', 'A veteran leaves public life', 'Retirement opens a succession battle'],
  primary: ['The nomination battle begins', 'Candidates enter the cameras', 'The parties choose their future'],
  law: ['A defining measure becomes law', 'The governor signs a polarizing measure', 'Policy success creates national consequences']
};


// v0.3 historical foundations -------------------------------------------------
export const CAREER_ORIGINS = [
  { id:'local-politics', name:'Local politics', weight:43, minAge:25, stateRecognition:24, homeFavorability:7, nationalRecognition:1, abilities:{ organization:5, coalition:4, governance:3 }, coalition:{ moderates:3 }, paths:[
    ['Town council','Mayor','State Representative'], ['County board','County Executive','State Representative'], ['Campaign staff','City Council','Mayor'], ['School board','State Representative']
  ]},
  { id:'state-politics', name:'State politics', weight:22, minAge:27, stateRecognition:31, homeFavorability:9, nationalRecognition:2, abilities:{ organization:5, governance:5, fundraising:3 }, coalition:{ moderates:3 }, paths:[
    ['Legislative aide','State Representative','State Senator'], ['Attorney','State Representative','State Senator'], ['Public administrator','State Executive']
  ]},
  { id:'law', name:'Law', weight:10, minAge:28, stateRecognition:15, homeFavorability:2, nationalRecognition:1, abilities:{ speech:3, debating:5, intelligence:3 }, coalition:{ moderates:2 }, paths:[
    ['Law clerk','Attorney','Prosecutor'], ['Attorney','District Attorney'], ['Attorney','Civil-rights advocate']
  ]},
  { id:'business', name:'Business', weight:7, minAge:32, stateRecognition:13, homeFavorability:0, nationalRecognition:5, abilities:{ fundraising:8, organization:2 }, coalition:{ business:12, labor:-7 }, paths:[
    ['Family business','Business executive'], ['Entrepreneur','Business executive'], ['Merchant','Industrialist']
  ]},
  { id:'military', name:'Military', weight:6, minAge:31, stateRecognition:17, homeFavorability:8, nationalRecognition:8, abilities:{ discipline:9, governance:2, speech:2 }, coalition:{ conservatives:8, moderates:5 }, paths:[
    ['Army officer','Regimental commander'], ['Naval officer','Senior officer'], ['Militia officer','War hero']
  ]},
  { id:'academic', name:'Academic', weight:5, minAge:30, stateRecognition:10, homeFavorability:0, nationalRecognition:3, abilities:{ intelligence:9, speech:3 }, coalition:{ progressives:6, moderates:3 }, paths:[
    ['Teacher','Professor'], ['Researcher','Professor'], ['Clerk','Political economist']
  ]},
  { id:'civil-service', name:'Civil service', weight:4, minAge:29, stateRecognition:13, homeFavorability:3, nationalRecognition:2, abilities:{ governance:8, intelligence:4, discipline:3 }, coalition:{ moderates:5 }, paths:[
    ['Clerk','Public administrator'], ['Diplomatic service','Senior civil servant'], ['Tax office','Department director']
  ]},
  { id:'celebrity', name:'Celebrity', weight:2, minAge:31, stateRecognition:18, homeFavorability:-2, nationalRecognition:34, abilities:{ media:10, charisma:6, fundraising:4, governance:-7, organization:-4 }, coalition:{ populists:9, moderates:-3 }, paths:[
    ['Stage performer','National celebrity'], ['Writer','Public personality'], ['Sports champion','National celebrity']
  ]},
  { id:'activism', name:'Movement / union', weight:1, minAge:27, stateRecognition:20, homeFavorability:5, nationalRecognition:4, abilities:{ speech:5, organization:7, coalition:2 }, coalition:{ labor:10, progressives:5, business:-6 }, paths:[
    ['Union organizer','Labor leader'], ['Community organizer','Movement leader'], ['Abolition society','Movement leader']
  ]}
];

export const HISTORICAL_ERAS = [
  { id:'founding', name:'Founding & Constitutional Era', start:1, end:24, technology:'Early republic', pressures:['federal power','public debt','frontier settlement','indigenous relations'] },
  { id:'expansion', name:'Expansion & Sectional Era', start:25, end:68, technology:'Canals, early rail, territorial expansion', pressures:['slavery','territorial expansion','neighboring powers','indigenous sovereignty'] },
  { id:'industrial', name:'Industrial & Mass Politics Era', start:69, end:116, technology:'Rail, heavy industry, telegraph', pressures:['industrialization','labor rights','immigration','monopoly power'] },
  { id:'global-conflict', name:'Global Conflict Era', start:117, end:157, technology:'Electric industry, motorization, mass warfare', pressures:['great-power rivalry','world war','economic crisis','social insurance'] },
  { id:'modern-state', name:'Modern State & Rights Era', start:158, end:198, technology:'Mass media, aviation, nuclear age', pressures:['civil rights','welfare state','ideological rivalry','suburbanization'] },
  { id:'contemporary', name:'Globalization & Digital Era', start:199, end:9999, technology:'Digital networks, advanced services', pressures:['globalization','technology','inequality','climate','migration'] }
];

export const PARTY_SUCCESSOR_NAMES = {
  union: ['Federal Union','National Republican Party','Commonwealth Party','Progressive Union','Social Democratic Party','Civic Alliance','New Commonwealth'],
  liberty: ['Republican Coalition','Democratic Party','National Liberty Party','Conservative Party','People’s Party','American Reform Party','National Conservative Union']
};

export const PARTY_FOUNDING_IDENTITIES = {
  union: {
    name:'Federal Unionists', short:'FU', color:'#365f83', pale:'#dce8f1', symbol:'F',
    description:'Supporters of a durable federal union, public credit, national institutions, commerce, and a capable central government.',
    platform:{ economy:58, social:50, federal:25, foreign:57, trade:68, immigration:50, environment:52, institutions:78, style:30 }
  },
  liberty: {
    name:'Republican Coalition', short:'RC', color:'#8a4f3b', pale:'#f0dfd7', symbol:'R',
    description:'A decentralized agrarian coalition skeptical of concentrated federal power and protective of state sovereignty.',
    platform:{ economy:66, social:61, federal:83, foreign:35, trade:43, immigration:52, environment:57, institutions:55, style:51 }
  }
};

export const FOREIGN_COUNTRY_NAMES = [
  'Albion','Borealia','Castillea','Danubria','Etruria','Francia','Germania','Helvetia','Iberia','Karsovia','Levantine Republic','Maghreb Union',
  'Nordland','Ottoman Commonwealth','Persia','Qinghua','Rusovia','Scandia','Siamara','Tokugawa Federation','Andesia','Brasilia','Gran Colombia','Patagonia',
  'Azteca','Caribia','Australis','Indica','Korea','Malay Federation','Nile Republic','Zulu Confederacy','Congo Free Republic','East Africa Union','Pacifica','Arabian Kingdom'
];

export const HISTORICAL_PRESSURES = [
  { id:'founding-precedent', era:'founding', earliest:4, latest:4, title:'The founding generation defines federal power' },
  { id:'native-policy', era:'founding', earliest:6, latest:36, title:'The frontier and indigenous sovereignty', repeat:true },
  { id:'colonial-war', era:'founding', earliest:10, latest:34, title:'A former colonial power tests the young republic' },
  { id:'slavery-question', earliest:28, latest:92, title:'The slavery question becomes unavoidable', repeat:true },
  { id:'neighbor-war', era:'expansion', earliest:34, latest:66, title:'Territorial confrontation with a neighboring power' },
  { id:'labor-question', era:'industrial', earliest:75, latest:112, title:'Industrial unrest forces a national response', repeat:true },
  { id:'great-war', era:'global-conflict', earliest:120, latest:138, title:'A great-power war erupts overseas' },
  { id:'depression', era:'global-conflict', earliest:132, latest:151, title:'A global financial collapse reaches Columbia' },
  { id:'second-world-war', era:'global-conflict', earliest:142, latest:158, title:'A second global war threatens the international order' },
  { id:'civil-rights', era:'modern-state', earliest:161, latest:187, title:'A national civil-rights movement demands action', repeat:true },
  { id:'globalization', era:'contemporary', earliest:201, latest:235, title:'Trade and technology accelerate globalization', repeat:true }
];

export const ORIGIN_GROUP_AFFINITY = {
  'local-politics': { ruralTraditionalists:5, suburbanFamilies:7, smallBusiness:4, publicSector:4, independents:2 },
  'state-politics': { suburbanFamilies:6, publicSector:7, urbanProfessionals:3, retirees:3 },
  law: { urbanProfessionals:5, publicSector:5, suburbanFamilies:2 },
  business: { smallBusiness:13, urbanProfessionals:5, industrialWorkers:-7, publicSector:-4 },
  military: { retirees:11, ruralTraditionalists:8, religiousCommunities:5, independents:4, youngGraduates:-3 },
  academic: { urbanProfessionals:10, youngGraduates:12, publicSector:5, ruralTraditionalists:-5 },
  'civil-service': { publicSector:12, suburbanFamilies:5, independents:-5 },
  celebrity: { independents:13, youngGraduates:7, urbanProfessionals:4, retirees:-3 },
  activism: { industrialWorkers:13, youngGraduates:9, publicSector:4, smallBusiness:-7 }
};

export const POPULATION_GROUP_ERA_LABELS = {
  founding: {
    urbanProfessionals:'Merchants & learned professions', industrialWorkers:'Artisans & wage laborers', ruralTraditionalists:'Small farmers & rural traditionalists',
    suburbanFamilies:'Established town households', smallBusiness:'Merchants & shopkeepers', publicSector:'Federal & state officeholders', youngGraduates:'Young educated reformers',
    retirees:'Older property holders', religiousCommunities:'Religious communities', immigrantCommunities:'New settlers & migrants', energyWorkers:'Frontier extraction workers', independents:'Anti-establishment localists'
  },
  expansion: {
    urbanProfessionals:'Urban professionals & merchants', industrialWorkers:'Industrial workers & artisans', ruralTraditionalists:'Farmers & rural traditionalists',
    suburbanFamilies:'Town & small-city households', smallBusiness:'Small proprietors', publicSector:'Government professionals', youngGraduates:'Young reformers', retirees:'Older voters',
    religiousCommunities:'Religious communities', immigrantCommunities:'New immigrant communities', energyWorkers:'Frontier & extraction workers', independents:'States-rights independents'
  },
  industrial: {
    urbanProfessionals:'Urban professionals', industrialWorkers:'Industrial labor', ruralTraditionalists:'Rural traditionalists', suburbanFamilies:'Middle-class households', smallBusiness:'Small business',
    publicSector:'Public professionals', youngGraduates:'Young reformers', retirees:'Older voters', religiousCommunities:'Religious communities', immigrantCommunities:'Immigrant communities', energyWorkers:'Mining & energy workers', independents:'Anti-machine independents'
  },
  'global-conflict': {}, 'modern-state': {}, contemporary: {}
};

export const FACTION_ERA_NAMES = {
  founding: {
    union: ['Commercial Federalists','Constitutional Nationalists','Urban Federalists','National Defense Caucus','Moderate Unionists'],
    liberty: ['Agrarian Republicans','States’ Rights Bloc','Frontier Republicans','Traditional Republicans','Anti-Centralists']
  },
  expansion: {
    union: ['National Development Wing','Free Soil Reformers','Commercial Unionists','Federal Moderates','Union Nationalists'],
    liberty: ['Agrarian Democrats','States’ Rights Democrats','Expansionists','Traditionalists','Popular Democrats']
  },
  industrial: {
    union: ['Labor Reform Wing','Progressive Reformers','Institutional Liberals','Growth Modernizers','Regional Reformers'],
    liberty: ['Enterprise Conservatives','Traditional Values Bloc','National Conservatives','Classical Liberals','Institutional Conservatives']
  },
  'global-conflict': {
    union: ['Labor Coalition','Social Reformers','Internationalists','Growth Liberals','Regional Moderates'],
    liberty: ['Business Conservatives','Traditionalists','National Conservatives','Limited Government Wing','Institutional Conservatives']
  },
  'modern-state': {
    union: ['Labor Coalition','Progressive Forum','Institutional Liberals','Growth Democrats','Regional Caucus'],
    liberty: ['Enterprise Conservatives','Traditional Values Caucus','National Conservatives','Liberty Forum','Institutional Conservatives']
  },
  contemporary: {
    union: ['Labor Coalition','Progressive Forum','Institutional Liberals','Growth Democrats','Regional Autonomy Caucus'],
    liberty: ['Enterprise Conservatives','Traditional Values Caucus','National Conservatives','Liberty Forum','Institutional Conservatives']
  }
};
