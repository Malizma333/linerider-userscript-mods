// ==UserScript==

// @name         Recursive Tree Generator
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates tree-like line structures recrusively
// @version      1.1.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-recursive-tree-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-recursive-tree-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

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

class RTreeMod {
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

  class RTreeModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        minB: 1,
        maxB: 3,
        iter: 5,
        scale: 1
      };

      this.treeMod = new RTreeMod(store, this.state);
    }

    componentWillUpdate (nextProps, nextState) {
      this.treeMod.onUpdate(nextState);
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: create => this.setState({ [key]: parseFloat(create.target.value) })
      };

      return create("div", null,
        title,
        create("input", { style: { width: "3em" }, type: "number", ...props }),
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
      const committed = this.treeMod.commit();
      if (committed) {
        this.setState({ active: false });
      }
    }

    render () {
      return create("div", null,
        this.state.active && create("div", null,
          this.renderSlider("minB", "Min Branches", { min: 0, max: 5, step: 1 }),
          this.renderSlider("maxB", "Max Branches", { min: this.state.minB + 1, max: 10, step: 1 }),
          this.renderSlider("iter", "Iterations", { min: 2, max: 5, step: 1 }),
          this.renderSlider("scale", "Scale", { min: 1, max: 10, step: 1 }),
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
          "Recursive Tree Mod"
        )
      );
    }
  }

  window.registerCustomSetting(RTreeModComponent);
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

function* genLines ({ minB = 1, maxB = 3, iter = 5, scale = 1 } = {}) {
  const camPos = window.store.getState().camera.editorPosition;

  let lineArray = [];

  function branch (iB, min, max, x, y, a) {
    let nX = x + iB * Math.cos(a);
    let nY = y + iB * Math.sin(a);

    addLine(x, y, nX, nY);

    if (iB == 1) return;

    for (let i = 0; i < min + (max - min) * Math.random(); i++) {
      branch(iB-1, min, max, nX, nY, a + Math.PI/2 * (Math.random()-0.5));
    }
  }

  function addLine (x1, y1, x2, y2) {
    lineArray[lineArray.length] = {
      p1: { x: camPos.x + scale * Math.round(x1*100)/100, y: camPos.y + scale * -Math.round(y1*100)/100 },
      p2: { x: camPos.x + scale * Math.round(x2*100)/100, y: camPos.y + scale * -Math.round(y2*100)/100 }
    };
  }

  branch(iter, minB, maxB, 0, 0, Math.PI/2);

  for (let i = 0; i < lineArray.length; i++) {
    yield lineArray[i];
  }
}
