// A reward bought from the shop page plays its sound and reports the result.
import { Notice } from "obsidian";
import { ASSETS } from "#/shared/config/index.js";
import { AudioEngine } from "#/shared/lib/sounds.js";
import { logPurchase } from "../operation/logPurchase.js";

const star = new AudioEngine(`${ASSETS}/star.wav`);

export async function buy(name, cost) {
  void star.play();
  const bought = await logPurchase(name, cost);
  new Notice(bought ? `✨ Bought ${name} for ${cost} gold` : `✦ Not enough gold for ${name}`);
  return bought;
}
