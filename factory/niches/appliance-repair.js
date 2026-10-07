export default {
  id: 'appliance_repair',
  name: 'Appliance Repair',
  category: 'Home & Property',
  slug: 'appliance-repair-price-calculator',
  status: 'build',
  seo: {
    title: 'Appliance Repair Price Calculator | Labour, Parts & Margin',
    description: 'Free appliance repair pricing calculator for technician time, parts, travel, diagnostics, overhead, warranty allowance, margin and tax.'
  },
  copy: {
    eyebrow: 'APPLIANCE REPAIR · FREE PRICING TOOL',
    headline: 'Appliance repair price calculator.',
    lead: 'Build a repair price from technician time, parts, diagnostics, travel, warranty allowance, overhead and the margin the business needs.',
    resultEyebrow: 'YOUR APPLIANCE REPAIR JOB, COSTED',
    footerNote: 'Planning support only. Confirm diagnosis, parts availability, warranty terms, electrical safety and local trade requirements before quoting.'
  },
  jobTypes: [
    { id: 'diagnostic', label: 'Diagnostic / call-out', example: { crew: 1, workHours: 1, travelHours: 0.5, parts: 0, diagnostic: 5, warranty: 5, disposal: 0, minimumPreTax: 90 } },
    { id: 'minor', label: 'Minor repair', example: { crew: 1, workHours: 1.5, travelHours: 0.5, parts: 35, diagnostic: 5, warranty: 8, disposal: 2, minimumPreTax: 130 } },
    { id: 'major', label: 'Major repair', example: { crew: 1, workHours: 2.5, travelHours: 0.5, parts: 120, diagnostic: 5, warranty: 15, disposal: 5, minimumPreTax: 260 } },
    { id: 'install', label: 'Appliance installation', example: { crew: 1, workHours: 2, travelHours: 0.5, parts: 25, diagnostic: 0, warranty: 8, disposal: 10, minimumPreTax: 180 } },
    { id: 'other', label: 'Other appliance repair', example: { crew: 1, workHours: 2, travelHours: 0.5, parts: 60, diagnostic: 5, warranty: 10, disposal: 3, minimumPreTax: 175 } }
  ],
  directCostFields: [
    { id: 'parts', label: 'Parts / components', default: 60 },
    { id: 'diagnostic', label: 'Diagnostic consumables', default: 5 },
    { id: 'warranty', label: 'Warranty / callback allowance', default: 10 },
    { id: 'disposal', label: 'Disposal / small consumables', default: 3 }
  ],
  defaults: { crew: 1, workHours: 2, travelHours: 0.5, wage: 27, burden: 12, distance: 24, vehicleRate: 0.50, monthlyOverhead: 2200, jobsMonth: 55, fixedFee: 0.30, paymentFeeRate: 2, reserveRate: 4, targetMargin: 35, minimumPreTax: 120, taxRate: 0 },
  products: { freeUrl: null, proUrl: null, proPrice: 24.99 }
};