import {CARDS as ALL,DUOS,HISTORY_CARD_IDS as IDS} from "../atu-data-v1.js";
const allowed=new Set(IDS);export const CARDS=ALL.filter(c=>allowed.has(c.id));export {DUOS};
