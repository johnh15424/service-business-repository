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
  },
  {
    id: 'lawn_care',
    name: 'Lawn Care',
    category: 'Garden & Outdoor',
    status: 'live',
    calculatorPath: '/lawn-care-price-calculator/',
    freeUrl: 'https://payhip.com/b/r04ip',
    proUrl: 'https://payhip.com/b/9UxTL',
    proPrice: 24.99
  },
  {
    id: 'window_cleaning',
    name: 'Window Cleaning',
    category: 'Home & Property',
    status: 'live',
    calculatorPath: '/window-cleaning-price-calculator/',
    freeUrl: 'https://payhip.com/b/2nIZu',
    proUrl: 'https://payhip.com/b/n6Btv',
    proPrice: 24.99
  },
  {
    id: 'carpet_cleaning',
    name: 'Carpet Cleaning',
    category: 'Home & Property',
    status: 'live',
    calculatorPath: '/carpet-cleaning-price-calculator/',
    freeUrl: 'https://payhip.com/b/pt2ac',
    proUrl: 'https://payhip.com/b/bLNUx',
    proPrice: 24.99
  },
  {
    id: 'handyman',
    name: 'Handyman',
    category: 'Home & Property',
    status: 'live',
    calculatorPath: '/handyman-price-calculator/',
    freeUrl: 'https://payhip.com/b/24Kg8',
    proUrl: 'https://payhip.com/b/UzWt0',
    proPrice: 24.99
  },
  {
    id: 'painting_decorating',
    name: 'Painting & Decorating',
    category: 'Home & Property',
    status: 'live',
    calculatorPath: '/painting-decorating-price-calculator/',
    freeUrl: 'https://payhip.com/b/FiAWG',
    proUrl: 'https://payhip.com/b/ONKXy',
    proPrice: 24.99
  },
  {
    id: 'gutter_cleaning',
    name: 'Gutter Cleaning',
    category: 'Home & Property',
    status: 'live',
    calculatorPath: '/gutter-cleaning-price-calculator/',
    freeUrl: 'https://payhip.com/b/P7zMQ',
    proUrl: null,
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

export function nicheById(id){
  return nicheRegistry.find(n => n.id === id) || null;
}
