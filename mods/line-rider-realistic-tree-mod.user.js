// ==UserScript==

// @name         Realistic Tree Generator
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates realistic trees
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-realistic-tree-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-realistic-tree-mod.user.js
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

class RealisticTreeMod {
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

  onUpdate (nextState = this.state, shouldUpdate = false) {
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
        const lines = genLines(this.state);

        if (lines.length > 0) {
          this.store.dispatch(addLines(lines));
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

  class RealisticTreeModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        baseWidth: 30,
        baseHeight: 100,
        maxDepth: 4,
        heightScale: 0.8,
        widthScale: 0.8,
        angleScale: 1,
      };

      this.treeMod = new RealisticTreeMod(store, this.state);
    }

    componentWillUpdate (_, nextState) {
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
      const epsilon = 1/256
      return create("div", null,
        this.state.active && create("div", null,
          this.renderSlider('baseWidth', 'Base Width',  { min: 1, max: 100, step: epsilon }),
          this.renderSlider('baseHeight', 'Base Height',  { min: 1, max: 100, step: epsilon }),
          this.renderSlider('maxDepth', 'Max Depth',  { min: 1, max: 10, step: 1 }),
          this.renderSlider('heightScale', 'Height Scale',  { min: epsilon, max: 1, step: epsilon }),
          this.renderSlider('widthScale', 'Width Scale',  { min: epsilon, max: 1, step: epsilon }),
          this.renderSlider('angleScale', 'Angle Scale',  { min: epsilon, max: 1, step: epsilon }),
          create("button", { style: { float: "left" }, onClick: () => this.onCommit() },
            "Commit"
          ),
          create("button", { style: { float: "left" }, onClick: () => this.treeMod.onUpdate(this.state, true) },
            "Refresh"
          )
        ),
        create("button",
          {
            style: {
              backgroundColor: this.state.active ? "lightblue" : null
            },
            onClick: this.onActivate.bind(this)
          },
          "Realistic Tree Mod"
        )
      );
    }
  }

  window.registerCustomSetting(RealisticTreeModComponent);
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

function genLines (state) {
  const { baseWidth, baseHeight, maxDepth, widthScale, heightScale, angleScale } = state;

  const camPos = window.store.getState().camera.editorPosition;
  let lineArray = [];

  let baseA = {
    p1: { x: camPos.x - baseWidth / 2, y: -camPos.y - baseHeight / 2},
    p2: { x: camPos.x + baseWidth / 2, y: -camPos.y - baseHeight / 2}
  };
  let mid = {x: (baseA.p1.x + baseA.p2.x) / 2, y: (baseA.p1.y + baseA.p2.y) / 2 };
  let direction = Math.PI / 2;
  let baseB = getSecondBase(mid, direction, baseHeight, baseWidth * widthScale);

  const tree = [{
    depth: 1,
    dir: direction,
    p1: baseA.p1,
    p2: baseA.p2,
    p3: baseB.p1,
    p4: baseB.p2,
  }];


  while(tree.length) {
    const { p1, p2, p3, p4, dir, depth } = tree.pop();

    if (depth <= maxDepth) {
      lineArray.push({ x1: p1.x, y1: -p1.y, x2: p2.x, y2: -p2.y, type: 2, width: 1 / depth });
      lineArray.push({ x1: p2.x, y1: -p2.y, x2: p3.x, y2: -p3.y, type: 2, width: 1 / depth });
      lineArray.push({ x1: p3.x, y1: -p3.y, x2: p4.x, y2: -p4.y, type: 2, width: 1 / depth });
      lineArray.push({ x1: p4.x, y1: -p4.y, x2: p1.x, y2: -p1.y, type: 2, width: 1 / depth });

      const percent = Math.random() * 0.5 + 0.25;
      const p5 = { x: percent * (p3.x - p4.x) + p4.x, y: percent * (p3.y - p4.y) + p4.y };

      for (let i = 0; i < 2; i++) {
        baseA = { p1: i === 0 ? p5 : p4, p2: i === 0 ? p3 : p5 };
        mid = {x: (baseA.p1.x + baseA.p2.x) / 2, y: (baseA.p1.y + baseA.p2.y) / 2 };
        direction = dir + (i === 0 ? -1 : 1) * angleScale * (Math.PI / 8 * Math.random() + Math.PI / 8);

        const width = Math.sqrt(Math.pow(baseA.p1.x - baseA.p2.x, 2) + Math.pow(baseA.p1.y - baseA.p2.y, 2));

        baseB = getSecondBase(mid, direction, baseHeight * Math.pow(heightScale, depth), width * widthScale);

        tree.push({
          depth: depth + 1,
          dir: direction,
          p1: baseA.p1,
          p2: baseA.p2,
          p3: baseB.p1,
          p4: baseB.p2,
        });
      }

      const shouldBranch = Math.random() < 1 / depth;

      if (shouldBranch) {
        const side1 = Math.random() > 0.5;
        const sign = (side1 ? 1 : -1)
        const target = { p1: side1 ? p2 : p1, p2: side1 ? p3 : p4 };
        const percent = Math.random() * 0.25 + 0.5;
        const perp = Math.atan2(target.p2.y - target.p1.y, target.p2.x - target.p1.x);
        const width = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)) * 0.5;

        mid = {
          x: percent * (target.p2.x - target.p1.x) + target.p1.x,
          y: percent * (target.p2.y - target.p1.y) + target.p1.y
        };
        baseA = {
          p1: {x: mid.x + sign * width/2 * Math.cos(perp), y: mid.y + sign * width/2 * Math.sin(perp)},
          p2: {x: mid.x - sign * width/2 * Math.cos(perp), y: mid.y - sign * width/2 * Math.sin(perp)},
        };
        direction = perp - sign * Math.PI / 4;
        baseB = getSecondBase(mid, direction, baseHeight * Math.pow(heightScale, depth), width * widthScale);

        tree.push({
          depth: depth + 1,
          dir: direction,
          p1: baseA.p1,
          p2: baseA.p2,
          p3: baseB.p1,
          p4: baseB.p2,
        });
      }
    }
  }

  return lineArray;
}

function getSecondBase(origin, dir, dist, width) {
  const p1 = {
    x: origin.x + dist * Math.cos(dir) + width / 2 * Math.cos(dir - Math.PI / 2),
    y: origin.y + dist * Math.sin(dir) + width / 2 * Math.sin(dir - Math.PI / 2),
  }

  const p2 = {
    x: origin.x + dist * Math.cos(dir) + width / 2 * Math.cos(dir + Math.PI / 2),
    y: origin.y + dist * Math.sin(dir) + width / 2 * Math.sin(dir + Math.PI / 2),
  }

  return { p1, p2 };
}
