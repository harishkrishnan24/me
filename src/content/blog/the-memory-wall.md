---
title: "The Memory Wall"
description: "Why a GPU is architected nothing like a CPU, and the one ratio — arithmetic intensity — that tells you whether your code will ever be fast on either."
date: 2026-08-16
tags: ["gpu", "cuda", "systems", "performance"]
draft: false
---

You write:

```c
c[i] = a[i] + b[i];
```

run it across a few million elements on a GPU, and it comes back fast. GPUs
are fast, right? But *why* it's fast — and why a matrix multiply is fast for
an entirely different reason — is where most explanations skip straight to
jargon: warps, occupancy, tensor cores. I want to give you the one idea
underneath all of it first, because once it clicks, the rest stops being
memorized trivia and starts being obvious.

> Doing math is fast. Getting the numbers to do math on is slow.

Everything else in this post is a reaction to that one sentence.

## The gap that shapes every processor

A processor core can add or multiply two numbers in well under a
nanosecond. Those numbers usually live in main memory — DRAM, a chip off to
the side — and fetching a value from there takes on the order of a **hundred
times longer** than the arithmetic itself. In the time one value arrives
from main memory, the core could have finished a few hundred operations.
Left alone, it just waits.

Every trick a CPU has exists to hide that one gap, and all three spend
transistors making a single thread wait less:

- **Caches** keep hot data physically close to the core, so most reads never
  make the slow trip to DRAM.
- **Out-of-order execution** runs later, independent instructions while a
  slow load is in flight, instead of stalling on it.
- **Branch prediction** guesses which way an `if` will go before the
  deciding value has even arrived, and starts running that path early.

> **Without these three tricks:** a CPU core spends most of its life idle,
> waiting on memory, no matter how fast its arithmetic units are.

You already reason about this shape in software, just at a different scale:
a local variable is instant, a call to a remote service or disk is orders of
magnitude slower, and you never let a program sit idle blocked on that call
— you cache the result, or do other work while you wait. A CPU does exactly
those three things, in silicon, for every memory read.

## Two answers to the same problem

A GPU faces the identical memory wall and makes the opposite bet. Instead of
spending its transistor budget hiding the wait for *one* thread, it spends
almost the entire chip on raw arithmetic units — barely any of it on cache
or control logic — and hides the wait some other way entirely. It isn't
built to make one thread fast. It's built to finish an enormous batch of
threads per unit time.

That "some other way" is **oversubscription**: a streaming multiprocessor
keeps far more threads resident than it can run at once, and when one group
stalls on a memory load, it instantly runs a different group that's ready.
If you've worked with a language runtime's scheduler, half of this is
already familiar — a blocked goroutine gets parked, and the scheduler runs
whatever's runnable next. That similarity holds up for about one paragraph.

Two places it breaks, and both matter:

1. **Switching cost.** Parking and resuming a goroutine costs real work —
   saving and restoring state. Swapping a GPU warp costs nothing, because
   every resident warp's registers already sit on-chip at the same time.
   That's the actual reason a GPU can afford thousands of threads where a
   language runtime would think twice about thousands of goroutines.
2. **Independence.** Goroutines each run their own code. GPU threads don't
   get that freedom in groups of 32 — they walk the exact same instruction,
   in lockstep, whether they like it or not.

> **Without oversubscription:** thousands of arithmetic units would sit idle
> waiting on memory, and the entire reason to reach for a GPU evaporates.

The gate question worth carrying into any workload: does it have thousands
of independent, arithmetic-heavy pieces of work? If yes, it belongs on the
throughput machine. If it's a handful of branchy, serial decisions, it
belongs on the machine you already know.

## Addressing one thread among hundreds of thousands

A kernel launches the same function on a huge number of threads at once.
The entire job of the thread hierarchy is to give each of those threads a
unique coordinate, so identical code can act on different data. It's four
levels, and only two are left to the programmer:

| Level      | Who sizes it       | What it can do                                            |
| ---------- | ------------------ | ---------------------------------------------------------- |
| **Thread** | —                  | Runs the kernel body once, on its own data                 |
| **Warp**   | hardware, fixed 32 | The unit that actually executes in lockstep                 |
| **Block**  | the programmer     | Threads share on-chip memory and rendezvous at a barrier    |
| **Grid**   | the programmer     | Every block in the launch — no cross-block sync at all      |

A block's total independence from every other block is what lets the
scheduler spray them across every streaming multiprocessor on the chip with
zero coordination cost. And the one line of code everything else builds on:

```c
int i = blockIdx.x * blockDim.x + threadIdx.x;
c[i] = a[i] + b[i];
```

Thousands of threads, running identical code, each computing a different
answer to "which one am I."

> **Where it still resembles familiar concurrency:** a block behaves like
> goroutines sharing a `WaitGroup`. **Where it stops entirely:** if threads
> in the same warp hit an `if`/`else` and disagree, the hardware doesn't run
> both branches concurrently — it runs one path with the other threads
> masked off, then the other. Divergence is a real, measurable cost, not a
> logical bug a runtime quietly resolves.

## Where the data actually lives

Once a thread knows which index is its own, where does the value at that
index actually live? Four tiers, the same "close and small is fast, far and
large is slow" law as before, just applied per-thread and per-block:

- **Registers** — one per thread, compiler-managed, invisible to the
  programmer.
- **Shared memory & L1** — on-chip. L1 is an automatic cache, exactly like a
  CPU's. Shared memory sits the same distance from the core but has to be
  loaded explicitly, and it's scoped to exactly one block — the same block
  that can call a barrier.
- **L2** — on-chip too, automatic, shared by the whole GPU.
- **Global memory (HBM)** — off-chip, visible to the entire grid, and the
  tier where almost all of a kernel's actual cost lives.

Global memory earns the word "cliff" for two reasons stacked on top of each
other. Its per-access latency jumps sharply the moment you leave the chip.
And its enormous aggregate bandwidth is a promise, not a guarantee — it only
pays off if a warp's 32 threads ask for memory in a pattern the hardware can
serve as one wide transaction. Get that pattern wrong and every thread pays
the full latency alone. That specific pattern has a name — coalescing — and
it deserves its own post entirely. For now, the fact worth holding onto is
simpler: **almost every kernel's speed is decided by how many bytes it has
to pull from this one tier.**

> **Shared memory has no safety net.** Write from one thread, read from
> another, without a barrier in between, and that's a real hardware race —
> wrong numbers, no panic, no error. The pattern that keeps it correct:
> load, barrier, compute, barrier, write.

## The one ratio that ties it together

Put the pieces together: memory is slow, a GPU hides that by brute-force
parallelism, threads are addressed in a strict hierarchy, and data lives in
four tiers with one very expensive cliff at the bottom. One idea ties all of
it into a single number, and it's worth internalizing before writing any
kernel, because it recurs at every level of optimization from here on.

**Arithmetic intensity** is FLOPs performed divided by bytes moved to
perform them. That's the whole formula. Work it by hand on the vector add
from earlier: one add per element, but three memory accesses per element —
read, read, write. FLOPs equal `N`. Bytes equal `12N`, in 32-bit floats.

```
arithmetic intensity = N FLOPs / 12N bytes ≈ 1/12 FLOP per byte
```

That number is almost insultingly low, and that's exactly the point: this
kernel is nearly pure data movement wearing a kernel's clothing. The one add
per element is free. The three memory accesses are the entire cost.

The **roofline model** turns that ratio into a verdict. Plot attainable
performance against arithmetic intensity for a given chip and the result is
a diagonal line climbing up to a ridge point, then a flat ceiling:

- **Below the ridge — memory-bound.** Bandwidth sets the speed; more math is
  nearly free.
- **Above the ridge — compute-bound.** The arithmetic units are the
  bottleneck; moving less data buys nothing.

The ridge point itself is just peak FLOP/s divided by peak bandwidth — one
fixed number for a given chip — and it turns "is this fast because of the
GPU, or in spite of it?" from a guess into a calculation.

> **A third failure mode the two-sided model doesn't show:** overhead-bound.
> A kernel can look compute-bound by the ratio and still be slow if it
> simply does too little total work — the fixed cost of launching it dwarfs
> whatever math or memory traffic happens inside. No amount of reasoning
> about FLOPs or bytes fixes that. The fix is doing more work per launch,
> which is why real kernels get fused and real serving systems batch
> requests instead of optimizing each operation in isolation.

## The whole thing on one page

| Idea                  | The one thing to remember                                  |
| ---------------------- | ------------------------------------------------------------ |
| **Memory wall**        | Math is ~100x faster than fetching the data for it          |
| **Throughput machine** | A GPU hides that wait with thousands of threads, not caches |
| **Thread hierarchy**   | thread → warp (32, fixed) → block → grid, addressed by index |
| **Memory tiers**       | Registers → shared/L1 → L2 → global (HBM), the last is the cliff |
| **Arithmetic intensity** | FLOPs ÷ bytes moved — the number that predicts your bottleneck |
| **Roofline**           | Below the ridge, bandwidth-bound; above it, compute-bound    |

## The takeaway

None of this is magic, and none of it requires memorizing a hardware
spec sheet. A GPU is a straightforward answer to one constraint — memory is
slow — pushed to its logical extreme: give up on making one thread fast,
and instead run so many threads that the wait disappears into the crowd.
Everything else — tiling, fusion, quantization, batching, multi-GPU
parallelism — is a variation on five ideas: know where the wall is, know
which machine you're on, know how to address your threads, know where your
data lives, and know which side of the ridge point you're standing on.
Everything past that is detail.
