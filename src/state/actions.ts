/* Every state change goes through here. */
import type { Equipment } from "../data/catalog";
import { update } from "./store";

export function toggleEquipment(e: Equipment) {
  update((s) => {
    const has = s.settings.equipment.includes(e);
    s.settings.equipment = has ? s.settings.equipment.filter((x) => x !== e) : [...s.settings.equipment, e];
  });
}
