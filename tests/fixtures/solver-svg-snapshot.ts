import { expect } from "bun:test"
import { type GraphicsObject, getSvgFromGraphicsObject } from "graphics-debug"
import {
  WindingBreakoutSolver,
  type WindingBreakoutSolverInput,
} from "../../lib"

const isFinitePoint = (point: { x: number; y: number }): boolean =>
  Number.isFinite(point.x) && Number.isFinite(point.y)

const MIN_SNAPSHOT_STROKE_WIDTH = 1.5

const ensureReadableStrokeWidths = (svg: string): string =>
  svg.replace(
    /stroke-width="([0-9.]+)(?:px)?"/g,
    (attribute, rawWidth: string) =>
      Number(rawWidth) < MIN_SNAPSHOT_STROKE_WIDTH
        ? `stroke-width="${MIN_SNAPSHOT_STROKE_WIDTH}"`
        : attribute,
  )

const createInvalidInputGraphics = (
  input: WindingBreakoutSolverInput,
  error: string,
): GraphicsObject => {
  const finiteRegions = input.regions.filter(
    (region) =>
      Number.isFinite(region.bounds.minX) &&
      Number.isFinite(region.bounds.maxX) &&
      Number.isFinite(region.bounds.minY) &&
      Number.isFinite(region.bounds.maxY),
  )
  const minX =
    finiteRegions.length > 0
      ? Math.min(...finiteRegions.map((region) => region.bounds.minX))
      : -2
  const maxY =
    finiteRegions.length > 0
      ? Math.max(...finiteRegions.map((region) => region.bounds.maxY))
      : 2
  const connections = input.connections.flatMap((connection) =>
    "type" in connection ? connection.connections : [connection],
  )
  const endpointPoints = connections.flatMap((connection) =>
    connection.endpoints.flatMap((endpoint) =>
      isFinitePoint(endpoint.position)
        ? [
            {
              ...endpoint.position,
              color: "#dc2626",
              label: `${connection.id} · ${endpoint.regionId}`,
            },
          ]
        : [],
    ),
  )
  const destinationPoints = connections.flatMap((connection) =>
    connection.endpoints.flatMap((endpoint) =>
      endpoint.externalDestination &&
      isFinitePoint(endpoint.externalDestination)
        ? [
            {
              ...endpoint.externalDestination,
              color: "#7c3aed",
              label: `${connection.id} · external destination`,
            },
          ]
        : [],
    ),
  )
  return {
    title: "Invalid winding breakout input",
    coordinateSystem: "cartesian",
    rects:
      finiteRegions.length > 0
        ? finiteRegions.map((region) => ({
            center: {
              x: (region.bounds.minX + region.bounds.maxX) / 2,
              y: (region.bounds.minY + region.bounds.maxY) / 2,
            },
            width: region.bounds.maxX - region.bounds.minX,
            height: region.bounds.maxY - region.bounds.minY,
            fill: "rgba(254, 226, 226, 0.2)",
            stroke: "#ef4444",
            label: region.id,
          }))
        : [
            {
              center: { x: 0, y: 0 },
              width: 4,
              height: 4,
              fill: "rgba(254, 226, 226, 0.2)",
              stroke: "#ef4444",
              label: "no regions",
            },
          ],
    points: [...endpointPoints, ...destinationPoints],
    texts: [
      {
        x: minX,
        y: maxY + 0.7,
        text: "Input validation failed",
        anchorSide: "bottom_left",
        color: "#991b1b",
        fontSize: 0.34,
      },
      {
        x: minX,
        y: maxY + 0.35,
        text: error,
        anchorSide: "bottom_left",
        color: "#7f1d1d",
        fontSize: 0.2,
      },
    ],
  }
}

export const expectSolverToMatchSvgSnapshot = async ({
  input,
  testPath,
  snapshotName,
  solver = new WindingBreakoutSolver(input),
  solve = true,
  graphics: suppliedGraphics,
  includeTextLabels = false,
}: {
  input: WindingBreakoutSolverInput
  testPath: string
  snapshotName: string
  solver?: WindingBreakoutSolver
  solve?: boolean
  graphics?: GraphicsObject
  includeTextLabels?: boolean
}): Promise<void> => {
  let graphics: GraphicsObject
  try {
    if (solve && !solver.solved && !solver.failed) solver.solve()
    graphics =
      suppliedGraphics ??
      (solver.failed
        ? createInvalidInputGraphics(
            input,
            solver.error ?? "Unknown solver failure",
          )
        : (solver.finalVisualize() ?? solver.initialVisualize()))
  } catch (error) {
    graphics = createInvalidInputGraphics(
      input,
      error instanceof Error ? error.message : String(error),
    )
  }
  const svg = ensureReadableStrokeWidths(
    getSvgFromGraphicsObject(graphics, {
      backgroundColor: "#ffffff",
      includeTextLabels,
      svgWidth: 1200,
      svgHeight: 800,
    }),
  ).replace(/[ \t]+$/gm, "")
  await expect(svg).toMatchSvgSnapshot(testPath, snapshotName)
}
