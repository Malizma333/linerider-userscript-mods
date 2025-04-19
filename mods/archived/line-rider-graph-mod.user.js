// ==UserScript==

// @name         Graph Generator
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates graphs from equations
// @version      1.2.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @require      https://cdnjs.cloudflare.com/ajax/libs/mathjs/9.2.0/math.js

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-graph-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-graph-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

/* globals math */

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: "UPDATE_LINES",
  payload: { linesToRemove, linesToAdd },
  meta: { name: name }
});

const addLines = (line) => updateLines(null, line, "ADD_LINES");

const commitTrackChanges = () => ({
  type: "COMMIT_TRACK_CHANGES"
});

const revertTrackChanges = () => ({
  type: "REVERT_TRACK_CHANGES"
});

const getSimulatorCommittedTrack = state => state.simulator.committedEngine;

class GraphMod {
  constructor (store, initState) {
    this.store = store;
    this.state = initState;

    this.changed = false;

    this.track = this.store.getState().simulator.committedEngine;

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

    if (!this.state.active && nextState.active) {
      window.previewLinesInFastSelect = true;
    }
    if (this.state.active && !nextState.active) {
      window.previewLinesInFastSelect = false;
    }

    if (this.state !== nextState) {
      this.state = nextState;
      shouldUpdate = true;
    }

    if (this.state.active) {
      const track = getSimulatorCommittedTrack(this.store.getState());

      if (this.track !== track) {
        this.track = track;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {

      if (this.changed) {
        this.store.dispatch(revertTrackChanges());
        this.changed = false;
      }

      if (this.state.active) {
        let lineArray = [];

        for (let { p1, p2 } of genLines(this.state)) {
          lineArray.push({
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            type: 2
          });
        }

        if (lineArray.length > 0) {
          this.store.dispatch(addLines(lineArray));
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

  class GraphModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        func: "",
        domainM: -10,
        domainN: 10,
        rangeM: -10,
        rangeN: 10,
        step: .1,
        centerCamera: true,
        connectDots: false
      };

      this.graphMod = new GraphMod(store, this.state);
    }

    componentWillUpdate (nextProps, nextState) {
      this.graphMod.onUpdate(nextState);
    }

    renderCheckbox (key, props) {
      props = {
        ...props,
        checked: this.state[key],
        onChange: create => this.setState({ [key]: create.target.checked })
      };
      return create("div", null,
        key,
        create("input", { type: "checkbox", ...props })
      );
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: create => this.setState({ [key]: parseFloat(create.target.value) })
      };

      return create("div", null,
        title,
        create("input", { style: { width: "4em" }, type: "number", ...props }),
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
      const committed = this.graphMod.commit();
      if (committed) {
        this.setState({ active: false });
      }
    }

    render () {
      return create("div", null,
        this.state.active && create("div", null,
          create("div", null,
            "Equation: ",
            create("textArea", { style: { width: "88%" }, type: "text",
              value: this.state.func,
              onChange: create => this.setState({ func: create.target.value })
            }),
            "Domain",
            this.renderSlider("domainM", "Min: ", { min: -100, max: this.state.domainN, step: 1 }),
            this.renderSlider("domainN", "Max: ", { min: -100, max: 100, step: 1 }),
            "Range",
            this.renderSlider("rangeM", "Min: ", { min: -100, max: this.state.rangeN, step: 1 }),
            this.renderSlider("rangeN", "Max: ", { min: -100, max: 100, step: 1 }),
            this.renderSlider("step", "Step", { min: 0.01, max: 5, step: 0.1 }),
            this.renderCheckbox("centerCamera"),
            this.renderCheckbox("connectDots")
          ),
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
          "Graph Mod"
        )
      );
    }
  }

  window.registerCustomSetting(GraphModComponent);
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

function* genLines ({ func = "", domainM = -10, domainN = 10, rangeM = -10, rangeN = 10, step = 0.1, centerCamera = true, connectDots = false } = {}) {
  const { V2 } = window;
  const camPos = window.store.getState().camera.editorPosition;
  const offset = centerCamera ? camPos : V2.from(0, 0);
  let lastPos = null;

  if (step <= 0) {
    return;
  }

  try {
    const exp = math.parse(func);
    const expC = exp.compile();

    for (let x = domainM; x <= domainN; x += step) {
      let y = 0;

      try {
        let scope = { "x": x };
        y = expC.evaluate(scope);
      } catch (e) {
        console.log(e);
        return;
      }

      if (rangeM <= y && y <= rangeN) {
        if (connectDots && lastPos) {
          yield {
            p1: V2.from(x + offset.x, offset.y - y + .1),
            p2: V2.from(lastPos.x + offset.x, offset.y - lastPos.y)
          };
        } else {
          yield {
            p1: V2.from(x + offset.x, offset.y - y + .1),
            p2: V2.from(x + offset.x, offset.y - y)
          };
        }

        lastPos = V2.from(x, y);
      }
    }
  } catch (e) {
    console.log(e);
    return;
  }
}
