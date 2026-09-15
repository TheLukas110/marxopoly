import {
  applyAction, getPlayer, groupHasBuildings, groupOf, groupTileIds, mortgageValue,
  ownableTile, ownedTileIds, type GameAction, type GameState, type TradeOffer, type TradeSide,
} from '@marxopoly/shared';

/** Kept per room, outside public game state. At most one negotiation per bot per turn. */
export interface BotTradeMemory {
  lastTurn: Map<string, number>;
  lastPartnerTurn: Map<string, number>;
}
export const createBotTradeMemory = (): BotTradeMemory => ({lastTurn:new Map(),lastPartnerTurn:new Map()});
const turnNumber = (state: GameState) => state.stats.netWorthHistory.at(-1)?.turn ?? 0;
const side = (tileIds: number[] = []): TradeSide => ({cash:0,tileIds,reprieveCards:0});
const dollars = (value: number) => `$${Math.round(value)}`;
const worldGroups = (state: GameState): number[][] => {
  const names = new Set(state.ruleWorld.board.map(groupOf).filter((group): group is string => !!group));
  return [...names].map(group => groupTileIds(state, group));
};

function portfolio(state: GameState, ids: Set<number>): number {
  let value=0;
  for(const group of worldGroups(state)) {
    const owned=group.filter(id=>ids.has(id));
    const base=owned.reduce((sum,id)=>sum+ownableTile(state,id)!.price*(state.deeds[id]?.mortgaged?0.45:1),0);
    const street=ownableTile(state,group[0]!)?.kind==='street';
    // Breaking a complete street group costs its development potential.
    const bonus=street && owned.length===group.length?0.85:Math.max(0,owned.length-1)*(street?0.15:0.3);
    value+=base*(1+bonus);
  }
  return value;
}

function cardsValue(state: GameState, playerId: string, count: number): number {
  const player=getPlayer(state,playerId)!;
  return count<=0?0:state.settings.holdingFine*((player.inHolding?0.95:0.65)+Math.max(0,count-1)*0.25);
}

function interest(state: GameState, incoming: TradeSide): number {
  return incoming.tileIds.reduce((sum,id)=>sum+(state.deeds[id]?.mortgaged?Math.ceil(mortgageValue(ownableTile(state,id)!)*0.1):0),0);
}

/** Evaluate the complete portfolio after the swap, not each deed independently. */
export function assessTrade(state: GameState, playerId: string, give: TradeSide, receive: TradeSide) {
  const player=getPlayer(state,playerId)!;
  const before=new Set(ownedTileIds(state,playerId)),after=new Set(before);
  give.tileIds.forEach(id=>after.delete(id));receive.tileIds.forEach(id=>after.add(id));
  const fee=interest(state,receive);
  const cashAfter=player.cash-give.cash+receive.cash-fee;
  const gain=portfolio(state,after)-portfolio(state,before)+receive.cash-give.cash-fee
    +cardsValue(state,playerId,player.reprieveCards-give.reprieveCards+receive.reprieveCards)-cardsValue(state,playerId,player.reprieveCards);
  const reserve=Math.min(250,player.cash);
  const debt=state.debt?.debtorId===playerId?state.debt.amount:0;
  const completes=worldGroups(state).some(ids=>ids.every(id=>after.has(id)) && !ids.every(id=>before.has(id)));
  return {gain,cashAfter,completes,affordable:cashAfter>=Math.max(reserve,debt)};
}

function executable(state: GameState, offer: TradeOffer): boolean {
  // Reuse authoritative ownership/building/card/cash/interest validation.
  return applyAction({...state,trades:[offer]}, {playerId:offer.toId,action:{type:'accept_trade',tradeId:offer.id},now:offer.createdAt}).ok;
}

function explanation(prefix: string, assessment: ReturnType<typeof assessTrade>): string {
  return `${prefix}: ${assessment.completes?'completes a set; ':''}estimated gain ${dollars(assessment.gain)}, cash left ${dollars(assessment.cashAfter)}. Valuation includes sets, mortgages and reprieve cards.`.slice(0,200);
}

/** Balance cash so both portfolios improve, keeping both players' reserves. */
function quote(state: GameState, fromId: string, toId: string, give: TradeSide, receive: TradeSide): TradeOffer | null {
  give={...give,cash:0};receive={...receive,cash:0};
  const a=assessTrade(state,fromId,give,receive),b=assessTrade(state,toId,receive,give);
  if(a.gain+b.gain<20) return null;
  const from=getPlayer(state,fromId)!,to=getPlayer(state,toId)!;
  // Positive price means the proposer pays. Negative means the recipient pays.
  const lower=Math.ceil(Math.max(10-b.gain,Math.min(250,to.cash)-b.cashAfter,-to.cash));
  const upper=Math.floor(Math.min(a.gain-10,a.cashAfter-Math.min(250,from.cash),from.cash));
  if(lower>upper) return null;
  const price=Math.max(lower,Math.min(upper,Math.round((a.gain-b.gain)/2)));
  give.cash=Math.max(0,price);receive.cash=Math.max(0,-price);
  const offer: TradeOffer={id:'bot-evaluation',fromId,toId,give,receive,createdAt:0};
  const mine=assessTrade(state,fromId,give,receive),theirs=assessTrade(state,toId,receive,give);
  return mine.affordable && theirs.affordable && executable(state,offer)?offer:null;
}

function remember(state: GameState, memory: BotTradeMemory, fromId: string, toId: string) {
  const turn=turnNumber(state);
  memory.lastTurn.set(fromId,turn);
  memory.lastPartnerTurn.set(`${fromId}:${toId}`,turn);
}

export function answerTrade(state: GameState, playerId: string, offer: TradeOffer, memory: BotTradeMemory): GameAction {
  if(!executable(state,offer)) return {type:'decline_trade',tradeId:offer.id,message:'Declined: ownership, buildings, available cash or cards have changed; this offer can no longer be completed.'};
  const value=assessTrade(state,playerId,offer.receive,offer.give);
  if(value.gain>=5 && value.affordable) {
    remember(state,memory,playerId,offer.fromId);
    return {type:'accept_trade',tradeId:offer.id,message:explanation('Accepted',value)};
  }
  // One counter per chain and per turn prevents bot-to-bot negotiation loops.
  if(!offer.counterOf && memory.lastTurn.get(playerId)!==turnNumber(state) && state.phase!=='debt'
    && state.trades.filter(t=>t.fromId===playerId).length<5) {
    const counter=quote(state,playerId,offer.fromId,offer.receive,offer.give);
    if(counter) {
      remember(state,memory,playerId,offer.fromId);
      return {type:'counter_trade',tradeId:offer.id,give:counter.give,receive:counter.receive,
        message:explanation('Counteroffer with adjusted cash',assessTrade(state,playerId,counter.give,counter.receive))};
    }
  }
  return {type:'decline_trade',tradeId:offer.id,message:!value.affordable
    ?`Declined: only ${dollars(value.cashAfter)} cash would remain; I need money for rent and outstanding debt.`
    :`Declined: estimated loss or insufficient benefit (${dollars(value.gain)}). Cash does not compensate for the properties, sets or cards I give up.`};
}

function tradable(state: GameState, playerId: string): number[] {
  return ownedTileIds(state,playerId).filter(id=>!groupHasBuildings(state,groupOf(ownableTile(state,id)!)!));
}

export function proposeBotTrade(state: GameState, playerId: string, memory: BotTradeMemory): GameAction | null {
  const turn=turnNumber(state);
  const pending=state.trades.find(t=>t.fromId===playerId);
  if(pending) {
    const sent=memory.lastPartnerTurn.get(`${playerId}:${pending.toId}`) ?? turn;
    if(!executable(state,pending) || turn-sent>=state.players.length*2) {
      remember(state,memory,playerId,pending.toId);
      return {type:'cancel_trade',tradeId:pending.id};
    }
    return null;
  }
  if(memory.lastTurn.get(playerId)===turn) return null;
  const me=getPlayer(state,playerId)!,mine=tradable(state,playerId);
  let best: TradeOffer | null=null,bestGain=0;
  for(const other of state.players) {
    if(other.id===playerId || other.bankrupt || state.trades.some(t=>t.fromId===other.id && t.toId===playerId)) continue;
    // Wait a full table round before approaching the same player again.
    if(turn-(memory.lastPartnerTurn.get(`${playerId}:${other.id}`) ?? -Infinity)<state.players.length) continue;
    const theirs=tradable(state,other.id);
    const consider=(give: TradeSide,receive: TradeSide)=>{
      const offer=quote(state,playerId,other.id,give,receive);
      if(!offer) return;
      const value=assessTrade(state,playerId,offer.give,offer.receive);
      if(value.gain>bestGain) {best=offer;bestGain=value.gain;}
    };
    for(const id of theirs) {
      const group=groupTileIds(state,groupOf(ownableTile(state,id)!)!);
      if(!group.some(tileId=>state.deeds[tileId]?.ownerId===playerId)) continue;
      consider(side(),side([id]));
      for(const ownId of mine) consider(side([ownId]),side([id]));
    }
    // Raise liquidity by selling a spare deed that helps the buyer assemble a group.
    if(me.cash<350) for(const id of mine) consider(side([id]),side());
    if(me.inHolding && me.reprieveCards===0 && other.reprieveCards>0) consider(side(),{...side(),reprieveCards:1});
  }
  if(!best) return null;
  const chosen=best as TradeOffer;
  remember(state,memory,playerId,chosen.toId);
  return {type:'propose_trade',toId:chosen.toId,give:chosen.give,receive:chosen.receive,
    message:explanation('Offer',assessTrade(state,playerId,chosen.give,chosen.receive))};
}
