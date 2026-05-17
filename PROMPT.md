# Process Flow UI Builder

Build a visual flow builder for semiconductor processes.

## Process Steps

1. **deposit(material: string, num_layers: int)** - Adds material layers to the wafer stack
2. **pattern(side: "left" | "right")** - Applies resist to protect one side from etching or depositing (see Patterning Rules below)
3. **etch(duration: int)** - Removes material from top to bottom. If resist is present, only etches unprotected side.

## Materials

There are 3 materials available: **A**, **B**, and **C**. Each material has properties:

**Deposit (thickness per layer):**

- **A**: 1.0 nm/layer
- **B**: 1.5 nm/layer
- **C**: 2.0 nm/layer

**Etch (etch rate):**

- **A**: 0.5 nm/s
- **B**: 1.0 nm/s
- **C**: 1.5 nm/s

## Patterning Rules

- Resist has zero height (visual indicator only, not a material layer)
- Blocks 100% of etching on the protected side during the next etch step, and blocks 100% of deposition on the protected side during the next deposit step (liftoff)
- Automatically removed when: etch completes, or deposit completes
- To protect again, apply a new pattern step
- Pattern/etch before any deposit does nothing (treated as etching the silicon base, which is out of scope)
- Multiple stacked resists (e.g., two `pattern` steps in a row) are treated as a single resist

## Example

```
flow = [
    deposit("A", 20),  // 20 layers × 1.0 nm/layer = 20 nm
    // Stack: [A: 20 nm]
    //        ┌──────────────────────┐
    //        │                      │
    //        │          A           │ 20 nm
    //        │                      │
    //        └──────────────────────┘

    pattern("left"),   // Apply resist to left side (resist has 0 height, just protects)
    // Stack: [A: 20 nm] (same, but left side protected)
    //
    //        xxxxxxxxxxx────────────┐
    //        │                      │
    //        │          A           │ 20 nm
    //        │                      │
    //        └──────────────────────┘

    etch(16),          // Etch for 16s - only right side etches
                       // Right side: A etches at 0.5 nm/s for 16s → removes 8 nm of A
                       //            Remaining: A (12 nm on right)
                       // Left side: Protected by resist, no etching
                       //           Remaining: A (20 nm on left)
                       // Resist is removed after etch completes
    // Stack: [A: 20 nm (left) / 12 nm (right)]
    //        ┌───────────┐
    //        │           │ L: 20 nm
    //        │     A     ├───────────┐
    //        │           │           │
    //        │           │     A     │ R: 12 nm
    //        └───────────┴───────────┘
]
```

## Requirements

**UI Features:**

- Add, edit, reorder, and delete steps
- Configure step parameters: material & layers (deposit), side (pattern), duration (etch)

**Visualization:**

- A single visualization of the stack that updates in real time as steps are added, edited, reordered, or deleted
- Render the stack so it's clear what materials are present and their thicknesses on each side
- Left and right sides are exactly 50% width each

**Tech:** Frontend only, single page. Any language/framework/library. No backend or databases.

**Expected time: 4-6 hours**

## Submission

Submit your code with a README on how to install and run. Include some high level design or architectural decisions.

Optionally host your page and share a link to it.