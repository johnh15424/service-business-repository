export default {
  id:'painting_decorating',name:'Painting & Decorating',category:'Home & Property',slug:'painting-decorating-price-calculator',status:'live',
  seo:{title:'Painting & Decorating Price Calculator | Costs, Margin & Tax',description:'Free painting and decorating price calculator for labour, paint, sundries, travel, overhead, minimum charge, margin and tax.'},
  copy:{eyebrow:'PAINTING & DECORATING · FREE PRICING TOOL',headline:'Painting and decorating price calculator.',lead:'Build a quote from paid labour, paint and sundries, preparation, travel, equipment wear, overhead and retained margin.',resultEyebrow:'YOUR PAINTING JOB, COSTED',footerNote:'Planning support only. Review real costs, preparation, scope, tax and local obligations before quoting.'},
  jobTypes:[
    {id:'room',label:'Single room repaint',example:{crew:1,workHours:8,travelHours:.5,paint:70,sundries:20,prep:15,wear:8,minimum:350}},
    {id:'feature',label:'Feature wall / small area',example:{crew:1,workHours:3,travelHours:.5,paint:25,sundries:10,prep:8,wear:4,minimum:150}},
    {id:'exterior',label:'Exterior painting job',example:{crew:2,workHours:12,travelHours:.75,paint:180,sundries:45,prep:40,wear:20,minimum:850}},
    {id:'woodwork',label:'Doors / trim / woodwork',example:{crew:1,workHours:6,travelHours:.5,paint:45,sundries:18,prep:18,wear:6,minimum:280}},
    {id:'other',label:'Other painting / decorating job',example:{crew:1,workHours:6,travelHours:.5,paint:55,sundries:18,prep:15,wear:6,minimum:280}}
  ],
  directCostFields:[{id:'paint',label:'Paint / coatings',default:55},{id:'sundries',label:'Tape / rollers / sheets / sundries',default:18},{id:'prep',label:'Preparation materials',default:15},{id:'wear',label:'Equipment wear / job',default:6}],
  defaults:{crew:1,workHours:6,travelHours:.5,wage:24,burden:12,distance:20,vehicleRate:.45,monthlyOverhead:1800,jobsMonth:28,fixedFee:.30,paymentFeeRate:2,reserveRate:4,targetMargin:32,minimumPreTax:250,taxRate:0},
  products:{freeUrl:'https://payhip.com/b/FiAWG',proUrl:'https://payhip.com/b/ONKXy',proPrice:24.99}
};