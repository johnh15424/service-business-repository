export default {
  id:'roofing',name:'Roofing',category:'Home & Property',slug:'roofing-price-calculator',status:'build',
  seo:{title:'Roofing Price Calculator | Labour, Materials & Margin',description:'Free roofing price calculator for crew-hours, roofing materials, tear-off, disposal, equipment, travel, overhead, minimum charge, margin and tax.'},
  copy:{eyebrow:'ROOFING · FREE PRICING TOOL',headline:'Roofing price calculator.',lead:'Build a contractor quote from crew-hours, materials, tear-off and disposal, equipment, travel, overhead and retained margin.',resultEyebrow:'YOUR ROOFING JOB, COSTED',footerNote:'Planning support for roofing businesses. Confirm measurements, specification, access, weather risk, safety, permits, tax and local requirements before quoting.'},
  jobTypes:[
    {id:'repair',label:'Roof repair',example:{crew:2,workHours:4,travelHours:.75,materials:180,disposal:40,equipment:35,permit:0,minimum:650}},
    {id:'asphalt',label:'Asphalt shingle replacement',example:{crew:4,workHours:16,travelHours:1,materials:3200,disposal:650,equipment:300,permit:150,minimum:6500}},
    {id:'metal',label:'Metal roof installation',example:{crew:4,workHours:20,travelHours:1,materials:5200,disposal:500,equipment:350,permit:150,minimum:9000}},
    {id:'flat',label:'Flat roof replacement',example:{crew:3,workHours:14,travelHours:1,materials:2400,disposal:450,equipment:250,permit:120,minimum:5000}},
    {id:'other',label:'Other roofing job',example:{crew:3,workHours:8,travelHours:.75,materials:900,disposal:180,equipment:100,permit:75,minimum:2200}}
  ],
  directCostFields:[{id:'materials',label:'Roofing materials',default:900},{id:'disposal',label:'Tear-off / disposal',default:180},{id:'equipment',label:'Equipment / access allowance',default:100},{id:'permit',label:'Permit / inspection allowance',default:75}],
  defaults:{crew:3,workHours:8,travelHours:.75,wage:30,burden:18,distance:30,vehicleRate:.65,monthlyOverhead:5000,jobsMonth:18,fixedFee:.30,paymentFeeRate:2,reserveRate:5,targetMargin:32,minimumPreTax:650,taxRate:0},
  products:{freeUrl:null,proUrl:null,proPrice:24.99}
};
