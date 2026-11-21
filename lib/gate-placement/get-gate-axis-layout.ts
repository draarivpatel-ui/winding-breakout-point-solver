import type { ValidatedRegion } from "../input/validate-winding-breakout-input"

export const getGateAxisLayout = ({
  regions,
  spacing,
  layerCount,
}: {
  regions: readonly ValidatedRegion[]
  spacing: number
  layerCount: number
}): {
  vertical: boolean
  minAxis: number
  maxAxis: number
  capacityPerLayer: number
} => {
  const vertical = regions.every(
    (region) => region.edge === "left" || region.edge === "right",
  )
  const minAxis = Math.max(
    ...regions.map((region) =>
      vertical ? region.bounds.minY : region.bounds.minX,
    ),
  )
  const maxAxis = Math.min(
    ...regions.map((region) =>
      vertical ? region.bounds.maxY : region.bounds.maxX,
    ),
  )
  const staggerSpan = ((layerCount - 1) * spacing) / 2
  const capacityPerLayer =
    Math.floor((maxAxis - minAxis - staggerSpan + 1e-9) / spacing) + 1
  return { vertical, minAxis, maxAxis, capacityPerLayer }
}
