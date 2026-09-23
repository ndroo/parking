// Content for /guide, adapted from the "General information" Google Doc.
// Photos live in /public/guide (exported from the doc). Edit text here.

export interface GuidePhoto { src: string; alt: string }
export interface GuideItem { title: string; body?: string; photos?: GuidePhoto[] }

const p = (n: number, alt: string): GuidePhoto => ({ src: `/guide/image${n}.jpg`, alt });
const k = (file: string, alt: string): GuidePhoto => ({ src: `/guide/${file}.jpg`, alt });

export const GUIDE = {
  intro:
    "Not everything here is critical for you to know, but by sharing it we hope to create a good base of information that kicks off a healthy, long-term tenant and landlord relationship.",

  facts: [
    { label: "Built", value: "1904" },
    { label: "Units", value: "3" },
    { label: "Renovated", value: "2018, 2022, 2025" },
    { label: "Rent controlled", value: "Yes" },
    { label: "Hydro (metered)", value: "$50-125/mo" },
  ],

  selected: {
    lede: "It's pretty simple. These are the steps I've followed myself in the past, so I share them with you! Generally it comes down to making it an easy \"yes\" for the landlord, so keep that in mind and come prepared.",
    steps: [
      { title: "Consent to a credit check", body: "Provide consent to pull your credit report, or provide a detailed extract of your credit report." },
      { title: "Apply early", body: "Fill out the application in advance of the showing, or the day after viewing the unit." },
      { title: "Be clear about must-haves", body: "Parking, animals, or any special considerations we might be overlooking." },
      { title: "Be honest and upfront", body: "In every possible way. We'll of course do the same in return!" },
      { title: "Explain anything odd", body: "In 2019 I forgot to pay a bill because I was living in Victoria for 12 months and wasn't collecting my mail in Toronto. As long as there's a good reason you can explain, it won't hurt your application. We just want to understand your situation and how it might impact ours." },
      { title: "Be reachable the next day", body: "We once couldn't reach someone for a whole day, so we selected someone else rather than lose our second-best option." },
      { title: "Re-confirm your interest", body: "Some people lose interest after a viewing, and that's OK. Just let me know so I know whether to follow up." },
      { title: "Be ready to move quickly", body: "Have your deposit ready within 48 hours and promptly sign the lease agreement." },
    ],
  },

  documents: {
    lede: "Share anything you feel strengthens your application. We're not rigid: make the best case you can, and we'll assess it on its merits. Everyone's situation is different, so use what fits yours.",
    groups: [
      { title: "Income", items: ["Employment letter", "Recent pay stubs", "Last year's T4 or T1 General (ideal), or Notice of Assessment", "Bank or credit card statements (great if you're self-employed)", "Proof of savings, scholarships or other support"] },
      { title: "Rental history", items: ["Contact for a current or past landlord (hold off on your current one if you haven't given notice)", "Rent payment records"] },
      { title: "Credit", items: ["Consent for a credit check, or a recent credit report", "A quick note explaining anything unusual"] },
      { title: "Anything else", items: ["A guarantor's details, if someone is backing your lease", "Details about your pet (breed, age, temperament)", "A short intro about you and why this place fits"] },
    ],
    timing: "If you can, bring what you have to the showing or send it right after. We aim to offer a lease within 24-72 hours of showings, and moving quickly helps us both.",
    privacy: "We'll only use what you share to review your application. You never need to send your SIN.",
  },

  utilities: {
    included: ["Heat", "Water (see below)"],
    notIncluded: [
      { name: "Hydro", note: "Each unit has its own meter, typically $50-125/month depending on usage." },
      { name: "Internet", note: "Set up your own plan. The house is wired for both fibre optic and cable internet, so you can pick the provider you like." },
    ],
    water: {
      included: 2,
      summary: "Water is included in your rent for up to 2 people per unit. Once a year we review how many people live in each unit. For each person above 2, the unit pays that person's share of the building's water bill, calculated each quarter when the bill arrives. Units with fewer than 2 people don't get a credit.",
      formula: "Your share = Quarterly bill × (Your unit's occupants − 2) ÷ Total occupants in the building",
      example: {
        bill: 420,
        occupants: [2, 2, 3],
        note: "If every unit has 2 or fewer people, nobody pays anything extra. Figures are illustrative; actual bills vary by season and usage.",
      },
    },
  },

  ideal: {
    lede: [
      "We want to communicate what's important to us so we can have a constructive long-term relationship where everyone stays happy. We're also interested in what's important to you, so feel free to chat with us about it!",
      "Generally we want someone who will take care of the place and understands the business nature of the relationship: we're required to provide high-quality housing, and your part is to enjoy it, avoid damaging it where possible, and pay your rent on time.",
    ],
    points: [
      { title: "Helps keep the property well maintained", body: "We invested over $400k in 2018-2019 cleaning up the house and landscape, and a further $130k on the basement in 2022-2023. Things will break and accidents will happen. All we ask is that we keep them to a minimum, and that damage is reported so it can be fixed before it becomes a bigger issue." },
      { title: "Understands it's a 100+ year old house", body: "We've replaced almost everything, but some parts are impossible to replace and lead to old-house quirks from time to time. If something takes longer to fix than you'd like, it's never because we don't care. It's because we're finding a solution that works for you without hurting the long-term maintainability of the house or other tenants." },
      { title: "Pays rent on time, all the time", body: "Without exception." },
      { title: "Is civil and reasonable with other tenants", body: "At all times, and doesn't interrupt their lifestyle." },
      { title: "Asks before making changes", body: "Please don't carry out repairs or modifications without written consent. We'd rarely say no, but being informed lets us maintain the building and avoid surprises when you move on. For example: internet installs that drill through walls; hanging curtains, blinds or TVs; replacing kitchen or bathroom parts; removing landscaping; painting (fine, but please return it to the original colour before you leave)." },
      { title: "Reports damage promptly", body: "So it can be corrected without causing larger issues, and ideally offers to pay for damage caused by abuse or negligence." },
      { title: "Understands annual guideline increases", body: "We'll likely raise rent by the provincial guideline each year, but we won't try to raise it further, even after large capital investments. Guideline increases (around 1.8-2.5% historically) have barely kept up with inflation, so we do apply them each year." },
      { title: "Allows access for maintenance", body: "With legal notice, for preventive maintenance, inspections and repairs." },
    ],
    guidelineUrl: "https://www.ontario.ca/page/residential-rent-increases",
  },

  faq: [
    { q: "How many units are in the house?", a: "3." },
    { q: "Who else lives in the house?", a: "There's a group of 3 in Unit 1 (the second and third floors), and on the main floor there are two sisters." },
    { q: "Can I use the front porch?", a: "Only Unit 1 uses this area, for bike storage." },
    { q: "Is parking available?", a: "Parking can optionally be added (pending availability) for an additional monthly fee, either with your lease or through our parking booking page. There's bike parking at the back for Units 2 and 3, and on the front porch for Unit 1. Tenants may only use the parking allocated in their lease, and unrecognized plates will be towed." },
    { q: "Are animals allowed?", a: "If it's a legal animal for you to have as a pet, yes. Please be extremely upfront about pets. I love dogs (my Beagle Elvis is my best friend), so I get it! But pets can cause damage, disrupt other tenants and, worst of all, be aggressive during maintenance or inspections. My goal is that you, the other tenants, anyone who works on the property and I are all safe and happy on site." },
    { q: "Is the rent negotiable?", a: "Give us an offer and we'll gladly consider it alongside the rest of your application and the other applicants." },
    { q: "You seem a bit intense, am I reading that right?", a: "I'm just trying to give you all the info you need and be the best landlord I can. I only try to create rentals I'd want to live in myself, and a lot of this comes from the lack of communication I felt from my own past landlords. I'm very easy going and like to joke around, but this part of life is a business and I want a constructive, fair value exchange for both of us." },
    { q: "Have you done this before?", a: "I've rented 3 other buildings, my first in 2016. We've since scoped our landlording down to just this building. In complete honesty we find it kind of stressful, so we may step back at some point, but that's a way off. Meanwhile our goal is to keep this house in the best possible condition and find the best possible tenants." },
    { q: "This was a lot of work, what did it cost?", a: "Approximately $580,000 at this point, and counting. We did everything to code, with permits." },
    { q: "Where do you live?", a: "Near Bellwoods park, so we're only around 5 minutes away most of the time. My full address will be on the lease if you're the successful applicant." },
    { q: "Is this unit rent controlled?", a: "Yes." },
  ],

  about: {
    photo: p(9, "Andrew and Jess with Elvis the Beagle"),
    paragraphs: [
      "My name is Andrew. I have a rescue Beagle named Elvis and a lovely wife, Jess. (The picture was taken during COVID, please excuse our hair.)",
      "I was born in Australia and moved to Canada in 2008. We live in the Bellwoods neighbourhood (Queen and Strachan) and have slowly collected apartments and houses across the city over the last 10 years. It's kind of enjoyable, and we get a sense of accomplishment when a quality unit hits the market.",
      "We bounce between our house on Queen West and our cottage in Haliburton. We live nearby, so we're very available to help if anything goes wrong. I'm very handy and can fix almost anything, and we use that to make sure issues are dealt with promptly and to a standard we'd be happy with in our own home.",
      "Jess has a PhD and works as a freshwater ecologist. I've worked in technology for 20 years, but in April 2018 I stepped away for a while to work with my hands, and the Beatrice renovation was the result. I'm back in my normal field now, but if you ever need help I'm super responsive and keen to lend a hand.",
    ],
  },

  history: {
    body: "The house was built in 1904 by a Scottish immigrant named Hartley Gibson, and until we came along in 2018 it hadn't had a serious renovation since. Our hope is to hold onto it for 10-20 years and keep it in ideal condition throughout, to give a great tenant experience.",
    photo: p(15, "The original 1904 building permit stub"),
    caption: "The original building permit stub from April 30th, 1904.",
  },

  reno2018: {
    lede: "From August 2018 to May 2019 we carried out what was basically an entire gut job and rebuild.",
    items: [
      { title: "New high-efficiency gas boiler", body: "Radiant heating plus hot water supply.", photos: [p(8, "New boiler system")] },
      { title: "New roof and gutters", photos: [p(23, "Roof replacement")] },
      { title: "Complete demolition of interior walls and floors", body: "The basement at the time was only 6 feet deep and very damp.", photos: [p(21, "Basement during demolition")] },
      { title: "AC in every room", photos: [p(7, "Finished room")] },
      { title: "Electrical split into 4 meters", body: "Common elements (we pay this bill), Unit 1, Unit 2 and Unit 3.", photos: [p(31, "New electrical meters")] },
      { title: "Built to current code, with a lot of insulation", body: "Electrical, plumbing, HVAC, framing, fire suppression and insulation requirements were all strictly followed. We insulated even the interior walls to reduce sound between bedrooms, well beyond code, and added two layers of drywall and resilient channels on the ceilings for sound and fire proofing.", photos: [p(17, "Insulation in a Unit 2 bedroom")] },
      { title: "Underpinned the basement", body: "The foundation was shored up by an additional 24 inches, with a 26 inch wide footing across all existing walls.", photos: [p(13, "Underpinning the basement"), p(12, "New footings")] },
      { title: "New windows and doors", body: "All interior and exterior windows and doors replaced, and a lot of decaying brick repaired.", photos: [p(37, "New bay window"), p(19, "New rear window")] },
      { title: "Restored radiators with thermostatic valves", body: "Every radiator was drained, cleaned and repainted, with thermostatic valves so you can set each room's temperature. Each unit also has its own smart thermostat and heating zone, so your neighbour doesn't control your heat!", photos: [p(26, "Radiator before"), p(32, "Radiator after"), p(5, "Thermostatic valve")] },
      { title: "New kitchens and fresh paint", body: "Units 2 and 3 got completely new kitchens. We re-used parts of Unit 1's kitchen at the time, and fully replaced it in 2025 (see below).", photos: [p(27, "Kitchen being installed"), p(18, "Finished kitchen"), p(2, "Freshly painted room")] },
      { title: "In-floor heating and waterproofing (basement)", body: "New drains, a backflow prevention valve and waterproofing keep the basement dry and comfortable.", photos: [p(4, "Pouring the heated floor")] },
      { title: "New basement walkout", body: "The old one was caving in.", photos: [p(28, "Rebuilding the walkout")] },
      { title: "Landscaped front yard", photos: [p(36, "Front yard before"), p(16, "Front yard after")] },
      { title: "Refinished back of the house", photos: [p(30, "Back of the house during work"), p(20, "Finished backyard")] },
      { title: "Resurfaced rear parking (July 2020)", body: "With the fancy new mural! Thanks to our buddy @mostlyletters.", photos: [p(11, "Preparing the parking pad"), p(10, "Fresh parking surface"), p(34, "Parking with the mural")] },
    ] as GuideItem[],
  },

  kitchens2025: {
    lede: "In 2025 we upgraded the kitchens in Units 1 and 2 at the same time. For both we chose a grey stone countertop: it's durable, better for tenants day to day, and easier for us to maintain over the long run.",
    items: [
      {
        title: "Unit 1: full kitchen replacement",
        body: "The last kitchen still carrying parts from before 2018 was fully replaced: new cabinets, appliances, backsplash and grey stone countertops, plus an island.",
        photos: [k("kitchen-u1-1", "Unit 1 kitchen before"), k("kitchen-u1-3", "New cabinets going in"), k("kitchen-u1-6", "Countertops being installed"), k("kitchen-u1-7", "Finished Unit 1 kitchen"), k("kitchen-u1-9", "New range and backsplash"), k("kitchen-u1-8", "Island looking into the living room")],
      },
      {
        title: "Unit 2: new countertops",
        body: "The cabinets from 2018 were still in great shape, but the wooden IKEA countertop didn't hold up well, so we replaced it with the same grey stone.",
        photos: [k("kitchen-u2-1", "Old countertop removed"), k("kitchen-u2-2", "Finished Unit 2 kitchen"), k("kitchen-u2-3", "Unit 2 kitchen and living area"), k("kitchen-u2-4", "New grey stone countertops")],
      },
    ] as GuideItem[],
  },

  reno2022: {
    lede: "In 2022 we finally finished the basement and created the house's third unit. This was always the plan when we bought the house in 2018; we just couldn't afford it at the time. The budget was $90,000 and the final cost was closer to $130k, including the entrance landscaping, heating upgrades and appliances. Thankfully we'd already underpinned in 2018 (another $125,000), so the ceiling height is great and it's completely dry.",
    items: [
      { title: "Where we started", body: "Underpinned, but otherwise unfinished.", photos: [p(22, "Basement before the 2022 renovation")] },
      { title: "Clearing the way", body: "We removed an old staircase and cast iron heating pipes that would have cost about a foot of ceiling height and blocked two new windows.", photos: [p(6, "Old staircase and pipes")] },
      { title: "Modern heating pipes", body: "Replaced with oxygen-barrier 3/4 inch PEX, which should last 20-30 years and takes up far less space.", photos: [p(1, "Framing and new pipes"), p(14, "New PEX piping")] },
      { title: "Living area and kitchen", body: "Delays getting a Committee of Adjustment hearing (which ultimately wasn't required) turned a 90 day plan into 13 months. It's not easy to build housing in Toronto!", photos: [p(3, "Living area under construction"), p(29, "Finished living area and kitchen")] },
      { title: "In-suite laundry for Unit 3", photos: [p(33, "Laundry before"), p(24, "Laundry after")] },
    ] as GuideItem[],
  },
};
