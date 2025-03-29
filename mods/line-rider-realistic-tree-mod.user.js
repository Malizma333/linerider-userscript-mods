// ==UserScript==

// @name         Tree Generator
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates various types of trees
// @version      1.1.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @require      https://raw.githubusercontent.com/supereggbert/proctree.js/refs/heads/master/proctree.js

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-realistic-tree-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-realistic-tree-mod.user.js
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

class TreeMod {
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

    if (shouldUpdate) {
      if (this.changed) {
        this.store.dispatch(revertTrackChanges());
        this.changed = false;
      }

      if (this.state.active) {
        let lines = [];

        switch (this.state.genType) {
        case 0:
          lines = genTreeTypeA(this.state);
          break;
        case 1:
          lines = genTreeTypeB(this.state);
          break;
        case 2:
          lines = genTreeTypeC(this.state);
          break;
        default:
          break;
        }

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

  const e = React.createElement;

  class TreeModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        genType: 2,

        // type 0
        baseWidth: 30,
        baseHeight: 100,
        maxDepthA: 4,
        heightScale: 0.8,
        widthScale: 0.8,
        angleScale: 1,

        // type 1
        minBranches: 1,
        maxBranches: 4,
        maxDepthB: 5,

        // type 2
        clumpMax: 0.8,
        clumpMin: 0.5,
        lengthFalloffFactor: 0.85,
        lengthFalloffPower: 1,
        branchFactor: 2.0,
        radiusFalloffRate: 0.6,
        climbRate: 1.5,
        trunkKink: 0.00,
        maxRadius: 0.25,
        treeSteps: 2,
        taperRate: 0.95,
        twistRate: 0.5,
        levels: 3,
        sweepAmount: 0,
        initalBranchLength: 0.85,
        trunkLength: 2.5,
        dropAmount: 0.0,
        growAmount: 0.0,
        scale: 10,
        seed: 10,
        orientation: 0,
        template: 0,
        twigGrowth: false,
        branchGrowth: false,
        trunkGrowth: false,
        lineWidth: 1,
      };

      this.treeMod = new TreeMod(store, this.state);
    }

    componentWillUpdate (_, nextState) {
      this.treeMod.onUpdate(nextState);
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: e => this.setState({ [key]: parseFloat(e.target.value) })
      };

      return e("div", null,
        title,
        e("input", { style: { width: "3em" }, type: "number", ...props }),
        e("input", { type: "range", ...props, onFocus: e => e.target.blur() })
      );
    }

    renderSection (key, title) {
      return e("div", null,
        e("button",
          { id: key, style: { background: "none", border: "none" }, onClick: () => this.setState({ [key]: !this.state[key] }) },
          this.state[key] ? "▲" : "▼"
        ),
        e("label", { for: key }, title)
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

    onLoadTemplate (t) {
      if (t < 1 || t > 4) return;

      this.setState({ template: t });
      const keys = ["clumpMax", "clumpMin", "levels", "initalBranchLength",
        "lengthFalloffFactor", "lengthFalloffPower", "growAmount", "branchFactor",
        "taperRate", "dropAmount", "sweepAmount", "maxRadius", "radiusFalloffRate",
        "treeSteps", "trunkLength", "climbRate", "trunkKink", "twistRate"
      ];

      const templates = [
        [0.665, 0.565, 5, 1.23, 0.65, 0.65, 0.2, 10, 1.025, 0.02, 0, 0.145, 0.705, 11.55, 2.15, 0.37, -0.035, 2.9],
        [0.605, 0.42, 6, 0.7, 0.73, 0.76, -0.17, 7.3, 0.9, 0.09, 0, 0.175, 0.75, 3.8, 1.75, 0.84, 0.06, 2.05],
        [0.555, 0, 5, 0.84, 0.61, 0.51, 0.74, 1.35, 0.48, 0.05, 0.01, 0.11, 0.735, 3.3, 2.3, 1.54, 0.1, 4.15],
        [0.56, 0.095, 6, 0.45, 0.71, 0.94, 0.28, 3.2, 0.98, 0.03, 0.01, 0.05, 0.615, 5.1, 1.75, 0.1, -0.055, 6.45],
      ];

      for (let i = 0; i < keys.length; i++) {
        this.setState({ [keys[i]]: templates[t - 1][i] });
      }
    }

    render () {
      const epsilon = 1/32;
      return e("div", null,
        this.state.active && e("div", null,
          e("select", { value: this.state.genType, onChange: (e) => this.setState({ genType: parseInt(e.target.value) }) },
            e("option", { value: 0 }, "Trapezoidal Skeleton"),
            e("option", { value: 1 }, "Stick Branches"),
            e("option", { value: 2 }, "Realistic Mesh")
          ),
          this.state.genType === 0 && e("div", null,
            this.renderSlider("baseWidth", "Base Width", { min: 1, max: 100, step: epsilon }),
            this.renderSlider("baseHeight", "Base Height", { min: 1, max: 100, step: epsilon }),
            this.renderSlider("maxDepthA", "Max Depth", { min: 1, max: 10, step: 1 }),
            this.renderSlider("heightScale", "Height Scale", { min: epsilon, max: 1, step: epsilon }),
            this.renderSlider("widthScale", "Width Scale", { min: epsilon, max: 1, step: epsilon }),
            this.renderSlider("angleScale", "Angle Scale", { min: epsilon, max: 1, step: epsilon })
          ),
          this.state.genType === 1 && e("div", null,
            this.renderSlider("minBranches", "Min Branches", { min: 0, max: 5, step: 1 }),
            this.renderSlider("maxBranches", "Max Branches", { min: this.state.minB + 1, max: 10, step: 1 }),
            this.renderSlider("maxDepthB", "Max Depth", { min: 2, max: 5, step: 1 }),
          ),
          this.state.genType === 2 && e("div", null,
            this.renderSlider("lineWidth", "Line Width", { min: epsilon, max: 3, step: epsilon }),
            this.renderSlider("orientation", "Orientation", { min: 0, max: 360, step: 1 }),
            this.renderSlider("seed", "Random Seed", { min: 0, max: 10000, step: 1 }),
            e("select", { value: this.state.template, onChange: (e) => this.onLoadTemplate(parseInt(e.target.value)) },
              e("option", { value: 0 }, ""),
              e("option", { value: 1 }, "Eucalyptus Tree"),
              e("option", { value: 2 }, "Oak Tree"),
              e("option", { value: 3 }, "Birch Tree"),
              e("option", { value: 4 }, "Citrus Tree"),
            ),
            this.renderSection("twigGrowth", "Twig Growth"),
            this.state.twigGrowth && e("div", null,
              this.renderSlider("clumpMin", "Minimum Twig Clumping", { min: 0, max: this.state.clumpMax, step: epsilon }),
              this.renderSlider("clumpMax", "Maximum Twig Clumping", { min: this.state.clumpMin, max: 1, step: epsilon }),
            ),
            this.renderSection("branchGrowth", "Branch Growth"),
            this.state.branchGrowth && e("div", null,
              this.renderSlider("levels", "Branching Level", { min: 0, max: 7, step: 1 }),
              this.renderSlider("initalBranchLength", "First Branch Length", { min: epsilon, max: 2.5, step: epsilon }),
              this.renderSlider("lengthFalloffFactor", "Other Branch Lengths", { min: 0.5, max: 1, step: epsilon }),
              this.renderSlider("lengthFalloffPower", "Branch Length Power", { min: epsilon, max: 1.5, step: epsilon }),
              this.renderSlider("growAmount", "First Branch Angle", { min: -0.5, max: 1, step: epsilon }),
              this.renderSlider("branchFactor", "Branch Angle Factor", { min: 1, max: 10, step: epsilon }),
              this.renderSlider("taperRate", "Crown Expansion", { min: 0.25, max: 1.25, step: epsilon }),
              this.renderSlider("dropAmount", "Gravity Effect", { min: -1, max: 1, step: epsilon }),
              this.renderSlider("sweepAmount", "Wind Effect", { min: -1, max: 1, step: epsilon }),
            ),
            this.renderSection("trunkGrowth", "Trunk Growth"),
            this.state.trunkGrowth && e("div", null,
              this.renderSlider("scale", "Core Height", { min: epsilon, max: 30, step: epsilon }),
              this.renderSlider("maxRadius", "Trunk Thickness", { min: epsilon, max: 1, step: epsilon }),
              this.renderSlider("radiusFalloffRate", "Branch Thickness", { min: 0.5, max: 1, step: epsilon }),
              this.renderSlider("treeSteps", "Vertical Segments", { min: 0, max: 30, step: epsilon }),
              this.renderSlider("trunkLength", "First Segment Height", { min: epsilon, max: 10, step: epsilon }),
              this.renderSlider("climbRate", "Other Segment Heights", { min: 0, max: 5, step: epsilon }),
              this.renderSlider("trunkKink", "Segment Crookedness", { min: -1, max: 1, step: epsilon }),
              this.renderSlider("twistRate", "Segment Rotation", { min: 0, max: 10, step: epsilon }),
            )
          ),
          e("button", { style: { float: "left" }, onClick: () => this.onCommit() },
            "Commit"
          ),
          e("button", { style: { float: "left" }, onClick: () => {
            this.treeMod.onUpdate(this.state, true);
            this.setState({ seed: Math.floor(Math.random() * 1000) });
          }},
          "Refresh"
          )
        ),
        e("button",
          {
            style: {
              backgroundColor: this.state.active ? "lightblue" : null
            },
            onClick: this.onActivate.bind(this)
          },
          "Tree Mod"
        )
      );
    }
  }

  window.registerCustomSetting(TreeModComponent);
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

function genTreeTypeA ({ baseWidth, baseHeight, maxDepthA, widthScale, heightScale, angleScale }) {
  const camPos = window.store.getState().camera.editorPosition;
  let lineArray = [];

  let baseA = {
    p1: { x: camPos.x - baseWidth / 2, y: -camPos.y - baseHeight},
    p2: { x: camPos.x + baseWidth / 2, y: -camPos.y - baseHeight}
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

    if (depth <= maxDepthA) {
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
        const sign = (side1 ? 1 : -1);
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
  };

  const p2 = {
    x: origin.x + dist * Math.cos(dir) + width / 2 * Math.cos(dir + Math.PI / 2),
    y: origin.y + dist * Math.sin(dir) + width / 2 * Math.sin(dir + Math.PI / 2),
  };

  return { p1, p2 };
}

function genTreeTypeB ({ minBranches, maxBranches, maxDepthB }) {
  const camPos = window.store.getState().camera.editorPosition;
  const scale = 20;
  let lineArray = [];

  function branch (iB, x, y, a) {
    let nX = x + scale * iB * Math.cos(a);
    let nY = y + scale * iB * Math.sin(a);

    lineArray.push({
      x1: x,
      y1: -y,
      x2: nX,
      y2: -nY,
      type: 2,
      width: iB / maxDepthB
    });

    if (iB == 1) return;

    for (let i = 0; i < minBranches + (maxBranches - minBranches) * Math.random(); i++) {
      branch(iB - 1, nX, nY, a + Math.PI / 2 * (Math.random() - 0.5));
    }
  }

  branch(maxDepthB, camPos.x, -camPos.y - scale * maxDepthB, Math.PI / 2);

  return lineArray;
}

// Adapted from (Tree3D)[https://drajmarsh.bitbucket.io/tree3d.html] and (proctreejs)[https://github.com/supereggbert/proctree.js]

function genTreeTypeC (state) {
  const camPos = window.store.getState().camera.editorPosition;
  const rotation = Math.PI * state.orientation / 180;
  const scale = state.scale * 5;
  const lineWidth = state.lineWidth;

  if (lineWidth <= 0) return;

  const projectedX = (x, z) => camPos.x + scale * (x * Math.cos(rotation) + z * Math.sin(rotation));
  const projectedY = (y) => -camPos.y - 4 * scale + scale * y;

  let tree;
  try {
    tree = new window.Tree({
      ...state,
      segments: 4
    });
  } catch (e) {
    console.log("Error generating tree:", e.message);
    return [];
  }
  let vertices = tree.verts;
  let faces = tree.faces;
  let lineArray = [];
  let seenPairs = new Set();

  for (const face of faces) {
    let points = [
      [projectedX(vertices[face[0]][0], vertices[face[0]][2]), -projectedY(vertices[face[0]][1])],
      [projectedX(vertices[face[1]][0], vertices[face[1]][2]), -projectedY(vertices[face[1]][1])],
      [projectedX(vertices[face[2]][0], vertices[face[2]][2]), -projectedY(vertices[face[2]][1])]
    ];
    for (let i = 0; i < 3; i++) {
      let j = (i + 1) % 3;
      if (!seenPairs.has(face[i] * vertices.length + face[j])) {
        seenPairs.add(face[i] * vertices.length + face[j]);
        seenPairs.add(face[j] * vertices.length + face[i]);
        lineArray.push({ x1: points[i][0], y1: points[i][1], x2: points[j][0], y2: points[j][1], type: 2, width: lineWidth });
      }
    }

    let a = Math.sqrt(Math.pow(points[0][0] - points[1][0], 2) + Math.pow(points[0][1] - points[1][1], 2));
    let b = Math.sqrt(Math.pow(points[1][0] - points[2][0], 2) + Math.pow(points[1][1] - points[2][1], 2));
    let c = Math.sqrt(Math.pow(points[2][0] - points[0][0], 2) + Math.pow(points[2][1] - points[0][1], 2));
    let A = Math.sqrt((a + b + c) * (-a + b + c) * (a - b + c) * (a + b - c));
    let h = 0.5 / c * A;
    for (let i = lineWidth / h; i < 1; i += lineWidth / h) {
      let x1 = i * (points[0][0] - points[1][0]) + points[1][0];
      let y1 = i * (points[0][1] - points[1][1]) + points[1][1];
      let x2 = i * (points[2][0] - points[1][0]) + points[1][0];
      let y2 = i * (points[2][1] - points[1][1]) + points[1][1];
      lineArray.push({ x1, y1, x2, y2, type: 2, width: lineWidth });
    }
  }

  return lineArray;
}
