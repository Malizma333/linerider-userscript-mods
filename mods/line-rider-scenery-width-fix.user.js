// ==UserScript==

// @name         Scenery Width Number Picker
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Scenery slider component
// @version      0.2.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-scenery-width-fix.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-scenery-width-fix.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

// jshint asi: true
// jshint esversion: 6

const getWindowFocused = state => state.views.Main
const getPlayerRunning = state => state.player.running
const getSceneryWidth = state => state.selectedSceneryWidth

function main () {
  const {
    React,
    ReactDOM,
    store
  } = window

  const e = React.createElement
  const sceneryWidthContainer = document.createElement('div')
  const sceneryWidthContainerStyle = {
    position: 'fixed',
    opacity: 0,
    pointerEvents: 'none',
    transition: 'opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
    top: '25px',
    left: '65vw'
  }

  class SceneryWidthModComponent extends React.Component {
    constructor () {
      super()

      this.state = {
        sceneryWidth: 1
      }

      store.subscribe(() => this._mounted && this.setState({ sceneryWidth: getSceneryWidth(store.getState()) }))
    }

    componentDidMount() {
      this._mounted = true;
      Object.assign(sceneryWidthContainer.style, sceneryWidthContainerStyle)
    }

    componentWillUnmount() {
      this._mounted = false;
    }

    onChooseWidth (sceneryWidth) {
      if (sceneryWidth === 0) return;
      store.dispatch({ type: "SELECT_SCENERY_WIDTH", payload: sceneryWidth })
      this.setState({ sceneryWidth })
    }

    render () {
      return e(
        'div',
        null,
        e('input', { style: { width: '4em' }, type: 'number', min: 0, max: 1000, step: 0.01, value: this.state.sceneryWidth, onChange: e => this.onChooseWidth(parseFloat(e.target.value)) }),
        e('input', { style: { width: '7em' }, type: 'range', min: -2, max: 3, step: 0.1, value: Math.log10(this.state.sceneryWidth), onChange: e => this.onChooseWidth(Math.pow(10, parseFloat(e.target.value))), onFocus: e => e.target.blur() })
      )
    }
  }

  sceneryWidthContainer.style

  document.getElementById('content').appendChild(sceneryWidthContainer)

  ReactDOM.render(
    e(SceneryWidthModComponent),
    sceneryWidthContainer
  )

  store.subscribe(() => {
    let playerRunning = getPlayerRunning(store.getState())
    let windowFocused = getWindowFocused(store.getState())
    const active = !playerRunning && windowFocused
    sceneryWidthContainer.style.opacity = active ? 1 : 0
    sceneryWidthContainer.style.pointerEvents = active ? null : 'none'
  })
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
