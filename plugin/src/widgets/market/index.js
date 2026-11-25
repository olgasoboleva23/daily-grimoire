// The dashboard shopping list, with its add button and catalog watches.
import { MARKET_NOTE, MARKET_RECORDS } from "#/shared/config/index.js";
import CelestialMarket from "./ui/index.vue";
import CelestialMarketAdd from "./ui/CelestialMarketAdd.vue";
import { loadCelestialMarket } from "./model/store.js";

export { CelestialMarket, CelestialMarketAdd };

export const celestialMarket = {
  view: CelestialMarket, load: loadCelestialMarket, cardButton: CelestialMarketAdd,
  watches: [MARKET_NOTE, MARKET_RECORDS],
};
