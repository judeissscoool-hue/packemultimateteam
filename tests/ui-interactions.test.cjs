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
  const player={id:1,name:'Test Player',team:'CHI',era:'90s',tier:'Gold'};
  const seen={},context=vm.createContext({T:{seenCards:seen},cardArtURL(){return 'test.png';},efxEligible(){return true;},esc:s=>s});
  vm.runInContext(source.slice(source.indexOf('function collTile(p){'),source.indexOf('function collPool(){')),context);
  const tile=context.collTile(player);
  assert.match(tile, /<button/);assert.match(tile, /openEquip\(1\)/);assert.match(tile, /Test Player/);assert.match(tile, /ct-q/);
  assert.doesNotMatch(tile, /<img/);assert.deepEqual(seen,{},'Preview access must not mark a player as discovered');
}

{
  const handlers={},classes=new Set(),groups=[];
  let renders=0,scrolls=0,focusTarget=null;
  const toggle={insideNav:true,attributes:{},setAttribute(key,value){this.attributes[key]=value;},focus(){focusTarget=this;}};
  const bar={dataset:{},innerHTML:'',classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)},
    querySelectorAll:()=>groups.filter(group=>group.open),contains:node=>node?.insideNav===true};
  const document={activeElement:toggle,addEventListener(name,fn){handlers[name]=fn;}};
  const draft={roster:{PG:42},activeSlot:'C'};
  const context=vm.createContext({document,screen:'landing',D:draft,esc:s=>s.replace(/&/g,'&amp;'),
    $:selector=>selector==='#topnav'?bar:selector==='#nav-toggle'?toggle:null,
    window:{scrollTo(){scrolls++;}},render(){renders++;}});
  vm.runInContext(source.slice(source.indexOf('const TOP_NAV='),source.indexOf('/* ================= HUB')),context);
  context.renderTopNav();
  const routes=[...bar.innerHTML.matchAll(/setScreen\('([^']+)'\)/g)].map(match=>match[1]);
  for(const page of ['landing','draft','classic','daily','team','packs','rare','challenge','rankings','collection','rafters','trophies','account','friends','updates'])assert.ok(routes.includes(page),`${page} is reachable from the top bar`);
  context.toggleTopNav();assert.ok(classes.has('menu-open'));assert.equal(toggle.attributes['aria-expanded'],'true');
  context.renderTopNav();assert.ok(classes.has('menu-open'),'Routine renders keep an open menu usable');
  handlers.click({target:{}});assert.ok(!classes.has('menu-open'));
  context.toggleTopNav();
  let prevented=false;
  handlers.keydown({key:'Escape',preventDefault(){prevented=true;}});
  assert.ok(prevented);assert.equal(focusTarget,toggle);assert.equal(toggle.attributes['aria-expanded'],'false');
  const summary={insideNav:true,focus(){focusTarget=this;}};
  const play={open:true,insideNav:true,matches:()=>true,querySelector:()=>summary};
  const club={...play};groups.push(play,club);
  handlers.toggle({target:club});assert.equal(play.open,false);assert.equal(club.open,true,'Only one dropdown stays open');
  document.activeElement=summary;
  handlers.keydown({key:'Escape',preventDefault(){}});assert.equal(club.open,false);assert.equal(focusTarget,summary);
  for(const page of routes){
    context.setScreen(page);context.renderTopNav();
    assert.equal(context.screen,page);
    assert.ok(bar.innerHTML.includes(`onclick="setScreen('${page}')" aria-current="page"`));
  }
  assert.equal(renders,routes.length);assert.equal(scrolls,routes.length);
  assert.deepEqual(draft,{roster:{PG:42},activeSlot:'C'},'Navigation never resets the draft or its open board');
}
console.log('UI interaction tests passed');
