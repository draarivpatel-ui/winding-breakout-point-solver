import { test } from "bun:test"
import type { WindingBreakoutSolverInput } from "../lib"
import { expectSolverExampleToMatchSvgSnapshot } from "./fixtures/solver-svg-snapshot"

// The destination field is intentionally present in this pre-change visual
// baseline. The current solver ignores it; #6 consumes it when choosing the
// best breakout edge. The snapshot helper renders it in both versions so the
// before/after geometry remains directly comparable.
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

const mcuToSpiFlash = {
  regions: [
    {
      id: "U2 · MCU",
      bounds: { minX: -6, maxX: -2, minY: -2.5, maxY: 2.5 },
      edge: "right",
    },
    {
      id: "U3 · SPI flash",
      bounds: { minX: 2, maxX: 6, minY: -2.5, maxY: 2.5 },
      edge: "left",
    },
  ],
  connections: [
    {
      id: "FLASH_CS_N",
      endpoints: [
        { regionId: "U2 · MCU", position: { x: -2.6, y: -1.5 } },
        { regionId: "U3 · SPI flash", position: { x: 2.6, y: -1.5 } },
      ],
    },
    {
      id: "SPI_MISO",
      endpoints: [
        { regionId: "U2 · MCU", position: { x: -2.6, y: -0.5 } },
        { regionId: "U3 · SPI flash", position: { x: 2.6, y: -0.5 } },
      ],
    },
    {
      id: "SPI_SCLK",
      endpoints: [
        { regionId: "U2 · MCU", position: { x: -2.6, y: 1.5 } },
        { regionId: "U3 · SPI flash", position: { x: 2.6, y: 1.5 } },
      ],
    },
    {
      id: "SPI_MOSI",
      endpoints: [
        { regionId: "U2 · MCU", position: { x: -2.6, y: 0.5 } },
        { regionId: "U3 · SPI flash", position: { x: 2.6, y: 0.5 } },
      ],
    },
  ],
  buses: [
    {
      id: "spi",
      connectionIds: ["SPI_SCLK", "SPI_MOSI", "SPI_MISO", "FLASH_CS_N"],
      preferredLayer: "top",
    },
  ],
  boundaryPointSpacing: 0.5,
} satisfies WindingBreakoutSolverInput

const socToLpddr4ByteLane = {
  regions: [
    {
      id: "U4 · SoC",
      bounds: { minX: -6, maxX: -2, minY: -3, maxY: 3 },
      edge: "right",
    },
    {
      id: "U5 · LPDDR4",
      bounds: { minX: 2, maxX: 6, minY: -3, maxY: 3 },
      edge: "left",
    },
  ],
  connections: [
    {
      id: "DQ2",
      endpoints: [
        { regionId: "U4 · SoC", position: { x: -2.6, y: 0 } },
        { regionId: "U5 · LPDDR4", position: { x: 2.6, y: 0 } },
      ],
    },
    {
      type: "differential",
      connections: [
        {
          id: "DQS0_P",
          endpoints: [
            { regionId: "U4 · SoC", position: { x: -2.6, y: 1 } },
            { regionId: "U5 · LPDDR4", position: { x: 2.6, y: 1 } },
          ],
        },
        {
          id: "DQS0_N",
          endpoints: [
            { regionId: "U4 · SoC", position: { x: -2.6, y: 1.8 } },
            { regionId: "U5 · LPDDR4", position: { x: 2.6, y: 1.8 } },
          ],
        },
      ],
    },
    {
      id: "DQ0",
      endpoints: [
        { regionId: "U4 · SoC", position: { x: -2.6, y: -0.8 } },
        { regionId: "U5 · LPDDR4", position: { x: 2.6, y: -0.8 } },
      ],
    },
    {
      id: "DQ1",
      endpoints: [
        { regionId: "U4 · SoC", position: { x: -2.6, y: -1.6 } },
        { regionId: "U5 · LPDDR4", position: { x: 2.6, y: -1.6 } },
      ],
    },
  ],
  buses: [
    {
      id: "byte-0-data",
      connectionIds: ["DQ0", "DQ1", "DQ2"],
      preferredLayer: "inner1",
    },
    {
      id: "byte-0-strobe",
      connectionIds: ["DQS0_P", "DQS0_N"],
      preferredLayer: "inner2",
    },
  ],
  boundaryPointSpacing: 0.75,
} satisfies WindingBreakoutSolverInput

test("QFP16 controller breaks out toward a header and reset resistor", async () => {
  await expectSolverExampleToMatchSvgSnapshot({
    input: qfp16ToHeaderAndReset,
    title: "QFP16 controller → header + reset resistor",
    testPath: import.meta.path,
    snapshotName: "qfp16-header-and-reset",
  })
})

test("MCU SPI bus breaks out toward a flash package", async () => {
  await expectSolverExampleToMatchSvgSnapshot({
    input: mcuToSpiFlash,
    title: "MCU ↔ SPI flash · fixed top-layer bus",
    testPath: import.meta.path,
    snapshotName: "mcu-to-spi-flash",
  })
})

test("SoC LPDDR4 byte lane keeps the strobe pair adjacent", async () => {
  await expectSolverExampleToMatchSvgSnapshot({
    input: socToLpddr4ByteLane,
    title: "SoC ↔ LPDDR4 byte-lane excerpt · data + differential strobe",
    testPath: import.meta.path,
    snapshotName: "soc-to-lpddr4-byte-lane",
  })
})
