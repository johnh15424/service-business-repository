export default {
  id: 'lawn_care',
  name: 'Lawn Care',
  category: 'Garden & Outdoor',
  slug: 'lawn-care-price-calculator',
  status: 'pilot',
  seo: {
    title: 'Lawn Care Price Calculator | Costs, Margin & Tax',
    description: 'Free lawn care price calculator for crew time, fuel, equipment wear, travel, overhead, minimum charge, margin and tax.'
  },
  copy: {
    eyebrow: 'LAWN CARE · FREE PRICING TOOL',
    headline: 'Lawn care price calculator.',
    lead: 'Build a quote from paid crew time, fuel, equipment wear, travel, disposal, overhead and the margin the business needs.',
    resultEyebrow: 'YOUR LAWN CARE JOB, COSTED'
  },
  jobTypes: [
    { id: 'mowing', label: 'Lawn mowing', example: { crew: 1, workHours: 1.25, travelHours: 0.5, fuel: 5, consumables: 2, wear: 6, disposal: 0, minimum: 55 } },
    { id: 'hedges', label: 'Hedge trimming', example: { crew: 1, workHours: 2.5, travelHours: 0.5, fuel: 6, consumables: 3, wear: 10, disposal: 12, minimum: 95 } },
    { id: 'tidy', label: 'Garden tidy-up', example: { crew: 2, workHours: 3, travelHours: 0.5, fuel: 8, consumables: 5, wear: 14, disposal: 30, minimum: 180 } },
    { id: 'leaves', label: 'Leaf clearance', example: { crew: 1, workHours: 2, travelHours: 0.5, fuel: 5, consumables: 4, wear: 8, disposal: 18, minimum: 85 } },
    { id: 'other', label: 'Other lawn / garden job', example: { crew: 1, workHours: 2, travelHours: 0.5, fuel: 5, consumables: 3, wear: 8, disposal: 0, minimum: 75 } }
  ],
  directCostFields: [
    { id: 'fuel', label: 'Fuel / job', default: 5 },
    { id: 'consumables', label: 'Consumables / job', default: 3 },
    { id: 'wear', label: 'Equipment wear / job', default: 8 },
    { id: 'disposal', label: 'Green waste disposal', default: 0 }
  ],
  defaults: {
    crew: 1,
    workHours: 1.5,
    travelHours: 0.5,
    wage: 20,
    burden: 12,
    distance: 20,
    vehicleRate: 0.45,
    monthlyOverhead: 1400,
    jobsMonth: 70,
    fixedFee: 0.30,
    paymentFeeRate: 2,
    reserveRate: 3,
    targetMargin: 30,
    minimumPreTax: 55,
    taxRate: 0
  },
  products: {
    freeUrl: null,
    proUrl: null,
    proPrice: 24.99
  }
};
