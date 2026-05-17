
/**
 * List of all known materials. Program can be extended by adding to this list
 */
export const MATERIALS = {
    A: { thickness: 1.0, etchRate: 0.5 },
    B: { thickness: 1.5, etchRate: 1.0 },
    C: { thickness: 2.0, etchRate: 1.5 }
} as const

export type MaterialName = keyof typeof MATERIALS

/**
 * Right now we just have left and right, but if we extended later to cover
 * more sector names, we could do that by adding to this array
 */
export const SECTORS = ['left', 'right'] as const
export type Sector = (typeof SECTORS)[number] // 'left' | 'right'

/**
 * Operations that can be applied to the stack
 */
export type Operation =
    | DepositOperation
    | PatternOperation
    | EtchOperation

export type DepositOperation = {
    readonly id: string,
    readonly name: 'deposit',
    readonly material: MaterialName,
    readonly numLayers: number
}

export type PatternOperation = {
    readonly id: string,
    readonly name: 'pattern',
    readonly sector: Sector
}

export type EtchOperation = {
    readonly id: string,
    readonly name: 'etch',
    readonly duration: number
}

/**
 * An operation at the UI level that modifies the current list of operations.
 * By representing these as data, we can implement undo and redo features in
 * the UI. This also makes testing and debugging easier.
 */
export type UIAction =
    | {
        readonly kind: 'add',
        readonly index: number,
        readonly newOperation: Operation
    }
    | {
        readonly kind: 'delete',
        readonly index: number
    }
    | {
        readonly kind: 'replace',
        readonly index: number,
        readonly newOperation: Operation
    }
    | {
        readonly kind: 'move',
        readonly fromIndex: number,
        readonly toIndex: number
    }

/**
 * One state of the resulting stack. Value for each 
 * key is the current height in nm.
 */
export type Stack = Record<Sector, SectorState>

/**
 * The state of one section of the stack
 */
export type SectorState = {
    readonly materialLayers: readonly MaterialLayer[],
    readonly resistant: boolean
}

/**
 * One material deposit somewhere in the stack
 */
export type MaterialLayer = {
    readonly material: MaterialName,
    readonly height: number
}

/**
 * Given a series of UI actions on the list, construct the current flow
 */
export const flowFromUIActions = (uiActions: readonly UIAction[]): readonly Operation[] => {
    const flow: Operation[] = []

    for (const uiAction of uiActions) {
        switch (uiAction.kind) {
            case "add": flow.splice(uiAction.index, 0, uiAction.newOperation); break // insert at index
            case "delete": flow.splice(uiAction.index, 1); break // delete one at index
            case "replace": flow[uiAction.index] = uiAction.newOperation; break // replace current entry
            case "move": {
                const [removed] = flow.splice(uiAction.fromIndex, 1) // remove from old index

                const newIndex =
                    uiAction.fromIndex < uiAction.toIndex
                        ? uiAction.toIndex - 1 // if everything shifted over we need to adjust the destination
                        : uiAction.toIndex

                flow.splice(newIndex, 0, removed!) // insert at new index
            } break
        }
    }

    return flow
}

/**
 * Apply all the Operations in a flow and get the resulting Stack
 */
export const createStack = (flow: readonly Operation[]): Stack => {
    const emptyStack: Stack = {
        left: {
            materialLayers: [],
            resistant: false
        },
        right: {
            materialLayers: [],
            resistant: false
        },
    }

    // apply each operation from the flow in sequence, generating a new Stack
    // and feeding it to the next operation
    return flow.reduce(applyOperationToStack, emptyStack)
}

/**
 * Given a stack and an operation, return the new state of the stack after
 * the operation has been applied
 */
export const applyOperationToStack = (stack: Stack, operation: Operation): Stack => {
    let resultingStack = stack

    for (const sector of SECTORS) { // we loop through all SECTORS so that if we want to add more later, the code will still work
        resultingStack = {
            ...resultingStack,
            [sector]: applyOperationToSector(sector, stack[sector], operation) // compute a new state for the current sector and replace just that piece of state
        }
    }

    return resultingStack
}

/**
 * Given a sector state and an operation, return the new state of the sector
 * after the operation has been applied
 */
export const applyOperationToSector = (
    thisSectorName: Sector,
    currentSectorState: SectorState,
    operation: Operation
): SectorState => {
    switch (operation.name) {
        case "pattern": {
            if (currentSectorState.materialLayers.length > 0 && operation.sector === thisSectorName) {
                return { ...currentSectorState, resistant: true }
            } else {
                return currentSectorState
            }
        }
        case "deposit": {
            if (currentSectorState.resistant) {
                return { ...currentSectorState, resistant: false }
            } else {
                const addedHeight = operation.numLayers * MATERIALS[operation.material].thickness
                const topLayer = currentSectorState.materialLayers[currentSectorState.materialLayers.length - 1]

                if (topLayer?.material === operation.material) {
                    const newMaterialLayer: MaterialLayer = {
                        material: operation.material,
                        height: topLayer.height + addedHeight
                    }

                    return {
                        materialLayers: [
                            ...currentSectorState.materialLayers.slice(0, currentSectorState.materialLayers.length - 1),
                            newMaterialLayer
                        ],
                        resistant: false
                    }
                } else {
                    const newMaterialLayer: MaterialLayer = {
                        material: operation.material,
                        height: addedHeight
                    }

                    return {
                        materialLayers: [
                            ...currentSectorState.materialLayers,
                            newMaterialLayer
                        ],
                        resistant: false
                    }
                }
            }
        }
        case "etch": {
            if (currentSectorState.materialLayers.length === 0 || currentSectorState.resistant) {
                return { ...currentSectorState, resistant: false }
            } else {
                let remainingDuration = operation.duration
                const remainingLayers = [...currentSectorState.materialLayers] // clone the array for mutation

                while (remainingLayers.length > 0 && remainingDuration > 0) {
                    const currentLayer = remainingLayers[remainingLayers.length - 1]! // top layer of the stack
                    const currentLayerEtchRate = MATERIALS[currentLayer.material].etchRate // look up the etch rate for its material
                    const amountToEtch = currentLayerEtchRate * remainingDuration // if we burn at this rate for the full duration, see how much we shave off

                    if (amountToEtch > currentLayer.height) { // if it's going to burn through more than just the current layer...
                        remainingLayers.pop() // pop off the current layer entirely
                        remainingDuration -= currentLayer.height / currentLayerEtchRate // figure out how much time is left after doing that
                    } else { // else, the current layer absorbs all of the etching
                        return {
                            materialLayers: [
                                ...remainingLayers.splice(0, remainingLayers.length - 1), // return the remaining layers without the top one
                                { // replace the top one with a new object holding its etched height
                                    ...currentLayer,
                                    height: currentLayer.height - amountToEtch
                                }
                            ],
                            resistant: false
                        }
                    }
                }

                return {
                    materialLayers: remainingLayers,
                    resistant: false
                }
            }
        }
    }
}