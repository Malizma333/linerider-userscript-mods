// ==UserScript==

// @name         XAnimator2
// @namespace    https://www.linerider.com/
// @author       Tobias Bessler
// @description  The advanced, layer automated animation tool
// @version      0.2.5
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-x-animator-2.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-x-animator-2.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

// jshint asi: true
// jshint esversion: 6

/* globals Millions, V2 */

/* constants */
const SELECT_TOOL = "SELECT_TOOL";
const EMPTY_SET = new Set();
const LOOP_LENGTH = 200;
const HEADER_COMMENT = "// Generated with XAnimator2";
const LAYER_NAME = "ANIM_LAYER";

/* actions */
const addLayer = () => ({ type: "ADD_LAYER" });

const renameLayer = (id, name) => ({
  type: "RENAME_LAYER",
  payload: { id, name },
});

const setLayerEditable = (id, editable) => ({
  type: "SET_LAYER_EDITABLE",
  payload: { id, editable },
});

const setScript = (script) => ({
  type: "trackData/SET_TRACK_SCRIPT",
  payload: script,
});

const setTool = (tool) => ({
  type: "SET_TOOL",
  payload: tool,
});

const updateLines = (linesToRemove, linesToAdd) => ({
  type: "UPDATE_LINES",
  payload: { linesToRemove, linesToAdd },
});

const addLines = (line) => updateLines(null, line, "ADD_LINES");

const commitTrackChanges = () => ({
  type: "COMMIT_TRACK_CHANGES",
});

const revertTrackChanges = () => ({
  type: "REVERT_TRACK_CHANGES",
});

const setEditScene = (scene) => ({
  type: "SET_RENDERER_SCENE",
  payload: { key: "edit", scene },
});

/* selectors */
const getTrackScript = state => state.trackData.script;
const getActiveTool = state => state.selectedTool;
const getToolState = (state, toolId) => state.toolState[toolId];
const getSelectToolState = state => getToolState(state, SELECT_TOOL);
const getSimulatorCommittedTrack = state => state.simulator.committedEngine;
const getSimulatorCommittedLayers = state => state.simulator.committedEngine.engine.state.layers.buffer;
const getPlayerIndex = state => Math.floor(state.player.index);
const getTrackCamera = (state, index, track) => {
  const { width, height } = state.camera.playbackDimensions || state.camera.editorDimensions;
  const zoom = window.getAutoZoom ? window.getAutoZoom(index) : state.camera.playbackZoom;
  return state.camera.playbackFollower.isFixed()
    ? state.camera.playbackFixedPosition
    : state.camera.playbackFollower.getCamera(track, { zoom, width, height }, index);
};

class AnimateMod {
  constructor(store, initState) {
    this.store = store;

    this.componentUpdateResolved = true;
    this.changed = false;
    this.state = initState;

    this.layers = getSimulatorCommittedLayers(this.store.getState());
    this.track = getSimulatorCommittedTrack(this.store.getState());
    this.selectedPoints = EMPTY_SET;
    this.beginLayerId = 1;

    store.subscribeImmediate(() => {
      if (this.componentUpdateResolved) {
        this.onUpdate();
      }
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

  onUpdate(nextState = this.state) {
    this.componentUpdateResolved = false;

    let shouldUpdate = false;

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

      const layers = getSimulatorCommittedLayers(this.store.getState());

      if (layers && this.layers !== layers) {
        this.layers = layers;
        shouldUpdate = true;
      }

      const selectToolState = getSelectToolState(this.store.getState());
      let selectedPoints = selectToolState.selectedPoints;

      if (!selectToolState.multi) {
        selectedPoints = EMPTY_SET;
      }

      if (!setsEqual(this.selectedPoints, selectedPoints)) {
        this.selectedPoints = selectedPoints;
        shouldUpdate = true;
      }
    }

    if (!shouldUpdate) {
      this.componentUpdateResolved = true;
      return;
    }

    console.log(this.changed);

    if (this.changed) {
      this.store.dispatch(revertTrackChanges());
      this.store.dispatch(setEditScene(new Millions.Scene()));
      this.changed = false;
    }

    if (!this.active()) {
      this.componentUpdateResolved = true;
      return;
    }

    let pretransformedLines = [...getLinesFromPoints(this.selectedPoints)]
      .map(id => this.track.getLine(id))
      .filter(l => l);

    let posttransformedLines = [];
    const startTime = performance.now();
    const allLines = [];
    const layersArray = this.layers;
    const currentFrame = getPlayerIndex(this.store.getState());
    let layerId = currentFrame % LOOP_LENGTH + this.beginLayerId;

    const camOffset = { x: 0, y: 0 };
    let originCamera = null;

    if (this.state.snapCamera) {
      originCamera = getTrackCamera(this.store.getState(), currentFrame, this.track);
    }

    for (let index = currentFrame; index < this.state.aLength + currentFrame; index++) {
      const progress = (index - currentFrame) / this.state.aLength;

      posttransformedLines = pretransformedLines.map(line =>
        Object.assign(Object.create(Object.getPrototypeOf(line)), line)
      );

      const preBB = getBoundingBox(posttransformedLines);
      const preCenter = new V2({
        x: preBB.x + 0.5 * preBB.width,
        y: preBB.y + 0.5 * preBB.height,
      });

      const alongRot = this.state.alongRot * progress * Math.PI / 180;
      const preTransform = buildRotTransform(-alongRot);
      const selectedLines = [];

      for (let line of posttransformedLines) {
        const p1 = preparePointAlong(
          new V2(line.p1),
          preCenter,
          this.state.alongPerspX * progress,
          this.state.alongPerspY * progress,
          preTransform,
        );
        const p2 = preparePointAlong(
          new V2(line.p2),
          preCenter,
          this.state.alongPerspX * progress,
          this.state.alongPerspY * progress,
          preTransform,
        );
        selectedLines.push({ original: line, p1, p2 });
      }

      const bb = getBoundingBox(selectedLines);

      const anchor = new V2({
        x: bb.x + (0.5 + this.state.anchorX * progress) * bb.width,
        y: bb.y + (0.5 - this.state.anchorY * progress) * bb.height,
      });
      const nudge = new V2({
        x: this.state.nudgeXSmall * progress + this.state.nudgeXBig * progress,
        y: -1 * (this.state.nudgeYSmall * progress + this.state.nudgeYBig * progress),
      });

      const transform = this.getTransform(progress);
      const transformedLines = [];

      const alongPerspX = this.state.alongPerspX * progress * 0.01;
      const alongPerspY = this.state.alongPerspY * progress * 0.01;
      const postTransform = buildRotTransform(alongRot);

      let perspX = this.state.perspX * progress;
      let perspY = this.state.perspY * progress;

      const perspSafety = Math.pow(10, this.state.perspClamping);

      if (this.state.relativePersp) {
        let perspXDenominator = bb.width * ((this.state.scale - 1) * progress + 1)
          * ((this.state.scaleX - 1) * progress + 1);
        if (Math.abs(bb.width) < perspSafety) {
          perspXDenominator = perspSafety;
        }
        perspX = perspX / perspXDenominator;
        let perspYDenominator = bb.height * ((this.state.scale - 1) * progress + 1)
          * ((this.state.scaleY - 1) * progress + 1);
        if (Math.abs(perspYDenominator) < perspSafety) {
          perspYDenominator = perspSafety;
        }
        perspY = perspY / perspYDenominator;
      } else {
        perspX = 0.01 * perspX;
        perspY = 0.01 * perspY;
      }

      if (this.state.snapCamera) {
        const currentCamera = getTrackCamera(this.store.getState(), index, this.track);
        camOffset.x = currentCamera.x - originCamera.x;
        camOffset.y = currentCamera.y - originCamera.y;
      }

      for (const line of selectedLines) {
        const p1 = restorePoint(
          transformPersp(
            new V2(line.p1).sub(anchor).transform(transform),
            perspX,
            perspY,
            perspSafety,
          ),
          anchor,
          postTransform,
          alongPerspX,
          alongPerspY,
          preCenter,
        ).add(nudge);

        const p2 = restorePoint(
          transformPersp(
            new V2(line.p2).sub(anchor).transform(transform),
            perspX,
            perspY,
            perspSafety,
          ),
          anchor,
          postTransform,
          alongPerspX,
          alongPerspY,
          preCenter,
        ).add(nudge);

        transformedLines.push({
          ...line.original.toJSON(),
          layer: layerId,
          id: null,
          x1: p1.x + camOffset.x,
          y1: p1.y + camOffset.y,
          x2: p2.x + camOffset.x,
          y2: p2.y + camOffset.y,
          type: 2,
        });
      }

      layerId += 1;
      if (layerId > this.beginLayerId + LOOP_LENGTH) {
        layerId = this.beginLayerId;
      }

      let endTime = performance.now();

      if (endTime - startTime > 5000) {
        this.componentUpdateResolved = true;
        this.store.dispatch(revertTrackChanges());
        this.store.dispatch(setEditScene(new Millions.Scene()));
        return { type: "TimeoutException", message: "Time exception: Operation took longer than 5000ms to complete" };
      }

      allLines.push(...transformedLines);
    }

    if (allLines.length > 0) {
      this.store.dispatch(addLines(allLines));
      this.changed = true;
    }

    this.componentUpdateResolved = true;
  }

  getTransform(progress) {
    let scaleX = ((this.state.scale - 1) * progress + 1) * ((this.state.scaleX - 1) * progress + 1);
    if (this.state.flipX) {
      scaleX *= -1;
    }
    let scaleY = ((this.state.scale - 1) * progress + 1) * ((this.state.scaleY - 1) * progress + 1);
    if (this.state.flipY) {
      scaleY *= -1;
    }
    const transform = buildAffineTransform(
      this.state.skewX * progress,
      this.state.skewY * progress,
      scaleX,
      scaleY,
      this.state.rotate * progress * Math.PI / 180,
    );
    return transform;
  }

  active() {
    return this.state.active && this.selectedPoints.size > 0 && (
      this.state.relativeTools
      || this.state.alongPerspX !== 0 || this.state.alongPerspY !== 0
      || this.state.alongRot !== 0
      || this.state.anchorX !== 0 || this.state.anchorY !== 0
      || this.state.skewX !== 0 || this.state.skewY !== 0
      || this.state.scaleX !== 1 || this.state.scaleY !== 1 || this.state.scale !== 1
      || this.state.flipX || this.state.flipY
      || this.state.rotate !== 0
      || this.state.perspX || this.state.perspY
      || this.state.nudgeXSmall !== 0 || this.state.nudgeXBig !== 0
      || this.state.nudgeYSmall !== 0 || this.state.nudgeYBig !== 0
      || this.state.aLength !== 0
    );
  }

  onPrepLayers() {
    this.beginLayerId = Math.max(...getSimulatorCommittedLayers(this.store.getState()).map(layer => layer.id)) + 1;

    for (let id = this.beginLayerId; id < this.beginLayerId + LOOP_LENGTH; id++) {
      this.store.dispatch(addLayer());
      this.store.dispatch(renameLayer(id, LAYER_NAME));
    }

    this.store.dispatch(commitTrackChanges());
    this.store.dispatch(revertTrackChanges());

    for (let id = this.beginLayerId; id < this.beginLayerId + LOOP_LENGTH; id++) {
      this.store.dispatch(setLayerEditable(id, false));
    }

    const nextScript = getTrackScript(this.store.getState())
      + `\n${HEADER_COMMENT}\n`
      + `window.getLayerVisibleAtTime = (id,ind) => {`
      + `if(${this.beginLayerId} <= id && id < ${LOOP_LENGTH + this.beginLayerId}) {`
      + `return id - ${this.beginLayerId} === ind % ${LOOP_LENGTH}} return true}`;
    this.store.dispatch(setScript(nextScript));

    window.getLayerVisibleAtTime = (id, ind) => {
      if (this.beginLayerId <= id && id < LOOP_LENGTH + this.beginLayerId) {
        return id - this.beginLayerId === ind % LOOP_LENGTH;
      }
      return true;
    };
  }

  onChangeColor(color) {
    for (let id = this.beginLayerId; id < this.beginLayerId + LOOP_LENGTH; id++) {
      this.store.dispatch(renameLayer(id, color + LAYER_NAME));
    }

    this.store.dispatch(commitTrackChanges());
    this.store.dispatch(revertTrackChanges());
  }

  onUnlockFrame() {
    const currentFrame = getPlayerIndex(this.store.getState());
    const layerId = currentFrame % LOOP_LENGTH + this.beginLayerId;
    this.store.dispatch(setLayerEditable(layerId, true));
  }
}

function main() {
  const {
    React,
    store,
  } = window;

  const e = React.createElement;

  class XAnimatorModComponent extends React.Component {
    constructor(props) {
      super(props);

      this.defaults = {
        aLength: 0,
        snapCamera: false,
        scale: 1,
        alongPerspX: 0,
        alongPerspY: 0,
        alongRot: 0,
        anchorX: 0,
        anchorY: 0,
        skewX: 0,
        skewY: 0,
        scaleX: 1,
        scaleY: 1,
        flipX: false,
        flipY: false,
        rotate: 0,
        perspClamping: -5,
        perspX: 0,
        perspY: 0,
        nudgeXSmall: 0,
        nudgeXBig: 0,
        nudgeYSmall: 0,
        nudgeYBig: 0,
      };
      this.state = {
        ...this.defaults,
        active: false,
        initialized: false,
        animColor: "#000000",
        relativeTools: false,
        warpTools: false,
        translateTools: false,
        relativePersp: true,
      };

      this.mod = new AnimateMod(store, this.state);

      store.subscribe(() => {
        const script = getTrackScript(store.getState());

        if (!this.state.initialized && script.includes(HEADER_COMMENT)) {
          this.mod.beginLayerId = Math.min(
            ...getSimulatorCommittedLayers(store.getState()).filter(layer => layer.name.includes(LAYER_NAME)).map(
              layer => layer.id,
            ),
          );
          this.setState({ initialized: true });
        }

        if (this.state.initialized && !script.includes(HEADER_COMMENT)) {
          this.setState({ initialized: false });
        }

        const selectToolActive = getActiveTool(store.getState()) === SELECT_TOOL;

        if (this.state.active && !selectToolActive) {
          this.setState({ active: false });
        }
      });
    }

    componentWillUpdate(nextProps, nextState) {
      let error = this.mod.onUpdate(nextState);
      if (error) {
        this.setState({ active: false });
        console.error(error.message);
      }
    }

    onReset(key) {
      let changedState = {};
      changedState[key] = this.defaults[key];
      this.setState(changedState);
    }

    onResetAll() {
      this.setState({ ...this.defaults });
    }

    onCommit() {
      this.mod.commit();
      this.setState({
        active: false,
      });
    }

    onActivate() {
      if (this.state.active) {
        this.setState({ active: false });
      } else {
        store.dispatch(setTool(SELECT_TOOL));
        this.setState({ active: true });
      }
    }

    renderSection(key, title) {
      return e(
        "div",
        null,
        e("button", {
          id: key,
          style: { background: "none", border: "none" },
          onClick: () => this.setState({ [key]: !this.state[key] }),
        }, this.state[key] ? "▲" : "▼"),
        e("label", { for: key }, title),
      );
    }

    renderCheckbox(key, title = null) {
      if (!title) title = key;

      const props = {
        id: key,
        checked: this.state[key],
        onChange: e => this.setState({ [key]: e.target.checked }),
      };
      return e(
        "div",
        null,
        e("label", { style: { width: "4em" }, for: key }, title),
        e("input", { style: { marginLeft: ".5em" }, type: "checkbox", ...props }),
      );
    }

    renderSlider(key, props, title = null) {
      if (!title) title = key;

      props = {
        ...props,
        id: key,
        value: this.state[key],
        onChange: e =>
          props.min <= e.target.value && e.target.value <= props.max
          && this.setState({ [key]: parseFloatOrDefault(e.target.value) }),
      };

      const rangeProps = {
        ...props,
      };
      const numberProps = {
        ...props,
      };
      return e(
        "div",
        null,
        e("label", { for: key }, title),
        e(
          "div",
          null,
          e("button", { style: { marginRight: ".5em" }, onClick: () => this.onReset(key) }, "⟳"),
          e("input", { style: { width: "4em" }, type: "number", ...numberProps }),
          e("input", { style: { width: "6em" }, type: "range", ...rangeProps, onFocus: e => e.target.blur() }),
        ),
      );
    }

    render() {
      return e(
        "div",
        null,
        this.state.active
          && e(
            "div",
            null,
            e(
              "span",
              { style: { fontStyle: "italic", color: "red", fontSize: 11, whiteSpace: "nowrap" } },
              "WARNING: This mod is severely untested, use at your own risk",
            ),
            e("hr"),
            !this.state.initialized && e("button", { onClick: () => this.mod.onPrepLayers() }, "Initialize"),
            this.state.initialized
              && e(
                "div",
                null,
                this.renderCheckbox("snapCamera", "Snap Camera"),
                this.renderSlider("aLength", { min: 0, max: LOOP_LENGTH, step: 1 }, "Animation Length"),
                e(
                  "div",
                  null,
                  e("input", {
                    type: "color",
                    style: { width: "2em", marginRight: ".5em" },
                    value: this.state.animColor,
                    onChange: e => this.setState({ animColor: e.target.value }),
                  }),
                  e("button", { onClick: () => this.mod.onChangeColor(this.state.animColor) }, "Set"),
                ),
                e("button", { onClick: () => this.mod.onUnlockFrame() }, "Unlock Frame"),
                e("hr"),
                this.renderSlider("scaleX", { min: 0, max: 10, step: 0.01 }, "Scale X"),
                this.renderSlider("scaleY", { min: 0, max: 10, step: 0.01 }, "Scale Y"),
                this.renderSlider("scale", { min: 0, max: 10, step: 0.01 }, "Scale"),
                this.renderCheckbox("flipX", "Flip X"),
                this.renderCheckbox("flipY", "Flip Y"),
                this.renderSlider("rotate", { min: -180, max: 180, step: 1 }, "Rotation"),
                this.renderSection("relativeTools", "Adjust Origin"),
                this.state.relativeTools
                  && e(
                    "div",
                    null,
                    this.renderSlider("alongPerspX", { min: -0.5, max: 0.5, step: 0.001 }, "Along Perspective X"),
                    this.renderSlider("alongPerspY", { min: -0.5, max: 0.5, step: 0.001 }, "Along Perspective Y"),
                    this.renderSlider("alongRot", { min: -180, max: 180, step: 1 }, "Along Rotation"),
                    this.renderSlider("anchorX", { min: -0.5, max: 0.5, step: 0.01 }, "Anchor X"),
                    this.renderSlider("anchorY", { min: -0.5, max: 0.5, step: 0.01 }, "Anchor Y"),
                  ),
                this.renderSection("warpTools", "Warp Tools"),
                this.state.warpTools
                  && e(
                    "div",
                    null,
                    this.renderCheckbox("relativePersp", "Relative Perspective"),
                    this.renderSlider("perspClamping", { min: -5, max: 0, step: 0.01 }, "Perspective Clamping"),
                    this.renderSlider("perspX", { min: -1, max: 1, step: 0.01 }, "Perpective X"),
                    this.renderSlider("perspY", { min: -1, max: 1, step: 0.01 }, "Perpective Y"),
                    this.renderSlider("skewX", { min: -2, max: 2, step: 0.01 }, "Skew X"),
                    this.renderSlider("skewY", { min: -2, max: 2, step: 0.01 }, "Skew Y"),
                  ),
                this.renderSection("translateTools", "Translate Tools"),
                this.state.translateTools
                  && e(
                    "div",
                    null,
                    this.renderSlider("nudgeXSmall", { min: -10, max: 10, step: 0.1 }, "Small Nudge X"),
                    this.renderSlider("nudgeXBig", { min: -100000, max: 100000, step: 10 }, "Large Nudge X"),
                    this.renderSlider("nudgeYSmall", { min: -10, max: 10, step: 0.1 }, "Small Nudge Y"),
                    this.renderSlider("nudgeYBig", { min: -100000, max: 100000, step: 10 }, "Large Nudge Y"),
                  ),
                e("hr"),
                e("button", { style: { float: "left" }, onClick: () => this.onCommit() }, "Commit"),
                e("button", { style: { float: "left" }, onClick: () => this.onResetAll() }, "Reset"),
              ),
          ),
        e("button", {
          style: { backgroundColor: this.state.active ? "lightblue" : null },
          onClick: this.onActivate.bind(this),
        }, "XAnimator2"),
      );
    }
  }

  window.registerCustomSetting(XAnimatorModComponent);
}

/* init */
if (window.registerCustomSetting) {
  main();
} else {
  const prevCb = window.onCustomToolsApiReady;
  window.onCustomToolsApiReady = () => {
    if (prevCb) prevCb();
    main();
  };
}

/* utils */
function setsEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (let x of a) {
    if (!b.has(x)) {
      return false;
    }
  }
  return true;
}

function getLinesFromPoints(points) {
  return new Set([...points].map(point => point >> 1));
}

function buildAffineTransform(shearX, shearY, scaleX, scaleY, rot) {
  const { V2 } = window;

  let tShear = [1 + shearX * shearY, shearX, shearY, 1, 0, 0];
  let tScale = [scaleX, 0, 0, scaleY, 0, 0];
  let u = V2.from(1, 0).rot(rot).transform(tScale).transform(tShear);
  let v = V2.from(0, 1).rot(rot).transform(tScale).transform(tShear);

  return [u.x, v.x, u.y, v.y, 0, 0];
}

function buildRotTransform(rot) {
  const { V2 } = window;

  let u = V2.from(1, 0).rot(rot);
  let v = V2.from(0, 1).rot(rot);

  return [u.x, v.x, u.y, v.y, 0, 0];
}

function preparePointAlong(p, preCenter, alongPerspX, alongPerspY, preTransform) {
  return transformPersp(p.sub(preCenter), -alongPerspX, -alongPerspY, 0).transform(preTransform);
}

function transformPersp(p, perspX, perspY, epsilon) {
  const pt = new V2(p);
  let w = 1 + perspX * pt.x + perspY * pt.y;
  if (Math.abs(w) < epsilon) {
    w = Math.sign(w) * epsilon;
  }
  pt.x = pt.x / w;
  pt.y = pt.y / w;
  return pt;
}

function restorePoint(p, anchor, postTransform, alongPerspX, alongPerspY, preCenter) {
  return transformPersp(
    p.add(anchor).transform(postTransform),
    alongPerspX,
    alongPerspY,
    0,
  ).add(preCenter);
}

function parseFloatOrDefault(string, defaultValue = 0) {
  const x = parseFloat(string);
  return isNaN(x) ? defaultValue : x;
}

function getBoundingBox(lines) {
  if (lines.size === 0) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let line of lines) {
    minX = Math.min(line.p1.x, minX);
    minY = Math.min(line.p1.y, minY);
    maxX = Math.max(line.p1.x, maxX);
    maxY = Math.max(line.p1.y, maxY);

    minX = Math.min(line.p2.x, minX);
    minY = Math.min(line.p2.y, minY);
    maxX = Math.max(line.p2.x, maxX);
    maxY = Math.max(line.p2.y, maxY);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
