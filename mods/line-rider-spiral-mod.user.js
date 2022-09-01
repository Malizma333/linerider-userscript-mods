// ==UserScript==

// @name         Spiral Mod
// @author       Malizma
// @description  Generates a spiral
// @version      1.0

// @namespace    http://tampermonkey.net/
// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:8000/*
// @grant        none
// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-spiral-mod.user.js

// ==/UserScript==

// Utility functions called towards source code

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: 'UPDATE_LINES',
  payload: { linesToRemove, linesToAdd },
  meta: { name: name }
})

const addLines = (line) => updateLines(null, line, 'ADD_LINES')

const commitTrackChanges = () => ({
  type: 'COMMIT_TRACK_CHANGES'
})

const revertTrackChanges = () => ({
  type: 'REVERT_TRACK_CHANGES'
})

const getSimulatorCommittedTrack = state => state.simulator.committedEngine

// Class to hold back-end information

class SpiralMod {
  constructor (store, initState) {
    this.store = store
    this.state = initState

    this.changed = false

    this.track = this.store.getState().simulator.committedEngine

    store.subscribeImmediate(() => {
      this.onUpdate()
    })
  }

  // Committing changes

  commit() {
    if (this.changed) {
      this.store.dispatch(commitTrackChanges())
      this.store.dispatch(revertTrackChanges())
      this.changed = false
      return true
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
    }

    if (shouldUpdate) {

      if (this.changed) {
        this.store.dispatch(revertTrackChanges())
        this.changed = false
      }

      if (this.state.active) {
        let myLines = []

        for (let { p1, p2 } of genLines(this.state)) {
          myLines.push({
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            type: 2
          })
        }

        if (myLines.length > 0) {
          this.store.dispatch(addLines(myLines))
          this.changed = true
        }
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

  class SpiralModComponent extends React.Component {
    constructor (props) {
      super(props)

      this.state = {
        active: false,
        length: 1,
        angle: 90
      }

      this.modClass = new SpiralMod(store, this.state)
    }

    componentWillUpdate (nextProps, nextState) {
      this.modClass.onUpdate(nextState)
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false })
      } else {
        this.setState({ active: true })
      }
    }

    onCommit () {
      const committed = this.modClass.commit()
      if (committed) {
        this.setState({ active: false })
      }
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: create => this.setState({ [key]: parseFloat(create.target.value) })
      }

      return create('div', null,
        title,
        create('input', { style: { width: '3em' }, type: 'number', ...props }),
        create('input', { type: 'range', ...props, onFocus: create => create.target.blur() })
      )
    }

    render () {
      return create('div', null,
        this.state.active && create('div', null,
          this.renderSlider('length', 'Length', { min: 3, max: 500, step: 1 }),
          this.renderSlider('angle', 'Angle', { min: 0, max: 360, step: 0.01 }),
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
          'Spiral Mod'
        )
      )
    }
  }

  window.registerCustomSetting(SpiralModComponent)
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

function* genLines ({ length = 1, angle = 90 } = {}) {
  const { V2 } = window
  const camPos = window.store.getState().camera.editorPosition;

  let a = 0;
  let point = V2.from(camPos.x, camPos.y);
  let prevPoint = V2.from(camPos.x, camPos.y);
  let twoPi = 2 * Math.PI;

  for(let i = 0; i < length; i++) {
      a += twoPi * angle / 180;
      if(a > twoPi) a -= twoPi;

      prevPoint = V2.from(point.x, point.y);
      point.x += i * Math.cos(a);
      point.y += i * Math.sin(a);

      yield {p1: point, p2: prevPoint};
  }
}
