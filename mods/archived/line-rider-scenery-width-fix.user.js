// ==UserScript==

// @name         Scenery Width Number Picker
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Scenery slider temp fix
// @version      0.1.1
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
    store
  } = window

  const e = React.createElement
  let playerRunning = getPlayerRunning(store.getState())
  let windowFocused = getWindowFocused(store.getState())

  class SceneryWidthModComponent extends React.Component {
    constructor () {
      super()

      this.state = {
        active: false,
        sceneryWidth: 0
      }

      store.subscribe(() => this.matchState())
    }

    componentDidMount () {
      window.addEventListener('resize', this.updateDimensions)
      this.matchState()
    }

    matchState () {
      const state = store.getState()
      this.setState({ width: getSceneryWidth(state) })
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false })
      } else {
        this.setState({ active: true })
      }
    }

    onChooseWidth (parent, newWidth) {
      parent.setState({ sceneryWidth: newWidth })
      store.dispatch({
        type: "SELECT_SCENERY_WIDTH",
        payload: Math.pow(10, newWidth)
      })
    }

    renderSlider (key, props, title, action) {
      const rangeProps = {
        min: props.min,
        max: props.max,
        step: props.step,
        id: key,
        value: this.state[key],
        onChange: e => action(this, parseFloat(e.target.value))
      }

      const numberProps = {
        min: Math.pow(10, props.min),
        max: Math.pow(10, props.max),
        step: props.step,
        id: key,
        value: Math.pow(10, this.state[key]),
        onChange: e => action(this, Math.log10(parseFloat(e.target.value)))
      }
      
      return e('div', null,
        e('label', { for: key }, title),
        e('div', null,
          e('input', { style: { width: '4em' }, type: 'number', ...numberProps }),
          e('input', { style: { width: '8em' }, type: 'range', ...rangeProps, onFocus: e => e.target.blur() })
        )
      )
    }

    render () {
      return e(
        'div',
        null,
        this.state.active && e(
          'div',
          { style: { width: '100%' } },
            this.renderSlider('sceneryWidth', { min: -3, max: 3, step: 0.1 }, 'Scenery Width', this.onChooseWidth)
        ),
        e('button',
          {
            style: {
              backgroundColor: this.state.active ? 'lightblue' : null
            },
            onClick: this.onActivate.bind(this)
          },
          'Scenery Width Mod'
        )
      )
    }
  }

  // this is a setting and not a standalone tool because it extends the select tool
  window.registerCustomSetting(SceneryWidthModComponent)
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
