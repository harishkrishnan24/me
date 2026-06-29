---
title: "Why Your AI Features Feel Bolted On"
description: "Most AI integrations disappoint for the same reason, viewed three ways. Here are the three failure modes — and the one architectural idea that fixes all of them."
date: 2026-06-29
tags: ["architecture", "ai-systems", "agent-native", "typescript"]
draft: false
---

You add an AI assistant to your product — say, a project-management tool. You
wire it up to chat, it answers questions about the user's workspace, and the
demo looks clean. The product lead is happy.

Then a real user asks it to actually *do* something:

> "Can you archive all my projects from Q1?"

The AI writes a beautiful explanation of *how* they could do it — which menu to
open, which button to click — and then stops. It can't actually do it. There's
no `archiveProject` action for it to call.

It can describe the room in vivid detail. It just can't move any of the
furniture.

That's failure mode one. There are two more, and once you see all three you'll
notice the *same gap* sitting underneath each one. Let's walk through them.

## Failure mode 1 — Rigid SaaS: the agent behind glass

When software is built for humans clicking through a UI, the "actions" live
inside click handlers. `handleArchiveClick` is a React function, not a callable
unit of work. So when an LLM needs to archive something, there's nothing to
call.

The usual fix is to wrap the API: give the model a `POST /projects/:id/archive`
endpoint. That works right up until you remember the API was designed *for the
UI*. The schemas are chatty, the errors are HTTP-flavored, and the agent is
reasoning over state it fetched once at the start of the turn.

The agent can see the room. It can describe it beautifully. It still can't touch
anything.

> **Root cause:** capabilities live in UI handlers, not in named, invocable
> actions.

## Failure mode 2 — Disconnected agents: two separate worlds

Fine — so you build a *real* standalone agent. Not bolted onto the UI, but a
proper service with its own tools and read/write access. It can finally do
things.

Then a subtler friction shows up:

- **It works on a ghost.** The agent reads state at the start of a turn. While
  it runs four tool calls, the human makes three edits. The agent is now acting
  on a snapshot that no longer exists.
- **Nobody knows it's running.** No presence, no live feedback, no way to
  interrupt. When it writes something, the UI doesn't find out until the human
  hits refresh.
- **A crash means double work.** If it dies after renaming a project but before
  archiving the old plans, restarting replays the rename. The user watches it
  happen twice.

The agent is a sophisticated cron job. It isn't *in* the system — it's adjacent
to it, slipping notes under the door.

> **Root cause:** no shared live state, no real-time connection between agent
> and UI.

## Failure mode 3 — High-maintenance tools: capabilities locked in surfaces

Now scale it up. Your company has six internal admin tools. Each team built its
own: Team A has a `banUser` button, Team B has a `suspend_account` function,
Team C has a CSV upload flow.

Leadership asks: *"Can we make these AI-powered?"*

That's six integrations — one per tool. LLM tool schema, HTTP endpoint, auth
wiring, error handling, six times over. Then the platform team asks: *"Can we
expose these as MCP tools too?"* Six more.

Every capability is trapped in the surface that first needed it. Freeing it
means a fresh project every time a new surface appears.

> **Root cause:** no shared action primitive — capabilities live in surfaces,
> not in surface-agnostic definitions.

## The same gap, three times

Strip away the scenarios and the three problems collapse into one:

| Failure mode          | What's actually missing                          |
| --------------------- | ------------------------------------------------ |
| Rigid SaaS            | Actions aren't invocable — they're UI side effects |
| Disconnected agents   | No shared live state between agent and UI        |
| High-maintenance tools | No shared action primitive across surfaces       |

The punchline:

> Agents and UIs should be equal citizens of one system.

Not an app with an AI add-on. Not an agent with an API for humans. **One
system**, where a named action can be invoked by anyone — human or agent —
through whatever surface they happen to speak.

## The fix: one definition, six surfaces

This is the core idea behind
[agent-native](https://github.com/BuilderIO/agent-native), BuilderIO's
open-source framework: a single, schema-validated action definition that drives
every surface at once, with no extra code.

```ts
export const renameProject = defineAction({
  id: "project.rename",
  input: z.object({ projectId: z.string(), name: z.string() }),
  handler: async ({ projectId, name }, { actor }) => {
    await db.update(projects).set({ name }).where(eq(projects.id, projectId));
    return { ok: true, projectId, name };
  },
});

// This one definition automatically becomes ALL of these:
//   UI    →  <RenameProjectButton/> — a generated form from the schema
//   Agent →  the LLM can call project.rename as a tool
//   HTTP  →  POST /api/actions/project.rename
//   MCP   →  a tool in the MCP server
//   A2A   →  callable by another agent
//   CLI   →  run project.rename --projectId=p1 --name="Q3"
```

The **action is the atom**. The surface is just a delivery mechanism. Pair this
with a durable agent runtime — threads that persist, survive a crash mid-turn,
and resume exactly where they left off without re-running committed side effects
— and all three failure modes close at once.

## The takeaway

Rigid SaaS, disconnected agents, high-maintenance tools — these aren't three
separate problems. They're the same problem seen from the UI, the agent runtime,
and the ops team. Software built for one kind of citizen never composes cleanly
with a second.

The fix isn't *adding an AI layer*. It's building the system so agents and
humans share the same action primitives, the same live state, and the same
invocation pipeline from day one.

That's not a product decision. It's an architectural constraint — and like all
good constraints, it changes everything downstream.
