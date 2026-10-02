import assert from 'node:assert/strict';
import {createCipheriv,createHash,webcrypto} from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import '../supabase/functions/_shared/draft-random-20261002.js';

const {create,freshSeed}=globalThis.ATUDraftRandomV1;
const wordRange=4294967296,maxWords=wordRange*16;
const seed=i=>createHash('sha256').update('draft-random-verification-'+i).digest('hex');
function bytes(random,count){
 const output=Buffer.alloc(count*4);
 for(let i=0;i<count;i++)output.writeUInt32LE(random.uint32(),i*4);
 return output;
}

// RFC 8439 section 2.3.2: the nonzero nonce and block 1 detect endian,
// quarter-round, nonce and counter mistakes independently of our own code.
const rfcKey='000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
const rfcNonce='000000090000004a00000000';
const rfcExpected='10f1e7e4d13b5915500fdd1fa32071c4c7d1f4c733c068030422aa9ac3d46c4e'+
 'd2826446079faa0914c2d705d98b02a2b5129cd1de164eb9cbd083e8a2503c4e';
assert.equal(bytes(create(rfcKey,{nonceHex:rfcNonce,offset:16}),16).toString('hex'),rfcExpected);
const zeroExpected='76b8e0ada0f13d90405d6ae55386bd28bdd219b8a08ded1aa836efcc8b770dc7'+
 'da41597c5157488d7724e03fb8d84a376a43b8f41518a11cc387b669b2ee6586';
assert.equal(bytes(create('0'.repeat(64)),16).toString('hex'),zeroExpected);

// OpenSSL's independent implementation uses a 16-byte counter/nonce input.
// We exercise all production stream domains, non-block-aligned offsets and the
// last permitted block; comparing one hand-picked block would miss carry bugs.
for(const key of [rfcKey,seed(1),seed(2)])for(const stream of [0,1,2,3]){
 for(const offset of [0,1,15,16,17,1003,maxWords-19]){
  const count=Math.min(67,maxWords-offset),counter=Math.floor(offset/16);
  const iv=Buffer.alloc(16);iv.writeUInt32LE(counter,0);iv.writeUInt32LE(stream,4);
  const cipher=createCipheriv('chacha20',Buffer.from(key,'hex'),iv);
  const raw=Buffer.concat([cipher.update(Buffer.alloc((offset%16+count)*4)),cipher.final()]);
  assert.deepEqual(bytes(create(key,{stream,offset}),count),raw.subarray((offset%16)*4));
 }
}

// Saving the word offset must reproduce float, integer (including rejected
// words) and shuffle consumption exactly after restoring in a fresh factory.
for(const stream of [0,1,2,3]){
 const original=create(seed('resume'),{stream});
 for(let i=0;i<27;i++){original();original.int(3);original.int(2147483649);}
 const saved=original.offset(),resumed=create(seed('resume'),{stream,offset:saved});
 assert.equal(resumed.offset(),saved);
 for(let i=0;i<200;i++){
  assert.equal(original(),resumed());
  for(const bound of [1,3,7,198,241,2147483649,wordRange])assert.equal(original.int(bound),resumed.int(bound));
  assert.equal(original.offset(),resumed.offset());
 }
 assert.deepEqual(original.shuffle(['a','b','c','d','e']),resumed.shuffle(['a','b','c','d','e']));
 assert.equal(original.offset(),resumed.offset());
}
assert.equal(create(rfcKey.toUpperCase())(),create(rfcKey)());
const domains=[0,1,2,3].map(stream=>bytes(create(seed('domains'),{stream}),32).toString('hex'));
assert.equal(new Set(domains).size,4,'Nonce streams must produce different sequences');
assert.notEqual(bytes(create(seed('restart-a')),32).toString('hex'),bytes(create(seed('restart-b')),32).toString('hex'));

// Large uneven bounds force rejection frequently. Verify the exact choice and
// consumed offset against the independent ChaCha stream, not just frequencies.
for(const bound of [3,241,2147483649,wordRange-1,wordRange]){
 const random=create(seed('rejection'));
 const reference=create(seed('rejection'));
 let rejections=0;
 const limit=Math.floor(wordRange/bound)*bound;
 for(let i=0;i<2000;i++){
  let value;
  do{value=reference.uint32();if(value>=limit)rejections++;}while(value>=limit);
  assert.equal(random.int(bound),value%bound);
  assert.equal(random.offset(),reference.offset());
 }
 if(bound===2147483649)assert(rejections>1000,'The test must exercise incomplete-bucket rejection');
}
const originalItems=[0,1,2,3,4,5,6,7,8,9],shuffled=create(seed('shuffle')).shuffle(originalItems);
assert.deepEqual(originalItems,[0,1,2,3,4,5,6,7,8,9],'Shuffle must not mutate its input');
assert.deepEqual([...shuffled].sort((a,b)=>a-b),originalItems);
assert.deepEqual(shuffled,create(seed('shuffle')).shuffle(originalItems));

for(const bad of ['',null,7,'g'.repeat(64),'a'.repeat(63),'a'.repeat(65)])assert.throws(()=>create(bad),/Invalid draft seed/);
for(const stream of [-1,4,.5,NaN,'1'])assert.throws(()=>create(seed(0),{stream}),/Invalid draft random stream/);
for(const offset of [-1,.5,NaN,maxWords+1,'0'])assert.throws(()=>create(seed(0),{offset}),/Invalid draft random offset/);
for(const nonceHex of ['',null,'g'.repeat(24),'0'.repeat(23)])assert.throws(()=>create(seed(0),{nonceHex}),/Invalid draft nonce/);
for(const bound of [0,-1,.5,NaN,Infinity,wordRange+1,'2'])assert.throws(()=>create(seed(0)).int(bound),/Invalid draft random bound/);
assert.throws(()=>create(seed(0)).shuffle('abc'),/Invalid draft shuffle items/);
const finalWord=create(seed('end'),{offset:maxWords-1});assert.equal(typeof finalWord.uint32(),'number');assert.equal(finalWord.offset(),maxWords);
assert.throws(()=>finalWord.uint32(),/stream exhausted/);
assert.throws(()=>create(seed(0),{offset:maxWords})(),/stream exhausted/);

const source=fs.readFileSync(new URL('../supabase/functions/_shared/draft-random-20261002.js',import.meta.url),'utf8');
const browser=vm.createContext({crypto:webcrypto});vm.runInContext(source,browser);
const browserStream=browser.ATUDraftRandomV1.create(seed('browser'),{stream:3,offset:31});
const serverStream=create(seed('browser'),{stream:3,offset:31});
for(let i=0;i<200;i++)assert.equal(browserStream.int(241),serverStream.int(241));
assert.equal(browserStream.offset(),serverStream.offset());
const controlled=vm.createContext({crypto:{getRandomValues(bytes){for(let i=0;i<bytes.length;i++)bytes[i]=i;return bytes;}}});
vm.runInContext(source,controlled);assert.equal(controlled.ATUDraftRandomV1.freshSeed(),rfcKey);
const unavailable=vm.createContext({});vm.runInContext(source,unavailable);
assert.throws(()=>unavailable.ATUDraftRandomV1.freshSeed(),/Secure draft randomness is unavailable/);
const secureSeeds=new Set(Array.from({length:50},freshSeed));assert.equal(secureSeeds.size,50);
for(const value of secureSeeds)assert.match(value,/^[a-f0-9]{64}$/);
console.log('Draft RNG: RFC vectors, OpenSSL comparison, stream domains, replay offsets, unbiased choices, browser parity and secure seed generation passed');
