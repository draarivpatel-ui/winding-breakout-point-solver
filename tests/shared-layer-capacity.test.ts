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

test("captures buses overfilling top while bottom capacity is available", async () => {
  const solver = new WindingBreakoutSolver(input)

  expect(() => solver.solve()).toThrow(
    "declared breakout edges need 5.50mm but expose only 3.50mm",
  )
  expect(solver.solved).toBe(false)
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
