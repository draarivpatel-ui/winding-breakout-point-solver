import { expect, test } from "bun:test"
import { ddrByte0Example } from "../examples/am62l"
import {
  WindingBreakoutOutputUnavailableError,
  WindingBreakoutSolver,
} from "../lib"
import { expectSolverToMatchSvgSnapshot } from "./fixtures/solver-svg-snapshot"

test("getOutput is unavailable until a successful solve", async () => {
  const solver = new WindingBreakoutSolver(ddrByte0Example)

  expect(() => solver.getOutput()).toThrow(
    WindingBreakoutOutputUnavailableError,
  )
  expect(solver.solved).toBe(false)
  expect(solver.failed).toBe(false)
  await expectSolverToMatchSvgSnapshot({
    input: ddrByte0Example,
    solver,
    solve: false,
    testPath: import.meta.path,
    snapshotName: "before-solve",
  })
})
