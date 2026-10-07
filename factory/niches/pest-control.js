export default {
  id: 'pest_control',
  name: 'Pest Control',
  category: 'Home & Property',
  slug: 'pest-control-price-calculator',
  status: 'build',
  seo: {
    title: 'Pest Control Price Calculator | Treatment Costs & Margin',
    description: 'Free pest control pricing calculator for technician time, treatment products, travel, equipment, overhead, follow-up allowance, margin and tax.'
  },
  copy: {
    eyebrow: 'PEST CONTROL · FREE PRICING TOOL',
    headline: 'Pest control price calculator.',
    lead: 'Build a service price from technician time, treatment products, travel, equipment, follow-up allowance, overhead and margin.',
    resultEyebrow: 'YOUR PEST CONTROL JOB, COSTED',
    footerNote: 'Planning support only. Use approved products, follow label requirements and comply with licensing, environmental and safety obligations.'
  },
  jobTypes: [
    { id: 'general', label: 'General household treatment', example: { crew: 1, workHours: 1.5, travelHours: 0.5, products: 18, equipment: 5, followup: 12, disposal: 2, minimumPreTax: 110 } },
    { id: 'rodent', label: 'Rodent control', example: { crew: 1, workHours: 2, travelHours: 0.5, products: 28, equipment: 6, followup: 30, disposal: 3, minimumPreTax: 150 } },
    { id: 'wasp', label: 'Wasp / hornet treatment', example: { crew: 1, workHours: 1.25, travelHours: 0.5, products: 15, equipment: 8, followup: 8, disposal: 2, minimumPreTax: 120 } },
    { id: 'commercial', label: 'Commercial service visit', example: { crew: 1, workHours: 2.5, travelHours: 0.5, products: 30, equipment: 8, followup: 20, disposal: 3, minimumPreTax: 180 } },
    { id: 'other', label: 'Other pest-control service', example: { crew: 1, workHours: 2, travelHours: 0.5, products: 20, equipment: 5, followup: 15, disposal: 2, minimumPreTax: 130 } }
  ],
  directCostFields: [
    { id: 'products', label: 'Treatment products / bait', default: 20 },
    { id: 'equipment', label: 'Equipment / PPE allowance', default: 5 },
    { id: 'followup', label: 'Follow-up visit allowance', default: 15 },
    { id: 'disposal', label: 'Disposal / consumables', default: 2 }
  ],
  defaults: { crew: 1, workHours: 1.75, travelHours: 0.5, wage: 24, burden: 12, distance: 24, vehicleRate: 0.50, monthlyOverhead: 1800, jobsMonth: 65, fixedFee: 0.30, paymentFeeRate: 2, reserveRate: 4, targetMargin: 35, minimumPreTax: 120, taxRate: 0 },
  products: { freeUrl: null, proUrl: null, proPrice: 24.99 }
};