// ==UserScript==

// @name         Duplicate Line Remover
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Removes duplicate lines from a selection
// @version      1.1.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-remove-dupes.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-remove-dupes.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

// jshint asi: true
// jshint esversion: 6

const SELECT_TOOL = 'SELECT_TOOL'

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: 'UPDATE_LINES',
  payload: { linesToRemove, linesToAdd },
  meta: { name }
})

const removeLines = (lineIds) => updateLines(lineIds, null, 'REMOVE_LINES')

const commitTrackChanges = () => ({
  type: 'COMMIT_TRACK_CHANGES'
})

const revertTrackChanges = () => ({
  type: 'REVERT_TRACK_CHANGES'
})

const getActiveTool = state => state.selectedTool
const getToolState = (state, toolId) => state.toolState[toolId]
const getSelectToolState = state => getToolState(state, SELECT_TOOL)
const getSimulatorCommittedTrack = state => state.simulator.committedEngine

function main () {
  const {
    React,
    store
  } = window

  const e = React.createElement

  class RemoveDuplicatesModComponent extends React.Component {
    constructor (props) {
      super(props)
    }

    onRemove () {
      const selectToolActive = getActiveTool(store.getState()) === SELECT_TOOL

      if (!selectToolActive) {
        return
      }

      const selectedPoints = getSelectToolState(store.getState()).selectedPoints

      if (selectedPoints.size === 0) {
        return
      }

      const t = performance.now()

      const linesToRemove = []
      const selectedLines = new Set([...new Set([...selectedPoints].map(point => point >> 1))]
        .map(id => getSimulatorCommittedTrack(store.getState()).getLine(id)).filter(l => l))
      const preserve = new Set()

      for (const line of selectedLines) {
        if (line.type !== 2) continue;

        const orderA = [line.x1, line.y1, line.x2, line.y2]
        const orderB = [line.x2, line.y2, line.x1, line.y1]
        let inPreserve = false

        for (const order of preserve) {
          if (order[0] === orderA[0] && order[1] === orderA[1] && order[2] === orderA[2] && order[3] === orderA[3]) {
            inPreserve = true
            break
          }

          if (order[0] === orderB[0] && order[1] === orderB[1] && order[2] === orderB[2] && order[3] === orderB[3]) {
            inPreserve = true
            break
          }
        }

        if (!inPreserve) {
          preserve.add(orderA)
        } else {
          linesToRemove.push(line.id)
        }
      }

      store.dispatch(removeLines(linesToRemove))
      store.dispatch(commitTrackChanges())
      store.dispatch(revertTrackChanges())

      console.log('Took', Math.round(performance.now() - t), 'ms')
    }

    render () {
      return e('div', null,
        e('button',
          { onClick: this.onRemove.bind(this) },
          'Remove Duplicates Select Mod'
        )
      )
    }
  }

  window.registerCustomSetting(RemoveDuplicatesModComponent)
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
