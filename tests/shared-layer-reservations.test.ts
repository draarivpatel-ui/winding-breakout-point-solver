import { expect, test } from "bun:test"
import { WindingBreakoutSolver, type WindingBreakoutSolverInput } from "../lib"

test("overfull pairs preserve fixed and unbused layers", () => {
  const connections = [
    "CLK_P",
    "CLK_N",
    "CMD",
    "DQS_P",
    "DQS_N",
    "DATA",
    "RESET_N",
    "IRQ",
  ].map((id, index) => ({
    id,
    endpoints: [{ regionId: "breakout", position: { x: 6, y: index * 0.2 } }],
  }))
  const input: WindingBreakoutSolverInput = {
    regions: [
      {
        id: "breakout",
        bounds: { minX: 0, maxX: 12, minY: 0, maxY: 3.5 },
        edge: "right",
      },
    ],
    connections: [
      { type: "differential", connections: [connections[0]!, connections[1]!] },
      connections[2]!,
      { type: "differential", connections: [connections[3]!, connections[4]!] },
      ...connections.slice(5),
    ],
    buses: [
      {
        id: "clock_and_command",
        connectionIds: ["CLK_P", "CLK_N", "CMD"],
        preferredLayers: ["top", "bottom"],
      },
      {
        id: "strobe_and_data",
        connectionIds: ["DQS_P", "DQS_N", "DATA"],
        preferredLayers: ["top", "bottom"],
      },
      {
        id: "reset",
        connectionIds: ["RESET_N"],
        preferredLayer: "top",
        preferredLayers: ["bottom"],
      },
    ],
    boundaryPointSpacing: 1,
  }
  const solver = new WindingBreakoutSolver(input)
  solver.solve()
  const points = solver.getOutput().breakoutPoints
  expect(points.filter((point) => point.layer === "top")).toHaveLength(4)
  expect(points.filter((point) => point.layer === "bottom")).toHaveLength(4)
  for (const connectionId of ["RESET_N", "IRQ"]) {
    expect(
      points.find((point) => point.connectionId === connectionId)!.layer,
    ).toBe("top")
  }
  for (const pairIds of [
    ["CLK_P", "CLK_N"],
    ["DQS_P", "DQS_N"],
  ]) {
    const pairPoints = points.filter((point) =>
      pairIds.includes(point.connectionId),
    )
    expect(pairPoints[0]!.layer).toBe(pairPoints[1]!.layer)
    expect(pairPoints[1]!.y - pairPoints[0]!.y).toBeCloseTo(1)
  }
})
