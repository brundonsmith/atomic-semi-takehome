
import { createRoot } from 'react-dom/client';
import { createStack, flowFromUIActions, SECTORS, type Operation, type Stack, type UIAction } from './model.ts'
import { memo, useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { OperationsList } from './operations-list.tsx';
import { MATERIAL_COLORS, ORANGE, BLUE, OPERATION_COLORS, randomID } from './utils.ts';

/**
 * Root of the app
 */
const App = memo(() => {

    /**
     * The full history of UI actions taken by the user. This is stored so that
     * undo (and redo) can be implemented.
     */
    const [uiActionsHistory, setUIActionsHistory] = useState<readonly UIAction[]>([
        { kind: 'add', index: 0, newOperation: { id: randomID(), name: 'deposit', material: 'A', numLayers: 20 } },
        { kind: 'add', index: 1, newOperation: { id: randomID(), name: 'pattern', sector: 'left' }, },
        { kind: 'add', index: 2, newOperation: { id: randomID(), name: 'etch', duration: 16 } },
    ])

    /**
     * Undo decrements this instead of popping an operation, so that we can also 
     * redo
     * 
     * This is the index *after* the last operation that we consider real, not the 
     * index of the final element!
     */
    const [uiActionsApplied, setUIActionsApplied] = useState(uiActionsHistory.length)

    /**
     * When the eye icon on one of the operations is hovered, the visualization
     * shows the stack after the operations *up to that point*
     */
    const [hoveredOperationIndex, setHoveredOperationIndex] = useState<number | undefined>(undefined)

    /**
     * The current flow (series of stack operations) being edited by the user
     */
    const flow = useMemo(() => {
        // If the user has hit the undo button one or more times,
        // uiActionsApplied will be less than the length of 
        // uiActionsHistory, and we want to ignore any actions after that
        // point
        const appliedUIActions = uiActionsHistory.slice(0, uiActionsApplied)

        // Compute the flow of operations from the relevant sequence of
        // UIActions
        return flowFromUIActions(appliedUIActions)
    }, [uiActionsApplied, uiActionsHistory])

    /**
     * If the user is hovering somewhere in the operations sequence, we get
     * just the sub-list of operations up to that point, and generate a Stack
     * from those, to then render in the canvas
     */
    const stackToRender = useMemo(() => {
        if (hoveredOperationIndex != null) {
            return createStack(flow.slice(0, hoveredOperationIndex + 1))
        } else {
            return createStack(flow)
        }
    }, [flow, hoveredOperationIndex])

    /**
     * Undo the last UIAction
     */
    const undo = useCallback(() => {
        setUIActionsApplied(current =>
            Math.max(current - 1, 0))
    }, [])

    /**
     * Redo the last undone UIAction (if any)
     */
    const redo = useCallback(() => {
        setUIActionsApplied(current =>
            Math.min(current + 1, uiActionsHistory.length))
    }, [uiActionsHistory.length])

    // handle keyboard shortcuts for undo and redo
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.metaKey) {
                if (e.key === 'z') {
                    if (e.shiftKey) {
                        redo()
                    } else {
                        undo()
                    }
                }
            }
        }

        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [redo, undo])

    /**
     * "Do a new UI action in the operations editor"
     */
    const appendUIAction = useCallback((operation: UIAction) => {
        // drop any undone "future history"
        setUIActionsHistory(x => x.slice(0, uiActionsApplied))

        // append the new UIAction to the history
        setUIActionsHistory(uiActions => [
            ...uiActions,
            operation
        ])

        // bump the current count
        setUIActionsApplied(x => x + 1)
    }, [uiActionsApplied])

    const replaceOperation = useCallback((index: number, newOperation: Operation) => {
        appendUIAction({
            kind: 'replace',
            index,
            newOperation
        })
    }, [appendUIAction])

    const deleteOperation = useCallback((index: number) => {
        appendUIAction({
            kind: 'delete',
            index
        })
    }, [appendUIAction])

    const moveOperation = useCallback((fromIndex: number, toIndex: number) => {
        appendUIAction({
            kind: 'move',
            fromIndex,
            toIndex
        })
    }, [appendUIAction])

    const addOperation = useCallback((newOperation: Operation) => {
        appendUIAction({
            kind: 'add',
            index: uiActionsApplied,
            newOperation
        })
    }, [appendUIAction, uiActionsApplied])

    const handleDepositButtonClick = useCallback(() => {
        addOperation({
            id: randomID(),
            name: 'deposit',
            material: 'A',
            numLayers: 0
        })
    }, [addOperation])

    const handlePatternButtonClick = useCallback(() => {
        addOperation({
            id: randomID(),
            name: 'pattern',
            sector: 'left'
        })
    }, [addOperation])

    const handleEtchButtonClick = useCallback(() => {
        addOperation({
            id: randomID(),
            name: 'etch',
            duration: 0
        })
    }, [addOperation])

    return (
        <div className='app'>
            <div className='editor'>
                <OperationsList
                    flow={flow}
                    hoveredOperationIndex={hoveredOperationIndex}
                    setHoveredOperationIndex={setHoveredOperationIndex}
                    replaceOperation={replaceOperation}
                    deleteOperation={deleteOperation}
                    moveOperation={moveOperation}
                />

                <div className='toolbar'>
                    <button onClick={handleDepositButtonClick} style={{ background: OPERATION_COLORS.deposit }}>
                        <span className="material-icons">add</span>
                        Deposit
                    </button>
                    <button onClick={handlePatternButtonClick} style={{ background: OPERATION_COLORS.pattern }}>
                        <span className="material-icons">add</span>
                        Pattern
                    </button>
                    <button onClick={handleEtchButtonClick} style={{ background: OPERATION_COLORS.etch }}>
                        <span className="material-icons">add</span>
                        Etch
                    </button>

                    <div className='spacer' />

                    <button onClick={undo}>
                        <span className="material-icons">undo</span>
                        Undo
                    </button>
                    <button onClick={redo}>
                        <span className="material-icons">redo</span>
                        Redo
                    </button>
                </div>
            </div>

            <StackVisualization stack={stackToRender} hovering={hoveredOperationIndex != null} />
        </div>
    )
})

/**
 * The canvas visualization on the right side of the screen, showing the
 * computed state of the stack
 */
const StackVisualization: FC<{ stack: Stack, hovering: boolean }> = memo(({ stack, hovering }) => {

    // store the canvas ref for drawing later
    const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null)


    const [canvasDimensions, setCanvasDimensions] = useState<{ width: number, height: number }>()

    // whenever the canvas changes size, update the dimensions in state to
    // trigger a re-draw
    useEffect(() => {
        if (canvasRef) {
            const ro = new ResizeObserver(entries => {
                const contentRect = entries[0]?.contentRect
                if (contentRect) {
                    const { width, height } = contentRect
                    setCanvasDimensions({ width, height })
                }
            });
            ro.observe(canvasRef)

            return () => ro.disconnect()
        }
    }, [canvasRef])

    useEffect(() => {
        if (canvasRef && canvasDimensions) {
            const ctx = canvasRef.getContext('2d')
            const { width: canvasWidth, height: canvasHeight } = canvasDimensions

            // dynamically update the canvas' internal width and height to
            // match its width and height in the DOM layout
            canvasRef.width = canvasWidth
            canvasRef.height = canvasHeight

            if (ctx) {
                const padding = 40
                const maxWidth = 800
                const sectorWidth = (Math.min(canvasWidth, maxWidth) - padding - padding) / SECTORS.length // the width of one sector's material stack
                const pixelsPerNm = 2

                // clear the canvas and set base styles
                ctx.clearRect(0, 0, canvasWidth, canvasHeight)
                ctx.font = '16px sans-serif'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'

                // draw each sector
                for (let sectorIndex = 0; sectorIndex < SECTORS.length; sectorIndex++) {
                    const sectorName = SECTORS[sectorIndex]!

                    // leftmost pixel for this sector stack
                    const x = padding + (sectorIndex * sectorWidth)

                    let currentBaseHeight = 0 // after we draw each layer we bump this cumulative height to know where to draw next
                    for (const layer of stack[sectorName].materialLayers) {
                        const baseline = padding + (currentBaseHeight * pixelsPerNm) // bottom of the current layer
                        const height = layer.height * pixelsPerNm // current material's height converted to pixel height
                        const y = canvasHeight - baseline - height // y is the top-left pixel of the rectangle, so we have to flip it

                        // draw the solid colored background
                        ctx.fillStyle = MATERIAL_COLORS[layer.material]
                        ctx.fillRect(x, y, sectorWidth, height)

                        // draw an outline around the colored box
                        ctx.strokeStyle = '#333'
                        ctx.strokeRect(x, y, sectorWidth, height)

                        // if there's room, draw the material's name inside the box
                        if (height > 16) {
                            ctx.fillStyle = '#333'
                            ctx.fillText(`${layer.material} (${layer.height}nm)`, x + (sectorWidth / 2), y + (height / 2))
                        }

                        // bump the base height for the next layer
                        currentBaseHeight += layer.height
                    }

                    // resistant sectors get an indicator at the top, after all the material layers
                    if (stack[sectorName].resistant) {
                        const baseline = padding + (currentBaseHeight * pixelsPerNm) // top of the stack
                        const height = 2
                        const y = canvasHeight - baseline - height

                        ctx.fillStyle = ORANGE
                        ctx.fillRect(x, y, sectorWidth, height) // draw a flat line across the top
                        ctx.fillText('resistant', x + (sectorWidth / 2), y - 16) // write a label above that
                    }
                }
            }
        }
    }, [canvasRef, canvasDimensions, stack])

    return (
        <div className='stack-visualization' style={{ boxShadow: hovering ? '0px 0px 15px ' + BLUE + ' inset' : undefined }} >
            <canvas ref={setCanvasRef} />
        </div>
    )
})

const root = createRoot(document.getElementById('root')!);
root.render(<App />);