export default {
  id:'gutter_cleaning',name:'Gutter Cleaning',category:'Home & Property',slug:'gutter-cleaning-price-calculator',status:'pilot',
  seo:{title:'Gutter Cleaning Price Calculator | Costs, Margin & Tax',description:'Free gutter cleaning price calculator for labour, access, disposal, travel, equipment wear, overhead, minimum charge, margin and tax.'},
  copy:{eyebrow:'GUTTER CLEANING · FREE PRICING TOOL',headline:'Gutter cleaning price calculator.',lead:'Build a quote from paid time, access difficulty, debris removal, equipment wear, travel, overhead and retained margin.',resultEyebrow:'YOUR GUTTER CLEANING JOB, COSTED'},
  jobTypes:[
    {id:'small',label:'Small single-storey home',example:{crew:1,workHours:1.5,travelHours:.5,disposal:5,wear:5,access:0,consumables:2,minimum:80}},
    {id:'standard',label:'Standard two-storey home',example:{crew:1,workHours:2.5,travelHours:.5,disposal:8,wear:8,access:10,consumables:3,minimum:120}},
    {id:'large',label:'Large / complex home',example:{crew:2,workHours:3,travelHours:.5,disposal:15,wear:12,access:20,consumables:5,minimum:190}},
    {id:'commercial',label:'Small commercial property',example:{crew:2,workHours:4,travelHours:.5,disposal:20,wear:15,access:25,consumables:6,minimum:260}},
    {id:'other',label:'Other gutter cleaning job',example:{crew:1,workHours:2.5,travelHours:.5,disposal:8,wear:8,access:5,consumables:3,minimum:110}}
  ],
  directCostFields:[{id:'disposal',label:'Debris / waste disposal',default:8},{id:'wear',label:'Vacuum / pole / ladder wear',default:8},{id:'access',label:'Access / height allowance',default:5},{id:'consumables',label:'Consumables / job',default:3}],
  defaults:{crew:1,workHours:2.5,travelHours:.5,wage:22,burden:12,distance:20,vehicleRate:.45,monthlyOverhead:1400,jobsMonth:55,fixedFee:.30,paymentFeeRate:2,reserveRate:4,targetMargin:32,minimumPreTax:100,taxRate:0},
  products:{freeUrl:null,proUrl:null,proPrice:24.99}
};