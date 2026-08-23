import { test } from "bun:test"
import { ddrByte0Example, fullDdrExample } from "../examples/am62l"
import type { WindingBreakoutSolverInput } from "../lib"
import { expectSolverExampleToMatchSvgSnapshot } from "./fixtures/solver-svg-snapshot"

// Keep this destination-annotated fixture byte-for-byte identical across the
// stacked PRs so the visual diff isolates solver output rather than input.
const qfp16ToHeaderAndReset = {
  regions: [
    {
      id: "U1 · QFP16 controller",
      bounds: { minX: -2, maxX: 2, minY: -2, maxY: 2 },
      edge: "right",
    },
  ],
  connections: [
    {
      id: "RESET_N",
      endpoints: [
        {
          regionId: "U1 · QFP16 controller",
          position: { x: 1.4, y: 1.4 },
          externalDestination: { x: -4.8, y: 1.5 },
        },
      ],
    },
    {
      id: "UART_TX",
      endpoints: [
        {
          regionId: "U1 · QFP16 controller",
          position: { x: 1.4, y: 0.7 },
          externalDestination: { x: 4.8, y: 1.5 },
        },
      ],
    },
    {
      id: "UART_RX",
      endpoints: [
        {
          regionId: "U1 · QFP16 controller",
          position: { x: 1.4, y: 0.1 },
          externalDestination: { x: 4.8, y: 0.5 },
        },
      ],
    },
    {
      id: "I2C_SCL",
      endpoints: [
        {
          regionId: "U1 · QFP16 controller",
          position: { x: 1.4, y: -0.5 },
          externalDestination: { x: 4.8, y: -0.5 },
        },
      ],
    },
    {
      id: "I2C_SDA",
      endpoints: [
        {
          regionId: "U1 · QFP16 controller",
          position: { x: 1.4, y: -1.1 },
          externalDestination: { x: 4.8, y: -1.5 },
        },
      ],
    },
  ],
  buses: [
    {
      id: "header-io",
      connectionIds: ["UART_TX", "UART_RX", "I2C_SCL", "I2C_SDA"],
      preferredLayer: "top",
    },
  ],
  boundaryPointSpacing: 0.55,
} as unknown as WindingBreakoutSolverInput

test("QFP16 controller breaks out toward a header and reset resistor", async () => {
  await expectSolverExampleToMatchSvgSnapshot({
    input: qfp16ToHeaderAndReset,
    title: "QFP16 controller → header + reset resistor",
    testPath: import.meta.path,
    snapshotName: "qfp16-header-and-reset",
  })
})

test("AM62L processor breaks out an LPDDR4 byte lane", async () => {
  await expectSolverExampleToMatchSvgSnapshot({
    input: ddrByte0Example,
    title: "AM62L processor ↔ LPDDR4 DRAM · byte lane 0 · 11 signals",
    includeTextLabels: false,
    testPath: import.meta.path,
    snapshotName: "am62l-lpddr4-byte0",
  })
})

test("AM62L processor breaks out the complete LPDDR4 link", async () => {
  await expectSolverExampleToMatchSvgSnapshot({
    input: fullDdrExample,
    title: "AM62L processor ↔ LPDDR4 DRAM · complete 33-signal link",
    includeTextLabels: false,
    testPath: import.meta.path,
    snapshotName: "am62l-lpddr4-full-link",
  })
})
