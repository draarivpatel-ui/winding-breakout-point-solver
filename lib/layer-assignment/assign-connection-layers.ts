import { getGateAxisLayout } from "../gate-placement/get-gate-axis-layout"
import type { ValidatedWindingInput } from "../input/validate-winding-breakout-input"
import { getBusLayerCandidates } from "../input/get-bus-layer-candidates"
import type { BreakoutPoint } from "../types"

type BreakoutLayer = BreakoutPoint["layer"]

export interface ConnectionLayerAssignment {
  readonly layerByConnection: Readonly<Record<string, string>>
  readonly layerNames: readonly string[]
}

const getAtomicUnits = (
  connectionIds: readonly string[],
  atomicGroups: readonly (readonly [string, string])[],
): readonly (readonly string[])[] => {
  const connectionSet = new Set(connectionIds)
  const groupByConnection = new Map(
    atomicGroups.flatMap((group) =>
      group.map((connectionId) => [connectionId, group] as const),
    ),
  )
  const addedGroups = new Set<readonly [string, string]>()
  const units: Array<readonly string[]> = []
  for (const connectionId of connectionIds) {
    const group = groupByConnection.get(connectionId)
    if (!group) {
      units.push([connectionId])
      continue
    }
    if (addedGroups.has(group)) continue
    addedGroups.add(group)
    units.push(group.filter((memberId) => connectionSet.has(memberId)))
  }
  return units
}

/** Assign fixed buses directly and spread flexible buses over their candidates. */
export const assignConnectionLayers = ({
  validated,
  referenceOrder,
  boundaryPointSpacing,
}: {
  validated: ValidatedWindingInput
  referenceOrder: readonly string[]
  boundaryPointSpacing: number
}): ConnectionLayerAssignment => {
  const assignments = new Map<string, string>()

  for (const bus of validated.buses) {
    const busConnectionSet = new Set(bus.connectionIds)
    const orderedBusConnections = referenceOrder.filter((connectionId) =>
      busConnectionSet.has(connectionId),
    )
    const candidates = getBusLayerCandidates(bus)
    const units = getAtomicUnits(
      orderedBusConnections,
      validated.atomicConnectionGroups,
    )

    // NOTE: preferredLayer is a permanent assignment despite its legacy name;
    // getBusLayerCandidates therefore returns exactly one layer for that case.
    for (const [unitIndex, unit] of units.entries()) {
      const layer = candidates[unitIndex % candidates.length]!
      for (const connectionId of unit) assignments.set(connectionId, layer)
    }
  }

  for (const connectionId of referenceOrder) {
    if (!assignments.has(connectionId)) assignments.set(connectionId, "top")
  }

  const connectionCountByLayer = new Map<BreakoutLayer, number>()
  for (const layer of assignments.values()) {
    connectionCountByLayer.set(
      layer,
      (connectionCountByLayer.get(layer) ?? 0) + 1,
    )
  }
  const { capacityPerLayer } = getGateAxisLayout({
    regions: validated.regions,
    spacing: boundaryPointSpacing,
    layerCount: connectionCountByLayer.size,
  })
  const exceedsEdgeCapacity = [...connectionCountByLayer.values()].some(
    (count) => count > capacityPerLayer,
  )
  if (exceedsEdgeCapacity) {
    const capacityWithAllLayers = getGateAxisLayout({
      regions: validated.regions,
      spacing: boundaryPointSpacing,
      layerCount: validated.layerNames.length,
    }).capacityPerLayer
    for (const bus of validated.buses) {
      const candidates = getBusLayerCandidates(bus)
      const units = getAtomicUnits(
        bus.connectionIds,
        validated.atomicConnectionGroups,
      )
      for (const unit of units) {
        const layer = assignments.get(unit[0]!)!
        if (connectionCountByLayer.get(layer)! <= capacityWithAllLayers) {
          continue
        }
        const destinationLayer = candidates.find(
          (candidate) =>
            (connectionCountByLayer.get(candidate) ?? 0) + unit.length <=
            capacityWithAllLayers,
        )
        if (!destinationLayer) continue
        for (const connectionId of unit) {
          assignments.set(connectionId, destinationLayer)
        }
        connectionCountByLayer.set(
          layer,
          connectionCountByLayer.get(layer)! - unit.length,
        )
        connectionCountByLayer.set(
          destinationLayer,
          (connectionCountByLayer.get(destinationLayer) ?? 0) + unit.length,
        )
      }
    }
  }

  const layerByConnection = Object.fromEntries(
    referenceOrder.map((connectionId) => [
      connectionId,
      assignments.get(connectionId)!,
    ]),
  )
  const layerNames = [...new Set(Object.values(layerByConnection))].sort(
    (first, second) => first.localeCompare(second),
  )
  return { layerByConnection, layerNames }
}
