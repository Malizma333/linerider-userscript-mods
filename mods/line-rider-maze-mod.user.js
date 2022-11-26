// ==UserScript==

// @name         Line Rider Maze Mod
// @author       Malizma
// @description  Adds the ability to generate mazes
// @version      1.0

// @namespace    http://tampermonkey.net/
// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:8000/*
// @grant        none
// ==/UserScript==

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: 'UPDATE_LINES',
  payload: { linesToRemove, linesToAdd }
})

const addLines = (line) => updateLines(null, line, 'ADD_LINES')

const commitTrackChanges = () => ({
  type: 'COMMIT_TRACK_CHANGES'
})

const revertTrackChanges = () => ({
  type: 'REVERT_TRACK_CHANGES'
})

const getSimulatorCommittedTrack = state => state.simulator.committedEngine

class MazeMod {
  constructor (store, initState) {
    this.store = store
    this.state = initState

    this.changed = false

    this.track = this.store.getState().simulator.committedEngine
    this.camPos = this.store.getState().camera.editorPosition

    store.subscribeImmediate(() => {
      this.onUpdate()
    })
  }

  commit() {
    if (this.changed) {
      this.store.dispatch(commitTrackChanges())
      this.store.dispatch(revertTrackChanges())
      this.changed = false
      return true
    }
  }

  onUpdate (nextState = this.state) {
      let shouldUpdate = false

      if (this.state !== nextState) {
          this.state = nextState
          shouldUpdate = true
      }

      const track = getSimulatorCommittedTrack(this.store.getState())

      if (this.track !== track) {
          this.track = track
          shouldUpdate = true
      }

      if (shouldUpdate) {
          if (this.changed) {
              this.store.dispatch(revertTrackChanges())
              this.changed = false
          }

          if(this.state.active) {
              let myLines = [];
              for (let { p1, p2 } of genLines(this.state)) {
                  myLines.push({
                      x1: p1.x,
                      y1: p1.y,
                      x2: p2.x,
                      y2: p2.y,
                      type: 2
                  })
              }

              if (myLines.length > 0) {
                  this.store.dispatch(addLines(myLines))
                  this.changed = true
              }
          }
      }
  }
}

function main () {
  const {
    React,
    store
  } = window

  const create = React.createElement

  class MazeModComponent extends React.Component {
    constructor (props) {
      super(props)

      this.state = {
        active: false,
        sizeX: 3,
        sizeY: 3
      }

      this.mazeMod = new MazeMod(store, this.state)
    }

    componentWillUpdate (nextProps, nextState) {
      this.mazeMod.onUpdate(nextState)
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: create => this.setState({ [key]: parseFloat(create.target.value) })
      }

      return create('div', null,
        title,
        create('input', { style: { width: '3em' }, type: 'number', ...props }),
        create('input', { type: 'range', ...props, onFocus: create => create.target.blur() })
      )
    }

      onActivate () {
          if (this.state.active) {
              this.setState({ active: false })
          } else {
              this.setState({ active: true })
          }
      }

    onCommit () {
      const committed = this.mazeMod.commit();
       if (committed) {
        this.setState({ active: false })
      }
    }

    render () {
      return create('div', null,
        this.state.active && create('div', null,
          this.renderSlider('sizeY', 'Size X', { min: 3, max: 100, step: 1 }),
          this.renderSlider('sizeX', 'Size Y', { min: 3, max: 100, step: 1 }),
          create('button', { style: { float: 'left' }, onClick: () => this.onCommit() },
            'Commit'
          )
        ),
        create('button',
          {
            style: {
              backgroundColor: this.state.active ? 'lightblue' : null
            },
            onClick: this.onActivate.bind(this)
          },
          'Maze Mod'
        )
      )
    }
  }

  window.registerCustomSetting(MazeModComponent)
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

function* genLines ({ sizeX = 3, sizeY = 3 } = {}, layerArr) {
    const { V2 } = window
    const camPos = window.store.getState().camera.editorPosition;

    let mazeWalls = huntWalk(sizeX, sizeY);

    for(let wall of mazeWalls) {
        yield {
            p1: {x: camPos.x + 30 * wall.x1, y: camPos.y + 30 * wall.y1},
            p2: {x: camPos.x + 30 * wall.x2, y: camPos.y + 30 * wall.y2}
        };
    }

}

function huntWalk(sizeX, sizeY) {
    let lines = [];
    var visitedArr = [];
    var wallArr = [];
    var currentMazePos = [0,0];

    function walk(sizeX, sizeY) {
        for(let i = 0; i < sizeX * sizeY; i++) {
            let nChoices = [];

            if(currentMazePos[0] + 1 < sizeX && !visitedArr[currentMazePos[0] + 1][currentMazePos[1]]) {
                nChoices[nChoices.length] = 'down';
            }
            if(currentMazePos[1] + 1 < sizeY && !visitedArr[currentMazePos[0]][currentMazePos[1] + 1]) {
                nChoices[nChoices.length] = 'right';
            }
            if(currentMazePos[0] - 1 >= 0 && !visitedArr[currentMazePos[0] - 1][currentMazePos[1]]) {
                nChoices[nChoices.length] = 'up';
            }
            if(currentMazePos[1] - 1 >= 0 && !visitedArr[currentMazePos[0]][currentMazePos[1] - 1]) {
                nChoices[nChoices.length] = 'left';
            }

            if(nChoices.length === 0) return;

            let dir = nChoices[Math.floor(Math.random() * nChoices.length)];

            switch(dir) {
                case 'up': {
                    visitedArr[currentMazePos[0] - 1][currentMazePos[1]] = true;
                    wallArr[currentMazePos[0] * 2][currentMazePos[1]] = false;
                    currentMazePos[0] -= 1;
                    break;
                }
                case 'left': {
                    visitedArr[currentMazePos[0]][currentMazePos[1] - 1] = true;
                    wallArr[currentMazePos[0] * 2 + 1][currentMazePos[1]] = false;
                    currentMazePos[1] -= 1;
                    break;
                }
                case 'right': {
                    visitedArr[currentMazePos[0]][currentMazePos[1] + 1] = true;
                    wallArr[currentMazePos[0] * 2 + 1][currentMazePos[1] + 1] = false;
                    currentMazePos[1] += 1;
                    break;
                }
                case 'down': {
                    visitedArr[currentMazePos[0] + 1][currentMazePos[1]] = true;
                    wallArr[(currentMazePos[0] + 1) * 2][currentMazePos[1]] = false;
                    currentMazePos[0] += 1;
                    break;
                }
                default: break;
            }
        }
    }

    function search(sizeX, sizeY) {
        for(let i = 0; i < sizeX; i++) {
            for(let j = 0; j < sizeY; j++) {
                if(!visitedArr[i][j]) {
                    let nChoices = [];

                    if(i + 1 < sizeX && visitedArr[i + 1][j]) {
                        nChoices[nChoices.length] = 'down';
                    }
                    if(j + 1 < sizeY && visitedArr[i][j + 1]) {
                        nChoices[nChoices.length] = 'right';
                    }
                    if(i - 1 >= 0 && visitedArr[i - 1][j]) {
                        nChoices[nChoices.length] = 'up';
                    }
                    if(j - 1 >= 0 && visitedArr[i][j - 1]) {
                        nChoices[nChoices.length] = 'left';
                    }

                    if(nChoices.length === 0) return;

                    let dir = nChoices[Math.floor(Math.random() * nChoices.length)];

                    visitedArr[i][j] = true;

                    switch(dir) {
                        case 'up': {
                            wallArr[i*2][j] = false;
                            break;
                        }
                        case 'left': {
                            wallArr[i*2+1][j] = false;
                            break;
                        }
                        case 'right': {
                            wallArr[i*2+1][j+1] = false;
                            break;
                        }
                        case 'down': {
                            wallArr[i*2+2][j] = false;
                            break;
                        }
                        default: break;
                    }

                    return [i,j];
                }
            }
        }
    }

    for(let i = 0; i < sizeX; i++) {
        visitedArr[i] = [];
        for(let j = 0; j < sizeY; j++) {
            visitedArr[i][j] = false;
        }
    }

    for(let i = 0; i < sizeX * 2 + 1; i++) {
        wallArr[i] = [];
        for(let j = 0; j < sizeY + (i & 1); j++) {
            wallArr[i][j] = true;
        }
    }

    for(let i = 0; i < sizeX * sizeY; i++) {
        walk(sizeX, sizeY);
        currentMazePos = search(sizeX, sizeY);
        if(currentMazePos == null) break;
    }

    wallArr[1][0] = false;
    wallArr[sizeX*2-1][sizeY] = false;

    for(let i = 0; i < 2 * sizeX + 1; i++) {
        for(let j = 0; j < sizeY + (i & 1); j++) {
            if(wallArr[i][j]) {
                if((i & 1) === 0) {
                    lines[lines.length] = {x1: j, y1: i>>1, x2: j+1, y2: i>>1};
                } else {
                    lines[lines.length] = {x1: j, y1: (i-1)>>1, x2: j, y2: ((i-1)>>1)+1};
                }
            }
        }
    }

    return lines;
}