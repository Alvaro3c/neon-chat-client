// ── MSN Messenger Emoticons ────────────────────────────────────────────────
// Complete shortcode → emoticon mapping, plus helpers for rendering.
//
// EMOTICONS_SORTED is sorted longest-shortcode-first so greedy matching
// always picks the longest match (e.g. `:'(` before `:(`, `:^)` before `:)`).

export const EMOTICONS = [
  // ── Faces ──────────────────────────────────────────────────────────────────
  { shortcode: ':)',    filename: 'smile',                  name: 'Smile',                animated: false },
  { shortcode: ':D',    filename: 'open-mouthed-smile',     name: 'Open-mouthed smile',   animated: false },
  { shortcode: ';)',    filename: 'winking-smile',          name: 'Winking smile',        animated: true  },
  { shortcode: ':-O',   filename: 'surprised-smile',        name: 'Surprised smile',      animated: false },
  { shortcode: ':P',    filename: 'smile-with-tongue-out',  name: 'Smile with tongue out',animated: false },
  { shortcode: '(H)',   filename: 'hot-smile',              name: 'Hot smile',            animated: false },
  { shortcode: ':@',    filename: 'angry-smile',            name: 'Angry smile',          animated: false },
  { shortcode: ':$',    filename: 'embarrassed-smile',      name: 'Embarrassed smile',    animated: false },
  { shortcode: ':S',    filename: 'confused-smile',         name: 'Confused smile',       animated: false },
  { shortcode: ':(',    filename: 'sad-smile',              name: 'Sad smile',            animated: false },
  { shortcode: ":'(",   filename: 'crying-face',            name: 'Crying face',          animated: true  },
  { shortcode: ':|',    filename: 'disappointed-smile',     name: 'Disappointed smile',   animated: false },
  { shortcode: ':[',    filename: 'vampire-bat',            name: 'Vampire bat',          animated: true  },
  { shortcode: ':^)',   filename: 'i-dont-know-smile',      name: "I don't know smile",   animated: true  },
  { shortcode: '*-)',   filename: 'thinking-smile',         name: 'Thinking smile',       animated: true  },
  { shortcode: '8-)',   filename: 'eye-rolling-smile',      name: 'Eye-rolling smile',    animated: true  },
  { shortcode: '|-)',   filename: 'sleepy-smile',           name: 'Sleepy smile',         animated: true  },
  { shortcode: '8-|',   filename: 'nerd-smile',             name: 'Nerd smile',           animated: false },
  { shortcode: '8o|',   filename: 'baring-teeth-smile',     name: 'Baring teeth smile',   animated: false },
  { shortcode: '^o)',   filename: 'sarcastic-smile',        name: 'Sarcastic smile',      animated: false },
  { shortcode: ':-*',   filename: 'secret-telling-smile',   name: 'Secret telling smile', animated: false },
  { shortcode: ':-#',   filename: 'dont-tell-anyone-smile', name: "Don't tell anyone",    animated: false },
  { shortcode: '+o(',   filename: 'sick-smile',             name: 'Sick smile',           animated: false },
  { shortcode: '<:o)',  filename: 'party-smile',            name: 'Party smile',          animated: true  },
  // ── Symbols / objects ──────────────────────────────────────────────────────
  { shortcode: '(6)',   filename: 'devil',                  name: 'Devil',                animated: false },
  { shortcode: '(A)',   filename: 'angel',                  name: 'Angel',                animated: false },
  { shortcode: '(L)',   filename: 'red-heart',              name: 'Red heart',            animated: false },
  { shortcode: '(U)',   filename: 'broken-heart',           name: 'Broken heart',         animated: false },
  { shortcode: '(M)',   filename: 'messenger',              name: 'Messenger',            animated: false },
  { shortcode: '(@)',   filename: 'cat-face',               name: 'Cat face',             animated: false },
  { shortcode: '(&)',   filename: 'dog-face',               name: 'Dog face',             animated: false },
  { shortcode: '(S)',   filename: 'sleeping-half-moon',     name: 'Sleeping half-moon',   animated: false },
  { shortcode: '(*)',   filename: 'star',                   name: 'Star',                 animated: false },
  { shortcode: '(~)',   filename: 'filmstrip',              name: 'Filmstrip',            animated: false },
  { shortcode: '(8)',   filename: 'note',                   name: 'Note (music)',         animated: false },
  { shortcode: '(E)',   filename: 'e-mail',                 name: 'E-mail',               animated: false },
  { shortcode: '(F)',   filename: 'red-rose',               name: 'Red rose',             animated: false },
  { shortcode: '(W)',   filename: 'wilted-rose',            name: 'Wilted rose',          animated: false },
  { shortcode: '(O)',   filename: 'clock',                  name: 'Clock',                animated: false },
  { shortcode: '(K)',   filename: 'red-lips',               name: 'Red lips',             animated: false },
  { shortcode: '(G)',   filename: 'gift-with-a-bow',        name: 'Gift with a bow',      animated: false },
  { shortcode: '(^)',   filename: 'birthday-cake',          name: 'Birthday cake',        animated: true  },
  { shortcode: '(P)',   filename: 'camera',                 name: 'Camera',               animated: false },
  { shortcode: '(I)',   filename: 'light-bulb',             name: 'Light bulb',           animated: false },
  { shortcode: '(C)',   filename: 'coffee-cup',             name: 'Coffee cup',           animated: false },
  { shortcode: '(T)',   filename: 'telephone-receiver',     name: 'Telephone receiver',   animated: false },
  { shortcode: '({)',   filename: 'left-hug',               name: 'Left hug',             animated: false },
  { shortcode: '(})',   filename: 'right-hug',              name: 'Right hug',            animated: false },
  { shortcode: '(B)',   filename: 'beer-mug',               name: 'Beer mug',             animated: false },
  { shortcode: '(D)',   filename: 'martini-glass',          name: 'Martini glass',        animated: false },
  { shortcode: '(Z)',   filename: 'boy',                    name: 'Boy',                  animated: false },
  { shortcode: '(X)',   filename: 'girl',                   name: 'Girl',                 animated: false },
  { shortcode: '(Y)',   filename: 'thumbs-up',              name: 'Thumbs up',            animated: false },
  { shortcode: '(N)',   filename: 'thumbs-down',            name: 'Thumbs down',          animated: false },
  { shortcode: '(#)',   filename: 'sun',                    name: 'Sun',                  animated: false },
  { shortcode: '(R)',   filename: 'rainbow',                name: 'Rainbow',              animated: false },
  { shortcode: '(li)',  filename: 'lightning',              name: 'Lightning',            animated: true  },
  // ── Animals / food / misc ──────────────────────────────────────────────────
  { shortcode: '(nnh)', filename: 'goat',                   name: 'Goat',                 animated: false },
  { shortcode: '(sn)',  filename: 'snail',                  name: 'Snail',                animated: false },
  { shortcode: '(tu)',  filename: 'turtle',                 name: 'Turtle',               animated: false },
  { shortcode: '(pl)',  filename: 'plate',                  name: 'Plate',                animated: false },
  { shortcode: '(||)',  filename: 'bowl',                   name: 'Bowl',                 animated: false },
  { shortcode: '(pi)',  filename: 'pizza',                  name: 'Pizza',                animated: false },
  { shortcode: '(so)',  filename: 'soccer-ball',            name: 'Soccer ball',          animated: false },
  { shortcode: '(au)',  filename: 'auto',                   name: 'Auto',                 animated: false },
  { shortcode: '(ap)',  filename: 'airplane',               name: 'Airplane',             animated: false },
  { shortcode: '(um)',  filename: 'umbrella',               name: 'Umbrella',             animated: false },
  { shortcode: '(ip)',  filename: 'island-with-a-palm-tree',name: 'Island',               animated: false },
  { shortcode: '(co)',  filename: 'computer',               name: 'Computer',             animated: false },
  { shortcode: '(mp)',  filename: 'mobile-phone',           name: 'Mobile phone',         animated: false },
  { shortcode: '(brb)', filename: 'be-right-back',          name: 'Be right back',        animated: false },
  { shortcode: '(st)',  filename: 'storm-cloud',            name: 'Storm cloud',          animated: false },
  { shortcode: '(h5)',  filename: 'high-five',              name: 'High five!',           animated: false },
  { shortcode: '(mo)',  filename: 'money',                  name: 'Money',                animated: false },
  { shortcode: '(bah)', filename: 'black-sheep',            name: 'Black sheep',          animated: false },
  { shortcode: "('.')", filename: 'bunny',                  name: 'Bunny',                animated: false },
]

/**
 * EMOTICONS_SORTED: sorted by shortcode length descending.
 * Ensures greedy matching: longer codes win before shorter ones that share a
 * common prefix (e.g. `:'(` before `:(`, `8-)` before `8-|`).
 */
export const EMOTICONS_SORTED = [...EMOTICONS].sort(
  (a, b) => b.shortcode.length - a.shortcode.length,
)

export const EMOTICONS_BASE_PATH = '/assets/emoticons/msn-emoticons/original'

/** Returns the URL for an emoticon image (.png — works for both static and APNG). */
export function getEmoticonSrc(filename) {
  return `${EMOTICONS_BASE_PATH}/${filename}.png`
}

/**
 * Parses a plain-text string into an array of tokens:
 *   { type: 'text',     value: string }
 *   { type: 'emoticon', shortcode, filename, name, animated }
 *
 * Greedy: longest shortcode wins when multiple match at the same position.
 * Earliest: the leftmost shortcode in the string is consumed first.
 */
export function parseEmoticons(text) {
  if (!text) return []
  const tokens = []
  let remaining = text

  while (remaining.length > 0) {
    let bestIdx      = Infinity
    let bestEmoticon = null

    for (const em of EMOTICONS_SORTED) {
      const idx = remaining.indexOf(em.shortcode)
      if (idx !== -1 && idx < bestIdx) {
        bestIdx      = idx
        bestEmoticon = em
        if (idx === 0) break // can't be earlier; longest-first sort → best match
      }
    }

    if (bestEmoticon === null) {
      tokens.push({ type: 'text', value: remaining })
      break
    }

    if (bestIdx > 0) {
      tokens.push({ type: 'text', value: remaining.slice(0, bestIdx) })
    }
    tokens.push({ type: 'emoticon', ...bestEmoticon })
    remaining = remaining.slice(bestIdx + bestEmoticon.shortcode.length)
  }

  return tokens
}
