// ==UserScript==

// @name         Rider Preview
// @namespace    https://www.linerider.com/
// @author       Tobias Bessler
// @description  Adds a preview rider to the mod window
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-rider-preview-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-rider-preview-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

function normalizePoints(points, canvasWidth, canvasHeight) {
  const SCALE = 5;
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerPoints = [points[4], points[5]];

  let centerX, centerY;

  if (centerPoints && centerPoints.length > 0) {
    const cx = centerPoints.reduce((sum, p) => sum + p.x, 0) / centerPoints.length;
    const cy = centerPoints.reduce((sum, p) => sum + p.y, 0) / centerPoints.length;
    centerX = cx;
    centerY = cy;
  } else {
    // Fallback: center of bounding box
    centerX = (minX + maxX) / 2;
    centerY = (minY + maxY) / 2;
  }

  const scaledCenterX = (centerX - minX) * SCALE;
  const scaledCenterY = (centerY - minY) * SCALE;
  const offsetX = canvasWidth / 2 - scaledCenterX;
  const offsetY = canvasHeight / 2 - scaledCenterY;
  return points.map(p => ({
    x: (p.x - minX) * SCALE + offsetX,
    y: (p.y - minY) * SCALE + offsetY,
  }));
}

class SimpleCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d");
    this.lines = [];
    this.points = [];
  }

  addLine(p1, p2) {
    this.lines.push({ p1, p2 });
  }

  addPoint(p) {
    this.points.push(p);
  }

  redraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 1.5;
    for (const { p1, p2 } of this.lines) {
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
    }

    for (const { x, y } of this.points) {
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
      this.ctx.fillStyle = "white";
      this.ctx.fill();
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = "black";
      this.ctx.stroke();
    }
  }
}

function main() {
  const {
    React,
    store,
  } = window;

  const e = React.createElement;

  class RiderPreviewComponent extends React.Component {
    constructor(props) {
      super(props);

      this.canvas = undefined;
      this.canvasRef = React.createRef();

      this.state = {
        active: false,
        activeRider: 0,
      };

      store.subscribe(() => this._mounted && this.matchState());
    }

    componentWillUnmount() {
      this._mounted = false;
    }

    componentDidMount() {
      this._mounted = true;

      if (this.canvasRef.current) {
        const canvas = this.canvasRef.current;
        this.canvas = new SimpleCanvas(canvas);
        canvas.width = 150;
        canvas.height = 150;
      }

      this.matchState();
    }

    matchState() {
      const state = store.getState();
      if (store.getState().progress.LOAD_TRACK.status) return;

      const riders = Selectors.getRiders(state);

      this.setState({ numRiders: riders.length });

      if (riders.length > 0 && this.canvas !== undefined) {
        this.canvas.lines = [];
        this.canvas.points = [];
        const canvas = this.canvasRef.current;

        const activeRider = Math.min(this.state.activeRider, riders.length - 1);
        this.setState({ activeRider });
        const riderPoints = normalizePoints(
          Selectors
            .getSimulatorTrack()
            .getFrame(Math.floor(Selectors.getPlayerIndex()))
            .snapshot.entities[0].entities[activeRider].points
            .slice(0, 10)
            .map(point => point.pos),
          canvas.width,
          canvas.height,
        );
        const bones = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
          [0, 2],
          [3, 1],
          [0, 4],
          [1, 4],
          [2, 4],
          [5, 4],
          [5, 7],
          [5, 6],
          [4, 8],
          [4, 9],
          [5, 6],
          [5, 0],
          [3, 7],
          [3, 6],
          [8, 2],
          [9, 2],
          [5, 8],
          [5, 9],
        ];
        bones.forEach(([i, j]) => this.canvas.addLine(riderPoints[i], riderPoints[j]));

        for (let i = 0; i < riderPoints.length; i++) {
          this.canvas.addPoint(riderPoints[i]);
        }

        this.canvas.redraw();
      }
    }

    renderSingle(key, label, editable, isNumber, action) {
      const props = {
        id: key,
        type: isNumber ? "number" : "text",
        readOnly: !editable,
        value: this.state[key],
        onChange: e => action(this, isNumber ? Number(e.target.value) : e.target.value),
      };

      return e(
        "div",
        null,
        e("label", { style: { width: "4em" }, htmlFor: key }, label),
        e("input", { style: { marginLeft: ".5em" }, ...props }),
      );
    }

    onActivate() {
      if (this.state.active) {
        this.setState({ active: false });
      } else {
        this.setState({ active: true });
      }
    }

    onSelectRider(parent, sr) {
      const riders = Selectors.getRiders();

      if (sr < 0 || sr >= riders.length) return;

      const activeRider = parseInt(sr);
      parent.setState({ activeRider });
    }

    render() {
      return e(
        "div",
        null,
        this.state.active
          && e(
            "div",
            null,
            this.state.numRiders > 1
              && this.renderSingle("selectedRider", "Selected Rider", true, true, this.onSelectRider),
          ),
        e("canvas", {
          ref: this.canvasRef,
          style: {
            display: this.state.active ? "block" : "none",
            width: "150px",
            height: "150px",
            border: "1px solid #ccc",
            marginTop: "1em",
          },
        }),
        e("button", {
          style: {
            backgroundColor: this.state.active ? "lightblue" : null,
          },
          onClick: this.onActivate.bind(this),
        }, "Rider Preview Mod"),
      );
    }
  }

  window.registerCustomSetting(RiderPreviewComponent);
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
