// ==UserScript==

// @name         Improved Mod API
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Container for linerider.com mods
// @version      1.8.3
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/line-rider-improved-api.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/line-rider-improved-api.user.js
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
const getWindowFocused = state => state.views.Main
const getPlayerRunning = state => state.player.running

const defaultPreferences = {
  settingsTop: '65vh',
  settingsLeft: '78vw',
  settingsWidth: '20vw',
  settingsHeight: '25vh'
}
const preferencesKey = 'MOD_API_PREFERENCES'

function loadPrefs () {
  const storedPreferences = window.localStorage.getItem(preferencesKey)
  if (storedPreferences) {
    const nextPrefs = JSON.parse(storedPreferences)

    Object.keys(defaultPreferences)
      .filter(key => !Object.keys(nextPrefs).includes(key))
      .forEach(key => {
        nextPrefs[key] = defaultPreferences[key]
      })
    return nextPrefs
  }

  return defaultPreferences
}

function savePrefs (newPrefs) {
  window.localStorage.setItem(
    preferencesKey,
    JSON.stringify(newPrefs)
  )
}

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

  const preferences = loadPrefs()
  savePrefs(preferences)

  const settingsContainerStyle = {
    position: 'fixed',
    border: '3px solid black',
    backgroundColor: '#ffffff',
    resize: 'both',
    overflow: 'hidden',
    opacity: 0,
    pointerEvents: 'none'
  }

  const toolContainerStyle = {
    position: 'fixed',
    width: '150px',
    height: '16%',
    overflowY: 'auto',
    overflowX: 'hidden',
    top: '8px',
    right: '225px',
    border: '1px solid black',
    backgroundColor: '#ffffff',
    pointerEvents: 'none',
    opacity: 0
  }

  const headerStyle = {
    cursor: 'move',
    minHeight: '3ch',
    backgroundColor: '#aaaaaa',
    zIndex: '10',
    borderBottom: '3px solid black'
  }

  const minifyButtonStyle = {
    height: '100%',
    aspectRatio: '1/1',
    border: 'none',
    background: 'none'
  }

  const expandButtonStyle = {
    visibility: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'fixed',
    bottom: '1vh',
    right: '1vw',
    fontSize: 'xx-large',
    aspectRatio: '1/1',
    borderRadius: '100%'
  }

  settingsContainerStyle.top = preferences.settingsTop
  settingsContainerStyle.left = preferences.settingsLeft
  settingsContainerStyle.width = preferences.settingsWidth
  settingsContainerStyle.height = preferences.settingsHeight

  store.subscribe(() => {
    playerRunning = getPlayerRunning(store.getState())
    windowFocused = getWindowFocused(store.getState())

    const shouldBeVisible = !playerRunning && windowFocused

    toolContainer.style.opacity = shouldBeVisible ? 1 : 0
    toolContainer.style.pointerEvents = shouldBeVisible ? null : 'none'

    settingsContainer.style.opacity = shouldBeVisible ? 1 : 0
    settingsContainer.style.pointerEvents = shouldBeVisible ? null : 'none'
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
          const activeCustomTool = this.state.customTools[this.state.activeTool]
          if (activeCustomTool && activeCustomTool.onDetach) {
            activeCustomTool.onDetach()
          }
          this.setState({ activeTool })
        }
      })
    }

    componentDidMount () {
      let containerAssigned = false
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

        if (!containerAssigned) {
          containerAssigned = true
          Object.assign(toolContainer.style, toolContainerStyle)
        }
      }
    }

    render () {
      const activeCustomTool = this.state.customTools[this.state.activeTool]

      const rootStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        flex: 1,
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden'
      }
    
      const boxStyle = {
        display: 'flex',
        flexDirection: 'column-reverse',
        padding: 8,
        width: '100%'
      }

      return e(
        'div',
        { style: rootStyle },
        Object.keys(this.state.customTools).length > 0 && e(
          'div',
          null,
          e(
            'select',
            {
              style: { textAlign: 'center', width: '150px' },
              maxMenuHeight: 100,
              value: this.state.activeTool,
              onChange: e => {
                store.dispatch(setTool(e.target.value))
                e.target.blur()
              }
            },
            e('option', { value: 'PENCIL_TOOL' }, '- Select Tool -'),
            ...Object.keys(this.state.customTools).map(
              toolName => e(
                'option',
                { value: toolName },
                toolName
              )
            )
          )
        ),
        activeCustomTool && activeCustomTool.component && e(
          'div',
          { style: boxStyle },
          e(activeCustomTool.component)
        )
      )
    }
  }

  const toolContainer = document.createElement('div')

  document.getElementById('content').appendChild(toolContainer)

  ReactDOM.render(
    e(CustomToolsContainer),
    toolContainer
  )

  const dragProps = { lastX: 0, lastY: 0 }

  class CustomSettingsContainer extends React.Component {
    constructor () {
      super()

      this.state = {
        customSettings: [],
        searchTerm: ''
      }
    }

    componentDidMount () {
      let containerAssigned = false

      window.registerCustomSetting = (component) => {
        console.info('Registering custom setting', component.name)
        this.setState((prevState) => ({
          customSettings: [...prevState.customSettings, component]
        }))

        if (!containerAssigned) {
          containerAssigned = true
          Object.assign(settingsContainer.style, settingsContainerStyle)
          Object.assign(expandButton.style, expandButtonStyle)
        }
      }

      if (typeof window.onCustomToolsApiReady === 'function') {
        window.onCustomToolsApiReady()
      }

      window.addEventListener('resize', this.updateDimensions)
    }

    updateDimensions () {
      if (settingsContainer.offsetLeft < 0) {
        settingsContainer.style.left = `${0}vw`
        preferences.settingsLeft = `${0}vw`
      }

      if (settingsContainer.offsetLeft > window.innerWidth - settingsContainer.offsetWidth) {
        settingsContainer.style.left = `${100 * (window.innerWidth - settingsContainer.offsetWidth) / window.innerWidth}vw`
        preferences.settingsLeft = `${100 * (window.innerWidth - settingsContainer.offsetWidth) / window.innerWidth}vw`
      }

      if (settingsContainer.offsetTop < 0) {
        settingsContainer.style.top = `${0}vh`
        preferences.settingsTop = `${0}vh`
      }

      if (settingsContainer.offsetTop > window.innerHeight - settingsContainer.offsetHeight) {
        settingsContainer.style.top = `${100 * (window.innerHeight - settingsContainer.offsetHeight) / window.innerHeight}vh`
        preferences.settingsTop = `${100 * (window.innerHeight - settingsContainer.offsetHeight) / window.innerHeight}vh`
      }

      savePrefs(preferences)
    }

    onStartDrag (e) {
      e = e || window.event
      e.preventDefault()

      dragProps.lastX = e.clientX
      dragProps.lastY = e.clientY

      document.onmousemove = this.onDrag
      document.onmouseup = this.onCloseDrag
    }

    onDrag (e) {
      e = e || window.event
      e.preventDefault()

      const newX = dragProps.lastX - e.clientX
      const newY = dragProps.lastY - e.clientY
      dragProps.lastX = e.clientX
      dragProps.lastY = e.clientY

      const nextOffsetX = settingsContainer.offsetLeft - newX
      const nextOffsetY = settingsContainer.offsetTop - newY

      if (nextOffsetX >= 0 && nextOffsetX <= window.innerWidth - settingsContainer.offsetWidth &&
             nextOffsetY >= 0 && nextOffsetY <= window.innerHeight - settingsContainer.offsetHeight) {
        settingsContainer.style.left = `${100 * (settingsContainer.offsetLeft - newX) / window.innerWidth}vw`
        settingsContainer.style.top = `${100 * (settingsContainer.offsetTop - newY) / window.innerHeight}vh`
        preferences.settingsLeft = `${100 * (settingsContainer.offsetLeft - newX) / window.innerWidth}vw`
        preferences.settingsTop = `${100 * (settingsContainer.offsetTop - newY) / window.innerHeight}vh`
      }

      savePrefs(preferences)
    }

    onCloseDrag (e) {
      document.onmouseup = null
      document.onmousemove = null
    }

    render () {
      const rootStyle = {
        height: '100%',
        overflowY: 'scroll',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column-reverse',
        textAlign: 'right'
      }

      this.state.customSettings.sort(function (modA, modB) {
        const modAName = modA.name.toUpperCase()
        const modBName = modB.name.toUpperCase()
        return -((modAName < modBName) ? -1 : (modAName > modBName) ? 1 : 0)
      })

      return this.state.customSettings.length > 0 && e(
        'div',
        { style: { display: 'flex', height: '100%', width: '100%', flexDirection: 'column' } },
        e(
          'div',
          { style: headerStyle, onMouseDown: (e) => this.onStartDrag(e) },
          e(
            'button',
            {
              style: minifyButtonStyle,
              onClick: () => { settingsContainer.style.visibility = 'hidden'; expandButton.style.visibility = 'visible' }
            },
            '-'
          )
        ),
        e(
          'input',
          {
            style: { width: '100%' },
            placeholder: 'Search...',
            value: this.state.searchTerm,
            onChange: (e) => { this.setState({ searchTerm: e.target.value }) }
          }
        ),
        e(
          'div',
          { style: rootStyle },
          this.state.customSettings.filter(
            (mod) => mod.name.toUpperCase().includes(this.state.searchTerm.toUpperCase())
          ).map(
            (mod) => e(
              'div',
              { style: { width: '100%', borderTop: '2px solid black' } },
              e(mod)
            )
          )
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

  const resizeObserver = new window.ResizeObserver(() => {
    preferences.settingsWidth = `${100 * settingsContainer.offsetWidth / window.innerWidth}vw`
    preferences.settingsHeight = `${100 * settingsContainer.offsetHeight / window.innerHeight}vh`
    savePrefs(preferences)
  })

  resizeObserver.observe(settingsContainer)
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
