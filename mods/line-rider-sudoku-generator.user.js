// ==UserScript==

// @name         Sudoku Generator
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates a sudoku puzzle
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @require      https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/console-scripts/puzzles.js

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-sudoku-generator.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-sudoku-generator.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

// Puzzles taken from first 10000 entries of https://www.kaggle.com/datasets/bryanpark/sudoku/data

const numberMaps = {
    '1': [[1,0,1,2]],
    '2': [[1,0,0,0],[1,0,1,1],[0,1,1,1],[0,1,0,2],[1,2,0,2]],
    '3': [[1,0,0,0],[0,1,1,1],[1,0,1,2],[1,2,0,2]],
    '4': [[0,0,0,1],[0,1,1,1],[1,0,1,2]],
    '5': [[1,0,0,0],[0,0,0,1],[0,1,1,1],[1,1,1,2],[1,2,0,2]],
    '6': [[1,0,0,0],[0,1,1,1],[0,0,0,2],[1,1,1,2],[1,2,0,2]],
    '7': [[1,0,1,2],[1,0,0,0]],
    '8': [[1,0,0,0],[0,1,1,1],[0,0,0,2],[1,0,1,2],[1,2,0,2]],
    '9': [[1,0,0,0],[0,0,0,1],[0,1,1,1],[1,0,1,2],[1,2,0,2]]
}

const updateLines = (linesToRemove, linesToAdd) => ({
  type: "UPDATE_LINES",
  payload: { linesToRemove, linesToAdd }
});

const addLines = (line) => updateLines(null, line, "ADD_LINES");

const commitTrackChanges = () => ({
  type: "COMMIT_TRACK_CHANGES"
});

const revertTrackChanges = () => ({
  type: "REVERT_TRACK_CHANGES"
});

const getSimulatorCommittedTrack = state => state.simulator.committedEngine;

class SudokuMod {
  constructor (store, initState) {
    this.store = store;
    this.state = initState;

    this.changed = false;

    this.track = this.store.getState().simulator.committedEngine;
    this.camPos = this.store.getState().camera.editorPosition;

    store.subscribeImmediate(() => {
      this.onUpdate();
    });
  }

  commit () {
    if (this.changed) {
      this.store.dispatch(commitTrackChanges());
      this.store.dispatch(revertTrackChanges());
      this.changed = false;
      return true;
    }
  }

  onUpdate (nextState = this.state) {
    let shouldUpdate = false;

    if (this.state !== nextState) {
      this.state = nextState;
      shouldUpdate = true;
    }

    const track = getSimulatorCommittedTrack(this.store.getState());

    if (this.track !== track) {
      this.track = track;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      if (this.changed) {
        this.store.dispatch(revertTrackChanges());
        this.changed = false;
      }

      if (this.state.active) {
        let myLines = [];
        for (let { p1, p2 } of genLines(this.state)) {
          myLines.push({
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            type: 2
          });
        }

        if (myLines.length > 0) {
          this.store.dispatch(addLines(myLines));
          this.changed = true;
        }
      }
    }
  }
}

function main () {
  const {
    React,
    store
  } = window;

  const create = React.createElement;

  class SudokuModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        seed: Math.floor(Math.random()*10000)
      };

      this.mod = new SudokuMod(store, this.state);
    }

    componentWillUpdate (nextProps, nextState) {
      this.mod.onUpdate(nextState);
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: create => this.setState({ [key]: parseFloat(create.target.value) })
      };

      return create("div", null,
        title,
        create("input", { type: "range", ...props, onFocus: create => create.target.blur() })
      );
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false });
      } else {
        this.setState({ active: true });
      }
    }

    onCommit () {
      const committed = this.mod.commit();
      if (committed) {
        this.setState({ active: false });
      }
    }

    render () {
      return create("div", null,
        this.state.active && create("div", null,
          this.renderSlider("seed", "Seed", { min: 0, max: 9999, step: 1 }),
          create("button", { style: { float: "left" }, onClick: () => this.onCommit() },
            "Commit"
          )
        ),
        create("button",
          {
            style: {
              backgroundColor: this.state.active ? "lightblue" : null
            },
            onClick: this.onActivate.bind(this)
          },
          "Sudoku Mod"
        )
      );
    }
  }

  window.registerCustomSetting(SudokuModComponent);
}

if (window.registerCustomSetting) {
  main();
} else {
  const prevCb = window.onCustomToolsApiReady;
  window.onCustomToolsApiReady = () => {
    if (prevCb) prevCb();
    main();
  };
}

function* genLines ({ seed=0 } = {}) {
  const puzzle = PUZZLES[seed];
  const camPos = window.store.getState().camera.editorPosition;
  for(let i = 0; i < 10; i++) {
      yield {
          p1: { x: camPos.x + i * 50, y: camPos.y },
          p2: { x: camPos.x + i * 50, y: camPos.y + 450 }
      };

      yield {
          p1: { x: camPos.x, y: camPos.y + i * 50 },
          p2: { x: camPos.x + 450, y: camPos.y + i * 50 }
      };
  }

  for(let i = 0; i < 9; i++) {
      for(let j = 0; j < 9; j++) {
          if(puzzle[i*9+j] == '0') continue;
          for(const l of numberMaps[puzzle[i*9+j]]) {
              yield {
                  p1: { x: camPos.x + l[0]*12.5 + j * 50 + 18.75, y: camPos.y + l[1]*12.5 + i * 50 + 12.5},
                  p2: { x: camPos.x + l[2]*12.5 + j * 50 + 18.75, y: camPos.y + l[3]*12.5 + i * 50 + 12.5}
              };
          }
      }
  }
}
