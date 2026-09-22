(function(){
const stages={
  early:{code:'EE24',name:'Early Explorers',ages:'2–4',emoji:'🌱',focus:'Patterns, language, movement, emotional safety and guided play'},
  foundation:{code:'F57',name:'Foundation',ages:'5–7',emoji:'🌈',focus:'Literacy, numeracy, life skills, creativity and early money sense'},
  discovery:{code:'DB810',name:'Discovery Builders',ages:'8–10',emoji:'🔎',focus:'Projects, HTML/CSS, science, finance and exploration'},
  creator:{code:'CA1113',name:'Creator Academy',ages:'11–13',emoji:'🚀',focus:'JavaScript, Python, enterprise, study skills and deeper projects'},
  pathfinder:{code:'PA1415',name:'Pathfinder Academy',ages:'14–15',emoji:'🧭',focus:'APIs, databases, cybersecurity, study skills and career exploration'},
  edge:{code:'EDGE1618',name:'LittleMinds Edge',ages:'16–18',emoji:'🎓',focus:'Full-stack portfolios, finance, enterprise, AI literacy and career pathways'}
};
const demo={
 profile:{id:'demo-profile',display_name:'LMU Demo',role:'learner',preferred_language:'en',country_code:'ZA'},
 learner:{id:'demo-learner',display_name:'Ari',stage_code:'DB810',curriculum_code:'CAPS',home_language:'en'},
 tasks:[
  {id:'t1',title:'Build a semantic web page',subject:'Coding',instructions:'Create a page with a heading, a short paragraph, a useful list and one accessible link. Explain why each element belongs there.',status:'published',week_number:1,day_role:'teaching',content_json:{helpLevel:3,authenticType:'coding'}},
  {id:'t2',title:'Smart budget challenge',subject:'Finance & Enterprise',instructions:'Plan a simple R120 budget for a class mini-project. Show needs, wants, saving and your reasoning.',status:'published',week_number:1,day_role:'teaching',content_json:{helpLevel:2,authenticType:'worked_reasoning'}},
  {id:'t3',title:'Friday reflection',subject:'Study Skills',instructions:'Explain one thing that became easier this week, one thing still difficult, and what you will try next.',status:'published',week_number:1,day_role:'revision',content_json:{helpLevel:2,authenticType:'reflection'}}
 ],
 mastery:[
  {name:'Web structure',subject:'Coding',estimate:72,evidence_count:5,confidence:.82,independent:true},
  {name:'Budget reasoning',subject:'Finance',estimate:61,evidence_count:4,confidence:.73,independent:true},
  {name:'Written explanation',subject:'Language',estimate:78,evidence_count:7,confidence:.88,independent:false},
  {name:'Study reflection',subject:'Life Skills',estimate:69,evidence_count:3,confidence:.65,independent:true}
 ],
 recommendations:[
  {id:'r1',recommendation_type:'intervention',rationale:'Repeated evidence shows confusion between page structure and visual styling.',recommended_action:'Create a temporary Web Structure support group for two guided sessions.',status:'proposed'},
  {id:'r2',recommendation_type:'enrichment',rationale:'Strong independent explanation evidence.',recommended_action:'Offer an extension project: design a mini learning page for a younger learner.',status:'proposed'}
 ],
 reports:[{id:'wr1',status:'approved',week_start:'2026-09-14',summary:'Steady progress with stronger independent explanations.',strengths:'Persistence, web structure and reflection.',next_steps:'Practise separating content structure from styling.',home_support:'Ask the learner to explain one web element and one budgeting choice in their own words.'}],
 classrooms:[{id:'c1',name:'Discovery Builders A',curriculum_code:'CAPS',age_band:'8–10',classroom_type:'normal'}],
 messages:[{id:'m1',body:'Welcome to the LittleMinds class channel. Teacher-approved updates appear here.',created_at:new Date().toISOString()}]
};
window.LMU_DATA={stages,demo};
})();
