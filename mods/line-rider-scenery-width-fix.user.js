// ==UserScript==

// @name         Scenery Width Number Picker
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Scenery slider component
// @version      0.1.2
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

  class SceneryWidthModComponent extends React.Component {
    constructor () {
      super()

      this.state = {
        active: false,
        sceneryWidth: 1
      }

      store.subscribe(() => this.setState({ sceneryWidth: getSceneryWidth(store.getState()) }))
    }

    onActivate () {
      this.setState({ active: !this.state.active })
    }

    onChooseWidth (parent, newWidth) {
      parent.setState({ sceneryWidth: newWidth })

      if (0.001 <= newWidth && newWidth <= 1000) {
        store.dispatch({ type: "SELECT_SCENERY_WIDTH", payload: newWidth })
      }
    }

    renderSlider (key, title, action) {
      const rangeProps = {
        min: -3,
        max: 3,
        step: 0.1,
        id: key,
        value: Math.log10(this.state[key]),
        onChange: e => action(this, Math.pow(10, parseFloat(e.target.value)))
      }

      const numberProps = {
        min: 0.001,
        max: 1000,
        step: 0.1,
        id: key,
        value: this.state[key],
        onChange: e => action(this, parseFloat(e.target.value))
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
          null,
          this.renderSlider('sceneryWidth', 'Scenery Width', this.onChooseWidth)
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

  window.registerCustomSetting(SceneryWidthModComponent)
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
