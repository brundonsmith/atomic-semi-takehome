# Atomic Semiconductor Takehome

This project can be found hosted at
[https://atomic-semi-takehome.onrender.com](https://atomic-semi-takehome.onrender.com)

## Running the project locally

The Bun JavaScript runtime is required to run this project and can be found
here:
https://bun.com/docs/installation

To install dependencies:

```bash
bun install
```

To run:

```bash
bun index.html
```

To run the test suite:

```bash
bun test
```

## Process notes

All code was written by hand. I normally use Claude Code quite a bit, but it
felt appropriate not to lean on it for this. I did keep a Claude chat for
quickly looking things up (for one: this was my first time playing with Bun)
and the occasional debugging shortcut. The full transcript can be found here:

[Claude transcript](https://claude.ai/share/19ac3eee-d6a2-4ef5-bdec-5ef41d9e064d)

## Features

I opted to add some features beyond the explicit requirements:
- Undo and redo functionality, with keyboard shortcuts (Cmd+Z and Cmd+Shift+Z)
- Drag-to-reorder operations
- Hover the eye icon on an operation to see a visual of what just the
  operations up to that point produce
- Color-coding for materials and operations, based on the Atomic Semi brand
  colors 🙂

## Architecture

The core data model is a sequence of `UIAction`s applied to create a list of
flow Operations, which are then performed in sequence to create a Stack
(representation of the end-product). These are all immutable data structures,
constructed and processed via pure functions. This gives us some benefits:
- It's very easy to inspect the state of different parts of the system while
  debugging
- It's very easy to test core logic
- Undo and redo functionality is trivial

Things have also been designed with an eye toward adding new materials,
operations, and "sectors" ("left" and "right" for now, but of course a real
chip would have more). The code will accomodate new entries in these
groups with little or no change.

The visualization of the stack is done with a `<canvas>`. This could have been
HTML, but it felt appropriate to do it this way. In this simple example the
benefits were limited, but in a real-world scenario you'd likely see
performance benefits and flexibility benefits, at the cost of re-implementing
some basic layout features by hand.

The `OperationsList` gets a little gnarly with the drag-and-drop implementation,
but I was happy with the end result in the UI. In a real-world scenario I would
encapsulate these messy implementation details better, in some sort of
generalized "draggable list", or possibly reach for a library.

In general I avoided reaching for libraries in this project, so that I could
demonstrate my abilities