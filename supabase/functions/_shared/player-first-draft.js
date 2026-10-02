/* Player-first Classic Draft v1. Earlier selectors remain frozen for replay. */
(function (root) {
  const ALL_SLOTS=["PG","SG","SF","PF","C","B1","B2","B3"];
  const LIMITS={Icon:2,Elite:4};
  function create({cards,pool,random=Math.random}) {
    const DB=cards;
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
// Rarity and position are already filtered. Every remaining player gets one ticket,
// then each of that player's eligible versions gets an equal chance. No history.
function playerFirstPick(pool,blocked,rng){
  const versionsByPlayer=new Map();
  for(const card of pool){
    if(blocked.has(card.name))continue;
    if(!versionsByPlayer.has(card.name))versionsByPlayer.set(card.name,[]);
    versionsByPlayer.get(card.name).push(card);
  }
  const players=[...versionsByPlayer.values()];
  if(!players.length)return null;
  const R=rng||random;
  const versions=players[Math.floor(R()*players.length)];
  return versions[Math.floor(R()*versions.length)];
}
function draftableEra(t){return eraPool(t);}
function draftOptionsFor(slot,takenIds,counts,seenNames,rng){
  const opts=[],hard=new Set((takenIds||[]).map(id=>DB[id].name));
  const soft=new Set(seenNames||[]);let guard=0;
  while(opts.length<5&&guard++<500){
    const t=draftDowngrade(rollTier(DRAFT_ODDS,rng),counts||{});
    const pool=draftableEra(t).filter(p=>eligible(p,slot));
    const boardHard=new Set([...hard,...opts.map(o=>o.name)]);
    const p=playerFirstPick(pool,boardHard,rng);
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
    const p=playerFirstPick(eraPool(t),hard,R);
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
  root.ATUPlayerFirstDraftRules=Object.freeze({create});
})(globalThis);
