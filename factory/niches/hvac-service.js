export default {
  id: 'hvac_service',
  name: 'HVAC Service',
  category: 'Home & Property',
  slug: 'hvac-service-price-calculator',
  status: 'build',
  seo: {
    title: 'HVAC Service Price Calculator | Labour, Parts & Margin',
    description: 'Free HVAC service pricing calculator for technician time, parts, refrigerant, equipment, travel, overhead, callback allowance, margin and tax.'
  },
  copy: {
    eyebrow: 'HVAC SERVICE · FREE PRICING TOOL',
    headline: 'HVAC service price calculator.',
    lead: 'Build a service price from technician time, parts, refrigerant, equipment, travel, callback allowance, overhead and margin.',
    resultEyebrow: 'YOUR HVAC JOB, COSTED',
    footerNote: 'Planning support only. Refrigerant handling, electrical work and mechanical systems may require qualified technicians, licences and jurisdiction-specific compliance.'
  },
  jobTypes: [
    { id: 'maintenance', label: 'Maintenance / tune-up', example: { crew: 1, workHours: 1.5, travelHours: 0.5, parts: 12, refrigerant: 0, equipment: 5, callback: 8, minimumPreTax: 140 } },
    { id: 'diagnostic', label: 'Diagnostic call-out', example: { crew: 1, workHours: 1.25, travelHours: 0.5, parts: 0, refrigerant: 0, equipment: 5, callback: 6, minimumPreTax: 120 } },
    { id: 'repair', label: 'HVAC repair', example: { crew: 1, workHours: 2.5, travelHours: 0.5, parts: 140, refrigerant: 35, equipment: 10, callback: 18, minimumPreTax: 300 } },
    { id: 'replacement', label: 'Equipment replacement', example: { crew: 2, workHours: 6, travelHours: 0.75, parts: 1200, refrigerant: 80, equipment: 50, callback: 50, minimumPreTax: 1900 } },
    { id: 'other', label: 'Other HVAC service', example: { crew: 1, workHours: 2, travelHours: 0.5, parts: 80, refrigerant: 20, equipment: 8, callback: 12, minimumPreTax: 220 } }
  ],
  directCostFields: [
    { id: 'parts', label: 'Parts / components', default: 80 },
    { id: 'refrigerant', label: 'Refrigerant / treatment materials', default: 20 },
    { id: 'equipment', label: 'Equipment / test instrument allowance', default: 8 },
    { id: 'callback', label: 'Warranty / callback allowance', default: 12 }
  ],
  defaults: { crew: 1, workHours: 2, travelHours: 0.5, wage: 32, burden: 15, distance: 28, vehicleRate: 0.55, monthlyOverhead: 3200, jobsMonth: 48, fixedFee: 0.30, paymentFeeRate: 2, reserveRate: 5, targetMargin: 35, minimumPreTax: 150, taxRate: 0 },
  products: { freeUrl: null, proUrl: null, proPrice: 24.99 }
};