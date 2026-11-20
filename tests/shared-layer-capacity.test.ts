import { expect, test } from "bun:test"
import { getSvgFromGraphicsObject } from "graphics-debug"
import { WindingBreakoutSolver, type WindingBreakoutSolverInput } from "../lib"

const input: WindingBreakoutSolverInput = {
  regions: [
    {
      id: "breakout",
      bounds: { minX: 0, maxX: 12, minY: 0, maxY: 3.5 },
      edge: "right",
    },
  ],
  connections: [
    {
      type: "differential",
      connections: [
        {
          id: "CLK_P",
          endpoints: [{ regionId: "breakout", position: { x: 6, y: 0 } }],
        },
        {
          id: "CLK_N",
          endpoints: [{ regionId: "breakout", position: { x: 6, y: 0.2 } }],
        },
      ],
    },
    {
      id: "CMD",
      endpoints: [{ regionId: "breakout", position: { x: 6, y: 0.4 } }],
    },
    {
      type: "differential",
      connections: [
        {
          id: "DQS_P",
          endpoints: [{ regionId: "breakout", position: { x: 6, y: 0.6 } }],
        },
        {
          id: "DQS_N",
          endpoints: [{ regionId: "breakout", position: { x: 6, y: 0.8 } }],
        },
      ],
    },
    {
      id: "DATA",
      endpoints: [{ regionId: "breakout", position: { x: 6, y: 1 } }],
    },
    {
      id: "RESET_N",
      endpoints: [{ regionId: "breakout", position: { x: 6, y: 1.2 } }],
    },
    {
      id: "IRQ",
      endpoints: [{ regionId: "breakout", position: { x: 6, y: 1.4 } }],
    },
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

test("buses share layer capacity while preserving fixed layers and pairs", async () => {
  const solver = new WindingBreakoutSolver(input)
  solver.solve()

  expect(solver.solved).toBe(true)
  const points = solver.getOutput().breakoutPoints
  const topPoints = points.filter((point) => point.layer === "top")
  const bottomPoints = points.filter((point) => point.layer === "bottom")

  expect(topPoints.map((point) => point.connectionId)).toEqual([
    "CMD",
    "DATA",
    "RESET_N",
    "IRQ",
  ])
  expect(bottomPoints.map((point) => point.connectionId)).toEqual([
    "CLK_P",
    "CLK_N",
    "DQS_P",
    "DQS_N",
  ])
  expect(bottomPoints[1]!.y - bottomPoints[0]!.y).toBeCloseTo(1)
  expect(bottomPoints[3]!.y - bottomPoints[2]!.y).toBeCloseTo(1)
  expect(Math.min(...points.map((point) => point.y))).toBeGreaterThanOrEqual(0)
  expect(Math.max(...points.map((point) => point.y))).toBeLessThanOrEqual(3.5)
  await expect(
    getSvgFromGraphicsObject(
      solver.finalVisualize() ?? solver.initialVisualize(),
      {
        backgroundColor: "white",
        includeTextLabels: true,
        svgWidth: 800,
        svgHeight: 500,
      },
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
