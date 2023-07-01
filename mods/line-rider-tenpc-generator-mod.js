// ==UserScript==

// @name         Line Rider Ten Point Cannon Generator
// @author       Malizma
// @description  Linerider.com mod for generating ten point cannons
// @version      0.1a

// @namespace    http://tampermonkey.net/
// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:8000/*
// @match        https://*.surge.sh/*
// @grant        none
// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-tenpc-generator-mod.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-tenpc-generator-mod.js
// ==/UserScript==

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

class TenPCMod {
  constructor (store, initState) {
    this.store = store
    this.state = initState

    this.changed = false

    this.track = this.store.getState().simulator.committedEngine

    store.subscribeImmediate(() => {
      this.onUpdate()
    })
  }

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

    if(!shouldUpdate) return

    if (this.changed) {
        this.store.dispatch(revertTrackChanges())
        this.changed = false
    }

    if (!this.state.active) return

    let myLines = []

        for (let { p1, p2, f, m } of GenerateCannon(this.state)) {
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
        rider: 0,
        riderCount: 1
      }

      this.mod = new TenPCMod(store, this.state)

      store.subscribe(() => {
      })
    }

    componentWillUpdate (nextProps, nextState) {
      this.mod.onUpdate(nextState)
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false })
      } else {
        this.setState({ active: true })
      }
    }

    onCommit () {
      const committed = this.mod.commit()
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
        create('input', { style: { width: '4em' }, type: 'number', ...props }),
        create('input', { type: 'range', ...props, onFocus: create => create.target.blur() })
      )
    }

    render () {
      return create('div', null,
        this.state.active && create('div', null,
          this.renderSlider('xSpeed', 'X Speed', { min: -9999, max: 9999, step: 5 }),
          this.renderSlider('ySpeed', 'Y Speed', { min: -9999, max: 9999, step: 5 }),
          this.renderSlider('rotation', 'Rotation', { min: 0, max: 360, step: 5 }),
          this.renderSlider('rider', 'Rider', { min: 0, max: this.state.riderCount - 1, step: 1 }),

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

function* GenerateCannon({ xSpeed = 0, ySpeed = 0, rotation = 0, rider = 0, riderCount = 1 } = {}) {
  const { V2 } = window

  const cpArray = [
    V2.from(0,0),
    V2.from(0,5),
    V2.from(15,5),
    V2.from(17.5,0),
    V2.from(5,0),
    V2.from(5,-5.5),
    V2.from(11.5,-5),
    V2.from(11.5,-5),
    V2.from(10,5),
    V2.from(10,5)
  ]

  let r = 0
  if(rider >= riderCount) {
      r = riderCount - 1
  } else {
      r = rider
  }

    let cFrames = window.store.getState().simulator.engine.engine._computed;
    let currentFrame = Math.ceil(window.store.getState().player.index);

    if(!cFrames) {
        console.log(window.store.getState().simulator.engine.engine)
        return
    }

    let curRider = cFrames._frames[currentFrame].snapshot.entities[0].entities[r]

    if(currentFrame + 1 >= cFrames._frames.length) {
        console.log(window.store.getState().simulator.engine.engine)
        return
    }

    let nextRider = cFrames._frames[currentFrame + 1].snapshot.entities[0].entities[r];

    let theta = Math.PI * rotation / 180;
    let rotationMat = [[Math.cos(theta), -Math.sin(theta)], [Math.sin(theta), Math.cos(theta)]];

    for (let i = 0; i < cpArray.length; i++)
    {
        let riderRotated = V2.from(
            rotationMat[0][0] * cpArray[i].x + rotationMat[1][0] * cpArray[i].y,
            rotationMat[0][1] * cpArray[i].x + rotationMat[1][1] * cpArray[i].y
        );


        let target = V2.from(curRider.points[0].pos.x, curRider.points[0].pos.y)
        target.add(riderRotated)
        target.add(V2.from(xSpeed, ySpeed));

        let offset = 1.0 + Math.random();

        let lineStack = GenerateSingleLine(curRider.points[i], nextRider.points[i], target, offset)

        for(let m = 0; m < lineStack.length; m++) {
            yield lineStack[m];
        }
    }
}

function GenerateSingleLine(pointCur, pointNext, pointTarget, offset = 1.0)
{
    const { V2 } = window

    const yDisplacement = 1.0e-3;
    const width = 1.0e-5;

    let inverse = false;
    let targetDir = pointTarget.copy().sub(pointNext.pos);
    let speedReq = targetDir.len();

    if(targetDir.len() > 0) {
        targetDir.div(targetDir.len());
    }

    let curVel = V2.from(pointCur.vel.x, pointCur.vel.y)
    let normDir = V2.from(-targetDir.y, targetDir.x);

    if (curVel.dot(normDir) <= 0)
    {
        inverse = true;
        normDir = V2.from(targetDir.y, -targetDir.x);
    }

    let multiReq = speedReq * 10.0;
    let linesReq = Math.ceil(multiReq / 255.0);
    multiReq /= linesReq;

    let curPos = V2.from(pointCur.pos.x, pointCur.pos.y)
    const lineCenter = curPos.copy().sub(normDir.copy().mul(yDisplacement * offset));
    let lineLeft = lineCenter.copy().sub(targetDir.copy().mul(0.5 * width));
    let lineRight = lineCenter.copy().add(targetDir.copy().mul(0.5 * width));
    let yShift = normDir.copy().mul(yDisplacement / 100.0);

    let lineStack = [];

    for (let i = 0; i < linesReq; i++)
    {
        let newLine = {
            p1: lineLeft,
            p2: lineRight,
            f: inverse,
            m: multiReq
        }

        lineStack.push(newLine);

        lineLeft.add(yShift)
        lineRight.add(yShift)
    }

    return lineStack;
}
