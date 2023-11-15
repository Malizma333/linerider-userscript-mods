// ==UserScript==

// @name         Line Rider Zigzag Mod
// @author       Malizma
// @description  Linerider.com userscript to generate zigzags
// @version      1.0

// @namespace    http://tampermonkey.net/
// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:8000/*
// @match        https://*.surge.sh/*
// @grant        none
// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-zigzag-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-zigzag-mod.user.js

// ==/UserScript==

const SELECT_TOOL = 'SELECT_TOOL'
const EMPTY_SET = new Set()

const setTool = (tool) => ({
    type: 'SET_TOOL',
    payload: tool
})

const setToolState = (toolId, state) => ({
    type: 'SET_TOOL_STATE',
    payload: state,
    meta: { id: toolId }
})

const setSelectToolState = toolState => setToolState(SELECT_TOOL, toolState)

const updateLines = (linesToRemove, linesToAdd, name) => ({
    type: 'UPDATE_LINES',
    payload: { linesToRemove, linesToAdd },
    meta: { name: name }
})

const addLines = (line) => updateLines(null, line, 'ADD_LINES')

const commitTrackChanges = () => ({
    type: 'COMMIT_TRACK_CHANGES'
})

const revertTrackChanges = () => ({
    type: 'REVERT_TRACK_CHANGES'
})

const getActiveTool = state => state.selectedTool
const getToolState = (state, toolId) => state.toolState[toolId]
const getSelectToolState = state => getToolState(state, SELECT_TOOL)
const getSimulatorCommittedTrack = state => state.simulator.committedEngine
const getSimulatorTrack = state => state.simulator.engine
const getTrackLinesLocked = state => state.trackLinesLocked

class ZigZagMod {
    constructor (store, initState) {
        this.store = store
        this.changed = false
        this.state = initState

        this.track = getSimulatorCommittedTrack(this.store.getState())
        this.selectedPoints = EMPTY_SET

        store.subscribeImmediate(() => {
            if (this.state.active) {
                const selectToolState = getSelectToolState(this.store.getState())
                if (selectToolState && selectToolState.status.pressed) {
                    this.store.dispatch(setSelectToolState({ status: { inactive: true } }))
                }
            }

            this.onUpdate()
        })
    }

    commit () {
        if (this.changed) {
            this.store.dispatch(commitTrackChanges())
            this.store.dispatch(revertTrackChanges())
            this.changed = false
            return true
        }
    }

    onUpdate (nextState = this.state) {
        let shouldUpdate = false

        if (!this.state.active && nextState.active) {
            window.previewLinesInFastSelect = true
        }
        if (this.state.active && !nextState.active) {
            window.previewLinesInFastSelect = false
        }

        if (this.state !== nextState) {
            this.state = nextState
            shouldUpdate = true
        }

        if (this.state.active) {
            const track = getSimulatorCommittedTrack(this.store.getState())
            if (this.track !== track) {
                this.track = track
                shouldUpdate = true
            }

            const selectToolState = getSelectToolState(this.store.getState())

            let selectedPoints = selectToolState.selectedPoints

            if (!setsEqual(this.selectedPoints, selectedPoints)) {
                this.selectedPoints = selectedPoints
                shouldUpdate = true
            }
        }

        if(!shouldUpdate) return;

        if (this.changed) {
            this.store.dispatch(revertTrackChanges())
            this.changed = false
        }

        if(!this.state.active || this.selectedPoints.size === 0) return;

        const selectedLines = [...getLinesFromPoints(this.selectedPoints)]
          .map(id => this.track.getLine(id))
          .filter(l => l)
        let track = this.track
        let linesToAdd = []

        for (let { p1, p2 } of genZigZag(chainCurve(selectedLines), this.state)) {
            linesToAdd.push({
                x1: p1.x,
                y1: p1.y,
                x2: p2.x,
                y2: p2.y,
                type: 2
            })
        }

        if (linesToAdd.length > 0) {
            this.store.dispatch(addLines(linesToAdd))
            this.changed = true
        }
    }
}

// Function to create UI component

function main () {
    const {
        React,
        store
    } = window

    const e = React.createElement

    class ZigZagModComponent extends React.Component {
        constructor (props) {
            super(props)

            this.state = {
                active: false,
                width: 5,
                height: 5
            }

            this.mod = new ZigZagMod(store, this.state)

            store.subscribe(() => {
                const selectToolActive = getActiveTool(store.getState()) === SELECT_TOOL

                if (this.state.active && !selectToolActive) {
                    this.setState({ active: false })
                }
            })
        }

        componentWillUpdate (nextProps, nextState) {
            this.mod.onUpdate(nextState)
        }

        onActivate () {
            if (this.state.active) {
                this.setState({ active: false })
            } else {
                store.dispatch(setTool(SELECT_TOOL))
                this.setState({ active: true })
            }
        }

        onCommit () {
            const committed = this.mod.commit()
            if (committed) {
                this.setState({ active: false })
            }
        }

        renderSlider (key, title, props) {
            props = {
                ...props,
                value: this.state[key],
                onChange: e => this.setState({ [key]: parseFloat(e.target.value) })
            }

            return e(
                'div', null,
                title,
                e('input', { style: { width: '3em' }, type: 'number', ...props }),
                e('input', { type: 'range', ...props, onFocus: e => e.target.blur() })
            )
        }

        render () {
            return e('div', null,
                     this.state.active &&
                     e('div', null,
                       this.renderSlider('width', 'Width', { min: 1, max: 100, step: 1 }),
                       this.renderSlider('height', 'Height', { min: -100, max: 100, step: 1 }),
                       e('button',
                         { style: { float: 'left' }, onClick: () => this.onCommit() },
                         'Commit'
                        )
                      ),
                     e('button',
                       { style: { backgroundColor: this.state.active ? 'lightblue' : null }, onClick: this.onActivate.bind(this) },
                       'Zig Zag Mod'
                      )
                    )
        }
    }

    window.registerCustomSetting(ZigZagModComponent)
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

function setsEqual (a, b) {
    if (a === b) {
        return true
    }
    if (a.size !== b.size) {
        return false
    }
    for (let x of a) {
        if (!b.has(x)) {
            return false
        }
    }
    return true
}

function getLinesFromPoints (points) {
    return new Set([...points].map(point => point >> 1))
}

function distance(x1,y1,x2,y2) { return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) }

function chainCurve(curve) {
    let startPoint = -1
    let chainedCurve = []
    let dict = {}

    for(let i = 0; i < curve.length; i++) {
        let connected = false
        let currentLine = curve[i];

        for(let j = 0; j < curve.length; j++) {
            let otherLine = curve[j];

            if(currentLine.p1.x === otherLine.p2.x && currentLine.p1.y === otherLine.p2.y) {
                dict[j] = i
                connected = true
                break
            }
        }

        if(!connected) {
            if(startPoint > -1) return null
            startPoint = i
        }
    }

    chainedCurve.push(curve[startPoint])

    while(startPoint in dict) {
        startPoint = dict[startPoint]
        chainedCurve.push(curve[startPoint])
    }

    return chainedCurve;
}

function* genZigZag (chainedLines, { width = 5, height = 5 } = {}) {
    const { V2 } = window

    if(width <= 0 || !chainedLines) return;

    let firstPoint = {x: chainedLines[0].p1.x, y: chainedLines[0].p1.y}
    let nextPoint = {...firstPoint}
    let reverseVector = {x: 0, y: 0}
    let flipSide = 1
    let distanceReached = 0
    let currentHeight = height

    let theta = Math.atan2(chainedLines[0].p2.y - chainedLines[0].p1.y, chainedLines[0].p2.x - chainedLines[0].p1.x)
    let offsetVector = {
        x: currentHeight * Math.cos(theta - flipSide * Math.PI/2),
        y: currentHeight * Math.sin(theta - flipSide * Math.PI/2)
    }
    let prevOffsetPoint = {x: firstPoint.x + offsetVector.x, y: firstPoint.y + offsetVector.y}

    for(let i = 0; i < chainedLines.length; i++) {
        let currentLine = chainedLines[i]
        distanceReached += distance(nextPoint.x, nextPoint.y, currentLine.p2.x, currentLine.p2.y)
        nextPoint.x = currentLine.p2.x
        nextPoint.y = currentLine.p2.y

        if(distanceReached < width) continue

        distanceReached = distanceReached - width

        if(distanceReached > 0) i -= 1

        theta = Math.atan2(currentLine.p2.y - currentLine.p1.y, currentLine.p2.x - currentLine.p1.x)
        reverseVector = {x: -distanceReached * Math.cos(theta), y: -distanceReached * Math.sin(theta)}
        offsetVector = {
            x: currentHeight * Math.cos(theta + flipSide * Math.PI/2),
            y: currentHeight * Math.sin(theta + flipSide * Math.PI/2)
        }

        flipSide = -flipSide

        nextPoint.x += reverseVector.x
        nextPoint.y += reverseVector.y

        yield {
            p1: V2.from(prevOffsetPoint.x, prevOffsetPoint.y),
            p2: V2.from(nextPoint.x + offsetVector.x, nextPoint.y + offsetVector.y)
        }

        prevOffsetPoint = {x: nextPoint.x + offsetVector.x, y: nextPoint.y + offsetVector.y}
        firstPoint = {...nextPoint};

        distanceReached = 0
    }
}
