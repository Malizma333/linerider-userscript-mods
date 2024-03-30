// ==UserScript==

// @name         Duplicate Line Remover
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Removes duplicate lines from a selection
// @version      1.0.0
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

/* deps */
const sortedIndex = window.lodash.sortedindex
const sortedIndexBy = window.lodash.sortedindexby

/* constants */
const SELECT_TOOL = 'SELECT_TOOL'
const EMPTY_SET = new Set()
const LINE_WIDTH = 2

/* actions */
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

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: 'UPDATE_LINES',
  payload: { linesToRemove, linesToAdd },
  meta: { name: name }
})

const removeLines = (lineIds) => updateLines(lineIds, null, 'REMOVE_LINES')

const commitTrackChanges = () => ({
  type: 'COMMIT_TRACK_CHANGES'
})

const revertTrackChanges = () => ({
  type: 'REVERT_TRACK_CHANGES'
})

/* selectors */
const getActiveTool = state => state.selectedTool
const getToolState = (state, toolId) => state.toolState[toolId]
const getSelectToolState = state => getToolState(state, SELECT_TOOL)
const getSimulatorCommittedTrack = state => state.simulator.committedEngine
const getSimulatorTrack = state => state.simulator.engine
const getTrackLinesLocked = state => state.trackLinesLocked

class RemoveDupesMod {
  constructor (store, initState) {
    this.store = store

    this.changed = false
    this.state = initState

    this.track = getSimulatorCommittedTrack(this.store.getState())
    this.selectedPoints = EMPTY_SET

    store.subscribeImmediate(() => {
      if (this.state.active) {
        const selectToolState = getSelectToolState(this.store.getState())
        if (selectToolState && selectToolState.status.pressed) {
          // prevent any adjustment
          this.store.dispatch(setSelectToolState({ status: { inactive: true } }))
        }
      }

      this.onUpdate()
    })
  }

  commit () {
    if (this.changed) {
      this.store.dispatch(commitTrackChanges())
      this.store.dispatch(revertTrackChanges())
      this.changed = false
      return true
    }
  }

  onUpdate (nextState = this.state) {
    let shouldUpdate = false;

    if (!this.state.active && nextState.active) {
      window.previewLinesInFastSelect = true
    }
    if (this.state.active && !nextState.active) {
      window.previewLinesInFastSelect = false
    }

    if (this.state !== nextState) {
      this.state = nextState
      shouldUpdate = true
    }

    if (this.state.active) {
      const track = getSimulatorCommittedTrack(this.store.getState())
      if (this.track !== track) {
        this.track = track
        shouldUpdate = true
      }

      const selectToolState = getSelectToolState(this.store.getState())

      let selectedPoints = selectToolState.selectedPoints

      if (!setsEqual(this.selectedPoints, selectedPoints)) {
        this.selectedPoints = selectedPoints
        shouldUpdate = true
      }
    }

    if (!shouldUpdate) return;

    if (this.changed) {
      this.store.dispatch(revertTrackChanges())
      this.changed = false
    }

    if (!this.state.active || this.selectedPoints.size === 0) return;

    const selectedLines = new Set([...getLinesFromPoints(this.selectedPoints)]
                                  .map(id => this.track.getLine(id))
                                  .filter(l => l))

    const linesToRemove = genRemove(selectedLines);

    if (linesToRemove.length > 0) {
      this.store.dispatch(removeLines(linesToRemove))
      this.changed = true;
    }
  }
}

function main () {
  const {
    React,
    store
  } = window

  const e = React.createElement

  class RemoveDuplicateModComponent extends React.Component {
    constructor (props) {
      super(props)

      this.state = {
        active: false
      }

      this.mod = new RemoveDupesMod(store, this.state)

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

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false })
      } else {
        store.dispatch(setTool(SELECT_TOOL))
        this.setState({ active: true })
      }
    }

    onCommit () {
      const committed = this.mod.commit()
      if (committed) {
        this.setState({ active: false })
      }
    }

    render () {
      return e('div',
        null,
        this.state.active && e('div', null,
          e('button', { style: { float: 'left' }, onClick: () => this.onCommit() },
            'Commit'
          )
        ),
        e('button',
          {
            style: {
              backgroundColor: this.state.active ? 'lightblue' : null
            },
            onClick: this.onActivate.bind(this)
          },
          'Remove Duplicates Mod'
        )
      )
    }
  }

  // this is a setting and not a standalone tool because it extends the select tool
  window.registerCustomSetting(RemoveDuplicateModComponent)
}

/* init */
if (window.registerCustomSetting) {
  main()
} else {
  const prevCb = window.onCustomToolsApiReady
  window.onCustomToolsApiReady = () => {
    if (prevCb) prevCb()
    main()
  }
}

/* utils */
function setsEqual (a, b) {
  if (a === b) {
    return true
  }
  if (a.size !== b.size) {
    return false
  }
  for (let x of a) {
    if (!b.has(x)) {
      return false
    }
  }
  return true
}

function getLinesFromPoints (points) {
  return new Set([...points].map(point => point >> 1))
}

function genRemove (selectedLines) {
  const { V2 } = window

  const ids = [];
  const preserve = new Set();

  for (const line of selectedLines) {
    const orderA = [line.x1, line.y1, line.x2, line.y2];
    const orderB = [line.x2, line.y2, line.x1, line.y1];
    let inPreserve = false;

    for (const order of preserve) {
      if(order[0] === orderA[0] && order[1] === orderA[1] && order[2] === orderA[2] && order[3] === orderA[3]) {
        inPreserve = true;
        break;
      }

      if(order[0] === orderB[0] && order[1] === orderB[1] && order[2] === orderB[2] && order[3] === orderB[3]) {
        inPreserve = true;
        break;
      }
    }

    if(!inPreserve) {
      preserve.add(orderA);
    } else {
      ids.push(line.id);
    }
  }

  return ids;
}
