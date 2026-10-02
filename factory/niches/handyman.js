export default {
  id:'handyman',name:'Handyman',category:'Home & Property',slug:'handyman-price-calculator',status:'live',
  seo:{title:'Handyman Price Calculator | Costs, Margin & Tax',description:'Free handyman price calculator for labour, materials, travel, overhead, minimum charge, margin and tax.'},
  copy:{eyebrow:'HANDYMAN · FREE PRICING TOOL',headline:'Handyman price calculator.',lead:'Build a quote from paid labour, materials, fixings, travel, tool wear, overhead and the retained margin the business needs.',resultEyebrow:'YOUR HANDYMAN JOB, COSTED'},
  jobTypes:[
    {id:'small',label:'Small repair / fitting job',example:{crew:1,workHours:1.5,travelHours:.5,materials:12,fixings:4,wear:4,disposal:0,minimum:85}},
    {id:'halfday',label:'Half-day job',example:{crew:1,workHours:4,travelHours:.5,materials:30,fixings:8,wear:8,disposal:5,minimum:180}},
    {id:'fullday',label:'Full-day job',example:{crew:1,workHours:7.5,travelHours:.5,materials:45,fixings:10,wear:12,disposal:8,minimum:320}},
    {id:'assembly',label:'Furniture assembly / installation',example:{crew:1,workHours:3,travelHours:.5,materials:8,fixings:6,wear:6,disposal:0,minimum:140}},
    {id:'other',label:'Other handyman job',example:{crew:1,workHours:2.5,travelHours:.5,materials:20,fixings:6,wear:6,disposal:0,minimum:120}}
  ],
  directCostFields:[{id:'materials',label:'Materials / job',default:20},{id:'fixings',label:'Fixings / consumables',default:6},{id:'wear',label:'Tool wear / job',default:6},{id:'disposal',label:'Waste / disposal',default:0}],
  defaults:{crew:1,workHours:2.5,travelHours:.5,wage:24,burden:12,distance:20,vehicleRate:.45,monthlyOverhead:1500,jobsMonth:50,fixedFee:.30,paymentFeeRate:2,reserveRate:4,targetMargin:32,minimumPreTax:100,taxRate:0},
  products:{freeUrl:'https://payhip.com/b/24Kg8',proUrl:'https://payhip.com/b/UzWt0',proPrice:24.99}
};