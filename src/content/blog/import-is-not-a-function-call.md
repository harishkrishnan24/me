---
title: "Import Is Not a Function Call"
description: "require() and import look like two spellings of the same thing. They aren't. One is a function call and one is a declaration — and that single difference explains live bindings, link-time errors, the browser's request waterfall, and why bundlers exist at all."
date: 2026-10-01
tags: ["javascript", "modules", "esm", "build-tools"]
draft: false
---

Say you have a shop. One file owns the cart:

```js
// cart.js
let itemCount = 0;
function addItem() { itemCount++; }
```

Another file draws the header, and it wants to show `Cart (2)` in the top
bar. So the header needs the cart. You can write that need two ways:

```js
const { itemCount, addItem } = require('./cart');   // CommonJS
import { itemCount, addItem } from './cart.js';     // ES modules
```

Most of us treat these as two spellings of the same idea — old style and new
style, pick whichever your tooling wants. That's the belief I want to break,
because it hides the most useful fact about JavaScript modules:

> `require()` is a function call. `import` is a declaration.

One runs when the line runs. The other is read before *any* line runs. Nearly
everything else — why exported values go stale in one system and not the
other, why a typo is silent in one and fatal in the other, why the browser
fires requests in waves, why bundlers exist — falls out of that one
difference. We'll keep the cart and the header the whole way through.

## First, the problem modules solve

Before modules, a page loaded code with plain script tags, and files talked
through globals:

```html
<script src="cart.js"></script>    <!-- sets window.itemCount -->
<script src="header.js"></script>  <!-- reads window.itemCount -->
```

Swap those two lines and the header reads a variable that doesn't exist yet.
Nothing in `header.js` says "I need the cart" — the dependency lives only in
the order of the HTML. A second file that also declares `itemCount` silently
overwrites the first. Everything is public to everyone.

A module system fixes this by giving each file its own private scope, and
letting it state what it *exports* and what it *imports*. A loader then uses
those statements to load files in the right order. The interesting question —
the one that splits the module systems apart — is **when** the loader finds
out what a file needs.

## `require()` is a function call

In CommonJS, the module system Node.js started with, `require('./cart')` is
an ordinary function call. When that line executes, Node:

1. resolves the path to a file on disk,
2. returns the cached exports if the file has already been loaded,
3. otherwise reads the file, wraps it in a function so its variables stay
   private, runs it, caches `module.exports`, and returns it.

The caller waits for all of that. It's synchronous, and it happens at the
exact line where you wrote it:

```js
// a.js
console.log('main: before require');
require('./b');           // b.js just logs 'b: running'
console.log('main: after require');
```

```text
main: before require
b: running
main: after require
```

Exactly what you'd expect from a function call. Now the cart:

```js
// cart.cjs
let itemCount = 0;
function addItem() { itemCount++; }
module.exports = { itemCount, addItem };
```

```js
// header.cjs
const { itemCount, addItem } = require('./cart.cjs');
addItem(); addItem();
console.log('CJS itemCount:', itemCount);
```

```text
CJS itemCount: 0
```

Two items added, and the header still says zero. Look at the last line of the
cart: `module.exports = { itemCount, addItem }` builds a **new object**, and
that object gets a copy of whatever number was in `itemCount` at that moment —
zero. The cart's private variable goes on to become 2. The property on the
exports object never changes. The header is holding a snapshot.

And because `module.exports` is just an object, asking for a name that isn't
there is just reading a missing property:

```js
const { itemCnt } = require('./cart.cjs');   // typo
console.log(itemCnt);                         // undefined — no error
```

The bug surfaces later, somewhere far from the typo.

> **Without a declared dependency list:** the loader can't know what a file
> needs until it runs the file.

## The wall: a function call can't wait for the network

On a server, step 3 above is a disk read — microseconds. Making the caller
wait is free.

In a browser, "read the file" is an HTTP request. Tens to hundreds of
milliseconds. And `require` has to hand back the value *on that line*. The
only way to do that over a network is to stop all JavaScript — freeze the
page — until the response arrives. That's not a real option, so CommonJS
simply cannot run as-is in a browser.

There were two ways around the wall, and both are still with us:

- **Make loading asynchronous.** Change the format so a file declares its
  dependencies up front and hands over a callback to run once they've
  arrived. That was AMD, and later, built into the language, ES modules.
- **Take the network out of loading.** Combine every file into one before the
  browser ever sees it, so each `require` becomes a lookup in memory. That's a
  bundler.

AMD — Asynchronous Module Definition, popularised by RequireJS — looked like
this:

```js
define(['cart'], function (cart) {
  // runs only after cart.js has arrived and run
  return { render: () => 'Cart (' + cart.getCount() + ')' };
});
```

The dependencies are a list of strings, known before the factory runs. The
loader injects a script tag for each one, waits, then calls back. You'll rarely
write this today, but you'll still meet it inside UMD wrappers in older
packages, and it carries the idea that ES modules made official: **know the
dependencies before you run the code.**

## `import` is a declaration

An `import` statement is not something that executes. It's a declaration, the
same family as `function` or `class`. That means the engine can find every
import in a file just by *parsing* it — before running a single line.

The price is that imports have to be static. Top level only, fixed string
path:

```js
if (true) { import { x } from './b.mjs'; }
```

```text
SyntaxError: Unexpected token '{'
```

That restriction is the whole point. Because the imports are visible without
running anything, the engine loads an ES module graph in three separate
phases:

1. **Construction** — fetch a file, parse it, read its imports, fetch those,
   and so on until the whole graph is in hand. No module code runs.
2. **Linking** — for every export, create a slot. Wire every import to the
   slot it names. Still no module code runs.
3. **Evaluation** — now run the code, dependencies before the files that
   depend on them, each module once.

CommonJS mixes all three into one step per file. ES modules keep them apart,
and each phase leaves a fingerprint you can see.

**Dependencies run first, regardless of where the import line sits.** Same
test as before, with the log *above* the import:

```js
// a.mjs
console.log('main: before import');
import './b.mjs';
console.log('main: after import');
```

```text
b: running
main: before import
main: after import
```

People call this "hoisting," which is true but hides the mechanism: both
files were fetched and linked before anything ran, and evaluation always runs
a dependency before the file that imports it. The line number of the import
doesn't matter.

**A missing name fails before any code runs.** The same typo as earlier — and
note the first line, which would print if anything executed:

```js
console.log('this line never prints');
import { itemCnt } from './cart.mjs';
```

```text
SyntaxError: The requested module './cart.mjs' does not provide an export named 'itemCnt'
```

Linking looked for a slot called `itemCnt`, didn't find one, and the entire
graph refused to start. Compare that to CommonJS's quiet `undefined`.

**Imports are live bindings, not copies.** Here's the cart as an ES module:

```js
// cart.mjs
console.log('cart.mjs evaluated');
export let itemCount = 0;
export function addItem() { itemCount++; }
```

```js
// header.mjs
import { itemCount, addItem } from './cart.mjs';
import './cart.mjs';                        // the same module again
addItem(); addItem();
console.log('ESM itemCount:', itemCount);
const again = await import('./cart.mjs');   // and once more, dynamically
console.log('import() again, itemCount:', again.itemCount);
```

```text
cart.mjs evaluated
ESM itemCount: 2
import() again, itemCount: 2
```

During linking, the header's `itemCount` was wired to the **same slot** as the
cart's variable. There is no copy to go stale. When the cart increments, the
header sees it. (The header can't assign to it — an import is a read-only view;
only the exporting module can change the value.)

**Each module is evaluated once.** Look at that output again. `cart.mjs` was
imported three times and printed `cart.mjs evaluated` once. The engine keeps a
module map keyed by the resolved URL; the same URL gives you back the same
instance. Hold onto that — it comes back at the end.

## The escape hatch: `import()`

Static imports are great until you only know at runtime what you need — load
the checkout code only when someone clicks *Checkout*, say. For that, ES
modules have `import()`. It looks like a function call, and it returns a
Promise:

```js
const p = import('./cart.mjs');
console.log('import() returns:', p instanceof Promise ? 'a Promise' : typeof p);
const cart = await p;
console.log('keys:', Object.keys(cart));
```

```text
import() returns: a Promise
cart.mjs evaluated
keys: [ 'addItem', 'itemCount' ]
```

The Promise came back *before* the cart was evaluated. Nothing waited on that
line. So unlike `require`, this works fine over a network — and it's the
primitive underneath every lazy-loaded route and code-split chunk you've used.

## In the browser, every import is a request

You turn ES modules on in a browser with `type="module"`. Three things change
from a classic script. Module scripts are deferred automatically, so they run
after the HTML is parsed. They run in strict mode. And bare names like
`'react'` mean nothing to a browser — only URLs do — unless an **import map**
says where a name points.

I put a small graph on a local server to watch this happen. The page:

```html
<script type="importmap">{ "imports": { "greet": "./lib/greet.js" } }</script>
<script>console.log('classic script runs first')</script>
<script type="module" src="./main.js"></script>
<p id="out">waiting</p>
```

```js
// main.js
import { greet } from 'greet';        // bare name, resolved by the import map
import { shout } from './shout.js';
document.getElementById('out').textContent = shout(greet('cart'));
console.log('main.js ran; #out found =', !!document.getElementById('out'));
```

`greet.js` in turn imports `./prefix.js`. The module script tag sits *above*
the `<p>` it writes into — and it still finds it, because it's deferred:

```text
classic script runs first
main.js ran; #out found = true
```

Now the interesting part. Here's what the browser's Resource Timing API
reported for those four files:

| File            | Requested (ms) | Arrived (ms) |
| --------------- | -------------: | -----------: |
| `main.js`       |             65 |           71 |
| `lib/greet.js`  |             71 |           73 |
| `shout.js`      |             71 |           73 |
| `lib/prefix.js` |             73 |           74 |

Four files, three waves. `greet.js` and `shout.js` couldn't be requested until
`main.js` had arrived and been parsed — that's the only way the browser learns
they exist. `prefix.js` had to wait for `greet.js`. Construction discovers the
graph one level at a time:

> The depth of the import graph is the number of network round trips before
> your code can start.

On localhost a wave costs a millisecond, so you never notice. Over a real
network each wave costs at least one round trip, and breadth hurts too. Vite's
docs give a blunt example: `lodash-es` has over 600 internal modules, and
importing it unbundled makes the browser fire off 600+ requests at once.

That's the real job of a bundler. It can read your whole graph at build time —
it can, *because* imports are static declarations — and write out a few files
the browser fetches in one or two waves instead of many. Even Vite, whose dev
server deliberately serves your own source as native modules, pre-bundles
dependencies like `lodash-es` into a single file for exactly this reason.

## Mixing the two today

Most real projects contain both formats; a lot of npm is still CommonJS.

**ES modules importing CommonJS** works. Node hands you `module.exports` as the
default export, and also tries to detect named exports by statically analysing
the CommonJS source. Those detected names are snapshots, not live bindings —
the CommonJS semantics leak through.

**CommonJS `require()`-ing an ES module** was impossible for years, for the
reason this whole post is about: `require` is synchronous, and ES module
loading can be asynchronous. Node now allows it without a flag, from v22.12.0
and v20.19.0 — as long as the module graph is fully synchronous. If that
module, or anything it imports, uses top-level `await`, `require()` throws
`ERR_REQUIRE_ASYNC_MODULE`, and you have to use `import()` instead. The
function call still can't wait.

Bundlers paper over the mix too. Webpack accepts ES modules, CommonJS, and AMD
in the same graph. Vite converts CommonJS and UMD dependencies to ES modules
before serving them, because its dev server speaks native ESM only.

## One URL, one instance

Remember that the module map is keyed by URL, and the same URL gives back the
same instance? That's what lets a whole page share one `itemCount` — and one
React. It's also the root of a classic bug: if two parts of an app end up
importing React from two *different* resolved locations, you get two
instances, each with its own internal state, and hooks fail with React's
"Invalid hook call" error, which lists duplicate copies of React as one of its
causes. Nothing is wrong with your hooks. The module system did exactly what
it promises: different URL, different module.

This gets sharper when separately built and deployed bundles share a page, as
they do in micro-frontend setups — which is why tools in that space spend so
much configuration on making every piece resolve shared libraries to a single
instance.

## The whole thing on one page

|                            | CommonJS                     | AMD                          | ES modules                         |
| -------------------------- | ---------------------------- | ---------------------------- | ---------------------------------- |
| **Syntax**                 | `require` / `module.exports` | `define([deps], factory)`    | `import` / `export`                |
| **An import is a…**        | function call                | string list + callback       | declaration                        |
| **When it loads**          | synchronously, at that line  | asynchronously, then callback | whole graph first, then run       |
| **Graph known up front?**  | no                           | yes                          | yes                                |
| **Exported values**        | copied at export time        | whatever the factory returns | live bindings                      |
| **Missing export**         | silent `undefined`           | silent `undefined`           | error before any code runs         |
| **Native in the browser?** | no                           | via a loader                 | yes                                |

## The takeaway

`require()` asks for a file at the moment a line runs. `import` tells the
engine what a file needs before anything runs. That's the entire difference,
and it isn't cosmetic.

Because `require` is a call, it must finish on its line — fine from a disk,
impossible over a network — and it hands you whatever the exports object held
at that moment. Because `import` is a declaration, the engine can build the
whole graph first, wire every name to a live slot, reject a typo before your
code starts, and let a bundler see your entire program without running it. The
same property gives you the browser's request waterfall, and the bundler that
flattens it.

So the next time a CommonJS value looks stale, or a missing export kills a
page before line one, or the network tab shows your modules arriving in waves,
you'll know where to look: at the moment the dependency becomes known.
