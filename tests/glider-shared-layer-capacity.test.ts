import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import { getSvgFromGraphicsObject } from "graphics-debug"
import { WindingBreakoutSolver, type WindingBreakoutSolverInput } from "../lib"
import { createSolverPhaseVisualization } from "../lib/visualization/create-solver-phase-visualization"

// Captured from spaced Glider U1: two DDR byte buses and 38 other connections.
const input: WindingBreakoutSolverInput = JSON.parse(
  gunzipSync(
    readFileSync(
      new URL("./fixtures/glider-spaced-u1.json.gz", import.meta.url),
    ),
  ).toString(),
)

test("Glider buses overfill one layer while other layers have room", async () => {
  const solver = new WindingBreakoutSolver(input)
  expect(() => solver.solve()).toThrow(
    "declared breakout edges need 16.91mm but expose only 16.80mm",
  )
  expect(solver.solved).toBe(false)

  const graphics = createSolverPhaseVisualization({
    input,
    phase: "Glider U1: placement failed",
    detail: "54 connections; needs 16.91mm on a 16.80mm edge",
  })
  await expect(
    getSvgFromGraphicsObject(graphics, {
      backgroundColor: "white",
      includeTextLabels: false,
      svgWidth: 1000,
      svgHeight: 800,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
