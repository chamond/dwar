import { manualPrice } from "../src/domain/orange-price.js";
export function fixturePrice(value = "200") {
  return manualPrice(value);
}
