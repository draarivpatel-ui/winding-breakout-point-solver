import { expect } from "bun:test"
import { type GraphicsObject, getSvgFromGraphicsObject } from "graphics-debug"
import { stackSvgsHorizontally, stackSvgsVertically } from "stack-svgs"
import {
  WindingBreakoutSolver,
  type WindingBreakoutSolverInput,
} from "../../lib"
import { getLayerNames } from "../../lib/get-layer-names"

const isFinitePoint = (point: { x: number; y: number }): boolean =>
  Number.isFinite(point.x) && Number.isFinite(point.y)

const MIN_SNAPSHOT_STROKE_WIDTH = 1.5
const PANEL_WIDTH = 600
const PANEL_HEADER_HEIGHT = 88
const PANEL_BODY_HEIGHT = 512

const STANDARD_LAYER_COLORS: Readonly<Record<string, string>> = {
  top: "#dc2626",
  inner1: "#d97706",
  inner2: "#7c3aed",
  inner3: "#db2777",
  inner4: "#059669",
  inner5: "#0891b2",
  inner6: "#65a30d",
  bottom: "#2563eb",
}

const FALLBACK_LAYER_COLORS = [
  "#0f766e",
  "#9333ea",
  "#c2410c",
  "#4f46e5",
] as const

const ensureReadableStrokeWidths = (svg: string): string =>
  svg.replace(
    /stroke-width="([0-9.]+)(?:px)?"/g,
    (attribute, rawWidth: string) =>
      Number(rawWidth) < MIN_SNAPSHOT_STROKE_WIDTH
        ? `stroke-width="${MIN_SNAPSHOT_STROKE_WIDTH}"`
        : attribute,
  )

const getLayerColor = (layerName: string, index: number): string =>
  STANDARD_LAYER_COLORS[layerName] ??
  FALLBACK_LAYER_COLORS[index % FALLBACK_LAYER_COLORS.length]!

const getColorForGraphicsLayer = (
  graphicsLayer: string | undefined,
  layerNames: readonly string[],
): string | undefined => {
  if (!graphicsLayer) return undefined
  const indexes = graphicsLayer.match(/[0-9]+/g)?.map(Number) ?? []
  if (indexes.length !== 1) return "#64748b"
  const layerIndex = indexes[0]!
  const layerName = layerNames[layerIndex]
  if (!layerName) return "#64748b"
  return getLayerColor(layerName, layerIndex)
}

const escapeXml = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

const createPanelHeaderSvg = ({
  title,
  subtitle,
  note,
}: {
  title: string
  subtitle: string
  note?: string
}): string =>
  `<svg width="${PANEL_WIDTH}" height="${PANEL_HEADER_HEIGHT}" viewBox="0 0 ${PANEL_WIDTH} ${PANEL_HEADER_HEIGHT}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><text x="16" y="25" font-family="sans-serif" font-size="17" font-weight="700" fill="#0f172a">${escapeXml(title)}</text><text x="16" y="49" font-family="sans-serif" font-size="13" fill="#475569">${subtitle}</text>${note ? `<text x="16" y="70" font-family="sans-serif" font-size="11" fill="#64748b">${escapeXml(note)}</text>` : ""}</svg>`

const addPanelHeader = ({
  svg,
  title,
  subtitle,
  note,
}: {
  svg: string
  title: string
  subtitle: string
  note?: string
}): string =>
  stackSvgsVertically([createPanelHeaderSvg({ title, subtitle, note }), svg], {
    gap: 0,
    normalizeSize: false,
  })

const createLayerLegend = (layerNames: readonly string[]): string =>
  layerNames
    .map(
      (layerName, index) =>
        `<tspan fill="${getLayerColor(layerName, index)}">${escapeXml(layerName.toUpperCase())}</tspan><tspan fill="#64748b">   </tspan>`,
    )
    .join("")

const recolorGraphicsByLayer = (
  graphics: GraphicsObject,
  input: WindingBreakoutSolverInput,
): GraphicsObject => {
  const layerNames = getLayerNames(input)
  const layerColor = (graphicsLayer: string | undefined) =>
    getColorForGraphicsLayer(graphicsLayer, layerNames)
  return {
    ...graphics,
    lines: graphics.lines?.map((line) => {
      const color = layerColor(line.layer)
      return color ? { ...line, strokeColor: `${color}99` } : line
    }),
    infiniteLines: graphics.infiniteLines?.map((line) => {
      const color = layerColor(line.layer)
      return color ? { ...line, strokeColor: `${color}99` } : line
    }),
    circles: graphics.circles?.map((circle) => {
      const color = layerColor(circle.layer)
      return color ? { ...circle, fill: `${color}30`, stroke: color } : circle
    }),
    points: graphics.points?.map((point) => {
      const color = layerColor(point.layer)
      return color ? { ...point, color } : point
    }),
    polygons: graphics.polygons?.map((polygon) => {
      const color = layerColor(polygon.layer)
      return color ? { ...polygon, fill: `${color}20`, stroke: color } : polygon
    }),
  }
}

const renderGraphicsSvg = ({
  graphics,
  includeTextLabels,
  svgWidth,
  svgHeight,
}: {
  graphics: GraphicsObject
  includeTextLabels: boolean
  svgWidth: number
  svgHeight: number
}): string =>
  ensureReadableStrokeWidths(
    getSvgFromGraphicsObject(graphics, {
      backgroundColor: "#ffffff",
      includeTextLabels,
      svgWidth,
      svgHeight,
    }),
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
  let showLayerComparison = false
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
    showLayerComparison = solver.solved && !solver.failed
  } catch (error) {
    graphics = createInvalidInputGraphics(
      input,
      error instanceof Error ? error.message : String(error),
    )
  }
  const svg = (
    showLayerComparison
      ? stackSvgsHorizontally(
          [
            addPanelHeader({
              svg: renderGraphicsSvg({
                graphics,
                includeTextLabels,
                svgWidth: PANEL_WIDTH,
                svgHeight: PANEL_BODY_HEIGHT,
              }),
              title: "CONNECTION / NET COLORS",
              subtitle:
                "Each color follows one connection through its assigned gates",
            }),
            addPanelHeader({
              svg: renderGraphicsSvg({
                graphics: recolorGraphicsByLayer(graphics, input),
                includeTextLabels,
                svgWidth: PANEL_WIDTH,
                svgHeight: PANEL_BODY_HEIGHT,
              }),
              title: "PCB LAYER COLORS",
              subtitle: createLayerLegend(getLayerNames(input)),
              note: "Gray = shared or multi-layer geometry",
            }),
          ],
          {
            gap: 16,
            normalizeSize: false,
            rootAttributes: {
              "data-color-views": "connection-and-layer",
            },
          },
        )
      : renderGraphicsSvg({
          graphics,
          includeTextLabels,
          svgWidth: 1200,
          svgHeight: 800,
        })
  ).replace(/[ \t]+$/gm, "")
  await expect(svg).toMatchSvgSnapshot(testPath, snapshotName)
}
