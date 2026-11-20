import type { ValidatedWindingInput } from "../input/validate-winding-breakout-input"
import {
  getBusLayerCandidates,
  getLayerCandidatesByConnection,
} from "../input/get-bus-layer-candidates"
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

/** Assign fixed buses directly and spread flexible buses over shared layer capacity. */
export const assignConnectionLayers = ({
  validated,
  referenceOrder,
}: {
  validated: ValidatedWindingInput
  referenceOrder: readonly string[]
}): ConnectionLayerAssignment => {
  const assignments = new Map<string, string>()
  const connectionCountByLayer = new Map<BreakoutLayer, number>()
  // Reserve exclusive layers before placing flexible atomic units.
  for (const candidates of Object.values(
    getLayerCandidatesByConnection(validated),
  )) {
    if (candidates.length !== 1) continue
    const layer = candidates[0]!
    connectionCountByLayer.set(
      layer,
      (connectionCountByLayer.get(layer) ?? 0) + 1,
    )
  }

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
    for (const unit of units) {
      const layer = candidates.reduce((leastLoadedLayer, candidateLayer) => {
        if (
          (connectionCountByLayer.get(candidateLayer) ?? 0) <
          (connectionCountByLayer.get(leastLoadedLayer) ?? 0)
        ) {
          return candidateLayer
        }
        return leastLoadedLayer
      })
      for (const connectionId of unit) assignments.set(connectionId, layer)
      if (candidates.length > 1) {
        connectionCountByLayer.set(
          layer,
          (connectionCountByLayer.get(layer) ?? 0) + unit.length,
        )
      }
    }
  }

  for (const connectionId of referenceOrder) {
    if (!assignments.has(connectionId)) assignments.set(connectionId, "top")
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
