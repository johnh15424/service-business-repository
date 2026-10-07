export default {
  id: 'landscaping',
  name: 'Landscaping',
  category: 'Garden & Outdoor',
  slug: 'landscaping-price-calculator',
  status: 'build',
  seo: {
    title: 'Landscaping Price Calculator | Job Costs, Margin & Tax',
    description: 'Free landscaping price calculator for crew time, materials, machinery, disposal, travel, overhead, minimum charge, margin and tax.'
  },
  copy: {
    eyebrow: 'LANDSCAPING · FREE PRICING TOOL',
    headline: 'Landscaping price calculator.',
    lead: 'Build a quote from crew-hours, materials, machinery, disposal, travel, overhead and the margin the business needs.',
    resultEyebrow: 'YOUR LANDSCAPING JOB, COSTED',
    footerNote: 'Planning support for landscaping businesses. Check scope, quantities, site conditions, tax and local requirements before quoting.'
  },
  jobTypes: [
    { id: 'maintenance', label: 'Garden maintenance', example: { crew: 2, workHours: 3, travelHours: 0.5, materials: 15, machinery: 18, disposal: 15, subcontract: 0, minimumPreTax: 180 } },
    { id: 'planting', label: 'Planting / bed installation', example: { crew: 2, workHours: 6, travelHours: 0.75, materials: 240, machinery: 25, disposal: 20, subcontract: 0, minimumPreTax: 450 } },
    { id: 'mulch', label: 'Mulch / bark installation', example: { crew: 2, workHours: 4, travelHours: 0.5, materials: 180, machinery: 20, disposal: 10, subcontract: 0, minimumPreTax: 350 } },
    { id: 'cleanup', label: 'Garden clearance', example: { crew: 2, workHours: 5, travelHours: 0.75, materials: 10, machinery: 30, disposal: 120, subcontract: 0, minimumPreTax: 420 } },
    { id: 'other', label: 'Other landscaping job', example: { crew: 2, workHours: 4, travelHours: 0.5, materials: 80, machinery: 20, disposal: 20, subcontract: 0, minimumPreTax: 280 } }
  ],
  directCostFields: [
    { id: 'materials', label: 'Materials / plants', default: 80 },
    { id: 'machinery', label: 'Machinery / equipment', default: 20 },
    { id: 'disposal', label: 'Waste / disposal', default: 20 },
    { id: 'subcontract', label: 'Subcontractors / specialist cost', default: 0 }
  ],
  defaults: { crew: 2, workHours: 4, travelHours: 0.5, wage: 22, burden: 12, distance: 24, vehicleRate: 0.50, monthlyOverhead: 2200, jobsMonth: 35, fixedFee: 0.30, paymentFeeRate: 2, reserveRate: 4, targetMargin: 30, minimumPreTax: 250, taxRate: 0 },
  products: { freeUrl: null, proUrl: null, proPrice: 24.99 }
};