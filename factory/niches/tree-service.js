export default {
  id: 'tree_service',
  name: 'Tree Service',
  category: 'Garden & Outdoor',
  slug: 'tree-service-price-calculator',
  status: 'build',
  seo: {
    title: 'Tree Service Price Calculator | Crew, Equipment & Margin',
    description: 'Free tree service price calculator for crew-hours, equipment, disposal, travel, overhead, minimum charge, margin and tax.'
  },
  copy: {
    eyebrow: 'TREE SERVICE · FREE PRICING TOOL',
    headline: 'Tree service price calculator.',
    lead: 'Build a quote from crew-hours, equipment, disposal, travel, overhead and the margin the business needs.',
    resultEyebrow: 'YOUR TREE SERVICE JOB, COSTED',
    footerNote: 'Planning support only. Tree work may require qualified operators, permits, specialist equipment, insurance and site-specific safety controls.'
  },
  jobTypes: [
    { id: 'pruning', label: 'Tree pruning', example: { crew: 2, workHours: 4, travelHours: 0.75, equipment: 45, disposal: 80, subcontract: 0, permit: 0, minimumPreTax: 450 } },
    { id: 'removal', label: 'Tree removal', example: { crew: 3, workHours: 6, travelHours: 0.75, equipment: 120, disposal: 180, subcontract: 0, permit: 0, minimumPreTax: 900 } },
    { id: 'stump', label: 'Stump grinding', example: { crew: 1, workHours: 2, travelHours: 0.75, equipment: 90, disposal: 30, subcontract: 0, permit: 0, minimumPreTax: 250 } },
    { id: 'storm', label: 'Storm / emergency clearance', example: { crew: 3, workHours: 5, travelHours: 0.75, equipment: 140, disposal: 200, subcontract: 0, permit: 0, minimumPreTax: 1000 } },
    { id: 'other', label: 'Other tree service', example: { crew: 2, workHours: 4, travelHours: 0.75, equipment: 70, disposal: 80, subcontract: 0, permit: 0, minimumPreTax: 500 } }
  ],
  directCostFields: [
    { id: 'equipment', label: 'Equipment / machine cost', default: 70 },
    { id: 'disposal', label: 'Green waste / disposal', default: 80 },
    { id: 'subcontract', label: 'Subcontractor / crane cost', default: 0 },
    { id: 'permit', label: 'Permit / traffic control allowance', default: 0 }
  ],
  defaults: { crew: 2, workHours: 4, travelHours: 0.75, wage: 28, burden: 15, distance: 30, vehicleRate: 0.65, monthlyOverhead: 3500, jobsMonth: 24, fixedFee: 0.30, paymentFeeRate: 2, reserveRate: 5, targetMargin: 32, minimumPreTax: 450, taxRate: 0 },
  products: { freeUrl: null, proUrl: null, proPrice: 24.99 }
};