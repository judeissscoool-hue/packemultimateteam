/* Classic Draft rules shared by local play and trusted duel replay. */
(function (root) {
  const ALL_SLOTS=["PG","SG","SF","PF","C","B1","B2","B3"];
  const LIMITS={Icon:2,Elite:4};
  function create({cards,weights={},fair={shown:{},last:{},cards:{},session:0},pool,random=Math.random}) {
    const DB=cards,SPOTLIGHT=weights,DRAFT_NAME_SHOWN=fair.shown,DRAFT_NAME_LAST=fair.last,
      DRAFT_CARD_SHOWN=fair.cards,DRAFT_FAIR_SESSION=fair.session;
    const DRAFT_LIMITS=LIMITS,DRAFT_ODDS={Bronze:.14,Silver:.40,Gold:.40,Elite:.04,Icon:.02};
    const TIER_ORDER=["Bronze","Silver","Gold","Elite","Icon"];
    const eraPool=pool||((tier)=>DB.filter(p=>p&&p.tier===tier));
    const eligible=(p,s)=>!!p&&(s.startsWith("B")||p.positions.includes(s));
    const require=(ok,message)=>{if(!ok)throw new Error(message);};
function rollTier(odds,rng){let r=(rng||random)(),acc=0;
  for(const t of TIER_ORDER){if(!odds[t])continue;acc+=odds[t];if(r<acc)return t;}
  // float slack: return best offered tier
  for(let i=TIER_ORDER.length-1;i>=0;i--)if(odds[TIER_ORDER[i]])return TIER_ORDER[i];
}
    function draftDowngrade(t,counts){const order=["Icon","Elite","Gold"];let i=order.indexOf(t);while(i>-1&&i<2&&DRAFT_LIMITS[order[i]]&&(counts[order[i]]||0)>=DRAFT_LIMITS[order[i]])i++;return i===-1?t:order[i]||t;}
function draftRecencyWeight(name){
  const last=DRAFT_NAME_LAST[name];
  if(last===undefined)return 1;
  const age=DRAFT_FAIR_SESSION-last;
  return age<=0?0.001:age===1?0.012:age===2?0.05:age===3?0.12:age===4?0.24:age===5?0.40:age===6?0.58:age===7?0.76:age===8?0.90:1;
}
function weightedIndex(weights,rng){
  const R=rng||random,total=weights.reduce((a,b)=>a+b,0);
  if(!(total>0))return Math.floor(R()*weights.length);
  let r=R()*total;
  for(let i=0;i<weights.length;i++){r-=weights[i];if(r<0)return i;}
  return weights.length-1;
}
function draftFairPick(pool,hardBlocked,softBlocked,rng){
  if(!pool.length)return null;
  const R=rng||random,byName={};
  pool.forEach(p=>(byName[p.name]=byName[p.name]||[]).push(p));
  const hard=hardBlocked||new Set(),soft=softBlocked||new Set();
  let names=Object.keys(byName).filter(n=>!hard.has(n)&&!soft.has(n));
  if(!names.length)names=Object.keys(byName).filter(n=>!hard.has(n)); /* only repeat if the tier/slot forces it */
  if(!names.length)return null;
  const minShown=Math.min(...names.map(n=>DRAFT_NAME_SHOWN[n]||0));
  const weights=names.map(n=>{
    const gap=(DRAFT_NAME_SHOWN[n]||0)-minShown;
    return Math.pow(0.32,gap)*draftRecencyWeight(n)*Math.sqrt(SPOTLIGHT[n]??1);
  });
  const name=names[weightedIndex(weights,R)],versions=byName[name];
  const minCard=Math.min(...versions.map(p=>DRAFT_CARD_SHOWN[p.id]||0));
  const fairest=versions.filter(p=>(DRAFT_CARD_SHOWN[p.id]||0)<=minCard);
  const card=fairest[Math.floor(R()*fairest.length)];
  DRAFT_NAME_SHOWN[name]=(DRAFT_NAME_SHOWN[name]||0)+1;
  DRAFT_NAME_LAST[name]=DRAFT_FAIR_SESSION;
  DRAFT_CARD_SHOWN[card.id]=(DRAFT_CARD_SHOWN[card.id]||0)+1;
  return card;
}
/* players flagged as collection-depth (very low spotlight) are kept OUT of draft boards
   and pack pulls so the ~150 modern deep-bench names don't dilute what you're offered.
   They remain in DB for roster completeness, discovery credits and franchise dailies. */
function isDepthOnly(p){return (SPOTLIGHT[p.name]??1)<=0.15;}
function draftableEra(t){return eraPool(t).filter(p=>!isDepthOnly(p));}
function draftOptionsFor(slot,takenIds,counts,seenNames,rng){
  const opts=[],hard=new Set((takenIds||[]).map(id=>DB[id].name));
  const soft=new Set(seenNames||[]);let guard=0;
  while(opts.length<5&&guard++<500){
    const t=draftDowngrade(rollTier(DRAFT_ODDS,rng),counts||{});
    const pool=draftableEra(t).filter(p=>eligible(p,slot));
    const boardHard=new Set([...hard,...opts.map(o=>o.name)]);
    const p=draftFairPick(pool,boardHard,soft,rng);
    if(p){opts.push(p);soft.add(p.name);}
  }
  return opts;
}
function draftCaptainOptions(rng){
  const R=rng||random,out=[],hard=new Set(),soft=new Set();let guard=0;
  /* era-aware anchor tiers: prefer Icon/Elite, but fall back to the best tiers the era HAS */
  let anchorTiers=["Icon","Elite"].filter(t=>eraPool(t).length>0);
  if(!anchorTiers.length)anchorTiers=TIER_ORDER.slice().reverse().filter(t=>eraPool(t).length>0).slice(0,2);
  while(out.length<3&&guard++<400){
    const t=anchorTiers[Math.floor(R()*anchorTiers.length)]||anchorTiers[0];
    const p=draftFairPick(eraPool(t),hard,soft,R);
    if(p){out.push(p);hard.add(p.name);soft.add(p.name);}
  }
  return out;
}

    function start(){
      const captain=draftCaptainOptions(random);
      return {stage:"captain",captain,roster:Object.fromEntries(ALL_SLOTS.map(s=>[s,null])),taken:[],opts:null,slotOpts:{},activeSlot:null,lastSlot:null,done:false,tierCounts:{},offeredNames:captain.map(p=>p.name)};
    }
    function pending(d){return ALL_SLOTS.find(s=>d.slotOpts[s]&&d.roster[s]==null)||null;}
    function apply(d,event){
      require(d&&event,"Invalid draft action");
      const card=DB[event.cardId];
      if(event.type==="captain"){
        require(d.stage==="captain"&&card&&d.captain.some(p=>p.id===card.id),"Captain was not offered");
        d.roster[card.pos]=card.id;d.taken.push(card.id);d.tierCounts[card.tier]=1;d.lastSlot=card.pos;d.stage="picking";
      }else if(event.type==="open"){
        const slot=event.slot;
        require(d.stage==="picking"&&ALL_SLOTS.includes(slot)&&d.roster[slot]==null,"Invalid draft slot");
        require(!pending(d)||pending(d)===slot,"Finish the open pick first");
        if(!d.slotOpts[slot]){
          d.slotOpts[slot]=draftOptionsFor(slot,d.taken,d.tierCounts,d.offeredNames,random);
          d.offeredNames=[...new Set([...d.offeredNames,...d.slotOpts[slot].map(p=>p.name)])];
        }
        d.activeSlot=slot;d.opts=d.slotOpts[slot];
      }else if(event.type==="pick"){
        const slot=d.activeSlot;
        require(slot&&d.roster[slot]==null&&card&&d.opts.some(p=>p.id===card.id),"Selected card was not offered");
        require(!d.taken.some(id=>DB[id].name===card.name),"Player already drafted");
        require(!LIMITS[card.tier]||(d.tierCounts[card.tier]||0)<LIMITS[card.tier],"Tier limit reached");
        require(eligible(card,slot),"Player cannot fill this position");
        d.roster[slot]=card.id;d.taken.push(card.id);d.tierCounts[card.tier]=(d.tierCounts[card.tier]||0)+1;
        d.lastSlot=slot;d.activeSlot=null;d.opts=null;d.done=ALL_SLOTS.every(s=>d.roster[s]!=null);
      }else if(event.type==="swap"){
        const a=event.from,b=event.to;
        require(d.stage==="picking"&&a!==b&&ALL_SLOTS.includes(a)&&ALL_SLOTS.includes(b),"Invalid swap");
        require(Number.isInteger(d.roster[a])&&Number.isInteger(d.roster[b])&&eligible(DB[d.roster[a]],b)&&eligible(DB[d.roster[b]],a),"Those positions don't fit");
        [d.roster[a],d.roster[b]]=[d.roster[b],d.roster[a]];d.lastSlot=b;
      }else throw new Error("Unknown draft action");
      return d;
    }
    return {start,apply,pending};
  }
  root.ATUDraftRules=Object.freeze({create});
})(globalThis);
