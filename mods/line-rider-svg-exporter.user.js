// ==UserScript==

// @name         SVG Exporter
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates an svg file from a selection of lines
// @version      1.1.3
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-svg-exporter.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-svg-exporter.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const SELECT_TOOL = 'SELECT_TOOL'
const EMPTY_SET = new Set()

const setTool = (tool) => ({
  type: 'SET_TOOL',
  payload: tool
})

const setToolState = (toolId, state) => ({
  type: 'SET_TOOL_STATE',
  payload: state,
  meta: { id: toolId }
})

const setSelectToolState = toolState => setToolState(SELECT_TOOL, toolState)

const getActiveTool = state => state.selectedTool
const getToolState = (state, toolId) => state.toolState[toolId]
const getSelectToolState = state => getToolState(state, SELECT_TOOL)
const getSimulatorCommittedTrack = state => state.simulator.committedEngine
const getCommittedTrackLayers = state => getSimulatorCommittedTrack(state).engine.state.layers

class SVGExportMod {
  constructor (store, initState) {
    this.store = store
    this.state = initState

    this.track = getSimulatorCommittedTrack(this.store.getState())
    this.layers = getCommittedTrackLayers(this.store.getState())
    this.selectedPoints = EMPTY_SET

    store.subscribeImmediate(() => {
      if (this.state.active) {
        const selectToolState = getSelectToolState(this.store.getState())
        if (selectToolState && selectToolState.status.pressed) {
          this.store.dispatch(setSelectToolState({ status: { inactive: true } }))
        }
      }

      this.onUpdate()
    })
  }

  onExport (useColor) {
    if (this.selectedPoints.size === 0) return 2

    const selectedLines = [...getLinesFromPoints(this.selectedPoints)]
      .map(id => this.track.getLine(id))
      .filter(l => l)

    try {
      if (getSVG(selectedLines, getColorsFromLayers(this.layers.buffer), useColor)) {
        console.info('[SVG Export] Success')
        return 0
      } else {
        console.info('[SVG Export] Failed')
        return 2
      }
    } catch (e) {
      console.error('[SVG Export] Failed:', e.message)
      return 1
    }
  }

  onUpdate (nextState = this.state) {
    if (!this.state.active && nextState.active) {
      window.previewLinesInFastSelect = true
    }
    if (this.state.active && !nextState.active) {
      window.previewLinesInFastSelect = false
    }

    if (this.state !== nextState) {
      this.state = nextState
    }

    if (!this.state.active) return

    const track = getSimulatorCommittedTrack(this.store.getState())

    if (track !== this.track) {
      this.track = track
    }

    const layers = getCommittedTrackLayers(this.store.getState())

    if (layers !== this.layers) {
      this.layers = layers
    }

    const selectToolState = getSelectToolState(this.store.getState())

    const selectedPoints = selectToolState.selectedPoints

    if (!setsEqual(this.selectedPoints, selectedPoints)) {
      this.selectedPoints = selectedPoints
    }
  }
}

function main () {
  const {
    React,
    store
  } = window

  const e = React.createElement

  class SvgExportModComponent extends React.Component {
    constructor (props) {
      super(props)

      this.state = {
        active: false,
        useColor: true,
        success: 0
      }

      this.mod = new SVGExportMod(store, this.state)

      store.subscribe(() => {
        const selectToolActive = getActiveTool(store.getState()) === SELECT_TOOL

        if (this.state.active && !selectToolActive) {
          this.setState({ active: false })
        }
      })
    }

    componentWillUpdate (nextProps, nextState) {
      this.mod.onUpdate(nextState)
    }

    renderCheckbox (key, label) {
      const settings = {
        checked: this.state[key],
        onChange: e => this.setState({ [key]: e.target.checked })
      }

      return React.createElement('div', null,
        label + ' ',
        React.createElement('input', { type: 'checkbox', ...settings })
      )
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false })
      } else {
        store.dispatch(setTool(SELECT_TOOL))
        this.setState({ active: true })
      }
    }

    onExport () {
      const exportSuccess = this.mod.onExport(this.state.useColor)
      this.setState({ success: exportSuccess })
    }

    render () {
      return e('div', null,
        this.state.active &&
               e('div', null,
                 this.state.success === 1 && e('div', null, 'Error: See console'),
                 this.state.success === 2 && e('div', null, 'Error: No lines selected'),
                 this.renderCheckbox('useColor', 'Use Color'),
                 e('button',
                   { style: { float: 'left' }, onClick: () => this.onExport() },
                   'Export'
                 )
               ),
        e('button',
          { style: { backgroundColor: this.state.active ? 'lightblue' : null }, onClick: this.onActivate.bind(this) },
          'SVG Export Mod'
        )
      )
    }
  }

  window.registerCustomSetting(SvgExportModComponent)
}

if (window.registerCustomSetting) {
  main()
} else {
  const prevCb = window.onCustomToolsApiReady
  window.onCustomToolsApiReady = () => {
    if (prevCb) prevCb()
    main()
  }
}

function setsEqual (a, b) {
  if (a === b) {
    return true
  }
  if (a.size !== b.size) {
    return false
  }
  for (const x of a) {
    if (!b.has(x)) {
      return false
    }
  }
  return true
}

function getLinesFromPoints (points) {
  return new Set([...points].map(point => point >> 1))
}

function getColorsFromLayers (layers) {
  const colors = []

  for (const layer of layers) {
    const name = layer.name
    if (name.length < 7) {
      colors.push({ id: layer.id, color: 'black' })
      continue
    }

    const regex = new RegExp(/^#([A-Fa-f0-9]{6})$/)
    const ss = layer.name.substring(0, 7)

    if (regex.test(ss)) {
      colors.push({ id: layer.id, color: ss })
    } else {
      colors.push({ id: layer.id, color: 'black' })
    }
  }

  return colors
}

function getSVG (selectedLines, layerColors, useColor) {
  if (!selectedLines || selectedLines.length === 0) return false

  const bounds = {
    minX: 0, maxX: 0, minY: 0, maxY: 0
  }

  bounds.minX = selectedLines[0].x1
  bounds.maxX = selectedLines[0].x2
  bounds.minY = selectedLines[0].y1
  bounds.maxY = selectedLines[0].y2

  const linesToAdd = {}
  const colorMap = {}

  for (const layerColor of layerColors) {
    linesToAdd[layerColor.id] = []
    colorMap[layerColor.id] = layerColor.color
  }

  for (const line of selectedLines) {
    const minLX = Math.min(line.x1, line.x2) - line.width
    const minLY = Math.min(line.y1, line.y2) - line.width
    const maxLX = Math.max(line.x1, line.x2) + line.width
    const maxLY = Math.max(line.y1, line.y2) + line.width

    if (bounds.minX > minLX) { bounds.minX = minLX }
    if (bounds.minY > minLY) { bounds.minY = minLY }
    if (bounds.maxX < maxLX) { bounds.maxX = maxLX }
    if (bounds.maxY < maxLY) { bounds.maxY = maxLY }

    const layerID = line.layer || 0
    linesToAdd[layerID].push({
      x1: line.x1,
      y1: line.y1,
      x2: line.x2,
      y2: line.y2,
      color: colorMap[layerID],
      width: line.width
    })
  }

  bounds.minX -= 2
  bounds.minY -= 2
  bounds.maxX += 2
  bounds.maxY += 2

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const svgWidth = bounds.maxX - bounds.minX
  const svgHeight = bounds.maxY - bounds.minY
  if (svgWidth < 0 || svgHeight < 0) return false

  svg.setAttribute('width', String(bounds.maxX - bounds.minX))
  svg.setAttribute('height', String(bounds.maxY - bounds.minY))

  for (const coloredLayer of layerColors) {
    for (const line of linesToAdd[coloredLayer.id]) {
      const lineElem = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      lineElem.setAttribute('x1', String(line.x1 - bounds.minX))
      lineElem.setAttribute('y1', String(line.y1 - bounds.minY))
      lineElem.setAttribute('x2', String(line.x2 - bounds.minX))
      lineElem.setAttribute('y2', String(line.y2 - bounds.minY))
      if (useColor) {
        lineElem.setAttribute('stroke', line.color)
      } else {
        lineElem.setAttribute('stroke', 'black')
      }
      lineElem.setAttribute('stroke-linecap', 'round')
      lineElem.setAttribute('stroke-width', (line.width || 1) * 2)
      svg.appendChild(lineElem)
    }
  }

  const svgString = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'lines.svg'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  return true
}
