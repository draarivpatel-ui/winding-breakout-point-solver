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

test("Glider buses share breakout capacity across their allowed layers", async () => {
  const solver = new WindingBreakoutSolver(input)
  solver.solve()
  expect(solver.solved).toBe(true)
  const points = solver.getOutput().breakoutPoints
  expect(points).toHaveLength(54)
  for (const layer of ["top", "inner2", "bottom"]) {
    expect(points.filter((point) => point.layer === layer)).toHaveLength(18)
  }

  const graphics = createSolverPhaseVisualization({
    input,
    phase: "Glider U1: 54 breakout points placed",
    detail: "18 per layer; same 16.80mm edge and 0.89mm spacing",
    state: {
      referenceOrder: points.map((point) => point.connectionId),
      breakoutPoints: points,
    },
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
