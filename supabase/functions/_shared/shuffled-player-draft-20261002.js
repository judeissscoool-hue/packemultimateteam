/* Shuffled player Classic Draft v1. Prior selectors remain frozen for replay. */
(function (root) {
  const ALL_SLOTS=["PG","SG","SF","PF","C","B1","B2","B3"];
  const TIERS=["Bronze","Silver","Gold","Elite","Icon"];
  const LIMITS={Icon:2,Elite:4};
  const ODDS={Bronze:.14,Silver:.40,Gold:.40,Elite:.04,Icon:.02};
  const require=(ok,message)=>{if(!ok)throw new Error(message);};
  const compare=(a,b)=>a<b?-1:a>b?1:0;
  function create({cards,pool,seed}={}) {
    require(Array.isArray(cards),"Invalid draft cards");
    const byId=new Map(cards.filter(Boolean).map(card=>[card.id,card]));
    const tierPool=pool||((tier)=>cards.filter(card=>card&&card.tier===tier));
    const eligible=(card,slot)=>!!card&&(slot.startsWith("B")||card.positions.includes(slot));
    const orderedVersions=(tier)=>tierPool(tier).slice().sort((a,b)=>a.id-b.id);
    function initialOrder(draftSeed){
      const shuffle=root.ATUDraftRandomV1.create(draftSeed,{stream:0});
      return Object.fromEntries(TIERS.map(tier=>[tier,shuffle.shuffle([...new Set(orderedVersions(tier).map(card=>card.name))].sort(compare))]));
    }
    function streams(d){
      require(typeof d.shuffleSeed==="string"&&d.playerOrders&&d.rngOffsets,"Invalid shuffled draft state");
      return Object.fromEntries([['rarity',1],['player',2],['version',3]].map(([name,stream])=>[name,root.ATUDraftRandomV1.create(d.shuffleSeed,{stream,offset:d.rngOffsets[name]})]));
    }
    function saveOffsets(d,rng){for(const name of ['rarity','player','version'])d.rngOffsets[name]=rng[name].offset();}
    function rollTier(rng){
      const roll=rng.rarity();let accumulated=0;
      for(const tier of TIERS){accumulated+=ODDS[tier];if(roll<accumulated)return tier;}
      return "Icon";
    }
    function downgrade(tier,counts){
      const order=["Icon","Elite","Gold"];let index=order.indexOf(tier);
      while(index>-1&&index<2&&LIMITS[order[index]]&&(counts[order[index]]||0)>=LIMITS[order[index]])index++;
      return index===-1?tier:order[index]||tier;
    }
    function pick(d,tier,slot,blocked,rng){
      const versionsByName=new Map();
      for(const card of orderedVersions(tier)){
        if(blocked.has(card.name)||(slot&&!eligible(card,slot)))continue;
        if(!versionsByName.has(card.name))versionsByName.set(card.name,[]);
        versionsByName.get(card.name).push(card);
      }
      const names=d.playerOrders[tier].filter(name=>versionsByName.has(name));
      if(!names.length)return null;
      const versions=versionsByName.get(names[rng.player.int(names.length)]);
      return versions[rng.version.int(versions.length)];
    }
    function captain(d){
      const rng=streams(d),out=[],blocked=new Set();let guard=0;
      let anchorTiers=["Icon","Elite"].filter(tier=>tierPool(tier).length);
      if(!anchorTiers.length)anchorTiers=TIERS.slice().reverse().filter(tier=>tierPool(tier).length).slice(0,2);
      require(anchorTiers.length>0,"Draft pool exhausted");
      while(out.length<3&&guard++<400){
        const card=pick(d,anchorTiers[rng.rarity.int(anchorTiers.length)],null,blocked,rng);
        if(card){out.push(card);blocked.add(card.name);}
      }
      saveOffsets(d,rng);return out;
    }
    function options(d,slot){
      const rng=streams(d),out=[],blocked=new Set(d.taken.map(id=>byId.get(id).name));let guard=0;
      while(out.length<5&&guard++<500){
        const card=pick(d,downgrade(rollTier(rng),d.tierCounts),slot,blocked,rng);
        if(card){out.push(card);blocked.add(card.name);}
      }
      saveOffsets(d,rng);return out;
    }
    function start(){
      const shuffleSeed=seed===undefined?root.ATUDraftRandomV1.freshSeed():seed;
      const d={stage:"captain",shuffleSeed,playerOrders:initialOrder(shuffleSeed),rngOffsets:{rarity:0,player:0,version:0},captain:[],roster:Object.fromEntries(ALL_SLOTS.map(slot=>[slot,null])),taken:[],opts:null,slotOpts:{},activeSlot:null,lastSlot:null,done:false,tierCounts:{},offeredNames:[]};
      d.captain=captain(d);d.offeredNames=d.captain.map(card=>card.name);return d;
    }
    function pending(d){return ALL_SLOTS.find(slot=>d.slotOpts[slot]&&d.roster[slot]==null)||null;}
    function apply(d,event){
      require(d&&event,"Invalid draft action");const card=byId.get(event.cardId);
      if(event.type==="captain"){
        require(d.stage==="captain"&&card&&d.captain.some(offered=>offered.id===card.id),"Captain was not offered");
        d.roster[card.pos]=card.id;d.taken.push(card.id);d.tierCounts[card.tier]=1;d.lastSlot=card.pos;d.stage="picking";
      }else if(event.type==="open"){
        const slot=event.slot;
        require(d.stage==="picking"&&ALL_SLOTS.includes(slot)&&d.roster[slot]==null,"Invalid draft slot");
        require(!pending(d)||pending(d)===slot,"Finish the open pick first");
        if(!d.slotOpts[slot]){
          d.slotOpts[slot]=options(d,slot);
          d.offeredNames=[...new Set([...d.offeredNames,...d.slotOpts[slot].map(offered=>offered.name)])];
        }
        d.activeSlot=slot;d.opts=d.slotOpts[slot];
      }else if(event.type==="pick"){
        const slot=d.activeSlot;
        require(slot&&d.roster[slot]==null&&card&&d.opts.some(offered=>offered.id===card.id),"Selected card was not offered");
        require(!d.taken.some(id=>byId.get(id).name===card.name),"Player already drafted");
        require(!LIMITS[card.tier]||(d.tierCounts[card.tier]||0)<LIMITS[card.tier],"Tier limit reached");
        require(eligible(card,slot),"Player cannot fill this position");
        d.roster[slot]=card.id;d.taken.push(card.id);d.tierCounts[card.tier]=(d.tierCounts[card.tier]||0)+1;
        d.lastSlot=slot;d.activeSlot=null;d.opts=null;d.done=ALL_SLOTS.every(position=>d.roster[position]!=null);
      }else if(event.type==="swap"){
        const a=event.from,b=event.to;
        require(d.stage==="picking"&&a!==b&&ALL_SLOTS.includes(a)&&ALL_SLOTS.includes(b),"Invalid swap");
        require(Number.isInteger(d.roster[a])&&Number.isInteger(d.roster[b])&&eligible(byId.get(d.roster[a]),b)&&eligible(byId.get(d.roster[b]),a),"Those positions don't fit");
        [d.roster[a],d.roster[b]]=[d.roster[b],d.roster[a]];d.lastSlot=b;
      }else throw new Error("Unknown draft action");
      return d;
    }
    return {start,apply,pending};
  }
  root.ATUShuffledPlayerDraftRules=Object.freeze({create});
})(globalThis);
