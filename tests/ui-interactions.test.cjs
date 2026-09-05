const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Parse each executable inline script; no browser or game bootstrap is needed.
for (const match of source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (!/src=|application\/ld\+json/.test(match[1])) new vm.Script(match[2]);
}

function packHarness(reduced = false) {
  const frames = new Map(), timers = new Map(), nodes = new Map();
  let time = 0, sequence = 0, purchases = 0, reveals = 0;
  for (const id of ['rftab','rfstage','rfpack','rftop','rfbot','rfcurl','rfvoid','rfspill','rfarena']) {
    const classes = new Set(), handlers = new Map();
    nodes.set('#'+id, {
      isConnected:true, clientWidth:214, clientHeight:302, dataset:{},
      style:{setProperty(name,value){this[name]=value;}},
      classList:{add(name){classes.add(name);},remove(name){classes.delete(name);}},
      setAttribute(){}, getAnimations(){return [];}, animate(){}, setPointerCapture(){},
      addEventListener(type,fn){handlers.set(type,fn);},
      removeEventListener(type,fn){if(handlers.get(type)===fn)handlers.delete(type);},
      fire(type, args={}){handlers.get(type)?.({pointerId:1,clientX:0,button:0,cancelable:true,preventDefault(){},...args});}
    });
  }
  const context=vm.createContext({
    RF:{open:false,prog:0,done:false,pull:null},
    EFX_TIER_COLOR:{Rare:'#35d6ff'},
    window:{matchMedia(){return {matches:reduced};}},
    performance:{now(){return time;}},
    requestAnimationFrame(fn){const id=++sequence;frames.set(id,fn);return id;},
    cancelAnimationFrame(id){frames.delete(id);},
    setTimeout(fn){const id=++sequence;timers.set(id,fn);return id;},
    clearTimeout(id){timers.delete(id);},
    $:id=>nodes.get(id),
    spendPack(){purchases++;return true;},
    openRaftersPack(){return {tier:'Rare'};}, rfSyncStats(){}, rfSetGlow(){}, notice(){},
    rfReveal(){reveals++;}, render(){}
  });
  vm.runInContext(source.slice(source.indexOf('function rfArm(){'), source.indexOf('function rfReveal(){')),context);
  context.rfBind();
  return {context,nodes,
    frames(n=100){for(let i=0;i<n&&frames.size;i++){time+=16;const work=[...frames.values()];frames.clear();work.forEach(fn=>fn(time));}},
    timers(){const work=[...timers.values()];timers.clear();work.forEach(fn=>fn());},
    purchases:()=>purchases,reveals:()=>reveals};
}

{
  const h=packHarness(),pack=h.nodes.get('#rfpack');
  pack.fire('pointerdown');pack.fire('pointercancel');
  assert.equal(h.purchases(),0,'A cancelled touch must not buy a pack');
  pack.fire('pointerdown');pack.fire('pointermove',{pointerId:2,clientX:150});
  assert.equal(h.purchases(),0,'A second finger must not control or buy the pack');
  pack.fire('pointermove',{clientX:65});h.frames();
  const torn=h.context.RF.prog;
  assert.ok(torn>.3&&torn<.4);
  pack.fire('pointercancel');h.frames();
  assert.equal(h.context.RF.done,false,'Cancelling a partial tear must not auto-open');
  assert.equal(h.context.RF.prog,torn,'The torn seam stays peeled');
  pack.fire('pointerdown',{clientX:65});pack.fire('pointermove',{clientX:200});h.frames();h.timers();
  assert.equal(h.purchases(),1,'Resuming the same pack must not charge again');
  assert.equal(h.reveals(),1);
  pack.fire('pointerup',{clientX:200});h.nodes.get('#rftab').fire('click',{detail:1});h.frames();h.timers();
  assert.equal(h.reveals(),1,'Release and click must not replay the reward');
}
{
  const h=packHarness(),pack=h.nodes.get('#rfpack');
  pack.fire('pointerdown');pack.fire('pointerup');h.frames();h.timers();
  assert.equal(h.purchases(),1,'A deliberate tap opens one pack');assert.equal(h.reveals(),1);
}
{
  const h=packHarness(true);
  h.nodes.get('#rftab').fire('click',{detail:0});h.frames(3);
  assert.equal(h.purchases(),1);assert.equal(h.reveals(),1,'Keyboard and reduced-motion opening complete without waiting for decorative animation');
}
{
  const h=packHarness();
  h.nodes.get('#rftab').fire('click',{detail:0});h.frames();
  h.context.RF.unbind();h.nodes.get('#rfstage').isConnected=false;h.timers();
  assert.equal(h.reveals(),0,'Leaving Rafters cancels delayed reward rendering');
}
{
  const player={id:1,name:'Test Player',team:'CHI',era:'90s',tier:'Gold'};
  const seen={},context=vm.createContext({T:{seenCards:seen},cardArtURL(){return 'test.png';},efxEligible(){return true;},esc:s=>s});
  vm.runInContext(source.slice(source.indexOf('function collTile(p){'),source.indexOf('function collPool(){')),context);
  const tile=context.collTile(player);
  assert.match(tile, /<button/);assert.match(tile, /openEquip\(1\)/);assert.match(tile, /Test Player/);assert.match(tile, /ct-q/);
  assert.doesNotMatch(tile, /<img/);assert.deepEqual(seen,{},'Preview access must not mark a player as discovered');
}
console.log('UI interaction tests passed');
