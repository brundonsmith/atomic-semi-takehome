import type { Operation, MaterialName } from "./model"

/**
 * Capitalize the first letter of a string
 */
export const capitalizeFirst = (s: string) => s[0]?.toLocaleUpperCase() + s.substring(1)

export const randomID = () => String(Math.random()).substring(2)


// Atomic Semi colors
export const BLUE = '#728af7'
export const PURPLE = '#bfa1c4'
export const YELLOW = '#f6dd75'

export const ORANGE = '#df8c68'
export const GREEN = '#87c76f'
export const GRAY = '#d2d3d4'

/**
 * Colors corresponding to each Operation type
 */
export const OPERATION_COLORS: Record<Operation['name'], string> = {
    deposit: 'rgba(135, 199, 111, 0.5)',
    pattern: 'rgba(223, 140, 104, 0.5)',
    etch: 'rgba(210, 211, 212, 0.5)'
} as const

/**
 * Colors corresponding to each material
 */
export const MATERIAL_COLORS: Record<MaterialName, string> = {
    A: BLUE,
    B: PURPLE,
    C: YELLOW
} as const
