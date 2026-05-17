import { type FC, memo, useState, useEffect, type CSSProperties, useCallback, type MouseEventHandler, type InputEvent, Fragment } from "react"
import { type Operation, type DepositOperation, type MaterialName, MATERIALS, type PatternOperation, SECTORS, type EtchOperation } from "./model"
import { BLUE, OPERATION_COLORS, capitalizeFirst, MATERIAL_COLORS } from "./utils"

const LIST_ITEM_HEIGHT = 50
const LIST_ROW_SPACING = 10
const LIST_ROW_HEIGHT = LIST_ITEM_HEIGHT + LIST_ROW_SPACING
const LIST_EDGE_PADDING = 12

export const OperationsList: FC<{
    flow: readonly Operation[],
    hoveredOperationIndex: number | undefined,
    setHoveredOperationIndex: (x: number | undefined) => void,
    replaceOperation: (index: number, newOperation: Operation) => void,
    deleteOperation: (index: number) => void,
    moveOperation: (fromIndex: number, toIndex: number) => void
}> = memo(({ flow, hoveredOperationIndex, setHoveredOperationIndex, replaceOperation, deleteOperation, moveOperation }) => {

    /** 
     * The index of the list item that's currently being dragged (if any)
     */
    const [draggingOperationIndex, setDraggingOperationIndex] = useState<number>()

    /**
     * The index of the list slot that the item is currently being dragged
     * over (if any)
     */
    const [hoveredDropTargetIndex, setHoveredDropTargetIndex] = useState<number>()

    // when user stops dragging, anywhere on the window, reset the dragging
    // state
    useEffect(() => {
        const handler = () => {
            setDraggingOperationIndex(undefined)
        }

        window.addEventListener('mouseup', handler)
        return () => window.removeEventListener('mouseup', handler)
    }, [])

    return (
        <div className='operations-list' style={{ height: flow.length * LIST_ROW_HEIGHT + LIST_EDGE_PADDING * 2 }}>
            {flow.map((operation, index) => {

                return (
                    <Fragment key={operation.id}>
                        {index === 0 &&
                            <DropTarget
                                index={index}
                                draggingOperationIndex={draggingOperationIndex}
                                setHoveredDropTargetIndex={setHoveredDropTargetIndex}
                                moveOperation={moveOperation}
                            />}

                        <OperationListItem
                            operation={operation}
                            onChange={newOperation => replaceOperation(index, newOperation)}
                            dragging={draggingOperationIndex === index}
                            onDragStart={() => setDraggingOperationIndex(index)}
                            hovered={hoveredOperationIndex != null && hoveredOperationIndex >= index}
                            onMouseEnter={() => setHoveredOperationIndex(index)}
                            onMouseLeave={() => {
                                if (hoveredOperationIndex === index) {
                                    setHoveredOperationIndex(undefined)
                                }
                            }}
                            onDelete={() => deleteOperation(index)}
                            style={{
                                top: LIST_ROW_SPACING + (hoveredDropTargetIndex != null && hoveredDropTargetIndex <= index
                                    ? (index + 1) * LIST_ROW_HEIGHT
                                    : index * LIST_ROW_HEIGHT)
                            }}
                        />

                        <DropTarget
                            index={index}
                            draggingOperationIndex={draggingOperationIndex}
                            setHoveredDropTargetIndex={setHoveredDropTargetIndex}
                            moveOperation={moveOperation}
                        />
                    </Fragment>
                )
            })}
        </div>
    )
})

/**
 * When an operation is being dragged by the user, these are big invisible
 * boxes that overlay the gaps between items to detect "drops". They're bigger
 * than the actual gap and overlap neighboring items so that the user has a
 * more generout target.
 */
const DropTarget: FC<{
    index: number,
    draggingOperationIndex: number | undefined,
    setHoveredDropTargetIndex: (x: number | undefined) => void,
    moveOperation: (fromIndex: number, toIndex: number) => void
}> = memo(({ index, draggingOperationIndex, setHoveredDropTargetIndex, moveOperation }) => {
    const dropTargetHeight = 50

    const handleMouseEnter = useCallback(() => {
        if (draggingOperationIndex != null) {
            setHoveredDropTargetIndex(index)
        }
    }, [draggingOperationIndex, index, setHoveredDropTargetIndex])

    const handleMouseLeave = useCallback(() => {
        setHoveredDropTargetIndex(undefined)
    }, [setHoveredDropTargetIndex])

    const handleMouseUp = useCallback(() => {
        if (draggingOperationIndex != null) {
            moveOperation(draggingOperationIndex, index)
        }
    }, [draggingOperationIndex, index, moveOperation])

    return (
        <div
            className="drop-target"
            style={{
                height: dropTargetHeight,
                top: LIST_ROW_SPACING + index * LIST_ROW_HEIGHT - dropTargetHeight / 2,

                // drop targets ignore pointer events until we're dragging
                // something, so that they don't block the actual fields
                pointerEvents: draggingOperationIndex != null ? 'all' : undefined
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
        />
    )
})

/**
 * The entry for one stack operation in the list
 */
export const OperationListItem: FC<OperationFormProps<Operation> & {
    dragging: boolean,
    onDragStart: () => void,
    hovered: boolean,
    onMouseEnter: () => void,
    onMouseLeave: () => void,
    onDelete: () => void,
    style: CSSProperties
}> = memo(({ operation, onChange, dragging, onDragStart, hovered, onMouseEnter, onMouseLeave, onDelete, style }) => {

    /**
     * When the user first starts dragging an item, move it to the cursor and
     * report that we're dragging it now
     */
    const handleDragStart: MouseEventHandler<HTMLDivElement> = useCallback(e => {
        setMousePos({ x: e.clientX, y: e.clientY })
        onDragStart()
    }, [onDragStart])

    // the current mouse position, if this item is being dragged
    const [mousePos, setMousePos] = useState<{ x: number, y: number }>()

    // while dragging an item, whenever the mouse moves, we record the mouse
    // position so that the item can be positioned there
    useEffect(() => {
        if (dragging) {
            const handler = (e: MouseEvent) => {
                setMousePos({ x: e.clientX, y: e.clientY })
            }

            window.addEventListener('mousemove', handler)
            return () => window.removeEventListener('mousemove', handler)
        } else {
            setMousePos(undefined) // clear it becaues we're done
        }
    }, [dragging])

    const baseStyle = {
        ...style,
        boxShadow: hovered ? '0px 0px 5px ' + BLUE : undefined,
    }

    // if the mouse position is being set because we're dragging, override the
    // base list item styles to anchor it to the mouse
    const completeStyle =
        mousePos
            ? {
                ...baseStyle,
                position: 'fixed',
                transition: 'none',
                zIndex: 2,
                top: mousePos.y - 32,
                left: mousePos.x - 27,
                pointerEvents: 'none'
            } as const
            : baseStyle

    return (
        <div className='operation-list-item' style={completeStyle}>
            <div className='name' onMouseDown={handleDragStart} style={{ background: OPERATION_COLORS[operation.name] }}>
                <span className="material-icons">drag_indicator</span>
                {capitalizeFirst(operation.name)}
            </div>

            <div className='form'>
                {operation.name === 'deposit' ?
                    <DepositOperationForm operation={operation} onChange={onChange} />
                    : operation.name === 'pattern' ?
                        <PatternOperationForm operation={operation} onChange={onChange} />
                        :
                        <EtchOperationForm operation={operation} onChange={onChange} />}

                <div className='spacer' />

                <button className='preview-button' onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                    <span className="material-icons">visibility</span>
                </button>

                <button className='delete-button' onClick={onDelete}>
                    <span className="material-icons">close</span>
                </button>
            </div>
        </div>
    )
})

type OperationFormProps<TOperation> = {
    operation: TOperation,
    onChange: (operation: Operation) => void
}

const DepositOperationForm: FC<OperationFormProps<DepositOperation>> = memo(({ operation, onChange }) => {

    return (
        <>
            <label>
                Material:
                &nbsp;
                <select
                    value={operation.material}
                    onChange={e => onChange({ ...operation, material: e.target.value as MaterialName })}
                    style={{ background: MATERIAL_COLORS[operation.material] }}
                >
                    {Object.keys(MATERIALS).map(material =>
                        <option
                            value={material}
                            key={material}
                        >
                            {material}
                        </option>)}
                </select>
            </label>

            &nbsp;

            <label>
                Layers ({MATERIALS[operation.material].thickness}nm per layer):
                &nbsp;
                <NumberInput
                    value={operation.numLayers}
                    onChange={numLayers => onChange({ ...operation, numLayers })}
                />
            </label>
        </>
    )
})

const PatternOperationForm: FC<OperationFormProps<PatternOperation>> = memo(({ operation, onChange }) => {

    return (
        <>
            <div></div>
            {SECTORS.map(sector =>
                <label key={sector}>
                    <input
                        type="radio"
                        checked={operation.sector === sector}
                        onChange={() => onChange({ ...operation, sector })}
                    />
                    {capitalizeFirst(sector)}
                </label>
            )}
        </>
    )
})

const EtchOperationForm: FC<OperationFormProps<EtchOperation>> = memo(({ operation, onChange }) => {

    return (
        <>
            <label>
                Duration (in seconds):
                &nbsp;
                <NumberInput
                    value={operation.duration}
                    onChange={duration => onChange({ ...operation, duration })}
                />
            </label>
        </>
    )
})

const NumberInput: FC<{ value: number, onChange: (val: number) => void }> = memo(({ value, onChange }) => {
    // we have to track a raw string value to allow the user to type temporarily 
    // malformed numbers in the field without losing their progress 
    const [textValue, setTextValue] = useState(String(value))

    const handleChange = useCallback((e: InputEvent) => {
        const target = e.target as HTMLInputElement
        setTextValue(target.value)
        if (!isNaN(Number(target.value))) {
            onChange(Number(target.value))
        }
    }, [onChange])

    return (
        <input
            type="number"
            value={textValue}
            // @ts-expect-error Can't get the types to line up but it's very simply correct
            onChange={handleChange}
            min={0}
        />

    )
})