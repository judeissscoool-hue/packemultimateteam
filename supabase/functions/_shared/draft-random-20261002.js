/* Replayable draft randomness, frozen v1. ChaCha20 follows RFC 8439 section 2.3.
   The draft seed is the full 256-bit key. Separate nonce streams keep shuffling,
   rarity, player and version draws independent of one another's consumption. */
(function (root) {
  const WORD_RANGE = 4294967296;
  const MAX_WORDS = WORD_RANGE * 16;
  const require = (condition, message) => { if (!condition) throw new Error(message); };

  function hexBytes(hex, length, label) {
    require(typeof hex === "string" && hex.length === length * 2 && /^[a-f0-9]+$/i.test(hex), "Invalid " + label);
    return Uint8Array.from({ length }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
  }

  function create(seed, { stream = 0, offset = 0, nonceHex } = {}) {
    require(Number.isInteger(stream) && stream >= 0 && stream <= 3, "Invalid draft random stream");
    require(Number.isSafeInteger(offset) && offset >= 0 && offset <= MAX_WORDS, "Invalid draft random offset");
    const key = hexBytes(seed, 32, "draft seed");
    const state = new Uint32Array(16);
    state.set([0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]);
    const keyView = new DataView(key.buffer);
    for (let i = 0; i < 8; i++) state[4 + i] = keyView.getUint32(i * 4, true);
    // nonceHex is available for published-vector verification. Production draft
    // streams use only the fixed stream word followed by two zero words.
    if (nonceHex !== undefined) {
      const nonce = hexBytes(nonceHex, 12, "draft nonce");
      const nonceView = new DataView(nonce.buffer);
      for (let i = 0; i < 3; i++) state[13 + i] = nonceView.getUint32(i * 4, true);
    } else state[13] = stream;
    let nextOffset = offset, cachedCounter = -1, words;
    const rotate = (value, shift) => ((value << shift) | (value >>> (32 - shift))) >>> 0;

    function block(counter) {
      state[12] = counter;
      const x = new Uint32Array(state);
      const quarter = (a, b, c, d) => {
        x[a] = (x[a] + x[b]) >>> 0; x[d] = rotate(x[d] ^ x[a], 16);
        x[c] = (x[c] + x[d]) >>> 0; x[b] = rotate(x[b] ^ x[c], 12);
        x[a] = (x[a] + x[b]) >>> 0; x[d] = rotate(x[d] ^ x[a], 8);
        x[c] = (x[c] + x[d]) >>> 0; x[b] = rotate(x[b] ^ x[c], 7);
      };
      for (let i = 0; i < 10; i++) {
        quarter(0, 4, 8, 12); quarter(1, 5, 9, 13);
        quarter(2, 6, 10, 14); quarter(3, 7, 11, 15);
        quarter(0, 5, 10, 15); quarter(1, 6, 11, 12);
        quarter(2, 7, 8, 13); quarter(3, 4, 9, 14);
      }
      for (let i = 0; i < 16; i++) x[i] = (x[i] + state[i]) >>> 0;
      return x;
    }

    function uint32() {
      // Never wrap the 32-bit block counter and replay the first block again.
      require(nextOffset < MAX_WORDS, "Draft random stream exhausted");
      const counter = Math.floor(nextOffset / 16);
      if (counter !== cachedCounter) { words = block(counter); cachedCounter = counter; }
      const value = words[nextOffset % 16];
      nextOffset++;
      return value;
    }

    function int(size) {
      require(Number.isSafeInteger(size) && size >= 1 && size <= WORD_RANGE, "Invalid draft random bound");
      // Reject the incomplete final bucket rather than biasing the first items.
      const limit = Math.floor(WORD_RANGE / size) * size;
      let value;
      do { value = uint32(); } while (value >= limit);
      return value % size;
    }

    const random = () => uint32() / WORD_RANGE;
    random.uint32 = uint32;
    random.int = int;
    random.offset = () => nextOffset;
    random.shuffle = items => {
      require(Array.isArray(items), "Invalid draft shuffle items");
      const shuffled = items.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    return random;
  }

  function freshSeed() {
    require(root.crypto && typeof root.crypto.getRandomValues === "function", "Secure draft randomness is unavailable");
    const bytes = new Uint8Array(32);
    root.crypto.getRandomValues(bytes);
    return [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
  }

  root.ATUDraftRandomV1 = Object.freeze({ create, freshSeed });
})(globalThis);
