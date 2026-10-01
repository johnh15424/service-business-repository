export const nicheRegistry = [
  {
    id: 'dog_grooming',
    name: 'Dog Grooming',
    category: 'Pet Services',
    status: 'live',
    calculatorPath: '/dog-grooming-price-calculator/',
    freeUrl: 'https://payhip.com/b/OyKL2',
    proUrl: 'https://payhip.com/b/7pXUm',
    proPrice: 24.99
  },
  {
    id: 'pressure_washing',
    name: 'Pressure Washing',
    category: 'Home & Property',
    status: 'live',
    calculatorPath: '/pressure-washing-price-calculator/',
    freeUrl: 'https://payhip.com/b/PQec5',
    proUrl: 'https://payhip.com/b/ew4rY',
    proPrice: 24.99
  },
  {
    id: 'house_cleaning',
    name: 'House Cleaning',
    category: 'Home & Property',
    status: 'live',
    calculatorPath: '/house-cleaning-price-calculator/',
    freeUrl: 'https://payhip.com/b/Q5fPh',
    proUrl: 'https://payhip.com/b/9rEyJ',
    proPrice: 24.99
  },
  {
    id: 'mobile_car_detailing',
    name: 'Mobile Car Detailing',
    category: 'Automotive',
    status: 'live',
    calculatorPath: '/mobile-car-detailing-price-calculator/',
    freeUrl: 'https://payhip.com/b/L4SPu',
    proUrl: 'https://payhip.com/b/6w2cQ',
    proPrice: 24.99
  }
];

export function liveNiches(){
  return nicheRegistry.filter(n => n.status === 'live');
}

export function nichesByCategory(){
  return liveNiches().reduce((groups,niche) => {
    (groups[niche.category] ||= []).push(niche);
    return groups;
  }, {});
}
