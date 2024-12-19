// ==UserScript==

// @name         Spawn Points
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Creates teleportation points at target keyframes
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-spawnpoints.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-spawnpoints.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const getPlayerIndex = state => state.player.index
const getEditorPosition = state => state.camera.editorPosition
const getTrackTitle = state => state.trackData.label
const getFrameData = (state, index) => state.simulator.engine.engine.getFrame(index)
const getRiderPoints = (frameData) => frameData.snapshot.entities[0].entities[0].points

function main () {
  const {
    React,
    store
  } = window

  const e = React.createElement

  class SpawnPointModComponent extends React.Component {
    constructor (props) {
      super(props)

      this.state = {
        active: false,
        indexView: false,
        spawnPointKeyframes: [] // [keyframe, [posx, posy, velx, vely, angle]]
      }
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false })
      } else {
        this.setState({ active: true })
      }
    }

    onToggleIndexView () {
      this.setState({ indexView: !this.state.indexView })
    }
    
    onCreateSpawnpoint(p) {
      const { spawnPointKeyframes } = p.state
      const currentIndex = Math.floor(getPlayerIndex(store.getState()))
      const currentCamPos = getEditorPosition(store.getState())
      const newKeyframe = [currentIndex, [currentCamPos.x, currentCamPos.y, 0, 0, 0]]
      p.setState({ spawnPointKeyframes: [...spawnPointKeyframes, newKeyframe] })
    }
    
    onDeleteSpawnpoint(p, ind) {
      const { spawnPointKeyframes } = p.state
      spawnPointKeyframes.splice(ind, 1)
      p.setState({ spawnPointKeyframes })
    }
    
    onPositionAtCamera(p, i) {
      const { spawnPointKeyframes } = p.state
      const currentCamPos = getEditorPosition(store.getState())
      const newSpawnPointKeyframes = [...spawnPointKeyframes]
      newSpawnPointKeyframes[i][1][0] = currentCamPos.x
      newSpawnPointKeyframes[i][1][1] = currentCamPos.y
      p.setState({ spawnPointKeyframes: newSpawnPointKeyframes })
    }

    onSetIndex(p, i, ind) {
      const { spawnPointKeyframes } = p.state
      const newSpawnPointKeyframes = [...spawnPointKeyframes]
      newSpawnPointKeyframes[i][0] = ind
      p.setState({ spawnPointKeyframes: newSpawnPointKeyframes })
    }
    
    onSetPosX(p, i, x) {
      const { spawnPointKeyframes } = p.state
      const newSpawnPointKeyframes = [...spawnPointKeyframes]
      newSpawnPointKeyframes[i][1][0] = x
      p.setState({ spawnPointKeyframes: newSpawnPointKeyframes })
    }
    
    onSetPosY(p, i, y) {
      const { spawnPointKeyframes } = p.state
      const newSpawnPointKeyframes = [...spawnPointKeyframes]
      newSpawnPointKeyframes[i][1][1] = y
      p.setState({ spawnPointKeyframes: newSpawnPointKeyframes })
    }
    
    onSetVelX(p, i, x) {
      const { spawnPointKeyframes } = p.state
      const newSpawnPointKeyframes = [...spawnPointKeyframes]
      newSpawnPointKeyframes[i][1][2] = x
      p.setState({ spawnPointKeyframes: newSpawnPointKeyframes })
    }
    
    onSetVelY(p, i, y) {
      const { spawnPointKeyframes } = p.state
      const newSpawnPointKeyframes = [...spawnPointKeyframes]
      newSpawnPointKeyframes[i][1][3] = y
      p.setState({ spawnPointKeyframes: newSpawnPointKeyframes })
    }

    onSetAngle(p, i, a) {
      const { spawnPointKeyframes } = p.state
      const newSpawnPointKeyframes = [...spawnPointKeyframes]
      newSpawnPointKeyframes[i][1][4] = a
      p.setState({ spawnPointKeyframes: newSpawnPointKeyframes })
    }
    
    onCommit(p) {
      window.store.getState().camera.playbackFollower._frames.length = 0;
      window.store.getState().simulator.engine.engine._computed._frames.length = 1;
      
      const currentIndex = store.getState().player.index
      store.dispatch({type: "SET_PLAYER_INDEX", payload: 0})
      requestAnimationFrame(() => store.dispatch({type: "SET_PLAYER_INDEX", payload: currentIndex}))
      
      const keyframes = p.state.spawnPointKeyframes.sort((a,b) => a[0] - b[0])
      const defaultRider = [{x: 0, y: 0}, {x: 0, y: 5}, {x: 15, y: 5}, {x: 17.5, y: 0}, {x: 5, y: 0}, {x: 5, y: -5.5}, {x: 11.5, y: -5}, {x: 11.5, y: -5}, {x: 10, y: 5}, {x: 10, y: 5}]
      let keyframePointer = 0
      let currentPointIndex = -1
      let transformedRider = null

      Object.defineProperty(window.$ENGINE_PARAMS, "gravity", { get() {
        currentPointIndex = (currentPointIndex + 1) % 17

        if (currentPointIndex >= 10) {
          return {x: 0, y: 0.175}
        }

        const index = store.getState().simulator.engine.engine._computed._frames.length
        const frameData = getFrameData(store.getState(), index - 1)
        const riderPoints = getRiderPoints(frameData)
        const currentPoint = riderPoints[currentPointIndex]

        if (keyframePointer < keyframes.length && index === keyframes[keyframePointer][0] + 2) {
          keyframePointer += 1
        }

        if (keyframePointer < keyframes.length && index === keyframes[keyframePointer][0]) {
          if(!transformedRider) {
            transformedRider = transformRiderArray(defaultRider, Math.PI * keyframes[keyframePointer][1][4] / 180)
          }

          const relativePoint = {
            x: transformedRider[currentPointIndex].x - transformedRider[0].x,
            y: transformedRider[currentPointIndex].y - transformedRider[0].y
          }

          const accelX = relativePoint.x + keyframes[keyframePointer][1][0] - currentPoint.pos.x - currentPoint.vel.x
          const accelY = relativePoint.y + keyframes[keyframePointer][1][1] - currentPoint.pos.y - currentPoint.vel.y
          return {x: accelX, y: accelY}
        }

        if (keyframePointer < keyframes.length && index === keyframes[keyframePointer][0] + 1) {
          transformedRider = null
          const accelX = keyframes[keyframePointer][1][2] - currentPoint.vel.x
          const accelY = keyframes[keyframePointer][1][3] - currentPoint.vel.y
          return {x: accelX, y: accelY}
        }

        return {x: 0, y: 0.175}
      }})
    }

    onDownload(p) {
      const trackName = getTrackTitle(store.getState())
      let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(p.state.spawnPointKeyframes))
      let a = document.createElement('a')
      a.setAttribute("href", dataStr)
      a.setAttribute("download", trackName + "_spawnpoint-keyframes.json")
      a.click()
    }

    onConfirmUpload(e) {
      this.uploadConfirm = confirm("Are you sure? This will overwrite your existing keyframes.")
      e.target.value = null
    }

    onUpload(file) {
      if(!this.uploadConfirm) {
        return
      }
      const reader = new FileReader()
      reader.addEventListener("load", () => {
        try {
          this.setState({ spawnPointKeyframes: JSON.parse(reader.result) })
        } catch(e) {
          console.error(e.message)
        }
      }, false)
      reader.readAsText(file)
    }
    
    renderDouble (key, index, values, label, sublabels, editable, actions) {
      const props = [
        {
          id: key + '_' + index + '_0',
          type: 'number',
          readOnly: !editable,
          value: values[0],
          onChange: e => (actions[0])(this, index, Number(e.target.value))
        }, {
          id: key + '_' + index + '_1',
          type: 'number',
          readOnly: !editable,
          value: values[1],
          onChange: e => (actions[1])(this, index, Number(e.target.value))
        }
      ]

      const block = { marginLeft: '.5em', width: '3em' }

      return e(
        'div',
        null,
        e('label', { style: { width: '4em' } }, label),
        e('label', { style: block, htmlFor: key + '_' + index + '_0' }, sublabels[0]),
        e('input', { style: block, ...props[0] }),
        e('label', { style: block, htmlFor: key + '_' + index + '_1' }, sublabels[1]),
        e('input', { style: block, ...props[1] })
      )
    }

    renderSingle (key, index, value, label, editable, isNumber, action) {
      const props = {
        id: key + index,
        type: isNumber ? 'number' : 'text',
        readOnly: !editable,
        value,
        onChange: e => action(this, index, isNumber ? Number(e.target.value) : e.target.value)
      }

      return e(
        'div',
        null,
        e('label', { style: { width: '4em' }, htmlFor: key + index }, label),
        e('input', { style: { marginLeft: '.5em' }, ...props })
      )
    }

    renderButton (key, label, action, args=null) {
      const props = {
        id: key,
        onClick: _ => action(this, args)
      }

      return e(
        'button',
        props,
        e('label', { htmlFor: key }, label)
      )
    }

    renderFramePicker (index) {
      const targetFrame = this.state.spawnPointKeyframes[index][0]
      return this.state.indexView ? e(
        'div', null,
        'Index ',
        e('input', { type: 'number', min: 0, step: 1, style: { width: '8em' },
          value: targetFrame,
          onChange: (e) => this.onSetIndex(this, index, parseInt(e.target.value || 0))
        })
      ) : e(
        'div', null,
        'Index ',
        e('input', { type: 'number', min: 0, step: 1, style: { width: '3em' },
          value: Math.floor(targetFrame / 2400),
          onChange: (e) => this.onSetIndex(this, index, 2400 * parseInt(e.target.value || 0) + targetFrame % 2400)
        }),
        ':',
        e('input', { type: 'number', min: 0, step: 1, style: { width: '3em' },
          value: Math.floor((targetFrame % 2400) / 40),
          onChange: (e) => this.onSetIndex(this, index, 2400 * Math.floor(targetFrame / 2400) + 40 * parseInt(e.target.value || 0) + targetFrame % 40)
        }),
        ':',
        e('input', { type: 'number', min: 0, step: 1, style: { width: '3em' },
          value: targetFrame % 40,
          onChange: (e) => this.onSetIndex(this, index, 40 * Math.floor(targetFrame / 40) + parseInt(e.target.value || 0))
        })
      )
    }
    
    renderSpawnpointKeyframe(index) {
      return e(
        'div', null,
        this.renderButton('remKeyframe' + index, 'Delete', this.onDeleteSpawnpoint, index),
        this.renderFramePicker(index),
        this.renderDouble('pos', index, [this.state.spawnPointKeyframes[index][1][0], this.state.spawnPointKeyframes[index][1][1]], 'Position', ['X', 'Y'], true, [this.onSetPosX, this.onSetPosY]),
        this.renderDouble('vel', index, [this.state.spawnPointKeyframes[index][1][2], this.state.spawnPointKeyframes[index][1][3]], 'Velocity', ['X', 'Y'], true, [this.onSetVelX, this.onSetVelY]),
        this.renderSingle('angle', index, this.state.spawnPointKeyframes[index][1][4], 'Angle', true, true, this.onSetAngle),
        this.renderButton('setPosHere' + index, 'Set Position at Editor Camera', this.onPositionAtCamera, index),
        e('hr')
      )
    }

    render () {
      return e(
        'div', null,
        this.state.active && e(
          'div', null,
          this.renderButton('addKeyframe', '+', this.onCreateSpawnpoint),
          e(
            'div', { style: { overflowY: 'scroll', height: '15vh', border: '1px solid black' } },
            this.state.spawnPointKeyframes.map((_,i) => {
              return this.renderSpawnpointKeyframe(i)
            })
          ),
          this.renderButton('commit', 'Run Gravity Script', this.onCommit),
          e('br'),
          this.renderButton('download', 'Download Keyframe Data', this.onDownload),
          e('br'),
          e('label', { for: 'upload' }, 'Load Keyframe Data '),
          e('input', { id: 'upload', type: 'file', accept: '.json', onClick: (e) => this.onConfirmUpload(e), onChange: (e) => this.onUpload(e.target.files[0]) }),
          e('br'),
          e('label', { for: 'indexView' }, 'Index View '),
          e('input', { id: 'indexView', type: 'checkbox', value: this.state.indexView, onChange: () => this.onToggleIndexView() })
        ),
        e(
          'button',
          {
            style: {
              backgroundColor: this.state.active ? 'lightblue' : null
            },
            onClick: this.onActivate.bind(this)
          },
          'Spawn Points'
        )
      )
    }
  }

  window.registerCustomSetting(SpawnPointModComponent)
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

function transformRiderArray(riderPoints, targetAngle) {
  const newPoints = []
  
  for(const point of riderPoints) {
    const radius = Math.sqrt(point.x ** 2 + point.y ** 2)
    let theta = Math.atan2(point.y, point.x)
    theta += targetAngle

    newPoints.push({
      x: radius * Math.cos(theta),
      y: radius * Math.sin(theta)
    })
  }

  return newPoints
}
