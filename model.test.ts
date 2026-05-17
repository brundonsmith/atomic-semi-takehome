import { test, expect, describe } from 'bun:test'
import { applyOperationToSector, flowFromUIActions } from './model'

describe('flowFromUIActions', () => {
    test.each([
        {
            uiActions: [
                { kind: 'add', index: 0, newOperation: { id: '1', name: 'deposit', material: 'A', numLayers: 20 } },
                { kind: 'add', index: 1, newOperation: { id: '2', name: 'pattern', sector: 'left' }, },
                { kind: 'add', index: 2, newOperation: { id: '3', name: 'etch', duration: 16 } },
            ],
            flow: [
                {
                    id: "1",
                    material: "A",
                    name: "deposit",
                    numLayers: 20,
                },
                {
                    id: "2",
                    name: "pattern",
                    sector: "left",
                },
                {
                    duration: 16,
                    id: "3",
                    name: "etch",
                },
            ]
        },
        {
            uiActions: [
                { kind: 'add', index: 0, newOperation: { id: '1', name: 'deposit', material: 'A', numLayers: 20 } },
                { kind: 'add', index: 1, newOperation: { id: '2', name: 'pattern', sector: 'left' }, },
                { kind: 'add', index: 2, newOperation: { id: '3', name: 'etch', duration: 16 } },
                { kind: 'delete', index: 1 },
            ],
            flow: [
                {
                    id: "1",
                    material: "A",
                    name: "deposit",
                    numLayers: 20,
                },
                {
                    duration: 16,
                    id: "3",
                    name: "etch",
                },
            ]
        },
        {
            uiActions: [
                { kind: 'add', index: 0, newOperation: { id: '1', name: 'deposit', material: 'A', numLayers: 20 } },
                { kind: 'add', index: 1, newOperation: { id: '2', name: 'pattern', sector: 'left' }, },
                { kind: 'add', index: 2, newOperation: { id: '3', name: 'etch', duration: 16 } },
                { kind: 'replace', index: 0, newOperation: { id: '1', name: 'deposit', material: 'B', numLayers: 25 } },
            ],
            flow: [
                {
                    id: "1",
                    material: "B",
                    name: "deposit",
                    numLayers: 25,
                },
                {
                    id: "2",
                    name: "pattern",
                    sector: "left",
                },
                {
                    duration: 16,
                    id: "3",
                    name: "etch",
                },
            ]
        },
        {
            uiActions: [
                { kind: 'add', index: 0, newOperation: { id: '1', name: 'deposit', material: 'A', numLayers: 20 } },
                { kind: 'add', index: 1, newOperation: { id: '2', name: 'pattern', sector: 'left' }, },
                { kind: 'add', index: 2, newOperation: { id: '3', name: 'etch', duration: 16 } },
                { kind: 'move', fromIndex: 2, toIndex: 1 },
            ],
            flow: [
                {
                    id: "1",
                    material: "A",
                    name: "deposit",
                    numLayers: 20,
                },
                {
                    duration: 16,
                    id: "3",
                    name: "etch",
                },
                {
                    id: "2",
                    name: "pattern",
                    sector: "left",
                },
            ]
        },
    ])('flowFromUIActions($uiActions) === $flow', ({ uiActions, flow }) => {
        expect(flowFromUIActions(uiActions)).toEqual(flow)
    })
})


describe('applyOperationToSector', () => {
    test.each([
        { // deposit on an empty stack creates a base layer
            thisSectorName: 'left',
            currentSectorState: {
                materialLayers: [
                ],
                resistant: false
            },
            operation: {
                id: '1',
                name: 'deposit',
                material: 'A',
                numLayers: 12
            },
            resultingSectorState: {
                materialLayers: [
                    { material: 'A', height: 12 }
                ],
                resistant: false
            }
        },
        { // etching on an empty stack does nothing
            thisSectorName: 'left',
            currentSectorState: {
                materialLayers: [
                ],
                resistant: false
            },
            operation: {
                id: '1',
                name: 'etch',
                duration: 1
            },
            resultingSectorState: {
                materialLayers: [
                ],
                resistant: false
            }
        },
        { // patterning on an empty stack does nothing
            thisSectorName: 'left',
            currentSectorState: {
                materialLayers: [
                ],
                resistant: false
            },
            operation: {
                id: '1',
                name: 'pattern',
                sector: 'left'
            },
            resultingSectorState: {
                materialLayers: [
                ],
                resistant: false
            }
        },
        { // deposit A on top of A combines them into one layer
            thisSectorName: 'left',
            currentSectorState: {
                materialLayers: [
                    { material: 'A', height: 10 }
                ],
                resistant: false
            },
            operation: {
                id: '1',
                name: 'deposit',
                material: 'A',
                numLayers: 12
            },
            resultingSectorState: {
                materialLayers: [
                    { material: 'A', height: 22 }
                ],
                resistant: false
            }
        },
        { // deposit B on top of A adds a material layer
            thisSectorName: 'left',
            currentSectorState: {
                materialLayers: [
                    { material: 'A', height: 10 }
                ],
                resistant: false
            },
            operation: {
                id: '1',
                name: 'deposit',
                material: 'B',
                numLayers: 12
            },
            resultingSectorState: {
                materialLayers: [
                    { material: 'A', height: 10 },
                    { material: 'B', height: 18 }
                ],
                resistant: false
            }
        },
        { // pattern on this sector sets resistant: true
            thisSectorName: 'left',
            currentSectorState: {
                materialLayers: [
                    { material: 'A', height: 10 }
                ],
                resistant: false
            },
            operation: {
                id: '1',
                name: 'pattern',
                sector: 'left'
            },
            resultingSectorState: {
                materialLayers: [
                    { material: 'A', height: 10 }
                ],
                resistant: true
            }
        },
        { // pattern on another sector doesn't affect this one
            thisSectorName: 'left',
            currentSectorState: {
                materialLayers: [
                    { material: 'A', height: 10 }
                ],
                resistant: false
            },
            operation: {
                id: '1',
                name: 'pattern',
                sector: 'right'
            },
            resultingSectorState: {
                materialLayers: [
                    { material: 'A', height: 10 }
                ],
                resistant: false
            }
        },
        { // resistance blocks deposit
            thisSectorName: 'left',
            currentSectorState: {
                materialLayers: [
                    { material: 'A', height: 10 }
                ],
                resistant: true
            },
            operation: {
                id: '1',
                name: 'deposit',
                material: 'B',
                numLayers: 12
            },
            resultingSectorState: {
                materialLayers: [
                    { material: 'A', height: 10 }
                ],
                resistant: false
            }
        },
        { // resistance blocks etching
            thisSectorName: 'left',
            currentSectorState: {
                materialLayers: [
                    { material: 'A', height: 10 }
                ],
                resistant: true
            },
            operation: {
                id: '1',
                name: 'etch',
                duration: 1
            },
            resultingSectorState: {
                materialLayers: [
                    { material: 'A', height: 10 }
                ],
                resistant: false
            }
        },
        { // etching eliminates a top layer and digs partially into the next
            thisSectorName: 'left',
            currentSectorState: {
                materialLayers: [
                    { material: 'A', height: 10 },
                    { material: 'B', height: 18 }
                ],
                resistant: false
            },
            operation: {
                id: '1',
                name: 'etch',
                duration: 20
            },
            resultingSectorState: {
                materialLayers: [
                    { material: 'A', height: 9 },
                ],
                resistant: false
            }
        },
    ])('applyOperationToSector($thisSectorName, $currentSectorState, $operation) === $resultingSectorState', ({ thisSectorName, currentSectorState, operation, resultingSectorState }) => {
        expect(applyOperationToSector(thisSectorName, currentSectorState, operation)).toEqual(resultingSectorState)
    })
})