import { expect, test } from "bun:test"
import { ddrByte0Example } from "../examples/am62l"
import { expectSolverToMatchSvgSnapshot } from "./fixtures/solver-svg-snapshot"
import {
  cloneInput,
  deepFreeze,
  solveSuccessfully,
} from "./fixtures/solver-test-utils"

test("caller connection data is preserved", async () => {
  const input = deepFreeze(cloneInput(ddrByte0Example))
  const before = JSON.stringify(input)

  solveSuccessfully(input)

  expect(JSON.stringify(input)).toBe(before)
  expect(Object.isFrozen(input)).toBe(true)
  expect(
    input.connections.every((connection) => Object.isFrozen(connection)),
  ).toBe(true)
  await expectSolverToMatchSvgSnapshot({
    input,
    testPath: import.meta.path,
    snapshotName: "frozen-caller-input",
  })
})
