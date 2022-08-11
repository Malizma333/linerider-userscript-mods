// ==UserScript==
// @name         Line Rider Improved Mod API
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Renders mod components for linerider.com mods
// @author       Malizma
// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:8000/*
// @grant        none
// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-improved-api.user.js
// ==/UserScript==

// jshint asi: true
// jshint esversion: 6

const setTool = (tool) => ({
  type: 'SET_TOOL',
  payload: tool
})

const getActiveTool = state => state.selectedTool
const getWindowFocused = state => state.views.Main
const getPlayerRunning = state => state.player.running

function main () {
  window.V2 = window.V2 || window.store.getState().simulator.engine.engine.state.startPoint.constructor

  const {
    React,
    ReactDOM,
    store
  } = window

  const e = React.createElement
  var playerRunning = getPlayerRunning(store.getState());
  var windowFocused = getWindowFocused(store.getState());

  const rootStyle = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      textAlign: 'left',
      transition: 'opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms'
  }

  const boxStyle = {
      display: 'flex',
      flexDirection: 'column-reverse',
      padding: 8
  }

  store.subscribe(() => {
      playerRunning = getPlayerRunning(store.getState());
      windowFocused = getWindowFocused(store.getState());

      let shouldBeVisible = !playerRunning && windowFocused;

      toolContainer.style.opacity = shouldBeVisible ? 1 : 0;
      toolContainer.style.pointerEvents = shouldBeVisible ? null : 'none';

      settingsContainer.style.opacity = shouldBeVisible ? 1 : 0;
      settingsContainer.style.pointerEvents = shouldBeVisible ? null : 'none';
  })

  class CustomToolsContainer extends React.Component {
    constructor () {
      super()

      this.state = {
        activeTool: getActiveTool(store.getState()),
        customTools: {}
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
      let containerAssigned = false;
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

        if(!containerAssigned) {
            containerAssigned = true;
            Object.assign(toolContainer.style, {
                position: 'fixed',
                width : '200px',
                height: '16%',
                overflowY: 'auto',
                overflowX: 'hidden',
                top: '50%',
                right: '8px',
                border: '1px solid black',
                backgroundColor: '#ffffff',
                opacity: 0,
                pointerEvents: 'none'
            })
        }
      }
    }

    render () {
      const activeCustomTool = this.state.customTools[this.state.activeTool]

      return e('div', { style: rootStyle },
        Object.keys(this.state.customTools).length > 0 && e('div', null,
            e('select', {
            style: {textAlign: 'center', width : '200px'},
            maxMenuHeight : 100,
            value: this.state.activeTool,
            onChange: e => {
                store.dispatch(setTool(e.target.value))
            }},
             e('option', {value: 'PENCIL_TOOL'}, '- Select Tool -'),
             ...Object.keys(this.state.customTools).map(toolName =>
              e('option', {value: toolName}, toolName)
             ))
        ),
        activeCustomTool && activeCustomTool.component && e('div', { style: boxStyle }, e(activeCustomTool.component)),
      )
    }
  }

    const toolContainer = document.createElement('div');

    document.getElementById('content').appendChild(toolContainer)

    ReactDOM.render(
        e(CustomToolsContainer),
        toolContainer
    )

  class CustomSettingsContainer extends React.Component {
    constructor () {
      super()

      this.state = {
        activeSetting: null,
        customSettings: []
      }
    }

    componentDidMount () {
        let containerAssigned = false;

        window.registerCustomSetting = (component) => {
            console.info('Registering custom setting', component.name)
            this.setState((prevState) => ({
                customSettings: [...prevState.customSettings, component]
            }))

            if(!containerAssigned) {
                containerAssigned = true;
                Object.assign(settingsContainer.style, {
                    position: 'fixed',
                    width : '200px',
                    height: '16%',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    top: '70%',
                    right: '8px',
                    border: '1px solid black',
                    backgroundColor: '#ffffff',
                    opacity: 0,
                    pointerEvents: 'none'
                })
            }
        }

        if (typeof window.onCustomToolsApiReady === 'function') {
            window.onCustomToolsApiReady()
        }
    }

    render() {
        const activeSetting = this.state.customSettings[this.state.activeSetting];

        return e('div', { style: rootStyle },
        this.state.customSettings.length > 0 && e('div', null,
            e('select', {
            style: {textAlign: 'center', width : '200px'},
            value: this.state.activeSetting,
            onChange: e => this.setState({ activeSetting : e.target.value })},
             e('option', {value: null}, '- Select Mod -'),
             this.state.customSettings.map((option, index) => (
              e('option', {value: index}, option.name)
             ))
            )
        ),
        activeSetting && e('div', { style: boxStyle }, e(activeSetting)),
      )
    }
  }

    const settingsContainer = document.createElement('div')

    document.getElementById('content').appendChild(settingsContainer)

    ReactDOM.render(
        e(CustomSettingsContainer),
        settingsContainer
    )
}

if (window.store) {
  main()
} else {
  window.onAppReady = main
}
