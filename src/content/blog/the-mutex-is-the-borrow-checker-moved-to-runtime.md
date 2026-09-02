---
title: "The Mutex Is the Borrow Checker, Moved to Runtime"
description: "Rust's rule against shared mutable state doesn't relax once you add threads. It just changes who enforces it — and gains a second rule deciding who's allowed to cross the thread boundary at all."
date: 2026-08-29
tags: ["rust", "concurrency", "systems", "async"]
draft: false
---

Say you're processing a queue of jobs, and you want a few worker threads
pulling from it at once instead of one thread grinding through it serially.
You'll also want to know, at the end, how many jobs got done — so you reach
for the obvious thing, a shared counter:

```rust
let mut completed = 0;

for _ in 0..4 {
    std::thread::spawn(|| {
        // do some work, then...
        completed += 1; // ❌ won't compile
    });
}
```

This doesn't build, and the instinct most people have at this point is that
concurrency is where Rust's famous safety rules step aside — that threads are
a separate, looser world where the borrow checker can't reach, and you're
back to being careful by hand the way you would be in C. That instinct is
wrong, and it's worth being precise about *why*, because the real answer is
more useful than "it's just stricter here too":

> The rule doesn't relax. It moves — from something the compiler checks in
> your source, to something a runtime primitive checks while your program
> is actually running. And a second, separate rule shows up to decide who's
> even allowed to try.

Everything below is that one idea, worked through with the job counter as
the running example.

## Why the naive counter doesn't compile

The error above isn't really about threads yet — it's about ownership. A
value has exactly one owner, and `std::thread::spawn` takes a closure that
has to *own* everything it touches, because the spawned thread might still
be running after the function that created it returns. You can't hand the
plain variable `completed` to four different closures — a move only goes to
one place. So before you can even ask "is it safe to increment this from
four threads," you have to answer a more basic question: how do four
threads own the same thing at all?

## Shared ownership: `Arc<T>`

`Arc<T>` — atomically reference-counted — is the answer. Cloning an `Arc`
doesn't copy the data underneath; it atomically bumps a counter, and every
clone points at the same allocation. When the last clone is dropped, the
counter hits zero and the data is freed:

```rust
use std::sync::Arc;

let completed = Arc::new(0);
let handle = Arc::clone(&completed);

std::thread::spawn(move || {
    println!("{handle}"); // a valid, shared owner, now living in this thread
});
```

Rust also has a single-threaded version of this, `Rc<T>`, that's cheaper
because it skips the atomic operations. Try to move an `Rc` — not an `Arc`
— into `thread::spawn`, and it refuses to compile. This isn't a style
nitpick: `Rc`'s reference count isn't atomic, so two threads bumping it at
the same instant would corrupt the count, and the standard library
[explicitly documents](https://doc.rust-lang.org/std/marker/trait.Send.html)
that this is undefined behavior if it happened. `Rc<T>` simply doesn't
implement a marker trait called `Send` — "safe to move to another thread" —
and `thread::spawn` requires its captured data to be `Send`. Pick the wrong
sharing primitive, and the compiler catches it before your program ever
runs, not after it's been misbehaving in production for a week.

`Send` is worth sitting with for a second, because it's not a special
concurrency-only concept — it's an ordinary trait, the same mechanism
Rust uses for `Clone` or `Debug`, just with nothing to implement and a
compiler that tracks it automatically based on what a type contains. It
answers exactly one question — *can this cross a thread boundary?* — and
until now you've never had to think about it, because everything you write
in single-threaded code trivially can.

## `Arc` alone still can't mutate anything

Here's the part that trips people up. `Arc::clone` only ever hands out a
shared reference to what's inside — never a mutable one. That's not a
missing feature; it's the same rule you already know, just showing up
somewhere new: if `Arc` handed two threads a mutable reference to the same
data at once, that's exactly the aliasing violation the compiler forbids in
single-threaded code, and here the compiler has no way to prove the two
threads won't touch it at the same instant. So `Arc<u64>` is permanently
read-only. To mutate shared data, you need a type built specifically to
allow that through a shared reference — that's called **interior
mutability**, and the ordinary tool for it is `Mutex<T>`:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

let completed = Arc::new(Mutex::new(0u64));
let mut handles = Vec::new();

for _ in 0..4 {
    let handle = Arc::clone(&completed);
    handles.push(thread::spawn(move || {
        // ... do the job ...
        let mut count = handle.lock().unwrap();
        *count += 1;
    })); // the lock releases here, when `count` goes out of scope
}

for h in handles {
    h.join().unwrap();
}

println!("completed: {}", *completed.lock().unwrap());
```

`.lock()` blocks the calling thread until it can get exclusive access, then
hands back a guard that behaves like a mutable reference. This is the exact
same rule as before — *shared reads or one exclusive writer, never both* —
just enforced by an actual lock instead of a compile-time check, because
across threads the compiler genuinely cannot know which one runs when. And
the guard unlocking automatically the moment it goes out of scope isn't an
extra feature bolted on — it's the ordinary Rust rule that a value's
resources are released deterministically when it's dropped, [applied to a
lock](https://doc.rust-lang.org/std/sync/struct.Mutex.html) instead of a
file handle or a heap allocation. There's no code path where you forget to
unlock, because unlocking was never a separate step you had to remember.

*(A quick housekeeping note on that `.unwrap()` after `.lock()`: it's there
because `lock()` returns a `Result` that's only an `Err` if another thread
panicked while holding the same lock — a state that should be rare and
usually indicates a bug elsewhere. `.unwrap()` throughout this post is for
clarity, not a style you should carry into real code: production code
should decide deliberately what a poisoned lock or a failed job means for
its caller, and propagate that as a real error rather than panicking on the
spot.)*

## When most of the traffic is reads: `RwLock<T>`

A plain `Mutex` treats reads and writes identically — even two threads that
only want to *check* the counter have to take turns. If your shared state
is read constantly and written rarely — say, a "max retries" setting the
workers check before every job, occasionally adjusted by an operator —
`RwLock<T>` is the closer match: many readers at once, *or* one exclusive
writer, never both.

```rust
use std::sync::{Arc, RwLock};

let max_retries = Arc::new(RwLock::new(3u32));

let reader = Arc::clone(&max_retries);
let limit = *reader.read().unwrap(); // any number of threads can hold a read lock together

let writer = Arc::clone(&max_retries);
*writer.write().unwrap() = 5; // this one blocks until every reader has finished
```

It's the identical rule as `Mutex`, just letting the *shared* half of
"shared reads or one exclusive writer" actually run concurrently instead of
serializing everyone.

## The other philosophy: don't share state, pass messages

Locks are one way to let threads cooperate, but they're not the only way,
and Rust's standard library ships a genuinely different model alongside
them: instead of multiple threads reaching into the same memory, one thread
owns the data outright, and other threads hand it *messages*. The
`std::sync::mpsc` module (multi-producer, single-consumer) implements this
as a channel — a sender half and a receiver half:

```rust
use std::sync::mpsc;
use std::thread;

let (tx, rx) = mpsc::channel();

for id in 0..4 {
    let tx = tx.clone();
    thread::spawn(move || {
        // ... do the job ...
        tx.send(id).unwrap(); // ownership of the value moves into the channel
    });
}
drop(tx); // drop the original sender so the receiver knows when senders are all done

for completed_id in rx {
    println!("worker {completed_id} finished");
}
```

Sending a value moves ownership of it into the channel — you can't send a
value and then keep using it afterward, the same move rule as everywhere
else in Rust, just crossing a thread boundary this time. There's no shared
memory here at all, so there's nothing to lock. The [Rust
documentation](https://doc.rust-lang.org/book/ch16-02-message-passing.html)
borrows a line from Go's design philosophy to describe this approach: *"Do
not communicate by sharing memory; instead, share memory by
communicating."* Locks and channels aren't competing solutions to the same
problem — a `Mutex`-guarded counter suits tightly-coupled shared bookkeeping
that many threads touch constantly, and a channel suits independent workers
that occasionally need to hand something off to one place.

## The same rule shows up again in async code

If you've written async Rust with a runtime like Tokio, you've probably hit
an error demanding that a spawned task be `Send` — the exact same trait
from earlier in this post, in a context that has nothing to do with
`thread::spawn`. It's not a coincidence, and it's worth being precise about
the connection rather than waving at it.

An async runtime with multiple worker threads doesn't necessarily run a
given task start-to-finish on one OS thread. A task can be suspended at an
`.await` point and resumed on a *different* worker thread than the one it
started on — that's how the runtime keeps every thread busy instead of one
thread idling on a task that's waiting on I/O. [Tokio's own
documentation](https://tokio.rs/tokio/tutorial/spawning) explains that this
is precisely why tasks spawned onto its runtime are required to implement
`Send`: it's what lets the runtime relocate a suspended task to a different
worker thread instead of pinning it to the one that spawned it. Concretely,
whatever state a task holds *across* an `.await` — the values that have to
survive being paused and picked back up elsewhere — has to be safe to move
to another thread, for the identical reason an `Arc` had to be `Send` to
cross into `thread::spawn` in the first place.

So the mechanism doesn't stop applying just because the concurrency looks
different on the surface. OS threads and an async task scheduler are two
different ways of deciding who runs what, when — but both of them, the
moment they might move your data to a different thread, ask the same
compiler question first: is this actually safe to move?

## The whole thing on one page

| Tool | What it solves |
| --- | --- |
| **`Arc<T>`** | Shared ownership across threads — the "one owner" rule, generalized to one *set* of owners |
| **`Send`** | Compile-time gate: is this type even safe to move to another thread? |
| **`Mutex<T>`** | Exclusive read-write access, one thread at a time, enforced at runtime |
| **`RwLock<T>`** | Many concurrent readers, or one exclusive writer, enforced at runtime |
| **`mpsc` channels** | No shared memory at all — ownership moves through messages instead |
| **`Send` in async** | The same gate, applied by a task scheduler instead of `thread::spawn` |

## The takeaway

Nothing about adding a thread turns off the rule that shared mutable data
needs exactly one writer at a time. What changes is *where* that rule gets
enforced, and *what new question* gets asked before it applies. Within one
thread, the compiler proves the rule holds by reading your code. Across
threads, where the compiler can no longer know the timing, the same
guarantee gets handed to a runtime lock — and a second rule, `Send`, checks
upfront whether a value is even eligible to make the trip. Once you see it
that way, a `Mutex` stops looking like a separate, harder discipline layered
on top of ownership, and starts looking like what it actually is: the exact
same discipline, just paid for at a different time.
