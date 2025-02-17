// ==UserScript==

// @name         More Controls
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Provides a menu for viewing and editing specific track data
// @version      1.2.3
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-more-controls-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-more-controls-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

// jshint asi: true
// jshint esversion: 6

const getWindowFocused = state => state.views.Main
const getPlayerRunning = state => state.player.running

const getPlaybackCamProps = state => ({ zoom: getPlaybackCamZoom(state), ...(state.camera.playbackDimensions || state.camera.editorDimensions) })
const getPlaybackCamPos = state => state.camera.playbackFollower.isFixed() ? state.camera.playbackFixedPosition : state.camera.playbackFollower.getCamera(state.simulator.engine, getPlaybackCamProps(state), getPlayerIndex(state))
const getPlaybackCamZoom = state => window.getAutoZoom ? window.getAutoZoom(state.player.index) : state.camera.playbackZoom
const getEditorCamPos = state => state.camera.editorPosition
const getEditorCamZoom = state => state.camera.editorZoom
const getStopAtEnd = state => state.player.stopAtEnd
const getPlayerIndex = state => state.player.index
const getPlayerMaxIndex = state => state.player.maxIndex
const getOnionSkinBounds = state => [state.renderer.onionSkinFramesBefore, state.renderer.onionSkinFramesAfter]
const getPlayerFPS = state => state.player.settings.fps
const getTrackTitle = state => state.trackData.label
const getTrackCreator = state => state.trackData.creator
const getTrackDesc = state => state.trackData.description
const getAutosaveEnabled = state => state.autosaveEnabled
const getRiders = state => state.simulator.engine.engine.state.riders
const getNumSelectedLines = (state) => {
    if (state.toolState && state.toolState.SELECT_TOOL && state.toolState.SELECT_TOOL.selectedPoints) {
        return new Set([...state.toolState.SELECT_TOOL.selectedPoints].map(point => point >> 1)).size;
    }
    return 0;
}

function main () {
  const {
    React,
    store
  } = window

  const e = React.createElement
  let playerRunning = getPlayerRunning(store.getState())
  let windowFocused = getWindowFocused(store.getState())

  class MoreControlsModComponent extends React.Component {
    constructor () {
      super()

      this.state = {
        active: false,
        showRiderData: false,
        showCameraData: false,
        showTimelineData: false,
        showDetailsData: false,
        playbackCam: [0, 0],
        editorCam: [0, 0],
        stopEnd: false,
        index: 0,
        maxIndex: 0,
        onionSkin: [0, 0],
        fps: 0,
        title: '',
        creator: '',
        desc: '',
        autosave: false,
        riderPos: [0, 0],
        riderVel: [0, 0],
        riderAngle: 0,
        riderRemountable: true,
        selectedRider: 0,
        selectedLines: 0
      }

      store.subscribe(() => this._mounted && this.matchState())
    }

    componentWillUnmount() {
      this._mounted = false;
    }

    componentDidMount () {
      this._mounted = true;
      window.addEventListener('resize', this.updateDimensions)
      this.matchState()
    }

    matchState () {
      const state = store.getState()
      if (store.getState().progress.LOAD_TRACK.status) return;

      const playbackCamState = getPlaybackCamPos(state)
      const editorCamState = getEditorCamPos(state)
      const riders = getRiders(state)

      this.setState({ playbackCam: [playbackCamState.x, playbackCamState.y] })
      this.setState({ editorCam: [editorCamState.x, editorCamState.y] })
      this.setState({ stopAtEnd: getStopAtEnd(state) })
      this.setState({ index: getPlayerIndex(state) })
      this.setState({ maxIndex: getPlayerMaxIndex(state) })
      this.setState({ onionSkin: getOnionSkinBounds(state) })
      this.setState({ fps: getPlayerFPS(state) })
      this.setState({ title: getTrackTitle(state) })
      this.setState({ creator: getTrackCreator(state) })
      this.setState({ desc: getTrackDesc(state) })
      this.setState({ autosave: getAutosaveEnabled(state) })
      this.setState({ selectedLines: getNumSelectedLines(state) })

      if (riders.length > 0) {
        const selectedRider = Math.min(this.state.selectedRider, riders.length - 1)
        this.setState({ riderPos: [riders[selectedRider].startPosition.x, riders[selectedRider].startPosition.y] })
        this.setState({ riderVel: [riders[selectedRider].startVelocity.x, riders[selectedRider].startVelocity.y] })
        this.setState({ riderAngle: riders[selectedRider].startAngle })
        this.setState({ riderRemountable: riders[selectedRider].remountable })
        this.setState({ selectedRider })
      }
    }
    
    onActivate () {
      if (this.state.active) {
        this.setState({ active: false })
      } else {
        this.setState({ active: true })
      }
    }

    onSetEditorCamX (parent, x) {
      const { editorCam } = parent.state
      const camState = { position: { x, y: editorCam[1] }, zoom: getEditorCamZoom(store.getState()) }
      editorCam[0] = x
      store.dispatch({ type: 'SET_EDITOR_CAMERA', payload: camState })
      parent.setState({ editorCam })
    }

    onSetEditorCamY (parent, y) {
      const { editorCam } = parent.state
      const camState = { position: { x: editorCam[0], y }, zoom: getEditorCamZoom(store.getState()) }
      editorCam[1] = y
      store.dispatch({ type: 'SET_EDITOR_CAMERA', payload: camState })
      parent.setState({ editorCam })
    }

    onToggleStopEnd (parent, stopAtEnd) {
      store.dispatch({ type: 'SET_PLAYER_STOP_AT_END', payload: stopAtEnd })
      parent.setState({ stopAtEnd })
    }

    onSetIndex (parent, index) {
      if (index < 0) return
      store.dispatch({ type: 'SET_PLAYER_INDEX', payload: index })
      parent.setState({ index })
    }

    onSetMaxIndex (parent, maxIndex) {
      if (maxIndex < 0) return
      store.dispatch({ type: 'SET_PLAYER_MAX_INDEX', payload: maxIndex })
      parent.setState({ maxIndex })
    }

    onSetOnionSkinBefore (parent, framesBefore) {
      if (framesBefore < 0) return
      const { onionSkin } = parent.state
      onionSkin[0] = framesBefore
      store.dispatch({ type: 'SET_ONION_SKIN_FRAMES_BEFORE', payload: framesBefore })
      parent.setState({ onionSkin })
    }

    onSetOnionSkinAfter (parent, framesAfter) {
      if (framesAfter < 0) return
      const { onionSkin } = parent.state
      onionSkin[1] = framesAfter
      store.dispatch({ type: 'SET_ONION_SKIN_FRAMES_AFTER', payload: framesAfter })
      parent.setState({ onionSkin })
    }

    onSetFPS (parent, fps) {
      if (fps < 1) return
      store.dispatch({ type: 'SET_PLAYER_FPS', payload: fps })
      parent.setState({ fps })
    }

    onSetTrackTitle (parent, title) {
      const details = { title, creator: parent.state.creator, description: parent.state.desc }
      store.dispatch({ type: 'trackData/SET_TRACK_DETAILS', payload: details })
      parent.setState({ title })
    }

    onSetTrackCreator (parent, creator) {
      const details = { title: parent.state.title, creator, description: parent.state.desc }
      store.dispatch({ type: 'trackData/SET_TRACK_DETAILS', payload: details })
      parent.setState({ creator })
    }

    onSetTrackDesc (parent, desc) {
      const details = { title: parent.state.title, creator: parent.state.creator, description: desc }
      store.dispatch({ type: 'trackData/SET_TRACK_DETAILS', payload: details })
      parent.setState({ desc })
    }

    onToggleAutosave (parent, autosave) {
      store.dispatch({ type: 'SET_AUTOSAVE_ENABLED', payload: autosave })
      parent.setState({ autosave })
    }

    onSetRiderPosX (parent, x) {
      const { riderPos, selectedRider } = parent.state
      const ridersArray = [...getRiders(store.getState())]
      ridersArray[selectedRider] = {
        ...ridersArray[selectedRider],
        startPosition: { x, y: ridersArray[selectedRider].startPosition.y }
      }
      riderPos[0] = x
      store.dispatch({ type: 'SET_RIDERS', payload: ridersArray })
      store.dispatch({ type: 'COMMIT_TRACK_CHANGES' })
      parent.setState({ riderPos })
    }

    onSetRiderPosY (parent, y) {
      const { riderPos, selectedRider } = parent.state
      const ridersArray = [...getRiders(store.getState())]
      ridersArray[selectedRider] = {
        ...ridersArray[selectedRider],
        startPosition: { x: ridersArray[selectedRider].startPosition.x, y }
      }
      riderPos[1] = y
      store.dispatch({ type: 'SET_RIDERS', payload: ridersArray })
      store.dispatch({ type: 'COMMIT_TRACK_CHANGES' })
      parent.setState({ riderPos })
    }

    onSetRiderVelX (parent, x) {
      const { riderVel, selectedRider } = parent.state
      const ridersArray = [...getRiders(store.getState())]
      ridersArray[selectedRider] = {
        ...ridersArray[selectedRider],
        startVelocity: { x, y: ridersArray[selectedRider].startVelocity.y }
      }
      riderVel[0] = x
      store.dispatch({ type: 'SET_RIDERS', payload: ridersArray })
      store.dispatch({ type: 'COMMIT_TRACK_CHANGES' })
      parent.setState({ riderVel })
    }

    onSetRiderVelY (parent, y) {
      const { riderVel, selectedRider } = parent.state
      const ridersArray = [...getRiders(store.getState())]
      ridersArray[selectedRider] = {
        ...ridersArray[selectedRider],
        startVelocity: { x: ridersArray[selectedRider].startVelocity.x, y }
      }
      riderVel[1] = y
      store.dispatch({ type: 'SET_RIDERS', payload: ridersArray })
      store.dispatch({ type: 'COMMIT_TRACK_CHANGES' })
      parent.setState({ riderVel })
    }

    onSetRiderAngle (parent, a) {
      const { selectedRider } = parent.state
      const ridersArray = [...getRiders(store.getState())]
      ridersArray[selectedRider] = {
        ...ridersArray[selectedRider],
        startAngle: a
      }
      store.dispatch({ type: 'SET_RIDERS', payload: ridersArray })
      store.dispatch({ type: 'COMMIT_TRACK_CHANGES' })
      parent.setState({ riderAngle: a })
    }

    onSetRiderRemountable (parent, r) {
      const { selectedRider } = parent.state
      const ridersArray = [...getRiders(store.getState())]
      ridersArray[selectedRider] = {
        ...ridersArray[selectedRider],
        remountable: r
      }
      store.dispatch({ type: 'SET_RIDERS', payload: ridersArray })
      store.dispatch({ type: 'COMMIT_TRACK_CHANGES' })
      parent.setState({ riderRemountable: r })
    }

    onSelectRider (parent, sr) {
      const riders = getRiders(store.getState())

      if (sr < 0 || sr >= riders.length) return

      const selectedRider = parseInt(sr)
      parent.setState({ selectedRider })

      parent.setState({ riderPos: [riders[selectedRider].startPosition.x, riders[selectedRider].startPosition.y] })
      parent.setState({ riderVel: [riders[selectedRider].startVelocity.x, riders[selectedRider].startVelocity.y] })
      parent.setState({ riderAngle: riders[selectedRider].startAngle })
      parent.setState({ riderRemountable: riders[selectedRider].remountable })
    }

    onIncrementRiders () {
      const ridersArray = [...getRiders(store.getState())]
      ridersArray.push({
        startPosition: { x: 0, y: -50 * ridersArray.length },
        startVelocity: { x: 0.4, y: 0 },
        startAngle: 0,
        remountable: true
      })
      store.dispatch({ type: 'SET_RIDERS', payload: ridersArray })
      store.dispatch({ type: 'COMMIT_TRACK_CHANGES' })
    }

    onDecrementRiders () {
      const ridersArray = [...getRiders(store.getState())]

      if (ridersArray.length === 0) return

      ridersArray.pop()
      store.dispatch({ type: 'SET_RIDERS', payload: ridersArray })
      store.dispatch({ type: 'COMMIT_TRACK_CHANGES' })
    }

    renderDouble (key, label, sublabels, editable, actions) {
      const props = [
        {
          id: key + '0',
          type: 'number',
          readOnly: !editable,
          value: this.state[key][0],
          onChange: e => (actions[0])(this, Number(e.target.value))
        }, {
          id: key + '1',
          type: 'number',
          readOnly: !editable,
          value: this.state[key][1],
          onChange: e => (actions[1])(this, Number(e.target.value))
        }
      ]

      const block = { marginLeft: '.5em', width: '3em' }

      return e(
        'div',
        null,
        e('label', { style: { width: '4em' } }, label),
        e('label', { style: block, htmlFor: key + '0' }, sublabels[0]),
        e('input', { style: block, ...props[0] }),
        e('label', { style: block, htmlFor: key + '1' }, sublabels[1]),
        e('input', { style: block, ...props[1] })
      )
    }

    renderSingle (key, label, editable, isNumber, action) {
      const props = {
        id: key,
        type: isNumber ? 'number' : 'text',
        readOnly: !editable,
        value: this.state[key],
        onChange: e => action(this, isNumber ? Number(e.target.value) : e.target.value)
      }

      return e(
        'div',
        null,
        e('label', { style: { width: '4em' }, htmlFor: key }, label),
        e('input', { style: { marginLeft: '.5em' }, ...props })
      )
    }

    renderButton (key, label, action) {
      const props = {
        id: key,
        onClick: _ => action()
      }

      return e(
        'button',
        props,
        e('label', { htmlFor: key }, label)
      )
    }

    renderCheckbox (key, label, action) {
      const props = {
        id: key,
        checked: this.state[key],
        onChange: e => action(this, e.target.checked)
      }

      return e(
        'div',
        null,
        e('label', { style: { width: '4em' }, htmlFor: key }, label),
        e('input', { style: { marginLeft: '.5em' }, type: 'checkbox', ...props })
      )
    }
    
    renderSection (key, title) {
      return e('div', null,
        e('button',
          { id: key, style: { background: 'none', border: 'none' }, onClick: () => this.setState({ [key]: !this.state[key] }) },
          this.state[key] ? '▲' : '▼'
        ),
        e('label', { for: key }, title)
      )
    }

    render () {
      return e(
        'div',
        null,
        this.state.active && e(
          'div',
          { style: { width: '100%' } },
          `Selected Lines: ${this.state.selectedLines}`,
          this.renderSection('showRiderData', 'Riders'),
          this.state.showRiderData && e(
            'div', null,
            this.renderButton('incRiders', '+', this.onIncrementRiders),
            this.renderButton('decRiders', '-', this.onDecrementRiders),
            getRiders(store.getState()).length > 1 && this.renderSingle('selectedRider', 'Selected Rider', true, true, this.onSelectRider),
            getRiders(store.getState()).length > 0 && e(
              'div', null,
              this.renderDouble('riderPos', 'Rider Position', ['X', 'Y'], true, [this.onSetRiderPosX, this.onSetRiderPosY]),
              this.renderDouble('riderVel', 'Rider Velocity', ['X', 'Y'], true, [this.onSetRiderVelX, this.onSetRiderVelY]),
              this.renderSingle('riderAngle', 'Rider Angle', true, true, this.onSetRiderAngle),
              this.renderCheckbox('riderRemountable', 'Remountable', this.onSetRiderRemountable)
            )
          ),
          e('hr'),
          this.renderSection('showCameraData', 'Camera'),
          this.state.showCameraData && e(
            'div', null,
            this.renderDouble('playbackCam', 'Playback Camera', ['X', 'Y'], false),
            this.renderDouble('editorCam', 'Editor Camera', ['X', 'Y'], true, [this.onSetEditorCamX, this.onSetEditorCamY])
          ),
          e('hr'),
          this.renderSection('showTimelineData', 'Timeline'),
          this.state.showTimelineData && e(
            'div', null,
            this.renderCheckbox('stopAtEnd', 'Stop at End', this.onToggleStopEnd),
            this.renderSingle('index', 'Index', true, true, this.onSetIndex),
            this.renderSingle('maxIndex', 'Max Index', true, true, this.onSetMaxIndex),
            this.renderDouble('onionSkin', 'Onion Skins', ['Before', 'After'], true, [this.onSetOnionSkinBefore, this.onSetOnionSkinAfter]),
            this.renderSingle('fps', 'Player FPS', true, true, this.onSetFPS)
          ),
          e('hr'),
          this.renderSection('showDetailsData', 'Track Details'),
          this.state.showDetailsData && e(
            'div', null,
            this.renderSingle('title', 'Title', true, false, this.onSetTrackTitle),
            this.renderSingle('creator', 'Creator', true, false, this.onSetTrackCreator),
            this.renderSingle('desc', 'Description', true, false, this.onSetTrackDesc),
            this.renderCheckbox('autosave', 'Autosave', this.onToggleAutosave)
          )
        ),
        e('button',
          {
            style: {
              backgroundColor: this.state.active ? 'lightblue' : null
            },
            onClick: this.onActivate.bind(this)
          },
          'More Controls Mod'
        )
      )
    }
  }

  // this is a setting and not a standalone tool because it extends the select tool
  window.registerCustomSetting(MoreControlsModComponent)
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
