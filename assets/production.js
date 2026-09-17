const LMU={role:"learner",stage:"discovery",mastery:62,published:false,submitted:false};
const stages=[
["early","Early Explorers","2–4","🌱","Patterns, language, movement and guided play"],
["foundation","Foundation","5–7","🌈","Literacy, numeracy, life skills and creative learning"],
["discovery","Discovery Builders","8–10","🔎","Projects, HTML/CSS, finance and exploration"],
["creator","Creator Academy","11–13","🚀","JavaScript, Python, enterprise and deeper projects"],
["pathfinder","Pathfinder Academy","14–15","🧭","APIs, databases, study skills and career discovery"],
["edge","LittleMinds Edge","16–18","🎓","Full-stack portfolios, finance, enterprise and pathways"]];
const lessons={early:["Pattern Adventure","Robot Path Play"],foundation:["Story Builder","My Saving Goal"],discovery:["Build My First Web Page","Smart Budget Project"],creator:["JavaScript Variables Lab","Enterprise Challenge"],pathfinder:["API Thinking Project","Break-even Investigation"],edge:["Full-stack Portfolio","Career & Enterprise Capstone"]};
function el(id){return document.getElementById(id)}
function toast(t){el("toast").textContent=t;el("toast").classList.add("show");setTimeout(()=>el("toast").classList.remove("show"),2200)}
function setRole(r){LMU.role=r;render()}
function setStage(s){LMU.stage=s;render()}
function rolePanel(){
 if(LMU.role==="teacher")return `<section class="panel"><div class="eyebrow">TEACHER WORKSPACE</div><h2>Milo recommendation queue</h2><p>Milo drafts. You decide what reaches learners.</p><div class="action"><div><b>Targeted support: Web structure</b><small>3 learners show repeated evidence of difficulty.</small></div><button onclick="approve()">${LMU.published?"Published ✓":"Review & approve"}</button></div><div class="action"><div><b>Weekly report review</b><small>Evidence summary awaiting teacher approval.</small></div><button onclick="toast('Report opened for teacher review')">Open report</button></div></section>`;
 if(LMU.role==="parent")return `<section class="panel"><div class="eyebrow">PARENT / GUARDIAN</div><h2>Progress that makes sense</h2><div class="master"><b>Current mastery evidence</b><span>${LMU.mastery}%</span></div><div class="bar"><i style="width:${LMU.mastery}%"></i></div><p>${LMU.published?"A teacher-approved learning activity is ready.":"No new teacher-approved work yet."}</p><button onclick="toast('Home-support activity opened')">Home support ideas</button></section>`;
 return `<section class="panel"><div class="eyebrow">LEARNER JOURNEY</div><h2>${lessons[LMU.stage][0]}</h2><p>First, show what you already understand. Milo can teach and hint, but will not do the work for you.</p><textarea id="evidence" placeholder="Explain your attempt, write your answer, or describe the evidence you will upload..."></textarea><div class="actions"><button onclick="hint()">Ask Milo for a hint</button><button class="primary" onclick="submitEvidence()">Submit learning evidence</button></div>${LMU.submitted?`<div class="success">Evidence recorded ✓ Mastery updated to ${LMU.mastery}%.</div>`:""}</section>`;
}
function approve(){LMU.published=true;toast("Teacher approved and published the recommendation");render()}
function hint(){toast("Milo: Start with your own attempt. What is the first step you think belongs here?")}
function submitEvidence(){if(!(el("evidence")?.value||"").trim())return toast("Add your attempt first.");LMU.submitted=true;LMU.mastery=Math.min(100,LMU.mastery+6);render();toast("Evidence submitted for learning analysis")}
function render(){
 el("roles").innerHTML=["learner","teacher","parent"].map(r=>`<button class="${LMU.role===r?"active":""}" onclick="setRole('${r}')">${r[0].toUpperCase()+r.slice(1)}</button>`).join("");
 el("stages").innerHTML=stages.map(s=>`<button class="stage ${LMU.stage===s[0]?"selected":""}" onclick="setStage('${s[0]}')"><span>${s[3]}</span><b>${s[1]}</b><small>Ages ${s[2]}</small><em>${s[4]}</em></button>`).join("");
 const st=stages.find(s=>s[0]===LMU.stage);
 el("today").innerHTML=`<div><div class="eyebrow">THIS WEEK · MON–THU LEARN · FRI REVISE · SUN ASSESS</div><h1>${st[1]}</h1><p>${st[4]}</p></div><div class="score"><span>Mastery</span><strong>${LMU.mastery}%</strong><small>evidence-based</small></div>`;
 el("workspace").innerHTML=rolePanel();
}
window.addEventListener("DOMContentLoaded",render);