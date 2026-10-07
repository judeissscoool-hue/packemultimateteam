/* Confirmed player aliases for identity-aware draft rules. Card IDs and display
   names remain separate; suffixes are never stripped from unrelated players. */
(function (root) {
  const aliases = Object.freeze({
    "Robert Williams": "Robert Williams III",
    "KJ Martin": "Kenyon Martin Jr."
  });

  function key(cardOrName) {
    const name = typeof cardOrName === "string" ? cardOrName : cardOrName?.name ?? cardOrName?.n;
    if (typeof name !== "string" || !name.length) throw new Error("Invalid player identity");
    return Object.prototype.hasOwnProperty.call(aliases, name) ? aliases[name] : name;
  }

  root.ATUPlayerIdentityV1 = Object.freeze({ key });
})(globalThis);
