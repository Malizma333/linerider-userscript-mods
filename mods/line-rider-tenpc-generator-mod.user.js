// ==UserScript==

// @name         Ten Point Cannon Generator
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates ten point cannons
// @version      1.4.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-tenpc-generator-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-tenpc-generator-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: "UPDATE_LINES",
  payload: { linesToRemove, linesToAdd },
  meta: { name }
});

const addLines = (line) => updateLines(null, line, "ADD_LINES");

const commitTrackChanges = () => ({
  type: "COMMIT_TRACK_CHANGES"
});

const revertTrackChanges = () => ({
  type: "REVERT_TRACK_CHANGES"
});

const setEditScene = (scene) => ({
  type: "SET_RENDERER_SCENE",
  payload: { key: "edit", scene }
});

const getSimulatorCommittedTrack = state => state.simulator.committedEngine;
const getRiders = state => state.simulator.engine.engine.state.riders;
const getNumRiders = (state) => getRiders(state).length;
const sidebarOpen = (state) => state.views.Sidebar;

class TenPCMod {
  constructor(store, initState) {
    this.store = store;
    this.state = initState;

    this.changed = false;

    this.track = getSimulatorCommittedTrack(this.store.getState());
    this.numRiders = getNumRiders(this.store.getState());
    this.selectedRider = 1;

    store.subscribeImmediate(() => {
      this.onUpdate();
    });
  }

  commit() {
    if (this.changed) {
      this.store.dispatch(commitTrackChanges());
      this.store.dispatch(revertTrackChanges());
      this.store.dispatch(setEditScene(new Millions.Scene()));
      this.changed = false;
      return true;
    }
  }

  revert() {
    if (this.changed) {
      this.store.dispatch(revertTrackChanges());
      this.store.dispatch(setEditScene(new Millions.Scene()));
      this.changed = false;
    }
  }

  onUpdate(nextState = this.state) {
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

      const numRiders = getNumRiders(this.store.getState());

      if (this.numRiders !== numRiders) {
        this.numRiders = numRiders;
        shouldUpdate = true;
      }

      if (this.selectedRider !== nextState.selectedRider) {
        this.selectedRider = Math.min(this.numRiders, nextState.selectedRider);
        shouldUpdate = true;
      }
    }

    if (!shouldUpdate) return;

    if (this.changed) {
      this.store.dispatch(revertTrackChanges());
      this.changed = false;
    }

    if (!this.state.active) return;

    const currentFrame = Math.ceil(window.store.getState().player.index);
    const engine = window.store.getState().simulator.engine.engine;
    const curRider = engine.getFrame(currentFrame).snapshot.entities[0].entities[this.state.selectedRider - 1];
    const nextRider = engine.getFrame(currentFrame + 1).snapshot.entities[0].entities[this.state.selectedRider - 1];
    const targetRider = calcTransformedRider(this.state, curRider.points[0]);

    const projection = drawRider(targetRider);
    this.store.dispatch(setEditScene(Millions.Scene.fromEntities(projection)));

    let mounted = false;
    let i = 0;

    while (i < 100 && !mounted) {
      if (i > 0) {
        window.store.dispatch(revertTrackChanges());
        this.changed = false;
      }

      const lines = [];

      for (const { p1, p2, f, m } of GenerateCannon(curRider, nextRider, targetRider)) {
        lines.push({
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          type: 1,
          flipped: f,
          leftExtended: false,
          rightExtended: false,
          multiplier: m
        });
      }

      this.store.dispatch(addLines(lines));
      this.changed = true;

      const engine = window.store.getState().simulator.engine.engine;
      const newNextRider = engine.getFrame(currentFrame + 1).snapshot.entities[0].entities[this.state.selectedRider - 1];
      mounted = newNextRider.riderMounted;
      i += 1;
    }
  }
}

function main() {
  const {
    React,
    store
  } = window;

  const create = React.createElement;

  class TenPCModComponent extends React.Component {
    constructor(props) {
      super(props);

      this.state = {
        active: false,
        xSpeed: 0,
        ySpeed: 0,
        rotation: 0,
        selectedRider: 1,
        riderCount: 1
      };

      this.mod = new TenPCMod(store, this.state);

      store.subscribe(() => {
        if (!this._mounted) return;

        if (sidebarOpen(window.store.getState())) {
          this.mod.revert();
          this.setState({ active: false });
        }

        if (this.state.riderCount != this.mod.numRiders) {
          this.setState({ riderCount: this.mod.numRiders });
          this.setState({ selectedRider: Math.min(this.state.riderCount, this.state.selectedRider) });
        }
      });
    }

    componentDidMount() {
      this._mounted = true;
    }

    componentWillUnmount() {
      this._mounted = false;
    }

    componentWillUpdate(_, nextState) {
      this.mod.onUpdate(nextState);
    }

    onActivate() {
      if (this.state.active || sidebarOpen(window.store.getState())) {
        this.setState({ active: false });
        store.dispatch(setEditScene(new Millions.Scene()));
      } else {
        this.setState({ active: true });
      }
    }

    onCommit() {
      const committed = this.mod.commit();
      if (committed) {
        this.setState({ active: false });
      }
    }

    renderCheckbox(key, title, props) {
      props = {
        ...props,
        checked: this.state[key],
        onChange: e => this.setState({ [key]: e.target.checked })
      };

      return create("div", null,
        title,
        create("input", { type: "checkbox", ...props })
      );
    }

    renderSlider(key, title, props) {
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

    render() {
      return create("div", null,
        this.state.active && create("div", null,
          this.renderSlider("xSpeed", "X Speed", { min: -99, max: 99, step: 1 }),
          this.renderSlider("ySpeed", "Y Speed", { min: -99, max: 99, step: 1 }),
          this.renderSlider("rotation", "Rotation", { min: 0, max: 360, step: 1 }),
          this.state.riderCount > 1 && this.renderSlider("selectedRider", "Rider", { min: 1, max: this.state.riderCount, step: 1 }),
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
          "TenPC Mod"
        )
      );
    }
  }

  window.registerCustomSetting(TenPCModComponent);
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

// Based on LRA's implementation

function calcTransformedRider({ xSpeed = 0, ySpeed = 0, rotation = 0 } = {}, origin) {
  const { V2 } = window;
  const cpArray = [V2.from(0, 0), V2.from(0, 5), V2.from(15, 5), V2.from(17.5, 0), V2.from(5, 0), V2.from(5, -5.5), V2.from(11.5, -5), V2.from(11.5, -5), V2.from(10, 5), V2.from(10, 5)];
  const theta = Math.PI * rotation / 180;
  const rotationMatrix = [[Math.cos(theta), -Math.sin(theta)], [Math.sin(theta), Math.cos(theta)]];
  const transformedRider = [];

  for (let i = 0; i < cpArray.length; i++) {
    transformedRider.push(V2.from(
      rotationMatrix[0][0] * cpArray[i].x + rotationMatrix[1][0] * cpArray[i].y + origin.pos.x + xSpeed,
      rotationMatrix[0][1] * cpArray[i].x + rotationMatrix[1][1] * cpArray[i].y + origin.pos.y + ySpeed
    ));
  }

  return transformedRider;
}

function* GenerateCannon(curRider, nextRider, targetRider) {
  const { V2 } = window;

  for (let i = 0; i < 10; i++) {
    let inverse = false;
    const targetDir = targetRider[i].copy().sub(nextRider.points[i].pos);
    const speedReq = targetDir.len();

    if (targetDir.len() > 0) {
      targetDir.div(targetDir.len());
    }

    const curVel = V2.from(curRider.points[i].vel.x, curRider.points[i].vel.y);
    let normDir = V2.from(-targetDir.y, targetDir.x);

    if (curVel.dot(normDir) <= 0) {
      inverse = true;
      normDir = V2.from(targetDir.y, -targetDir.x);
    }

    const curPos = V2.from(curRider.points[i].pos.x, curRider.points[i].pos.y);
    const lineCenter = curPos.copy().sub(normDir.copy().mul(1.0e-3 * (1 + Math.random())));

    yield {
      p1: lineCenter.copy().sub(targetDir.copy().mul(0.5 * 1.0e-5)),
      p2: lineCenter.copy().add(targetDir.copy().mul(0.5 * 1.0e-5)),
      f: inverse,
      m: speedReq * 10.0
    };
  }
}

function drawRider(targetRider) {
  const color = new Millions.Color(0, 0, 0, 255);
  return [
    genMillionsLine(targetRider[0], targetRider[1], color, 0.1, 1.01),
    genMillionsLine(targetRider[1], targetRider[2], color, 0.1, 1.02),
    genMillionsLine(targetRider[2], targetRider[3], color, 0.1, 1.03),
    genMillionsLine(targetRider[3], targetRider[0], color, 0.1, 1.04),
    genMillionsLine(targetRider[4], targetRider[5], color, 0.1, 1.05),
    genMillionsLine(targetRider[5], targetRider[6], color, 0.1, 1.06),
    genMillionsLine(targetRider[4], targetRider[8], color, 0.1, 1.08),
  ];
}

function genMillionsLine(p1, p2, color, thickness, zIndex) {
  const p1m = { x: p1.x, y: p1.y, colorA: color, colorB: color, thickness };
  const p2m = { x: p2.x, y: p2.y, colorA: color, colorB: color, thickness };
  return new Millions.Line(p1m, p2m, 3, zIndex);
}
