import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Room,settings,normalize} from '../server/game.js';
const emitBus={to(){return {emit(){}}}};
const player=(id,name)=>({id,name,score:0,ready:false,region:'india',avatar:'🦊'});
test('PDF limits and word match normalization',()=>{
  assert.equal(settings({rounds:3,drawTime:80,wordCount:5,hints:0,maxPlayers:20}).rounds,3);
  assert.throws(()=>settings({rounds:11}),/Invalid rounds/);
  assert.throws(()=>settings({drawTime:10}),/Invalid drawTime/);
  assert.equal(normalize('  A  BiG  Rocket  '),'a big rocket');
});
test('2 round two-player game finishes at round 2 of 2 and rematch resets scores',()=>{
  const r=new Room(player('host','Host'),{rounds:2,drawTime:15},emitBus,()=>{}, {breakMs:10});
  try {
    r.add(player('guest','Guest'));
    r.players[1].ready=true;
    r.start('host');
    assert.equal(r.phase,'choosing');
    assert.equal(r.round,1);
    for(let turn=0;turn<4;turn++) {
      assert.equal(r.phase,'choosing');
      const drawer=r.drawerId;
      const guesser=drawer==='host'?'guest':'host';
      const word=r.options[0];
      assert.equal(r.view(guesser).word,null);
      assert.equal(r.view(guesser).options.length,0);
      r.choose(drawer,word);
      assert.equal(r.phase,'drawing');
      r.guess(guesser,'  '+word.toUpperCase()+'  ');
      assert.equal(r.phase,'between');
      r.next();
    }
    assert.equal(r.phase,'finished');
    assert.equal(r.round,2);
    assert.equal(r.view('guest').round,2);
    assert.ok(r.players.every(p=>p.score>0));
    r.start('host');
    assert.equal(r.phase,'choosing');
    assert.equal(r.round,1);
    assert.ok(r.players.every(p=>p.score===0));
  } finally {clearInterval(r.timer)}
});
