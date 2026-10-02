export default {
  id:'carpet_cleaning',name:'Carpet Cleaning',category:'Home & Property',slug:'carpet-cleaning-price-calculator',status:'live',
  seo:{title:'Carpet Cleaning Price Calculator | Costs, Margin & Tax',description:'Free carpet cleaning price calculator for labour, chemicals, machine wear, travel, overhead, minimum charge, margin and tax.'},
  copy:{eyebrow:'CARPET CLEANING · FREE PRICING TOOL',headline:'Carpet cleaning price calculator.',lead:'Build a quote from paid time, chemicals, extraction-machine wear, travel, setup, overhead and retained margin.',resultEyebrow:'YOUR CARPET CLEANING JOB, COSTED'},
  jobTypes:[
    {id:'room',label:'Single room',example:{crew:1,workHours:1,travelHours:.4,chemicals:8,wear:6,waterPower:4,spotting:2,minimum:65}},
    {id:'home',label:'Multi-room home',example:{crew:1,workHours:3.5,travelHours:.5,chemicals:24,wear:14,waterPower:8,spotting:6,minimum:150}},
    {id:'stairs',label:'Stairs and landing',example:{crew:1,workHours:2,travelHours:.5,chemicals:12,wear:8,waterPower:5,spotting:4,minimum:95}},
    {id:'commercial',label:'Small commercial area',example:{crew:2,workHours:3,travelHours:.5,chemicals:30,wear:18,waterPower:10,spotting:6,minimum:220}},
    {id:'other',label:'Other carpet cleaning job',example:{crew:1,workHours:2,travelHours:.5,chemicals:14,wear:9,waterPower:6,spotting:4,minimum:100}}
  ],
  directCostFields:[{id:'chemicals',label:'Chemicals / job',default:14},{id:'wear',label:'Machine / hose wear',default:9},{id:'waterPower',label:'Water / power cost',default:6},{id:'spotting',label:'Spotting / treatment products',default:4}],
  defaults:{crew:1,workHours:2,travelHours:.5,wage:21,burden:12,distance:22,vehicleRate:.45,monthlyOverhead:1600,jobsMonth:55,fixedFee:.30,paymentFeeRate:2,reserveRate:3,targetMargin:32,minimumPreTax:90,taxRate:0},
  products:{freeUrl:'https://payhip.com/b/pt2ac',proUrl:'https://payhip.com/b/bLNUx',proPrice:24.99}
};