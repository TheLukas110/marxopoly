import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyAction, createGame, currentPlayer, type GameAction, type GameState, type TradeSide } from '@marxopoly/shared';
import { decideBotAction } from '../src/bot.js';
import { assessTrade, createBotTradeMemory } from '../src/bot-trading.js';

const side=(cash=0,tileIds: number[]=[],reprieveCards=0): TradeSide=>({cash,tileIds,reprieveCards});
function game(): GameState {
  const state=createGame('BOT',[{id:'a',name:'Ada'},{id:'b',name:'Bot'},{id:'c',name:'Cleo'}],{seed:42,turnSeconds:0});
  state.phase='post_roll';state.turnSeat=1;state.players[1]!.isBot=true;
  state.deeds[1]!.ownerId='b';state.deeds[3]!.ownerId='a';
  return state;
}
function act(state: GameState,playerId: string,action: GameAction): GameState {
  const result=applyAction(state,{playerId,action,now:100});
  assert.equal(result.ok,true,JSON.stringify(result));
  if(!result.ok) throw new Error(result.error);
  return result.state;
}
function offer(state: GameState,give: TradeSide,receive: TradeSide) {
  return act(state,'a',{type:'propose_trade',toId:'b',give,receive});
}

test('bot proposes an affordable group-completing offer with a note and then continues its turn',()=>{
  let state=game();const memory=createBotTradeMemory(),before=structuredClone(state);
  const action=decideBotAction(state,'b',memory);
  assert.equal(action?.type,'propose_trade');assert.deepEqual(state,before);
  if(action?.type!=='propose_trade') return;
  assert.deepEqual(action.receive.tileIds,[3]);assert.ok(action.message?.includes('completes a set'));
  assert.ok(assessTrade(state,'a',action.receive,action.give).gain>0);
  state=act(state,'b',action);
  assert.equal(decideBotAction(state,'b',memory)?.type,'end_turn');
  state=act(state,'a',{type:'decline_trade',tradeId:state.trades[0]!.id});
  assert.equal(decideBotAction(state,'b',memory)?.type,'end_turn','no repeat offer after refusal in the same turn');
});

test('bot accepts a strategic offer even above printed price and records its reason',()=>{
  let state=offer(game(),side(0,[3]),side(100));
  state.turnSeat=0; // Replies also work during a human turn.
  const action=decideBotAction(state,'b');assert.equal(action?.type,'accept_trade');
  state=act(state,'b',action!);
  assert.equal(state.deeds[3]!.ownerId,'b');assert.equal(state.trades.length,0);
  assert.ok(state.log.at(-1)!.text.includes('Note: Accepted: completes a set'));
});

test('cash-poor bots can propose property swaps without consuming their rent reserve',()=>{
  let state=game();state.players[0]!.cash=250;state.players[1]!.cash=250;
  state.deeds[6]!.ownerId='a';state.deeds[8]!.ownerId='b';state.deeds[9]!.ownerId='b';
  const action=decideBotAction(state,'b');assert.equal(action?.type,'propose_trade');
  if(action?.type!=='propose_trade') return;
  assert.ok(action.give.tileIds.length>0 && action.receive.tileIds.length>0);
  assert.equal(action.give.cash,0);assert.equal(action.receive.cash,0);
  state=act(state,'b',action);state=act(state,'a',{type:'accept_trade',tradeId:state.trades[0]!.id});
  assert.equal(state.players[1]!.cash,250);
});

test('unfair but negotiable offers are replaced atomically with cash-adjusted counteroffers',()=>{
  let state=offer(game(),side(0,[3]),side(300));const original=state.trades[0]!;
  const action=decideBotAction(state,'b');assert.equal(action?.type,'counter_trade');
  state=act(state,'b',action!);
  assert.equal(state.trades.length,1);
  const counter=state.trades[0]!;
  assert.equal(counter.fromId,'b');assert.equal(counter.toId,'a');assert.equal(counter.counterOf,original.id);
  assert.deepEqual(counter.receive.tileIds,[3]);assert.ok(counter.give.cash<300);
  assert.ok(counter.message?.includes('adjusted cash'));
  const reply=decideBotAction(state,'a');assert.equal(reply?.type,'accept_trade');
  state=act(state,'a',reply!);assert.equal(state.trades.length,0);
});

test('counteroffer chains end rather than countering back indefinitely',()=>{
  let state=offer(game(),side(0,[3]),side(300));
  state.trades[0]!.counterOf='previous';
  const action=decideBotAction(state,'b');assert.equal(action?.type,'decline_trade');
  state=act(state,'b',action!);assert.ok(state.log.at(-1)!.text.includes('insufficient benefit'));
});

test('complete groups are worth more than their face value and are not broken cheaply',()=>{
  let state=game();state.deeds[3]!.ownerId='b';
  state=offer(state,side(80),side(0,[1]));
  const action=decideBotAction(state,'b');assert.equal(action?.type,'decline_trade');
});

test('reserve prevents purchases that would leave the bot unable to pay rent',()=>{
  let state=game();state.players[1]!.cash=260;
  state=offer(state,side(0,[3]),side(100));
  const action=decideBotAction(state,'b');assert.equal(action?.type,'decline_trade');
  if(action?.type==='decline_trade') assert.ok(action.message?.includes('rent'));
});

test('reprieve cards are valued, including a higher value while detained',()=>{
  let state=game();state.players[0]!.reprieveCards=1;state.players[1]!.inHolding=true;
  state=offer(state,side(0,[],1),side(20));
  const action=decideBotAction(state,'b');assert.equal(action?.type,'accept_trade');
  state=act(state,'b',action!);assert.equal(state.players[1]!.reprieveCards,1);
});

test('mortgages are discounted, but incoming cash can cover transfer interest',()=>{
  let state=game();state.deeds[3]!.mortgaged=true;state.players[1]!.cash=0;
  const normal=assessTrade(state,'b',side(),side(0,[3]));
  state.deeds[3]!.mortgaged=false;
  assert.ok(assessTrade(state,'b',side(),side(0,[3])).gain>normal.gain);
  state.deeds[3]!.mortgaged=true;
  state=offer(state,side(10,[3]),side());
  const action=decideBotAction(state,'b');assert.equal(action?.type,'accept_trade');
  state=act(state,'b',action!);assert.equal(state.players[1]!.cash,5);
});

test('stale ownership, buildings, cash and cards are declined instead of stalling the bot',()=>{
  const scenarios=[
    (s: GameState)=>{s.deeds[3]!.ownerId='c';},
    (s: GameState)=>{s.deeds[3]!.houses=1;},
    (s: GameState)=>{s.players[1]!.cash=0;},
    (s: GameState)=>{s.players[0]!.reprieveCards=0;},
  ];
  for(const change of scenarios) {
    let state=game();state.players[0]!.reprieveCards=1;
    state=offer(state,side(0,[3],1),side(80));change(state);
    const action=decideBotAction(state,'b');assert.equal(action?.type,'decline_trade');
    state=act(state,'b',action!);assert.equal(state.trades.length,0);
  }
});

test('bot never negotiates with itself, bankrupt players, or in a closed game',()=>{
  const state=game();state.players[0]!.bankrupt=true;
  assert.equal(decideBotAction(state,'b')?.type,'end_turn');
  state.phase='lobby';assert.equal(decideBotAction(state,'b'),null);
  state.phase='game_over';assert.equal(decideBotAction(state,'b'),null);
});

test('unsuccessful counteroffers and unauthorized replacements leave the original intact',()=>{
  const state=offer(game(),side(0,[3]),side(300)),before=structuredClone(state);
  for(const [id,give] of [['c',side()],['b',side(99999)]] as const) {
    const result=applyAction(state,{playerId:id,action:{type:'counter_trade',tradeId:state.trades[0]!.id,give,receive:side(0,[3])},now:100});
    assert.equal(result.ok,false);assert.deepEqual(state,before);
  }
});

test('ignored or invalid outgoing offers are withdrawn without blocking play',()=>{
  let state=game();const memory=createBotTradeMemory();
  state=act(state,'b',decideBotAction(state,'b',memory)!);
  state.stats.netWorthHistory.push({turn:6,worth:{}});
  const action=decideBotAction(state,'b',memory);assert.equal(action?.type,'cancel_trade');
  state=act(state,'b',action!);assert.equal(decideBotAction(state,'b',memory)?.type,'end_turn');
});

test('several full bot tables keep making legal progress through trades, auctions and debt',()=>{
  let proposals=0,accepted=0;
  for(const seed of [42,123,999]) {
    let state=createGame('PLAY',[{id:'a',name:'Ada',isBot:true},{id:'b',name:'Brix',isBot:true},{id:'c',name:'Cleo',isBot:true}],{seed,turnSeconds:0});
    state=act(state,'a',{type:'start_game'});
    const memory=createBotTradeMemory();
    for(let step=0;step<800 && state.phase!=='game_over';step++) {
      const actor=state.phase==='auction'?state.auction!.activeIds[state.auction!.turnIndex]!
        :state.phase==='debt'?state.debt!.debtorId
        :state.trades[0]?.toId ?? currentPlayer(state)!.id;
      const action=decideBotAction(state,actor,memory);
      assert.ok(action,`seed ${seed}, step ${step}, phase ${state.phase}`);
      if(action.type==='propose_trade') proposals++;
      if(action.type==='accept_trade') accepted++;
      state=act(state,actor,action);
      assert.ok(state.trades.length<=state.players.length*2,'bounded open offers');
    }
    assert.ok((state.stats.netWorthHistory.at(-1)?.turn ?? 0)>15);
  }
  assert.ok(proposals>0,'bots actively negotiate in real play');
  assert.ok(accepted>0,'bots can reach mutually acceptable agreements');
});
