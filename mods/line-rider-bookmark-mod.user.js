// ==UserScript==

// @name         Bookmark Mod
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Allows you to make bookmarks that act similar to flags but there's multiple
// @version      1.3.2
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-bookmark-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-bookmark-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const DEFAULT_STATE = [[0, 0, 0, '']]

function main () {
  const {
    React,
    store
  } = window
  const e = React.createElement

  class BookmarkModComponent extends React.Component {
    constructor (props) {
      super(props)

      this.state = {
        active: false,
        showBpmGen: false,
        indexView: false,
        bpm: 60,
        start: 0,
        end: 1200,
        beats: 1,
        timestamps: JSON.parse(JSON.stringify(DEFAULT_STATE))
      }
    }

    async onRegisterTimestamps () {
      try {
        const timestamps = JSON.parse(window.localStorage.getItem('BOOKMARK_MOD_TIMESTAMPS'))
        if (timestamps && timestamps.length) {
          this.setState({ timestamps })
        } else {
          this.setState({ timestamps: JSON.parse(JSON.stringify(DEFAULT_STATE)) })
        }
      } catch (e) {
        this.setState({ timestamps: JSON.parse(JSON.stringify(DEFAULT_STATE)) })
      }
    }

    async onActivate () {
      if (this.state.active) {
        this.setState({ active: false })
      } else {
        await this.onRegisterTimestamps()
        this.setState({ active: true })
      }
    }

    onIndexView () {
      if (this.state.indexView) {
        this.setState({ indexView: false })
      } else {
        this.setState({ indexView: true })
      }
    }

    onGenerateBPM () {
      if (this.state.beats <= 0) return
      if (this.state.bpm <= 0) return
      if (this.state.start < 0) return
      if (this.state.end < 0) return
      const timestamps = this.state.timestamps
      for (let frame = this.state.start; frame < this.state.end; frame += 2400 / (this.state.beats * this.state.bpm)) {
        const timestamp = this.convertIndexToTime(frame)
        timestamp.push('BPM Marker')
        timestamps.push(timestamp)
      }
      this.setState({ timestamps })
    }

    componentWillUpdate (nextProps, nextState) { // eslint-disable-line react/no-deprecated
      if (!nextState.timestamps) return
      window.localStorage.setItem('BOOKMARK_MOD_TIMESTAMPS', JSON.stringify(nextState.timestamps))
    }

    onAddTimestamp () {
      const timestamps = this.state.timestamps
      const currentIndex = store.getState().player.index
      const currentTimestamp = this.convertIndexToTime(currentIndex)
      timestamps.unshift(currentTimestamp)
      this.setState({ timestamps })
    }

    convertIndexToTime (index) {
      const time = [
        Math.floor(index / 2400),
        Math.floor((index % 2400) / 40),
        Math.floor(index % 40)
      ]
      return time
    }

    convertTimeToIndex (time) {
      const index = time[0] * 2400 + time[1] * 40 + time[2]
      return index
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

    renderFramePicker (index) {
      const props = {
        type: 'text',
        inputmode: 'numeric',
        value: this.convertTimeToIndex(this.state.timestamps[index]),
        onChange: e => {
          const timestamps = this.state.timestamps
          timestamps[index] = this.convertIndexToTime(parseInt(e.target.value))
          this.setState({ timestamps })
        }
      }

      return e(
        'div', null,
        e('input', { style: { width: '6em' }, ...props })
      )
    }

    renderNumberPicker (key, title, constraints) {
      const props = {
        ...constraints,
        type: 'number',
        value: this.state[key],
        onChange: e => this.setState({ [key]: parseInt(e.target.value) })
      }

      return e(
        'div', null,
        title + ' ',
        e('input', { style: { width: '4em' }, ...props })
      )
    }

    renderTimePicker (index, key, constraints) {
      const props = {
        type: 'text',
        inputmode: 'numeric',
        value: this.state.timestamps[index][key],
        onChange: e => {
          const timestamps = this.state.timestamps
          timestamps[index][key] = Math.max(constraints.min, Math.min(constraints.max, parseInt(e.target.value)))
          this.setState({ timestamps })
        }
      }

      return e(
        'div', null,
        e('input', { style: { width: '2em' }, ...props })
      )
    }

    renderBPMGenerator () {
      const maxIndex = window.store.getState().player.maxIndex
      return e(
        'div', null,
        this.renderNumberPicker('beats', 'Beat Count (1/x) ', { min: 1, max: 256, step: 1 }),
        this.renderNumberPicker('start', 'Start', { min: 0, max: 1000, step: 1 }),
        this.renderNumberPicker('end', 'End', { min: 0, max: maxIndex, step: 1 }),
        this.renderNumberPicker('bpm', 'BPM', { min: 0, max: maxIndex, step: 1 }),
        e('button', { onClick: this.onGenerateBPM.bind(this) }, 'Generate')
      )
    }

    renderTimeStamp (index) {
      return e(
        'div', null,
        e(
          'input', {
            style: { width: '8em' },
            type: 'text',
            value: this.state.timestamps[index][3],
            onChange: (e) => {
              const timestamps = this.state.timestamps
              timestamps[index][3] = e.target.value
              this.setState({ timestamps })
            }
          }),
        e(
          'div', { style: { display: 'flex', flexDirection: 'row' } },
          e(
            'button', {
              onClick: () => {
                const targetTimestamp = this.state.timestamps[index]
                const targetFrame = this.convertTimeToIndex(targetTimestamp)
                store.dispatch({ type: 'SET_PLAYER_INDEX', payload: targetFrame })
              }
            }, '>'),
          this.state.indexView
          ? e(
            'div', null,
            this.renderFramePicker(index)
          )
          : e(
            'div', { style: { display: 'flex', flexDirection: 'row' } },
            this.renderTimePicker(index, 0, { min: 0, max: 59 }), ':',
            this.renderTimePicker(index, 1, { min: 0, max: 59 }), ':',
            this.renderTimePicker(index, 2, { min: 0, max: 39 })
          ),
          e(
            'button', {
              onClick: () => {
                if (!window.confirm('Remove bookmark?')) return
                const timestamps = this.state.timestamps
                timestamps.splice(index, 1)
                this.setState({ timestamps })
              }
            }, '-')
        )
      )
    }

    render () {
      return e(
        'div', null,
        this.state.active && e(
          'div',
          null,
          e(
            'button', {
              onClick: () => this.onAddTimestamp()
            }, '+'),
          e(
            'button', {
              onClick: () => {
                if (!window.confirm('Remove all bookmarks?')) return
                this.setState({ timestamps: [] })
              }
            }, 'X'),
          e(
            'button', { onClick: this.onIndexView.bind(this) },
            this.state.indexView ? 'Show Times' : 'Show Indices'
          ),
          e(
            'div',
            { style: { width: '100%', height: '10vh', overflowY: 'auto', border: '1px solid black' } },
            this.state.timestamps.map((timestamp, index) => {
              return e('div', { key: index }, this.renderTimeStamp(index))
            })
          ),
          e('hr'),
          this.renderSection('showBpmGen', 'Generate BPM Markers'),
          this.state.showBpmGen && this.renderBPMGenerator()
        ),
        e(
          'button', {
            style: { backgroundColor: this.state.active ? 'lightblue' : null },
            onClick: this.onActivate.bind(this)
          },
          'Bookmark Mod'
        )
      )
    }
  }

  window.registerCustomSetting(BookmarkModComponent)
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
