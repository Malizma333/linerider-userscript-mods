// ==UserScript==

// @name         Alternative Mod API
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Container for linerider.com mods
// @version      2.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/line-rider-alternative-api.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/line-rider-alternative-api.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

// jshint asi: true
// jshint esversion: 6

const setTool = (tool) => ({
  type: 'SET_TOOL',
  payload: tool
})

const getActiveTool = state => state.selectedTool
const getWindowFocused = state => !!state.views.Main
const getPlayerRunning = state => state.player.running

function main () {
  window.V2 = window.V2 || window.store.getState().simulator.engine.engine.state.startPoint.constructor

  const {
    React,
    ReactDOM,
    store
  } = window

  const e = React.createElement
  let playerRunning = getPlayerRunning(store.getState())
  let windowFocused = getWindowFocused(store.getState())

  const settingsContainerStyle = {
    position: 'fixed',
    background: '#ffffffbb',
    overflow: 'hidden',
    opacity: 0,
    pointerEvents: 'none',
    transition: 'opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
    bottom: '70px',
    right: '8px',
    height: '35vh'
  }

  const minifyButtonStyle = {
    height: '100%',
    aspectRatio: '1/1',
    background: 'none',
    borderRadius: '100%',
    alignItems: 'center',
    display: 'flex'
  }

  const expandButtonStyle = {
    visibility: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'fixed',
    bottom: '70px',
    right: '8px',
    fontSize: 'xx-large',
    aspectRatio: '1/1',
    borderRadius: '100%'
  }

  const rootStyle = {
    height: '100%',
    overflowY: 'scroll',
    display: 'flex',
    flexDirection: 'column-reverse',
    textAlign: 'right',
  }

  class CustomSettingsContainer extends React.Component {
    constructor () {
      super()

      this.state = {
        customSettings: [],
        customTools: {},
        searchTerm: '',
        activeTool: getActiveTool(store.getState())
      }

      store.subscribe(() => {
        const activeTool = getActiveTool(store.getState())
        if (this.state.activeTool !== activeTool) {
          let activeCustomTool = this.state.customTools[this.state.activeTool]
          if (activeCustomTool && activeCustomTool.onDetach) {
            activeCustomTool.onDetach()
          }
          this.setState({ activeTool })
        }
      })
    }

    componentDidMount () {
      let containerAssigned = false

      window.registerCustomSetting = (component) => {
        console.info('Registering custom setting', component.name)
        this.setState((prevState) => {
          const customSettings = [...prevState.customSettings, component];
          customSettings.sort(function (modA, modB) {
            const modAName = modA.name.toUpperCase()
            const modBName = modB.name.toUpperCase()
            return -((modAName < modBName) ? -1 : (modAName > modBName) ? 1 : 0)
          });
          return { customSettings }
        })

        if (!containerAssigned) {
          containerAssigned = true
          Object.assign(settingsContainer.style, settingsContainerStyle)
          Object.assign(expandButton.style, expandButtonStyle)
        }
      }

      window.registerCustomTool = (toolName, tool, component, onDetach) => {
        console.info('Registering custom tool', toolName)

        window.Tools[toolName] = tool

        this.setState((prevState) => ({
          customTools: {
            ...prevState.customTools,
            [toolName]: { component, onDetach }
          }
        }))

        if (onDetach) {
          this.customToolsDestructors[toolName] = onDetach
        }
      }

      if (typeof window.onCustomToolsApiReady === 'function') {
        window.onCustomToolsApiReady()
      }
    }

    render () {
      return this.state.customSettings.length > 0 && e(
        'div',
        { style: { display: 'flex', height: '100%', flexDirection: 'column' } },
        e(
          'div',
          { style: { display: 'flex', flexDirection: 'row', alignItems: 'center' } },
          e(
            'button',
            {
              style: minifyButtonStyle,
              onClick: () => { settingsContainer.style.visibility = 'hidden'; expandButton.style.visibility = 'visible' }
            },
            '-'
          ),
          e(
            'input',
            {
              style: { width: '100%', border: 'none', background: 'none', marginLeft: '1em' },
              placeholder: 'Search...',
              value: this.state.searchTerm,
              onChange: (e) => this.setState({ searchTerm: e.target.value })
            }
          )
        ),
        e(
          'div',
          { style: rootStyle },
          this.state.customSettings.filter(
            (mod) => mod.name.toUpperCase().includes(this.state.searchTerm.toUpperCase())
          ).map((mod) => e(mod)),
          ...Object.keys(this.state.customTools).map(toolName => {
            return e(
              'div',
              null,
              // this.state.activeTool === toolName && e(this.state.customTools[this.state.activeTool].component),
              e('button',
                {
                  key: toolName,
                  style: {
                    backgroundColor: this.state.activeTool === toolName ? 'lightblue' : null
                  },
                  onClick: () => store.dispatch(setTool(toolName))
                },
                toolName
              )
            );
          })
        )
      )
    }
  }

  const expandButton = document.createElement('button')
  expandButton.innerHTML = '↖'
  expandButton.title = 'Show ModAPI'
  expandButton.onclick = () => { settingsContainer.style.visibility = 'visible'; expandButton.style.visibility = 'hidden' }
  document.getElementById('content').appendChild(expandButton)

  const settingsContainer = document.createElement('div')

  document.getElementById('content').appendChild(settingsContainer)

  ReactDOM.render(
    e(CustomSettingsContainer),
    settingsContainer
  )

  store.subscribe(() => {
    playerRunning = getPlayerRunning(store.getState())
    windowFocused = getWindowFocused(store.getState())
    const active = !playerRunning && windowFocused
    settingsContainer.style.opacity = active ? 1 : 0
    settingsContainer.style.pointerEvents = active ? null : 'none'
  })
}

if (window.store) {
  main()
} else {
  const prevInit = window.onAppReady
  window.onAppReady = () => {
    if (prevInit) prevInit()
    main()
  }
}
