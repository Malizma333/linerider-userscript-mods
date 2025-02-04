// ==UserScript==

// @name         Ten Point Cannon Generator
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates ten point cannons
// @version      1.3.1
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-tenpc-generator-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-tenpc-generator-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: 'UPDATE_LINES',
  payload: { linesToRemove, linesToAdd },
  meta: { name }
})

const addLines = (line) => updateLines(null, line, 'ADD_LINES')

const commitTrackChanges = () => ({
  type: 'COMMIT_TRACK_CHANGES'
})

const revertTrackChanges = () => ({
  type: 'REVERT_TRACK_CHANGES'
})

const getSimulatorCommittedTrack = state => state.simulator.committedEngine
const getRiders = state => state.simulator.engine.engine.state.riders
const getNumRiders = (state) => getRiders(state).length
const sidebarOpen = (state) => state.views.Sidebar

class TenPCMod {
  constructor (store, initState) {
    this.store = store
    this.state = initState

    this.changed = false

    this.track = getSimulatorCommittedTrack(this.store.getState())
    this.numRiders = getNumRiders(this.store.getState())
    this.selectedRider = 1

    store.subscribeImmediate(() => {
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

  revert () {
    if (this.changed) {
      this.store.dispatch(revertTrackChanges())
      this.changed = false
    }
  }

  onUpdate (nextState = this.state) {
    let shouldUpdate = false

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

      const numRiders = getNumRiders(this.store.getState())

      if (this.numRiders !== numRiders) {
        this.numRiders = numRiders
        shouldUpdate = true
      }

      if (this.selectedRider !== nextState.selectedRider) {
        this.selectedRider = Math.min(this.numRiders, nextState.selectedRider)
        shouldUpdate = true
      }
    }

    if (!shouldUpdate) return

    if (this.changed) {
      this.store.dispatch(revertTrackChanges())
      this.changed = false
    }

    if (!this.state.active) return

    let iterations = 0
    const MAX_ITERATIONS = 1000

    while (true) {
      const myLines = []

      for (const { p1, p2, f, m } of GenerateCannon(this.state)) {
        myLines.push({
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          type: 1,
          flipped: f,
          leftExtended: false,
          rightExtended: false,
          multiplier: m
        })
      }

      if (myLines.length > 0) {
        this.store.dispatch(addLines(myLines))
        this.changed = true
      }

      if (!this.state.forceLive) break

      const engine = window.store.getState().simulator.engine.engine
      const currentFrame = Math.ceil(window.store.getState().player.index)
      const nextRider = engine.getFrame(currentFrame + 1).snapshot.entities[0].entities[this.state.selectedRider - 1]

      if (nextRider.riderMounted) {
        break
      }
      window.store.dispatch(revertTrackChanges())

      if (iterations++ >= MAX_ITERATIONS) {
        console.error('Max iterations reached')
        return 'MAX_ITERATIONS'
      }
    }
  }
}

function main () {
  const {
    React,
    store
  } = window

  const create = React.createElement

  class TenPCModComponent extends React.Component {
    constructor (props) {
      super(props)

      this.state = {
        active: false,
        xSpeed: 0,
        ySpeed: 0,
        rotation: 0,
        selectedRider: 1,
        riderCount: 1,
        forceLive: false
      }

      this.mod = new TenPCMod(store, this.state)

      store.subscribe(() => {
        if (sidebarOpen(window.store.getState())) {
          this.mod.revert()
          this.setState({ active: false })
        }

        if (this.state.riderCount != this.mod.numRiders) {
          this.setState({ riderCount: this.mod.numRiders })
          this.setState({ selectedRider: Math.min(this.state.riderCount, this.state.selectedRider) })
        }
      })
    }

    componentWillUpdate (nextProps, nextState) {
      const error = this.mod.onUpdate(nextState)
      if (error == 'MAX_ITERATIONS') {
        this.setState({ forceLive: false })
        this.setState({ active: false })
      }
    }

    onActivate () {
      if (this.state.active || sidebarOpen(window.store.getState())) {
        this.setState({ forceLive: false })
        this.setState({ active: false })
      } else {
        this.setState({ active: true })
      }
    }

    onCommit () {
      const committed = this.mod.commit()
      if (committed) {
        this.setState({ forceLive: false })
        this.setState({ active: false })
      }
    }

    renderCheckbox (key, title, props) {
      props = {
        ...props,
        checked: this.state[key],
        onChange: e => this.setState({ [key]: e.target.checked })
      }

      return create('div', null,
        title,
        create('input', { type: 'checkbox', ...props })
      )
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: create => this.setState({ [key]: parseFloat(create.target.value) })
      }

      return create('div', null,
        title,
        create('input', { style: { width: '4em' }, type: 'number', ...props }),
        create('input', { type: 'range', ...props, onFocus: create => create.target.blur() })
      )
    }

    render () {
      return create('div', null,
        this.state.active && create('div', null,
          this.renderSlider('xSpeed', 'X Speed', { min: -99, max: 99, step: 1 }),
          this.renderSlider('ySpeed', 'Y Speed', { min: -99, max: 99, step: 1 }),
          this.renderSlider('rotation', 'Rotation', { min: 0, max: 360, step: 1 }),
          this.state.riderCount > 1 && this.renderSlider('selectedRider', 'Rider', { min: 1, max: this.state.riderCount, step: 1 }),
          this.renderCheckbox('forceLive', 'Force Live (Warning: Causes Lag) '),

          create('button', { style: { float: 'left' }, onClick: () => this.onCommit() },
            'Commit'
          )
        ),

        create('button',
          {
            style: {
              backgroundColor: this.state.active ? 'lightblue' : null
            },
            onClick: this.onActivate.bind(this)
          },
          'TenPC Mod'
        )
      )
    }
  }

  window.registerCustomSetting(TenPCModComponent)
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

// Based on LRA's implementation

function * GenerateCannon ({ xSpeed = 0, ySpeed = 0, rotation = 0, selectedRider = 1 } = {}) {
  const { V2 } = window

  const cpArray = [
    V2.from(0, 0),
    V2.from(0, 5),
    V2.from(15, 5),
    V2.from(17.5, 0),
    V2.from(5, 0),
    V2.from(5, -5.5),
    V2.from(11.5, -5),
    V2.from(11.5, -5),
    V2.from(10, 5),
    V2.from(10, 5)
  ]

  const engine = window.store.getState().simulator.engine.engine
  const currentFrame = Math.ceil(window.store.getState().player.index)
  const curRider = engine.getFrame(currentFrame).snapshot.entities[0].entities[selectedRider - 1]
  const nextRider = engine.getFrame(currentFrame + 1).snapshot.entities[0].entities[selectedRider - 1]
  const theta = Math.PI * rotation / 180
  const rotationMatrix = [[Math.cos(theta), -Math.sin(theta)], [Math.sin(theta), Math.cos(theta)]]

  for (let i = 0; i < cpArray.length; i++) {
    const riderRotated = V2.from(
      rotationMatrix[0][0] * cpArray[i].x + rotationMatrix[1][0] * cpArray[i].y,
      rotationMatrix[0][1] * cpArray[i].x + rotationMatrix[1][1] * cpArray[i].y
    )

    const target = V2.from(curRider.points[0].pos.x, curRider.points[0].pos.y)
    target.add(riderRotated)
    target.add(V2.from(xSpeed, ySpeed))

    yield GenerateLine(curRider.points[i], nextRider.points[i], target)
  }
}

function GenerateLine (pointCur, pointNext, pointTarget) {
  const { V2 } = window

  let inverse = false
  const targetDir = pointTarget.copy().sub(pointNext.pos)
  const speedReq = targetDir.len()

  if (targetDir.len() > 0) {
    targetDir.div(targetDir.len())
  }

  const curVel = V2.from(pointCur.vel.x, pointCur.vel.y)
  let normDir = V2.from(-targetDir.y, targetDir.x)

  if (curVel.dot(normDir) <= 0) {
    inverse = true
    normDir = V2.from(targetDir.y, -targetDir.x)
  }

  const curPos = V2.from(pointCur.pos.x, pointCur.pos.y)
  const lineCenter = curPos.copy().sub(normDir.copy().mul(1.0e-3 * (1 + Math.random())))

  return {
    p1: lineCenter.copy().sub(targetDir.copy().mul(0.5 * 1.0e-5)),
    p2: lineCenter.copy().add(targetDir.copy().mul(0.5 * 1.0e-5)),
    f: inverse,
    m: speedReq * 10.0
  }
}
