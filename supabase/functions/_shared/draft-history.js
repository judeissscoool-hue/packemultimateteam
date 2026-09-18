// Only replayed, genuinely offered cards enter persistent account history.
export function draftExposure(draft) {
  const exposure={names:{},cards:{}};
  const offered=[...draft.captain,...Object.values(draft.slotOpts).flat()];
  for(const card of offered){
    exposure.names[card.name]=(exposure.names[card.name]||0)+1;
    exposure.cards[card.id]=(exposure.cards[card.id]||0)+1;
  }
  return exposure;
}

export function cloneDraftFairness(fair) {
  if(fair==null)return undefined; // Pre-release runs retain their original draw sequence.
  if(!Number.isSafeInteger(fair.session)||fair.session<0)throw new Error('Invalid draft history');
  const copy={session:fair.session,shown:{},last:{},cards:{}};
  for(const key of ['shown','last','cards']){
    if(!fair[key]||typeof fair[key]!=='object'||Array.isArray(fair[key]))throw new Error('Invalid draft history');
    for(const [name,count] of Object.entries(fair[key])){
      if(!Number.isSafeInteger(count)||count<0)throw new Error('Invalid draft history count');
      Object.defineProperty(copy[key],name,{value:count,writable:true,enumerable:true,configurable:true});
    }
  }
  return copy;
}
