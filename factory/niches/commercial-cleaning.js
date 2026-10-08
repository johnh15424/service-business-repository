export default {
  id: 'commercial_cleaning',
  name: 'Commercial Cleaning',
  category: 'Home & Property',
  slug: 'commercial-cleaning-price-calculator',
  status: 'build',
  seo: {
    title: 'Commercial Cleaning Bid Calculator | Contract Costs & Margin',
    description: 'Free commercial cleaning bid calculator for cleaner-hours, supplies, site access, travel, overhead, risk reserve and retained margin.'
  },
  copy: {
    eyebrow: 'COMMERCIAL CLEANING · CONTRACTOR PRICING',
    headline: 'Commercial cleaning price calculator.',
    lead: 'Build a bid for one site visit from paid cleaner-hours, supplies, equipment, travel, contract overhead and margin. For recurring contracts, calculate visit frequency and periodic work separately.',
    resultEyebrow: 'YOUR CLEANING VISIT, COSTED',
    footerNote: 'Planning support for cleaning businesses. Confirm site scope, productivity, employment costs, contract terms, tax and local obligations before quoting.'
  },
  jobTypes: [
    { id: 'office', label: 'Routine office cleaning visit', example: { crew: 2, workHours: 3, travelHours: 0.5, supplies: 18, equipment: 9, security: 5, periodic: 8, minimumPreTax: 180 } },
    { id: 'retail', label: 'Retail / showroom cleaning visit', example: { crew: 2, workHours: 2.5, travelHours: 0.5, supplies: 16, equipment: 7, security: 3, periodic: 6, minimumPreTax: 160 } },
    { id: 'clinic', label: 'Clinic / specialist premises visit', example: { crew: 2, workHours: 4, travelHours: 0.5, supplies: 28, equipment: 12, security: 8, periodic: 14, minimumPreTax: 260 } },
    { id: 'school', label: 'Education premises visit', example: { crew: 3, workHours: 4, travelHours: 0.5, supplies: 38, equipment: 15, security: 6, periodic: 18, minimumPreTax: 350 } },
    { id: 'deep', label: 'One-off commercial deep clean', example: { crew: 3, workHours: 7, travelHours: 0.75, supplies: 85, equipment: 45, security: 5, periodic: 0, minimumPreTax: 650 } }
  ],
  directCostFields: [
    { id: 'supplies', label: 'Chemicals and consumables / visit', default: 18 },
    { id: 'equipment', label: 'Equipment wear / visit', default: 9 },
    { id: 'security', label: 'Keyholding and site access / visit', default: 5 },
    { id: 'periodic', label: 'Provision for periodic work / visit', default: 8 }
  ],
  defaults: {
    crew: 2, workHours: 3, travelHours: 0.5, wage: 17, burden: 25,
    distance: 16, vehicleRate: 0.50, monthlyOverhead: 3200, jobsMonth: 120,
    fixedFee: 0.30, paymentFeeRate: 1.5, reserveRate: 5, targetMargin: 28,
    minimumPreTax: 180, taxRate: 0
  },
  products: { freeUrl: null, proUrl: null, proPrice: 24.99 }
};
