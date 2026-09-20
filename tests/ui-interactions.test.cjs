const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Parse each executable inline script; no browser or game bootstrap is needed.
for (const match of source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (!/src=|application\/ld\+json/.test(match[1])) new vm.Script(match[2]);
}

{
  const logic=source.match(/<script>\s*\/\/<LOGIC>([\s\S]*?)\/\/<\/LOGIC>/)[1];
  const art=source.slice(source.indexOf('const CARD_ART_BASE='),source.indexOf('function cardArtFallbackAttr'));
  const context=vm.createContext({console});
  vm.runInContext(logic+art+';globalThis.cards=DB;globalThis.artFor=cardSlugFor;',context);
  const card=(name,team)=>context.cards.find(p=>p&&p.name===name&&p.team===team);
  for(const [name,owner,other,slug] of [['Julius Erving','PHI','BKN','julius-erving'],['Dikembe Mutombo','DEN','ATL','dikembe-mutombo']]){
    const original=card(name,owner),alternate=card(name,other);
    assert(original.acquisitionActive&&alternate.acquisitionActive,'Meaningful franchise versions must remain separately pullable');
    assert.equal(context.artFor(original),slug);
    assert.equal(context.artFor(alternate),slug+'-'+other.toLowerCase());
    original.ovr=85;alternate.ovr=99;
    assert.equal(context.artFor(original),slug,'Rating changes must not reassign artwork');
    assert.equal(context.artFor(alternate),slug+'-'+other.toLowerCase());
  }
  assert.equal(context.artFor(card('LeBron James','LAL')),'lebron-james-lal','Explicit team artwork keeps priority');
}

{
  const player={id:1,name:'Test Player',team:'CHI',era:'90s',tier:'Gold'};
  const seen={},context=vm.createContext({T:{seenCards:seen},cardArtURL(){return 'test.png';},efxEligible(){return true;},esc:s=>s});
  vm.runInContext(source.slice(source.indexOf('function collTile(p){'),source.indexOf('function collPool(){')),context);
  const tile=context.collTile(player);
  assert.match(tile, /<button/);assert.match(tile, /openEquip\(1\)/);assert.match(tile, /Test Player/);assert.match(tile, /ct-q/);
  assert.doesNotMatch(tile, /<img/);assert.deepEqual(seen,{},'Preview access must not mark a player as discovered');
}

{
  let renders=0,scrolls=0,focusTarget=null;
  const selected={offsetLeft:560,offsetWidth:110,focus(options){focusTarget=options;}};
  const rail={scrollLeft:0,clientWidth:330,querySelector:()=>selected};
  const bar={dataset:{},innerHTML:'',querySelector:()=>selected,querySelectorAll:()=>[rail],contains:node=>node?.insideNav===true};
  const document={activeElement:null};
  const draft={roster:{PG:42},activeSlot:'C'};
  const context=vm.createContext({document,screen:'landing',D:draft,esc:s=>s.replace(/&/g,'&amp;'),
    $:selector=>selector==='#topnav'?bar:null,
    window:{scrollTo(){scrolls++;}},render(){renders++;}});
  vm.runInContext(source.slice(source.indexOf('const TOP_NAV='),source.indexOf('/* ================= HUB')),context);
  context.renderTopNav();
  assert.equal(rail.scrollLeft,340,'A selected tab outside the phone viewport is revealed');
  assert.equal(focusTarget,null,'Rendering navigation must not steal focus from the game');
  rail.scrollLeft=100;
  context.renderTopNav();assert.equal(rail.scrollLeft,100,'Routine game renders preserve manual horizontal scrolling');
  const getRoutes=()=>[...bar.innerHTML.matchAll(/setScreen\('([^']+)'\)/g)].map(match=>match[1]);
  const primary=getRoutes(),routes=new Set(primary);
  for(const page of primary){
    context.setScreen(page);context.renderTopNav();
    getRoutes().forEach(route=>routes.add(route));
  }
  for(const page of ['landing','draft','classic','daily','team','rare','challenge','rankings','collection','rafters','trophies','account','friends','updates'])assert.ok(routes.has(page),`${page} is reachable through the top bar`);
  document.activeElement={insideNav:true};
  for(const page of routes){
    context.setScreen(page);context.renderTopNav();
    assert.equal(context.screen,page);
    assert.ok(bar.innerHTML.includes(`onclick="setScreen('${page}')" aria-current="page"`));
  }
  assert.equal(focusTarget.preventScroll,true,'Keyboard navigation restores focus without scrolling the page');
  assert.equal(renders,primary.length+routes.size);assert.equal(scrolls,renders);
  selected.offsetLeft=0;context.setScreen('draft');context.renderTopNav();
  assert.equal(rail.scrollLeft,0,'Navigation can reveal an earlier tab after swiping right');
  assert.match(bar.innerHTML,/aria-current="location">Play/);
  assert.match(bar.innerHTML,/aria-current="page">Classic Draft/);
  assert.deepEqual(draft,{roster:{PG:42},activeSlot:'C'},'Navigation never resets the draft or its open board');
}
{
  const slots=['PG','SG','SF','PF','C','B1','B2','B3'];
  const restored={stage:'picking',roster:Object.fromEntries(slots.map((s,i)=>[s,i<3?i:null]))};
  const sheet={innerHTML:'',classList:{add(value){this.value=value;}}};
  const context=vm.createContext({screen:'draft',D:{stage:'captain',roster:{}},DRAFT_ERA:null,
    ALL_SLOTS:slots,ATUBackend:{getGameSession:()=>({draft:restored})},$:()=>sheet});
  vm.runInContext(source.slice(source.indexOf('function activeDraft(){'),source.indexOf('function localDraftRules(){'))+
    source.slice(source.indexOf('function confirmDraftReset(){'),source.indexOf('function doDraftReset(){')),context);
  context.confirmDraftReset();
  assert.equal(sheet.classList.value,'show','Restart must open for a restored signed-in draft even when the local draft is still at captain selection');
  assert.match(sheet.innerHTML,/3 picks/,'Restart confirmation counts the displayed online roster');
  assert.match(sheet.innerHTML,/doDraftReset\(\)/);
  context.ATUBackend.getGameSession=()=>null;
  context.D=restored;
  sheet.classList.value=null;
  context.confirmDraftReset();
  assert.equal(sheet.classList.value,'show','Guest drafts still restart');
}
console.log('UI interaction tests passed');

// Pointer gestures use the same two-way eligibility rules on touch and mouse.
{
 const draft={stage:'picking',roster:{PG:0,SG:1,C:2,B1:3}};
 const cards=[{positions:['PG','SG']},{positions:['PG','SG']},{positions:['C']},{positions:['C']}];
 const swaps=[], nodes=['PG','SG','C','B1'].map(slot=>({dataset:{draftSlot:slot},classList:{add(){},remove(){},toggle(){}}}));
 let hit=nodes[1];
 const button={setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){}};
 const context=vm.createContext({Date,DB:cards,ALL_SLOTS:['PG','SG','SF','PF','C','B1'],activeDraft:()=>draft,eligible:(p,s)=>s==='B1'||p.positions.includes(s),document:{querySelectorAll:()=>nodes,elementFromPoint:()=>({closest:()=>hit})},doDraftSwap:(a,b)=>swaps.push([a,b])});
 vm.runInContext(source.slice(source.indexOf('let DRAFT_DRAG='),source.indexOf('function doDraftSwap(a,b){')),context);
 const event={button:0,isPrimary:true,pointerId:1,currentTarget:button,preventDefault(){},stopPropagation(){},clientX:10,clientY:20};
 assert.equal(context.canDraftSwap('PG','SG'),true);
 assert.equal(context.canDraftSwap('PG','C'),false);
 assert.equal(context.canDraftSwap('PG','SF'),false,'Empty slots never qualify');
 assert.equal(context.canDraftSwap('C','B1'),true);
 context.draftDragStart(event,'PG');context.draftDragEnd(event);
 assert.deepEqual(swaps,[['PG','SG']]);
 hit=nodes[2];context.draftDragStart(event,'PG');context.draftDragEnd(event);
 assert.equal(swaps.length,1,'Invalid touch release cannot swap');
 hit=nodes[1];context.draftDragStart(event,'PG');context.draftDragEnd(event,true);
 assert.equal(swaps.length,1,'Cancelled touch cannot swap');
 draft.stage='captain';assert.equal(context.canDraftSwap('PG','SG'),false);
}
