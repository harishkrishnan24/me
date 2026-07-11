---
title: "There's No Magic in Your Database"
description: "You type SELECT and rows come back. In between is a stack of twelve layers, each solving one very sensible problem. Here's the whole journey, following a single query from your terminal to the disk and back."
date: 2026-07-11
tags: ["databases", "postgresql", "internals", "systems"]
draft: false
---

You run a query:

```sql
SELECT name FROM users WHERE id = 42;
```

A few milliseconds later, a name comes back. Somewhere in between, a lot
happened — and if you're like most engineers who use databases every day, that
"in between" is a black box. It's just *magic behind the scenes*.

I want to kill that feeling, because it's holding you back from a mental model
you can actually reason about. So here's the reframe, and it's the most
important sentence in this whole post:

> A database is just a normal program reading and writing files.

Your table `users` is a file on disk — literally, a file in a folder. When you
query it, the database opens that file, reads some bytes, and works out which
bytes are the row you asked for. That's the entire trick. Everything else —
every layer we're about to walk through — exists to make that reading **fast**,
**safe**, and **answerable in SQL instead of raw byte offsets**.

We'll follow that one query, `id = 42`, the whole way down and back. Keep it in
your head.

## The query has two jobs

Every query splits cleanly into two halves, and this split is the spine of
everything that follows:

1. **The top half — figure out *what* to do.** The database receives your text,
   understands it, and decides on a plan. This is the *brain*. Nothing has been
   fetched yet; it's all thinking.
2. **The bottom half — go *get* the bytes.** The plan runs, which means
   descending to where the data physically lives and pulling row 42 back up.

Let's take the brain first, because that's where your query lands.

## The brain: turning text into a plan

### It arrives — the client protocol

Before anything, your query has to physically *get* to the database. Postgres
is a separate process, often on a separate machine. So your client opens a
socket and speaks an agreed-upon language over it — the wire protocol — sending
a message that means "here's a query, this many bytes, here's the text."

> **Without this layer:** the database is a sealed box with no door.

### It gets understood — the parser

Now the database has your query, but only as *text* — a string of characters.
It doesn't yet know that `SELECT` means "read" or that `users` is a table. The
parser turns that flat string into a **structured tree**: this is a SELECT, the
target column is `name`, the table is `users`, there's a filter `id = 42`.

It's the same move a compiler makes parsing source code before it can run it.

> **Without this layer:** code can't act on an ambiguous, unstructured string.

### It gets a strategy — the planner

Here's the layer most people don't know exists. There's more than one way to
answer your query. To find `id = 42`, the database could:

- read *every row* in `users` and check each one (a **sequential scan** —
  slow), or
- use an **index** on `id` to jump almost straight to it (an **index scan** —
  fast).

The planner weighs what's available and picks the cheapest path, producing a
step-by-step plan. This single decision is the difference between a query
returning in one millisecond and one returning in ten seconds.

> **Without this layer:** the database does the naive thing every time and falls
> over at scale.

### It runs — the executor

The plan is just a recipe. The executor actually *cooks* it: "open an index
scan on `id`, seek to 42, fetch that row, pull out the `name` column, hand it
back." It's the layer that turns inert instructions into real actions against
the storage below.

> **Without this layer:** you have a plan and no one to carry it out.

That's the whole brain. Your query has been **received**, **understood**,
**strategized**, and the executor is now reaching down into storage to actually
fetch row 42. Notice that *no table data has been touched yet*. That reach-down
is where the second half begins.

## The storage: going to get the bytes

### A quick aside — how does it even know what `users` is?

How did the planner know there's an index on `id`? How does the executor know
`users` has a `name` column that holds text? The database stores **facts about
itself** in the *catalog* — and here's the lovely part: the catalog is *itself
just tables*. A table listing your tables. A table listing your columns. A table
listing your indexes. The database describes itself using its own storage
machinery, then bootstraps on top of it.

### Finding it fast — the index (a B-tree)

The executor wants `id = 42`. The dumb way: read all ten million rows and check
each one. The smart way: an index — a separate, sorted, tree-shaped structure
that lets you find `42` by walking a handful of branches instead of scanning
everything.

It's the index at the back of a textbook. You don't read all 900 pages to find
"mitochondria"; you flip to the M's. The B-tree answers exactly one question:
*for `id = 42`, which page holds the row, and where in that page?*

### Where rows actually live — the heap

The index told us *where*. The row itself lives in the **heap** — the table's
real data, organized into fixed-size **pages** of 8KB each. Inside a page,
individual rows are **tuples**, and a small directory at the top of the page
records the exact byte offset of each one.

Fixed-size pages are the unit everything else is built on. Remember that number,
8KB — it shows up everywhere.

### Skipping the disk — the buffer pool

We know row 42 is in, say, page 17. But reading from disk is *slow* — orders of
magnitude slower than RAM — and popular pages get read over and over. So the
database keeps a big pool of memory that caches recently-used pages. Before
touching disk, the executor asks the buffer pool: "got page 17?"

- **Yes** → handed over instantly, no disk touched.
- **No** → go to disk, read it, and *keep a copy* for next time (evicting some
  cold page if the pool is full).

A hot table effectively lives in RAM, and repeated queries never pay the disk
cost.

### The floor — disk I/O

If the pool didn't have page 17, we finally hit bottom. The disk manager opens
the file, computes where page 17 sits (17 × 8KB = byte offset 139,264), and
reads exactly 8KB from that spot.

> This is where "page 17" stops being an abstraction and becomes a real read
> from a real file.

### And back up

Now it all reverses. The 8KB page rises from disk → into the buffer pool
(cached for next time) → the heap layer finds tuple 42 inside it → the executor
extracts the `name` column → hands it up through the plan → the protocol layer
packages it → and it travels back over the socket to your terminal.

Query answered. That's the full descent and return — one round trip.

## The three layers that wrap everything

So far we only *read*. The moment you *write*, three more layers wake up. Change
the query:

```sql
UPDATE users SET name = 'Ada' WHERE id = 42;
```

**Transactions and MVCC.** What if someone reads row 42 while you're
mid-update? What if your change is half-done? What if you `ROLLBACK`? A
transaction is the promise that a group of changes happens *all-or-nothing*, and
that concurrent users never see each other's half-finished work. Postgres pulls
this off with MVCC — it keeps *multiple versions* of a row and shows each
transaction the version that was correct when it started. Readers never block
writers; writers never block readers.

**Write-ahead logging (WAL).** Your update modified page 17 — but that page is
sitting in the buffer pool, in memory, not yet on disk. The power dies. The
change is gone, even though you told the user "committed." That's a lie a
database can't tell. The fix: *before* changing anything, append a tiny note to
a separate, append-only log on disk — "about to set row 42's name to Ada." Only
once that note is durable do you report success. On restart, replay the log and
redo anything that didn't make it. It's counterintuitive — to make writes
*safer*, you *write more* — but the log write is a fast sequential append, and
it's the price of "committed" actually meaning committed.

**Replication.** One machine is a single point of failure. Replication keeps
copies of the database on other machines — and the mechanism falls right out of
WAL: the primary streams that same log to the replicas, and each one replays it
to stay in sync. Reads spread across copies; if the primary dies, a replica
takes over. It comes almost for free, because the log already describes every
change.

## The whole thing on one page

| Layer                    | Its one job                                          |
| ------------------------ | ---------------------------------------------------- |
| **Client protocol**      | Get the query in, send rows back, over a socket      |
| **Parser**               | Text → structured query tree                         |
| **Planner**              | Choose the cheapest strategy (scan vs. index)        |
| **Executor**             | Run the plan, step by step                           |
| **Catalog**              | The database's facts about itself (tables of tables) |
| **Index / B-tree**       | Find a row fast without scanning                     |
| **Heap**                 | Where rows physically live, in 8KB pages             |
| **Buffer pool**          | Cache hot pages in RAM, skip the disk                |
| **Disk I/O**             | Read and write real 8KB pages in the file            |
| **Transactions / MVCC**  | All-or-nothing changes and safe concurrency          |
| **WAL**                  | Log before data, so "committed" survives a crash     |
| **Replication**          | Ship the WAL to copies for safety and scale          |

## The takeaway

A query comes in the top, falls through the brain and into storage to fetch some
bytes, and three safety layers wrap the whole thing so it stays correct,
durable, and available. That's it. That's the database.

None of these layers is magic. Each one is a sensible answer to a specific,
concrete problem: *how does the query get in? how do we understand it? how do we
avoid scanning everything? how do we not touch the slow disk? how do we survive
a crash?* Once you can name the problem, the layer that solves it stops being
mysterious.

So carry the map. The next time a query is slow, or a "committed" write goes
missing, or two transactions step on each other, you'll know exactly which of
these twelve rooms to go looking in.
