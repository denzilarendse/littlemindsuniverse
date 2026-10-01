(function(){
const activities=[
  {
    id:'number-garden',
    ages:[2,5],
    emoji:'🌼',
    title:'Number Garden',
    subject:'Mathematics',
    engine:'early_learning',
    intent:'early number sense counting quantities',
    prompt:'Let us play Number Garden. Give me one tiny counting challenge with objects a young child knows. Ask me to point, count or draw before you help. Keep it very short.',
    narration:'Number Garden. Count, point and draw with Milo.',
    goal:'Count small groups and connect number words to quantities.'
  },
  {
    id:'sound-hunt',
    ages:[2,5],
    emoji:'🔤',
    title:'Sound Hunt',
    subject:'Language',
    engine:'early_learning',
    intent:'early literacy sounds phonological awareness',
    prompt:'Let us play Sound Hunt. Choose one simple sound or beginning sound. Say one example, then ask me to find or say another. Use one short step at a time.',
    narration:'Sound Hunt. Listen for a sound and find another word.',
    goal:'Notice sounds in familiar words without requiring fluent reading.'
  },
  {
    id:'shape-builder',
    ages:[2,5],
    emoji:'🔷',
    title:'Shape Builder',
    subject:'Mathematics',
    engine:'early_learning',
    intent:'early geometry shapes spatial language',
    prompt:'Let us play Shape Builder. Pick one basic shape. Ask me to find, point to, move or draw something with that shape. Do not give me the answer before I try.',
    narration:'Shape Builder. Find and make shapes with Milo.',
    goal:'Recognise shapes and use simple spatial language.'
  },
  {
    id:'pattern-train',
    ages:[3,5],
    emoji:'🚂',
    title:'Pattern Train',
    subject:'Mathematics',
    engine:'early_learning',
    intent:'patterns sequencing prediction',
    prompt:'Let us play Pattern Train. Give me a very short repeating pattern using familiar objects, sounds or movements. Stop before the missing part and ask me what comes next.',
    narration:'Pattern Train. Spot what repeats and choose what comes next.',
    goal:'Copy, extend and explain simple repeating patterns.'
  },
  {
    id:'story-draw',
    ages:[2,5],
    emoji:'📖',
    title:'Story & Draw',
    subject:'Language',
    engine:'play_story',
    intent:'story creative drawing vocabulary',
    prompt:'Start a safe two-sentence story for a young child using ordinary animals or everyday objects. Then stop and ask me to choose what happens next or draw one part. Keep the story bounded and calm.',
    narration:'Story and Draw. Listen, choose and make a picture.',
    goal:'Build vocabulary, listening comprehension and creative expression.'
  },
  {
    id:'move-and-tell',
    ages:[2,5],
    emoji:'🕺',
    title:'Move & Tell',
    subject:'Life Skills',
    engine:'early_learning',
    intent:'movement body words following directions',
    prompt:'Give me one safe movement instruction that can be done beside a chair, then ask me to describe what I did using one simple word or short phrase. No risky jumps or equipment.',
    narration:'Move and Tell. Follow one safe movement and tell Milo what you did.',
    goal:'Follow simple directions and connect movement with language.'
  },
  {
    id:'sort-it',
    ages:[3,5],
    emoji:'🧺',
    title:'Sort It',
    subject:'Mathematics',
    engine:'early_learning',
    intent:'sorting classifying attributes',
    prompt:'Give me a tiny sorting game using familiar household or classroom objects. Ask me how two things are the same or different before giving another clue.',
    narration:'Sort It. Group things that belong together.',
    goal:'Classify objects by one visible or familiar attribute.'
  },
  {
    id:'feelings-story',
    ages:[3,5],
    emoji:'🙂',
    title:'Feelings Story',
    subject:'Life Skills',
    engine:'play_story',
    intent:'social emotional feelings empathy story',
    prompt:'Tell a short calm story about a child or friendly animal having one everyday feeling. Ask me how the character might feel and one kind thing they could do next. Do not diagnose or label the learner.',
    narration:'Feelings Story. Notice a feeling and choose a kind next step.',
    goal:'Name everyday feelings and practise simple perspective-taking.'
  }
];

function byId(id){return activities.find(a=>a.id===id)||null}
function forAge(age){
  const n=Number(age);
  if(!Number.isFinite(n))return activities;
  return activities.filter(a=>n>=a.ages[0]&&n<=a.ages[1]);
}

window.LMU_EARLY=Object.freeze({
  activities:Object.freeze(activities.map(a=>Object.freeze({...a}))),
  byId,
  forAge
});
})();