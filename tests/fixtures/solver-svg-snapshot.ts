import { expect } from "bun:test"
import { type GraphicsObject, getSvgFromGraphicsObject } from "graphics-debug"
import { stackSvgsHorizontally, stackSvgsVertically } from "stack-svgs"
import {
  WindingBreakoutSolver,
  type WindingBreakoutOutput,
  type WindingBreakoutSolverInput,
} from "../../lib"
import { getLayerNames } from "../../lib/get-layer-names"
import { getCanonicalConnections } from "../../lib/input/get-canonical-connections"
import { getConnectionColor } from "../../lib/visualization/get-connection-color"
import { getGraphicsLayer } from "../../lib/visualization/get-graphics-layer"

const MIN_SNAPSHOT_STROKE_WIDTH = 1.5
const PANEL_WIDTH = 600
const PANEL_BODY_HEIGHT = 480
const COMBINED_WIDTH = PANEL_WIDTH * 2 + 16
const EXAMPLE_HEADER_HEIGHT = 176
const EPSILON = 1e-9

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

interface Point {
  readonly x: number
  readonly y: number
}

interface EndpointWithExternalDestination {
  readonly externalDestination?: Point
}

interface GuidePolyline {
  readonly connectionId: string
  readonly layer: string
  readonly points: readonly Point[]
}

const ensureReadableGuideStrokes = (svg: string): string =>
  svg
    .replace(
      /stroke-width="([0-9.]+)(?:px)?"/g,
      (attribute, rawWidth: string) =>
        Number(rawWidth) < MIN_SNAPSHOT_STROKE_WIDTH
          ? `stroke-width="${MIN_SNAPSHOT_STROKE_WIDTH}"`
          : attribute,
    )
    .replace(/stroke-dasharray="[0-9. ]+"/g, 'stroke-dasharray="5 5"')

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

const createExampleHeaderSvg = ({
  title,
  solved,
  intersectionCount,
  layerNames,
}: {
  title: string
  solved: boolean
  intersectionCount: number
  layerNames: readonly string[]
}): string => {
  const status = solved ? "SOLVED" : "FAILED"
  const statusColor = solved ? "#15803d" : "#b91c1c"
  const intersectionLabel = `${intersectionCount} same-layer guide intersection${intersectionCount === 1 ? "" : "s"}`
  const rightColumnX = PANEL_WIDTH + 32
  return `<svg width="${COMBINED_WIDTH}" height="${EXAMPLE_HEADER_HEIGHT}" viewBox="0 0 ${COMBINED_WIDTH} ${EXAMPLE_HEADER_HEIGHT}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><text x="16" y="27" font-family="sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(title)}</text><text x="16" y="52" font-family="sans-serif" font-size="14"><tspan font-weight="700" fill="${statusColor}">${status}</tspan><tspan fill="#475569"> · ${escapeXml(intersectionLabel)}</tspan></text><text x="16" y="76" font-family="sans-serif" font-size="12" fill="#475569">Rectangles = breakout regions · circles = component pads · gate labels include the selected layer</text><text x="16" y="95" font-family="sans-serif" font-size="12" fill="#64748b">Dashed paths are straight-line guides, not copper traces · outer dots marked “target” are destinations</text><text x="16" y="130" font-family="sans-serif" font-size="16" font-weight="700" fill="#0f172a">CONNECTION / NET COLORS</text><text x="16" y="153" font-family="sans-serif" font-size="12" fill="#475569">Each color follows one connection through its boundary gates</text><text x="${rightColumnX}" y="130" font-family="sans-serif" font-size="16" font-weight="700" fill="#0f172a">PCB LAYER COLORS</text><text x="${rightColumnX}" y="153" font-family="sans-serif" font-size="12" fill="#475569">${createLayerLegend(layerNames)}</text><text x="${rightColumnX}" y="171" font-family="sans-serif" font-size="11" fill="#64748b">Gray = geometry shared by multiple layers</text></svg>`
}

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

const renderGraphicsSvg = (graphics: GraphicsObject): string =>
  ensureReadableGuideStrokes(
    getSvgFromGraphicsObject(graphics, {
      backgroundColor: "#ffffff",
      includeTextLabels: true,
      svgWidth: PANEL_WIDTH,
      svgHeight: PANEL_BODY_HEIGHT,
    }),
  )

const getExternalDestination = (endpoint: object): Point | undefined =>
  (endpoint as EndpointWithExternalDestination).externalDestination

const pointsEqual = (first: Point, second: Point): boolean =>
  Math.abs(first.x - second.x) < EPSILON &&
  Math.abs(first.y - second.y) < EPSILON

const createGuidePolylines = (
  input: WindingBreakoutSolverInput,
  output: WindingBreakoutOutput,
): GuidePolyline[] =>
  getCanonicalConnections(input).flatMap((connection) => {
    const breakoutPoints = output.breakoutPoints.filter(
      (point) => point.connectionId === connection.id,
    )
    const layer = breakoutPoints[0]?.layer
    if (!layer || breakoutPoints.length !== input.regions.length) return []
    const points = input.regions.flatMap((region, regionIndex) => {
      const endpoint = connection.endpoints.find(
        (candidate) => candidate.regionId === region.id,
      )
      const breakout = breakoutPoints.find(
        (candidate) => candidate.regionId === region.id,
      )
      if (!endpoint || !breakout) return []
      const destination = getExternalDestination(endpoint)
      if (input.regions.length === 1 && destination) {
        return [endpoint.position, breakout, destination]
      }
      if (regionIndex === 0) return [endpoint.position, breakout]
      return [breakout, endpoint.position]
    })
    return [{ connectionId: connection.id, layer, points }]
  })

const cross = (first: Point, second: Point): number =>
  first.x * second.y - first.y * second.x

const subtract = (first: Point, second: Point): Point => ({
  x: first.x - second.x,
  y: first.y - second.y,
})

const getSegmentIntersection = (
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
): Point | undefined => {
  const firstVector = subtract(firstEnd, firstStart)
  const secondVector = subtract(secondEnd, secondStart)
  const denominator = cross(firstVector, secondVector)
  if (Math.abs(denominator) < EPSILON) return undefined
  const betweenStarts = subtract(secondStart, firstStart)
  const firstDistance = cross(betweenStarts, secondVector) / denominator
  const secondDistance = cross(betweenStarts, firstVector) / denominator
  if (
    firstDistance < -EPSILON ||
    firstDistance > 1 + EPSILON ||
    secondDistance < -EPSILON ||
    secondDistance > 1 + EPSILON
  ) {
    return undefined
  }
  const intersection = {
    x: firstStart.x + firstDistance * firstVector.x,
    y: firstStart.y + firstDistance * firstVector.y,
  }
  const sharedEndpoint =
    (pointsEqual(intersection, firstStart) ||
      pointsEqual(intersection, firstEnd)) &&
    (pointsEqual(intersection, secondStart) ||
      pointsEqual(intersection, secondEnd))
  return sharedEndpoint ? undefined : intersection
}

const countSameLayerGuideIntersections = (
  guides: readonly GuidePolyline[],
): number => {
  const intersections = new Set<string>()
  for (let firstIndex = 0; firstIndex < guides.length; firstIndex += 1) {
    const first = guides[firstIndex]!
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < guides.length;
      secondIndex += 1
    ) {
      const second = guides[secondIndex]!
      if (first.layer !== second.layer) continue
      for (
        let firstSegmentIndex = 0;
        firstSegmentIndex < first.points.length - 1;
        firstSegmentIndex += 1
      ) {
        for (
          let secondSegmentIndex = 0;
          secondSegmentIndex < second.points.length - 1;
          secondSegmentIndex += 1
        ) {
          const intersection = getSegmentIntersection(
            first.points[firstSegmentIndex]!,
            first.points[firstSegmentIndex + 1]!,
            second.points[secondSegmentIndex]!,
            second.points[secondSegmentIndex + 1]!,
          )
          if (!intersection) continue
          intersections.add(
            `${first.connectionId}:${second.connectionId}:${intersection.x.toFixed(6)}:${intersection.y.toFixed(6)}`,
          )
        }
      }
    }
  }
  return intersections.size
}

const addExternalDestinationGuides = (
  graphics: GraphicsObject,
  input: WindingBreakoutSolverInput,
  output: WindingBreakoutOutput,
): GraphicsObject => {
  const lines = [...(graphics.lines ?? [])]
  const points = [...(graphics.points ?? [])]
  for (const connection of getCanonicalConnections(input)) {
    for (const endpoint of connection.endpoints) {
      const destination = getExternalDestination(endpoint)
      if (!destination) continue
      const breakout = output.breakoutPoints.find(
        (point) =>
          point.connectionId === connection.id &&
          point.regionId === endpoint.regionId,
      )
      if (!breakout) continue
      const layer = getGraphicsLayer(input, [breakout.layer])
      if (!points.some((point) => pointsEqual(point, destination))) {
        points.push({
          ...destination,
          color: getConnectionColor(connection.id),
          label: `${connection.id} · destination`,
          layer,
        })
      }
      const destinationAlreadyConnected = lines.some((line) =>
        line.points?.some((point) => pointsEqual(point, destination)),
      )
      if (!destinationAlreadyConnected) {
        lines.push({
          points: [breakout, destination],
          strokeColor: `${getConnectionColor(connection.id)}55`,
          strokeWidth: 0.012,
          strokeDash: [0.025, 0.07],
          layer,
        })
      }
    }
  }
  return {
    ...graphics,
    lines,
    points: points.map((point) =>
      point.label?.endsWith(" · external destination") ||
      point.label?.endsWith(" · destination")
        ? { ...point, label: "target" }
        : point,
    ),
  }
}

export const expectSolverExampleToMatchSvgSnapshot = async ({
  input,
  testPath,
  snapshotName,
  title,
}: {
  input: WindingBreakoutSolverInput
  testPath: string
  snapshotName: string
  title: string
}): Promise<void> => {
  const solver = new WindingBreakoutSolver(input)
  solver.solve()
  const output =
    solver.solved && !solver.failed ? solver.getOutput() : undefined
  let graphics = solver.finalVisualize() ?? solver.initialVisualize()
  let intersectionCount = 0
  if (output) {
    graphics = addExternalDestinationGuides(graphics, input, output)
    intersectionCount = countSameLayerGuideIntersections(
      createGuidePolylines(input, output),
    )
  }
  const panels = stackSvgsHorizontally(
    [
      renderGraphicsSvg(graphics),
      renderGraphicsSvg(recolorGraphicsByLayer(graphics, input)),
    ],
    {
      gap: 16,
      normalizeSize: false,
      rootAttributes: { "data-color-views": "connection-and-layer" },
    },
  )
  const svg = stackSvgsVertically(
    [
      createExampleHeaderSvg({
        title,
        solved: solver.solved && !solver.failed,
        intersectionCount,
        layerNames: getLayerNames(input),
      }),
      panels,
    ],
    { gap: 0, normalizeSize: false },
  ).replace(/[ \t]+$/gm, "")
  await expect(svg).toMatchSvgSnapshot(testPath, snapshotName)
  expect(solver.failed).toBe(false)
  expect(solver.solved).toBe(true)
}
