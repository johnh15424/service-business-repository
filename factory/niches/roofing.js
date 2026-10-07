export default {
  id: 'roofing',
  name: 'Roofing',
  category: 'Home & Property',
  slug: 'roofing-price-calculator',
  status: 'build',
  seo: {
    title: 'Roofing Price Calculator | Contractor Job Costs & Margin',
    description: 'Free roofing contractor price calculator for crew-hours, roofing materials, access, waste, disposal, travel, overhead and margin.'
  },
  copy: {
    eyebrow: 'ROOFING · CONTRACTOR PRICING TOOL',
    headline: 'Roofing price calculator.',
    lead: 'Estimate a roofing job from paid crew-hours, materials, waste allowance, safe access, disposal, travel, overhead and retained margin. Replace every example with your own measured scope and supplier costs.',
    resultEyebrow: 'YOUR ROOFING JOB, COSTED',
    footerNote: 'Planning support for roofing contractors. Check measured quantities, structural scope, safety requirements, insurance, permits, tax and local obligations before quoting.'
  },
  jobTypes: [
    { id: 'repair', label: 'Roof repair / leak investigation', example: { crew: 2, workHours: 4, travelHours: 0.75, materials: 150, access: 120, disposal: 35, specialist: 0, minimumPreTax: 420 } },
    { id: 'pitched', label: 'Pitched roof replacement', example: { crew: 3, workHours: 32, travelHours: 1, materials: 4600, access: 1100, disposal: 800, specialist: 450, minimumPreTax: 6500 } },
    { id: 'metal', label: 'Metal roof installation', example: { crew: 3, workHours: 28, travelHours: 1, materials: 6200, access: 950, disposal: 550, specialist: 400, minimumPreTax: 7500 } },
    { id: 'flat', label: 'Flat roof covering', example: { crew: 2, workHours: 18, travelHours: 0.75, materials: 1850, access: 450, disposal: 350, specialist: 250, minimumPreTax: 3000 } },
    { id: 'flashing', label: 'Flashing / roofline repair', example: { crew: 2, workHours: 6, travelHours: 0.75, materials: 260, access: 180, disposal: 50, specialist: 0, minimumPreTax: 650 } }
  ],
  directCostFields: [
    { id: 'materials', label: 'Roofing materials, fixings and waste allowance', default: 150 },
    { id: 'access', label: 'Scaffolding / access equipment', default: 120 },
    { id: 'disposal', label: 'Skip / waste disposal', default: 35 },
    { id: 'specialist', label: 'Specialist subcontractors / testing', default: 0 }
  ],
  defaults: {
    crew: 2, workHours: 4, travelHours: 0.75, wage: 28, burden: 18,
    distance: 30, vehicleRate: 0.55, monthlyOverhead: 4000, jobsMonth: 24,
    fixedFee: 0.30, paymentFeeRate: 2, reserveRate: 8, targetMargin: 30,
    minimumPreTax: 420, taxRate: 0
  },
  products: { freeUrl: null, proUrl: null, proPrice: 24.99 }
};
