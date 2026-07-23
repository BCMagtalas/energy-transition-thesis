export type NodeId='CI'|'IQ'|'PC'|'IC'|'RA'|'AE'|'ES';
export type PageId='poster'|'background'|'model'|'pathways'|'evidence'|'methods'|'conclusion';
export type Indicator={code:string;name:string;loading:number;note:string};
export type Construct={id:NodeId;name:string;role:string;color:string;x:number;y:number;description:string;indicators:Indicator[]};
export type Path={id:string;hypothesis:string;symbol:string;from:NodeId;to:NodeId;coefficient:number;p:string;route:string;label:[number,number];interpretation:string};

export const constructs:Construct[]=[
{id:'CI',name:'Carbon Intensity',role:'System pressure',color:'#c2564b',x:150,y:210,description:'The carbon intensity of the energy system and its relationship with clean energy in final consumption.',indicators:[{code:'CI1',name:'CO₂ Intensity of Total Energy Supply',loading:.781,note:'Positive loading.'},{code:'CI2',name:'Share of Clean Energy in Final Energy Consumption',loading:-.715,note:'Negative sign reflects indicator orientation.'}]},
{id:'IQ',name:'Institutional Quality',role:'Governance enabler',color:'#1f8a70',x:150,y:475,description:'Institutional conditions supporting credible policy, political commitment, and investment.',indicators:[{code:'IQ1',name:'Control of Corruption',loading:.990,note:'Very strong loading.'},{code:'IQ2',name:'Stability of Policy',loading:.691,note:'Moderate loading.'},{code:'IQ3',name:'Political Stability and Absence of Violence/Terrorism',loading:.753,note:'Strong loading.'},{code:'IQ4',name:'Effective Carbon Rate Score',loading:.675,note:'Moderate loading.'}]},
{id:'PC',name:'Political Commitment',role:'Policy channel',color:'#7c5cd6',x:445,y:340,description:'Policy and regulatory commitment supporting energy access, efficiency, renewable energy, and net zero participation.',indicators:[{code:'PC1',name:'RISE Energy Access Score',loading:.619,note:'Moderate loading.'},{code:'PC2',name:'RISE Energy Efficiency Score',loading:.923,note:'Very strong loading.'},{code:'PC3',name:'RISE Renewable Energy Score',loading:.813,note:'Strong loading.'},{code:'PC4',name:'Country Commitment to Net Zero',loading:.610,note:'Moderate loading.'}]},
{id:'IC',name:'Investment Climate',role:'Investment channel',color:'#3b7fc4',x:800,y:475,description:'The financial and business environment supporting private participation in renewable energy.',indicators:[{code:'IC1',name:'Sovereign Credit Rating',loading:.965,note:'Very strong loading.'},{code:'IC2',name:'Domestic Credit to Private Sector',loading:.649,note:'Moderate loading.'},{code:'IC3',name:'Innovative Business Environment',loading:.646,note:'Moderate loading.'}]},
{id:'RA',name:'RE Adoption',role:'Central bridge',color:'#059669',x:800,y:210,description:'The integration of renewable energy into the energy system, represented by employment and investment.',indicators:[{code:'RA1',name:'Jobs in RE as Share of Industrial Workforce',loading:.755,note:'Strong loading.'},{code:'RA2',name:'Investments in Renewable Energy',loading:.303,note:'Weak loading; retained for theoretical relevance.'}]},
{id:'AE',name:'Access to Modern Energy',role:'Outcome',color:'#2e9bc0',x:1120,y:145,description:'Access to electricity and clean cooking, together with service quality and system losses.',indicators:[{code:'AE1',name:'Access to Electricity in Urban Areas',loading:.564,note:'Below .60; retained for theoretical relevance.'},{code:'AE2',name:'Access to Electricity in Rural Areas',loading:.683,note:'Moderate loading.'},{code:'AE3',name:'Access to Clean Cooking',loading:.753,note:'Strong loading.'},{code:'AE4',name:'Interruption Duration Index',loading:-.848,note:'Negative sign reflects adverse service orientation.'},{code:'AE5',name:'Interruption Frequency Index',loading:-.914,note:'Negative sign reflects adverse service orientation.'},{code:'AE6',name:'Electric Power T&D Losses',loading:-.790,note:'Negative sign reflects adverse service orientation.'}]},
{id:'ES',name:'Energy Security',role:'Outcome',color:'#c98413',x:1120,y:455,description:'Import dependence, electricity prices, and diversity of total energy and electricity supply.',indicators:[{code:'ES1',name:'Net Fuel Imports',loading:.521,note:'Moderate loading.'},{code:'ES2',name:'Net Energy Imports',loading:.427,note:'Weak loading.'},{code:'ES3',name:'Household Electricity Prices',loading:.644,note:'Moderate loading.'},{code:'ES4',name:'Electricity Prices for Industry',loading:.569,note:'Below .60; retained for theoretical relevance.'},{code:'ES5',name:'Diversity of Total Energy Supply',loading:-.778,note:'Negative sign reflects beneficial diversity orientation.'},{code:'ES6',name:'Diversity of Electricity Supply',loading:-.818,note:'Negative sign reflects beneficial diversity orientation.'}]}
];

export const paths:Path[]=[
{id:'p1',hypothesis:'H1',symbol:'β1',from:'PC',to:'IC',coefficient:.348,p:'0.001',route:'M 527 367 C 610 388 660 425 717 451',label:[628,401],interpretation:'Political commitment is positively associated with the investment climate.'},
{id:'p2',hypothesis:'H2',symbol:'β2',from:'PC',to:'RA',coefficient:.631,p:'<0.001',route:'M 524 309 C 608 291 665 252 714 228',label:[625,269],interpretation:'Political commitment has a strong positive association with renewable energy adoption.'},
{id:'p3',hypothesis:'H3',symbol:'γ2',from:'IQ',to:'IC',coefficient:.602,p:'<0.001',route:'M 228 475 C 405 475 575 475 718 475',label:[483,451],interpretation:'Institutional quality is positively associated with the investment climate.'},
{id:'p4',hypothesis:'H4',symbol:'γ1',from:'IQ',to:'PC',coefficient:.774,p:'<0.001',route:'M 223 444 C 291 421 343 387 372 365',label:[305,398],interpretation:'Institutional quality strongly supports political commitment.'},
{id:'p5',hypothesis:'H5',symbol:'γ3',from:'CI',to:'PC',coefficient:.186,p:'0.012',route:'M 224 236 C 291 258 344 294 373 317',label:[302,276],interpretation:'Carbon intensity is positively associated with political commitment.'},
{id:'p6',hypothesis:'H6',symbol:'γ4',from:'CI',to:'RA',coefficient:.310,p:'<0.001',route:'M 228 210 C 405 210 580 210 711 210',label:[482,185],interpretation:'Carbon intensity is directly associated with renewable energy adoption.'},
{id:'p7',hypothesis:'H7',symbol:'β3',from:'IC',to:'RA',coefficient:.321,p:'0.006',route:'M 800 425 C 800 357 800 306 800 266',label:[849,348],interpretation:'Investment climate is positively associated with renewable energy adoption.'},
{id:'p8',hypothesis:'H8',symbol:'β5',from:'RA',to:'AE',coefficient:.931,p:'<0.001',route:'M 886 190 C 951 179 1001 160 1043 151',label:[965,205],interpretation:'Renewable energy adoption has a very strong positive association with access to modern energy.'},
{id:'p9',hypothesis:'H9',symbol:'β6',from:'RA',to:'ES',coefficient:-.597,p:'0.001',route:'M 883 237 C 970 282 1010 374 1046 425',label:[985,326],interpretation:'Renewable energy adoption is negatively associated with the energy-security construct; interpretation requires care.'}
];

export const pathways={
 voluntary:{name:'Voluntary approach',effect:.310,formula:'γ₄ = 0.310',activeNodes:['CI','RA'] as NodeId[],activePaths:['p6'],summary:'High carbon intensity may prompt households, communities, private firms, and civil society to adopt renewable energy through pro-environmental behavior, self-interest, or broader societal concern.',examples:['Community-owned renewable energy projects','Household clean-energy and clean-cooking adoption']},
 command:{name:'Command and control',effect:.606,formula:'γ₃β₂ + γ₁β₂ = 0.606',activeNodes:['CI','IQ','PC','RA'] as NodeId[],activePaths:['p4','p5','p2'],summary:'Carbon pressure and institutional quality shape political commitment, which supports renewable energy adoption through mandates, regulation, renewable portfolio standards, and feed-in tariffs.',examples:['Renewable portfolio standards in the United States','Feed-in tariffs supporting wind and solar deployment in Germany']},
 market:{name:'Market based mechanism',effect:.300,formula:'γ₃β₁β₃ + γ₂β₃ + γ₁β₁β₃ = 0.300',activeNodes:['CI','IQ','PC','IC','RA'] as NodeId[],activePaths:['p4','p5','p3','p1','p7'],summary:'Institutional quality and political commitment help create an investment climate that supports private participation through market compatible incentives and finance.',examples:['Emissions trading systems','Renewable energy certificate trading and renewable energy markets']}
} as const;

export type Modification={id:string;type:'cross-loading'|'residual';lhs:string;rhs:string;estimate:number;p:string;note:string};
// Thesis-reported model modifications (MI > 15, theoretically justified):
// four cross-loadings and fifteen residual covariances, from the thesis
// "Summary of Resulting Factor Loadings, Regression Coefficients,
// Residual Correlation Coefficients, and P-Values".
export const modifications:Modification[]=[
{id:'m1',type:'cross-loading',lhs:'AE',rhs:'ES3',estimate:.432,p:'<0.001',note:'Access to modern energy also relates to lower household electricity prices, given cost savings from cheaper and more reliable supply.'},
{id:'m2',type:'cross-loading',lhs:'CI',rhs:'RA1',estimate:-.473,p:'<0.001',note:'Higher carbon intensity is associated with a smaller renewable-energy share of employment as fossil-based workforces expand.'},
{id:'m3',type:'cross-loading',lhs:'RA',rhs:'ES1',estimate:.254,p:'0.011',note:'Renewable energy adoption increases fuel self-sufficiency, reducing reliance on imported fuel.'},
{id:'m4',type:'cross-loading',lhs:'CI',rhs:'AE5',estimate:.125,p:'0.009',note:'Higher carbon intensity relates to more frequent power interruptions through reliance on inflexible generation that cannot follow demand fluctuations.'},
{id:'m5',type:'residual',lhs:'AE1',rhs:'AE2',estimate:.836,p:'<0.001',note:'Urban electricity access may lower the cost of renewable solutions, in turn supporting rural access.'},
{id:'m6',type:'residual',lhs:'AE1',rhs:'AE3',estimate:.576,p:'<0.001',note:'Clean cooking technologies such as induction stoves require electricity, linking electricity access and clean cooking.'},
{id:'m7',type:'residual',lhs:'AE2',rhs:'AE3',estimate:.446,p:'0.005',note:'Rural electricity access and clean-cooking access are linked through the same electrification channel.'},
{id:'m8',type:'residual',lhs:'ES1',rhs:'ES2',estimate:.698,p:'<0.001',note:'Net energy imports and net fuel imports move together because fuel underlies most energy use.'},
{id:'m9',type:'residual',lhs:'ES3',rhs:'ES4',estimate:.680,p:'<0.001',note:'Household and industry electricity prices share the same cost drivers, such as regulatory changes and market forces.'},
{id:'m10',type:'residual',lhs:'AE4',rhs:'AE5',estimate:.656,p:'0.001',note:'Interruption duration and frequency indices can both be affected by extreme weather conditions.'},
{id:'m11',type:'residual',lhs:'IQ2',rhs:'IC3',estimate:.586,p:'<0.001',note:'A stable policy environment can foster business innovation.'},
{id:'m12',type:'residual',lhs:'CI2',rhs:'ES5',estimate:.503,p:'0.001',note:'Prioritizing clean energy may exacerbate issues in diversification of the total energy supply.'},
{id:'m13',type:'residual',lhs:'IQ2',rhs:'IC1',estimate:.408,p:'0.007',note:'Policy stability contributes to a stronger sovereign credit rating.'},
{id:'m14',type:'residual',lhs:'CI2',rhs:'IQ4',estimate:.348,p:'<0.001',note:'Pricing energy-related emissions can encourage the use of clean energy.'},
{id:'m15',type:'residual',lhs:'CI1',rhs:'IC2',estimate:.330,p:'0.002',note:'Private-sector credit may finance energy-intensive activities.'},
{id:'m16',type:'residual',lhs:'AE3',rhs:'PC1',estimate:.306,p:'0.032',note:'Some clean cooking technologies rely on electricity covered by energy-access regulation.'},
{id:'m17',type:'residual',lhs:'AE4',rhs:'PC1',estimate:-.306,p:'0.005',note:'Regulations promoting energy access also improve supply reliability, reducing interruptions.'},
{id:'m18',type:'residual',lhs:'PC4',rhs:'IC2',estimate:.278,p:'0.008',note:'Government commitment to net zero may result in significant investment in renewable energy.'},
{id:'m19',type:'residual',lhs:'CI2',rhs:'AE2',estimate:.189,p:'0.010',note:'Decentralized renewable solutions are deployed in rural areas to provide electricity.'}
];

export const thesisResources=[
['Diagrams and model syntax','https://drive.google.com/file/d/1oYK28GN9reI0fxMyrm9x7K9spfmzRKCw/view'],
['Loadings, coefficients, residual correlations, p-values','https://drive.google.com/file/d/1h4BpysR5z_ZS5MbRbBjMU75HtxHiheXC/view'],
['Estimated structural model','https://drive.google.com/file/d/1Mm5jWMGPbhFuZm84oWFIPICzx78J5KuM/view']
] as const;

export const sample=[['Advanced Economies',31],['Latin America & Caribbean',20],['Sub-Saharan Africa',18],['Emerging & Developing Europe',15],['Middle East, North Africa & Pakistan',15],['Emerging & Developing Asia',14],['Commonwealth of Independent States',7]] as const;
export const fit=[['RMSEA','0.072','< 0.08','Meets'],['CFI','0.921','> 0.90','Meets'],['TLI','0.906','> 0.90','Meets'],['χ²/df','1.617','< 5.0','Meets'],['GFI','0.759','> 0.90','Below'],['AGFI','0.668','> 0.90','Below'],['NFI','0.821','> 0.90','Below']] as const;
export const reliability=[['CI','.726','.570','Acceptable'],['IQ','.866','.627','Strong'],['PC','.834','.566','Strong'],['IC','.806','.598','Strong'],['RA','.456','.331','Caution'],['AE','.891','.585','Strong'],['ES','.798','.413','AVE caution']] as const;
