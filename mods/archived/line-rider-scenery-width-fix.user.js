// ==UserScript==

// @name         Scenery Width Number Picker
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Scenery slider temp fix
// @version      0.1.0
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
        sceneryWidth: 1
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
      const width = getSceneryWidth(store.getState())
      const parsedWidth = parseFloat(newWidth)

      parent.setState({ sceneryWidth: parsedWidth })

      if (parsedWidth < 0.01 || parsedWidth > 1000) return

      store.dispatch({
        type: "SELECT_SCENERY_WIDTH",
        payload: parsedWidth
      })
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

    render () {
      return e(
        'div',
        null,
        this.state.active && e(
          'div',
          { style: { width: '100%' } },
            this.renderSingle('sceneryWidth', 'Scenery Width', true, true, this.onChooseWidth)
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
