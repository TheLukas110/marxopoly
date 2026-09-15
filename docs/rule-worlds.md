# Rule worlds

A rule world is a validated, server-authoritative package. Visual skins remain
personal browser preferences, while the selected rule world determines the
board, prices, card decks, player pieces and lobby defaults for everybody at
the table.

`RuleWorldConfig` supports these fields:

- `id`, `name`: required stable identifier and display name.
- `description`, `visualId`: optional copy and suggested visual skin.
- `board`: optional complete 40-space ring. Every tile has an index, name and
  kind; ownable and tax tiles additionally define their prices, rents, build
  costs or tax amount.
- `cards`: optional Fortune and Ledger decks using the shared `CardEffect`
  variants.
- `tokens`: optional list of two to eight unique figure keys, assigned by seat.
- `settings`: optional starting cash, salary, auction, building, holding-yard,
  timer, supply and player-limit rules. The random seed remains server-owned.

Omitted optional fields inherit immutable standard defaults. Call
`validateRuleWorld(config)` before using external configuration; it returns the
fully resolved package or one combined, player-readable validation error.

The complete `CLOCKWORK_WORLD_CONFIG` example in
`packages/shared/src/data/worlds.ts` contains 40 custom spaces and demonstrates
every configuration area. Small built-in visual worlds intentionally omit rule
data to demonstrate stable fallback behaviour.
