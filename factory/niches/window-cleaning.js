export default {
  id:'window_cleaning',name:'Window Cleaning',category:'Home & Property',slug:'window-cleaning-price-calculator',status:'pilot',
  seo:{title:'Window Cleaning Price Calculator | Costs, Margin & Tax',description:'Free window cleaning price calculator for labour, water, chemicals, equipment wear, travel, overhead, minimum charge, margin and tax.'},
  copy:{eyebrow:'WINDOW CLEANING · FREE PRICING TOOL',headline:'Window cleaning price calculator.',lead:'Build a quote from paid time, access difficulty, water and chemicals, equipment wear, travel, overhead and retained margin.',resultEyebrow:'YOUR WINDOW CLEANING JOB, COSTED'},
  jobTypes:[
    {id:'standard',label:'Standard residential clean',example:{crew:1,workHours:1.5,travelHours:.4,chemicals:3,water:2,wear:4,access:0,minimum:55}},
    {id:'large',label:'Large home / many panes',example:{crew:1,workHours:3,travelHours:.5,chemicals:5,water:3,wear:7,access:5,minimum:95}},
    {id:'conservatory',label:'Conservatory / glass roof',example:{crew:1,workHours:2.5,travelHours:.5,chemicals:6,water:4,wear:8,access:12,minimum:110}},
    {id:'commercial',label:'Small commercial frontage',example:{crew:2,workHours:2,travelHours:.5,chemicals:6,water:4,wear:8,access:8,minimum:130}},
    {id:'other',label:'Other window cleaning job',example:{crew:1,workHours:2,travelHours:.5,chemicals:4,water:3,wear:6,access:0,minimum:70}}
  ],
  directCostFields:[{id:'chemicals',label:'Chemicals / job',default:4},{id:'water',label:'Water / job',default:3},{id:'wear',label:'Equipment wear / job',default:6},{id:'access',label:'Access / ladder / pole allowance',default:0}],
  defaults:{crew:1,workHours:2,travelHours:.5,wage:20,burden:12,distance:20,vehicleRate:.45,monthlyOverhead:1200,jobsMonth:75,fixedFee:.30,paymentFeeRate:2,reserveRate:3,targetMargin:30,minimumPreTax:60,taxRate:0},
  products:{freeUrl:null,proUrl:null,proPrice:24.99}
};