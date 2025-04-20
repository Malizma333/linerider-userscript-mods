// ==UserScript==

// @name         SVG Mod
// @namespace    https://www.linerider.com/
// @author       Conqu3red & Tobias Bessler
// @description  Linerider.com userscript for converting svgs to lines
// @version      1.1.1
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-svg-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-svg-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// @require      http://cdnjs.cloudflare.com/ajax/libs/raphael/2.1.0/raphael-min.js
// @require      https://cdn.jsdelivr.net/npm/opentype.js@latest/dist/opentype.min.js

// ==/UserScript==

/* globals Raphael, opentype */

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: "UPDATE_LINES",
  payload: {
    linesToRemove,
    linesToAdd
  },
  meta: {
    name: name
  }
});

const addLines = (line) => updateLines(null, line, "ADD_LINES");

const commitTrackChanges = () => ({
  type: "COMMIT_TRACK_CHANGES"
});

const revertTrackChanges = () => ({
  type: "REVERT_TRACK_CHANGES"
});

const getSimulatorCommittedTrack = state => state.simulator.committedEngine;
const getEditorPosition = state => state.camera.editorPosition;

class SvgMod {
  constructor(store, initState) {
    this.store = store;
    this.state = initState;

    this.changed = false;
    this.nlines = 0;

    this.track = getSimulatorCommittedTrack(this.store.getState());
    this.camPos = getEditorPosition(this.store.getState());

    store.subscribeImmediate(() => {
      this.onUpdate();
    });
  }

  commit() {
    if (this.changed) {
      this.store.dispatch(commitTrackChanges());
      this.store.dispatch(revertTrackChanges());
      this.changed = false;
      return true;
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

      const camPos = getEditorPosition(this.store.getState());

      if (this.camPos !== camPos) {
        this.camPos = camPos;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {

      if (this.changed) {
        this.store.dispatch(revertTrackChanges());
        this.changed = false;
      }

      if (this.state.active) {
        let myLines = [];

        this.nlines = 0;

        console.time("GenLines");

        for (let { p1, p2 } of genLines(this.state)) {
          this.nlines++;
          myLines.push({
            x1: p1.x + this.camPos.x,
            y1: p1.y + this.camPos.y,
            x2: p2.x + this.camPos.x,
            y2: p2.y + this.camPos.y,
            type: 2
          });
        }

        console.timeEnd("GenLines");

        if (myLines.length > 0) {
          this.store.dispatch(addLines(myLines));
          this.changed = true;
        }
      }
    }
  }
}

function main() {
  const { React, store } = window;

  const e = React.createElement;

  class SvgModComponent extends React.Component {
    constructor(props) {
      super(props);

      this.state = {
        active: false,

        mode: "TEXT",
        tolerance: 0.5,
        xOffs: 0,
        yOffs: 0,

        fontFile: null,
        fontName: "",
        text: "",

        fontSize: 72,
        width: Infinity,
        align: "left",
        letterSpacing: 0,
        lineHeight: 1.125,

        svgFile: null,
        svgName: "",
        scale: 1,
      };

      this.mod = new SvgMod(store, this.state);
    }

    componentWillUpdate(_, nextState) {
      this.mod.onUpdate(nextState);
    }

    onActivate() {
      if (this.state.active) {
        this.setState({
          active: false,
          text: ""
        });
      } else {
        this.setState({
          active: true
        });
      }
    }

    onFontFileChange() {
      return new Promise((resolve) => {
        const file = event.target.files[0];
        const fileReader = new FileReader();
        fileReader.fileName = event.target.files[0].name;
        fileReader.onloadend = (e) => {
          try {
            const result = fileReader.result;
            const font = opentype.parse(result);
            resolve([fileReader.fileName, font]);
          } catch (e) {
            console.log("Error when parsing: Unsupported font");
            console.log(e);
          }
        };
        fileReader.readAsArrayBuffer(file);
      });
    }

    onSvgFileChange() {
      return new Promise((resolve) => {
        const file = event.target.files[0];
        const fileReader = new FileReader();
        fileReader.fileName = event.target.files[0].name;
        fileReader.onloadend = (e) => {
          try {
            const result = fileReader.result;
            const dom = new DOMParser().parseFromString(result, "image/svg+xml");
            resolve([fileReader.fileName, dom]);
          } catch (e) {
            console.log("Error when parsing: Unsupported svg");
            console.log(e);
          }
        };
        fileReader.readAsText(file, "utf8");
      });
    }

    onCommit() {
      const committed = this.mod.commit();
      if (committed) {
        this.setState({
          active: false,
          text: ""
        });
      }
    }

    renderSlider(key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: create => this.setState({
          [key]: parseFloat(create.target.value)
        })
      };

      return e("div", null,
        title,
        e("input", {
          style: {
            width: "4em"
          },
          type: "number",
          ...props
        }),
        e("input", {
          type: "range",
          ...props,
          onFocus: create => create.target.blur()
        })
      );
    }

    renderEnumChoices(key, title, items, props) {
      return e("form", null,
        title,
        ...items.map((i) => this.renderRadioButton(key, i[0], i[1], {})),
        props,
      );
    }

    renderRadioButton(key, internalValue, title, props) {
      props = {
        ...props,
        name: key,
        value: internalValue,
        onChange: create => this.setState({
          [key]: create.target.value
        })
      };

      return e("div", null,
        title,
        e("input", {
          type: "radio",
          ...props,
          onFocus: create => create.target.blur()
        })
      );
    }

    render() {
      return e("div", null,
        this.state.active && e("div", null, this.renderEnumChoices("mode", "Mode", [
          ["TEXT", "Text Mode"],
          ["SVG", "SVG Mode"],
        ]),

        this.state.mode == "TEXT" &&
          e("div", null,

            e("div", null,
              "Font: ",
              e("input", {
                type: "file",
                onChange: create => this.onFontFileChange().then(result => {
                  //result = normalizeLines(result);
                  let [fileName, res] = result;
                  this.setState({
                    fontFile: res,
                    fontName: fileName
                  });
                  console.log("Loaded " + fileName + " successfully");
                }).catch(err => {
                  console.log("Error when parsing: Invalid font file");
                  console.log(err);
                })
              })
            ),

            this.state.fontFile != null && e("div", null, "Loaded: " + this.state.fontName),
            this.state.fontFile != null && e("div", null,
              "Text: ",
              e("textArea", {
                style: {
                  width: "88%"
                },
                type: "text",
                value: this.state.text,
                onChange: create => this.setState({
                  text: create.target.value
                })
              })
            ),
            this.renderSlider("tolerance", "Tolerance", { min: 0.001, max: 0.5, step: 0.001 }),
            this.renderSlider("xOffs", "X Offset", { min: -500, max: 500, step: 10 }),
            this.renderSlider("yOffs", "Y Offset", { min: -500, max: 500, step: 10 }),
            this.renderSlider("fontSize", "Font Size", { min: 10, max: 250, step: 1 }),
            this.renderSlider("width", "Wrap Width", { min: 100, max: 2000, step: 100 }),
            this.renderSlider("letterSpacing", "Extra Letter Spacing", { min: 0, max: 50, step: 1 }),
            this.renderSlider("lineHeight", "Line Height", { min: 0, max: 2, step: 0.005 }),
          ),
        this.state.mode == "SVG" &&
          e("div", null,
            e("div", null,
              "SVG File: ",
              e("input", {
                type: "file",
                onChange: _ => this.onSvgFileChange().then(result => {
                  let [fileName, res] = result;
                  this.setState({
                    svgFile: res,
                    svgName: fileName
                  });
                  console.log("Loaded " + fileName + " successfully");
                }).catch(err => {
                  console.log("Error when parsing: Invalid svg file");
                  console.log(err);
                })
              })
            ),

            this.state.svgFile != null && e("div", null, "Loaded: " + this.state.svgName),
            this.renderSlider("tolerance", "Tolerance", { min: 0.001, max: 0.5, step: 0.001 }),
            this.renderSlider("xOffs", "X Offset", { min: -500, max: 500, step: 10 }),
            this.renderSlider("yOffs", "Y Offset", { min: -500, max: 500, step: 10 }),
            this.renderSlider("scale", "Scale", { min: 0.1, max: 10, step: 0.05 })
          ),
        e("div", null, `Lines: ${this.mod.nlines}`),
        e("button", {
          style: {
            float: "left"
          },
          onClick: () => this.onCommit()
        },
        "Commit"
        )
        ),
        e("button", {
          style: {
            backgroundColor: this.state.active ? "lightblue" : null
          },
          onClick: this.onActivate.bind(this)
        },
        "SVG Mod"
        )
      );
    }
  }

  window.registerCustomSetting(SvgModComponent);
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

function applyScaleThenOffset(path, xOffs, yOffs, xScale, yScale) {
  return path.map((e) => [e[0], ...e.slice(1).map((v, index) => (index % 2 === 0 ? xOffs + v * xScale : yOffs + v * yScale))]);
}

function RaphaelPathToDescribedPath(path) {
  let newPath = [];
  for (const e of path) {
    let newEntry;
    switch (e[0]) {
    case "M":
    case "L":
      newEntry = {
        code: e[0],
        x: e[1],
        y: e[2]
      };
      break;
    case "C":
      newEntry = {
        code: e[0],
        x1: e[1],
        y1: e[2],
        x2: e[3],
        y2: e[4],
        x: e[5],
        y: e[6],
      };
      break;
    case "Z":
      newEntry = {
        code: e[0],
      };
      break;
    }

    newPath.push(newEntry);
  }

  return newPath;
}

function generatePolys(pathSections, opts = undefined) {
  opts = opts ? opts : {
    tolerance: 1
  };
  let allLines = [];
  let curLines = [];

  const tolerance2 = opts.tolerance * opts.tolerance;

  let add = (x, y) => curLines.push([x, y]);

  function sampleCubicBézier(x0, y0, x1, y1, x2, y2, x3, y3) {
    // Calculate all the mid-points of the line segments
    const x01 = (x0 + x1) / 2,
      y01 = (y0 + y1) / 2,
      x12 = (x1 + x2) / 2,
      y12 = (y1 + y2) / 2,
      x23 = (x2 + x3) / 2,
      y23 = (y2 + y3) / 2,
      x012 = (x01 + x12) / 2,
      y012 = (y01 + y12) / 2,
      x123 = (x12 + x23) / 2,
      y123 = (y12 + y23) / 2,
      x0123 = (x012 + x123) / 2,
      y0123 = (y012 + y123) / 2;

    // Try to approximate the full cubic curve by a single straight line
    const dx = x3 - x0,
      dy = y3 - y0;

    const d1 = Math.abs(((x1 - x3) * dy - (y1 - y3) * dx)),
      d2 = Math.abs(((x2 - x3) * dy - (y2 - y3) * dx));

    if (((d1 + d2) * (d1 + d2)) < (tolerance2 * (dx * dx + dy * dy))) add(x0123, y0123);
    else { // Continue subdivision
      sampleCubicBézier(x0, y0, x01, y01, x012, y012, x0123, y0123);
      sampleCubicBézier(x0123, y0123, x123, y123, x23, y23, x3, y3);
    }
  }

  let prev = null;
  for (const cmd of pathSections) {
    switch (cmd.code) {
    case "M":
      allLines.push(curLines = [
        [cmd.x, cmd.y]
      ]);
      // intentional flow-through
    case "L":
    case "H":
    case "V":
    case "Z":
      add(cmd.x, cmd.y);
      // if (cmd.code === 'Z') curLines.closed = true;
      break;

    case "C":
      if (cmd.x1 == prev.x && cmd.x2 == cmd.x && cmd.y1 == prev.y && cmd.y2 == cmd.y)
        add(cmd.x, cmd.y);
      else {
        sampleCubicBézier(prev.x, prev.y, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        add(cmd.x, cmd.y);
      }

      break;

    default:
      console.error(`'${cmd.command}' is not supported`);
    }

    prev = cmd;
  }

  return allLines;
}

function* pathToLines(path, {
  xOffs = 0,
  yOffs = 0,
  xScale = 1,
  yScale = -1,
  tolerance = 1
} = {}) {
  tolerance = tolerance == 0 ? 0.001 : tolerance;

  // Turns path into just cubic bezier curves and moves
  let curvePath = Raphael.path2curve(path);
  curvePath = applyScaleThenOffset(curvePath, xOffs, yOffs, xScale, yScale);

  // convert arrays to labeled objects
  let labledCurvePath = RaphaelPathToDescribedPath(curvePath);

  let polys = generatePolys(labledCurvePath, {
    tolerance: tolerance
  });

  for (const poly of polys) {
    if (poly.length < 2) continue;
    for (let i = 1; i < poly.length; i++) {
      yield {
        p1: V2.from(
          poly[i - 1][0],
          poly[i - 1][1]
        ),
        p2: V2.from(
          poly[i][0],
          poly[i][1]
        ),
      };
    }
  }
}

function defaultIfNaN(n, defaultValue) {
  return isNaN(n) ? defaultValue : n;
}

function* textToLines({
  text = "",
  fontFile = null,
  tolerance = 1,
  xOffs = 0,
  yOffs = 0,
  fontSize = 72,

  width = Infinity,
  align = "left",
  letterSpacing = 0,
  lineHeight = 1.125,
} = {}) {
  const {
    V2
  } = window;

  tolerance = tolerance == 0 ? 0.001 : tolerance;

  if (fontFile === null) return;

  var scale = 1 / fontFile.unitsPerEm * fontSize;

  /* let path = fontFile.getPath(text, xOffs, yOffs, fontSize).toPathData(10) // x, y, baseline
  let curvePath = Raphael.path2curve(path);
  let labledCurvePath = RaphaelPathToDescribedPath(curvePath); */

  var result = computeLayout(fontFile, text, {
    lineHeight: lineHeight * fontFile.unitsPerEm,
    width: width / scale,
    align,
    letterSpacing
  });

  for (const glyph of result.glyphs) {
    let offset = glyph.position;
    offset[0] = xOffs + offset[0] * scale;
    offset[1] = yOffs + offset[1] * -scale;
    let path = glyph.data.path.toPathData(10);

    if (glyph.data.name !== "space") {
      yield* pathToLines(path, {
        xOffs: offset[0],
        yOffs: offset[1],
        xScale: scale,
        yScale: -scale,
        tolerance
      });
    }
  }
}

function* svgToLines({
  svgFile = null,
  tolerance = 1,
  xOffs = 0,
  yOffs = 0,
  scale = 1,
} = {}) {
  const {
    V2
  } = window;

  tolerance = tolerance == 0 ? 0.001 : tolerance;

  if (svgFile === null) return;
  let paths = Array.from(svgFile.getElementsByTagName("path"), path => path.getAttribute("d"));

  console.log("Path count: ", paths.length);

  for (const path of paths) {
    yield* pathToLines(path, {
      xOffs: xOffs,
      yOffs: -yOffs,
      xScale: scale,
      yScale: scale,
      tolerance
    });

  }
}

function* genLines({
  mode = "TEXT",
  text = "",
  fontFile = null,
  tolerance = 1,
  xOffs = 0,
  yOffs = 0,
  fontSize = 72,

  width = Infinity,
  align = "left",
  letterSpacing = 0,
  lineHeight = 1.125,

  svgFile = null,
  scale = 1,
} = {}) {
  if (mode === "TEXT") {
    yield* textToLines({
      text,
      fontFile,
      tolerance: defaultIfNaN(tolerance, 1),
      xOffs: defaultIfNaN(xOffs, 0),
      yOffs: defaultIfNaN(yOffs, 0),
      fontSize: defaultIfNaN(fontSize, 72),

      width: defaultIfNaN(width, Infinity),
      align,
      letterSpacing: defaultIfNaN(letterSpacing, 0),
      lineHeight: defaultIfNaN(lineHeight, 1.125),
    });
  } else if (mode === "SVG") {
    yield* svgToLines({
      svgFile,
      tolerance: defaultIfNaN(tolerance, 1),
      xOffs: defaultIfNaN(xOffs, 0),
      yOffs: defaultIfNaN(yOffs, 0),
      scale: defaultIfNaN(scale, 1),
    });
  }
}

//
//   Text Utilities
//



// npm: word-wrapper

var newline = /\n/;
var newlineChar = "\n";
var whitespace = /\s/;

function wrap(text, opt) {
  var lines = wordWrapLines(text, opt);
  return lines.map(function (line) {
    return text.substring(line.start, line.end);
  }).join("\n");
}

function wordWrapLines(text, opt) {
  opt = opt || {};

  //zero width results in nothing visible
  if (opt.width === 0 && opt.mode !== "nowrap")
    return [];

  text = text || "";
  var width = typeof opt.width === "number" ? opt.width : Number.MAX_VALUE;
  var start = Math.max(0, opt.start || 0);
  var end = typeof opt.end === "number" ? opt.end : text.length;
  var mode = opt.mode;

  var measure = opt.measure || monospace;
  if (mode === "pre")
    return pre(measure, text, start, end, width);
  else
    return greedy(measure, text, start, end, width, mode);
}

function idxOf(text, chr, start, end) {
  var idx = text.indexOf(chr, start);
  if (idx === -1 || idx > end)
    return end;
  return idx;
}

function isWhitespace(chr) {
  return whitespace.test(chr);
}

function pre(measure, text, start, end, width) {
  var lines = [];
  var lineStart = start;
  for (var i = start; i < end && i < text.length; i++) {
    var chr = text.charAt(i);
    var isNewline = newline.test(chr);

    //If we've reached a newline, then step down a line
    //Or if we've reached the EOF
    if (isNewline || i === end - 1) {
      var lineEnd = isNewline ? i : i + 1;
      var measured = measure(text, lineStart, lineEnd, width);
      lines.push(measured);

      lineStart = i + 1;
    }
  }
  return lines;
}

function greedy(measure, text, start, end, width, mode) {
  //A greedy word wrapper based on LibGDX algorithm
  //https://github.com/libgdx/libgdx/blob/master/gdx/src/com/badlogic/gdx/graphics/g2d/BitmapFontCache.java
  var lines = [];

  var testWidth = width;
  //if 'nowrap' is specified, we only wrap on newline chars
  if (mode === "nowrap")
    testWidth = Number.MAX_VALUE;

  while (start < end && start < text.length) {
    //get next newline position
    var newLine = idxOf(text, newlineChar, start, end);

    //eat whitespace at start of line
    while (start < newLine) {
      if (!isWhitespace(text.charAt(start)))
        break;
      start++;
    }

    //determine visible # of glyphs for the available width
    var measured = measure(text, start, newLine, testWidth);

    var lineEnd = start + (measured.end - measured.start);
    var nextStart = lineEnd + newlineChar.length;

    //if we had to cut the line before the next newline...
    if (lineEnd < newLine) {
      //find char to break on
      while (lineEnd > start) {
        if (isWhitespace(text.charAt(lineEnd)))
          break;
        lineEnd--;
      }
      if (lineEnd === start) {
        if (nextStart > start + newlineChar.length) nextStart--;
        lineEnd = nextStart; // If no characters to break, show all.
      } else {
        nextStart = lineEnd;
        //eat whitespace at end of line
        while (lineEnd > start) {
          if (!isWhitespace(text.charAt(lineEnd - newlineChar.length)))
            break;
          lineEnd--;
        }
      }
    }
    if (lineEnd >= start) {
      var result = measure(text, start, lineEnd, testWidth);
      lines.push(result);
    }
    start = nextStart;
  }
  return lines;
}

//determines the visible number of glyphs within a given width
function monospace(text, start, end, width) {
  var glyphs = Math.min(width, end - start);
  return {
    start: start,
    end: start + glyphs
  };
}


// npm: opentype-layout

// A default 'line-height' according to Chrome/FF/Safari (Jun 2016)
var DEFAULT_LINE_HEIGHT = 1.175;

function computeLayout(font, text, opt) {
  if (!font) throw new TypeError("Must specify a font from Opentype.js");
  opt = opt || {};
  text = text || "";
  var align = opt.align || "left";
  var letterSpacing = opt.letterSpacing || 0;
  var width = opt.width || Infinity;

  // apply word wrapping to text
  var wrapOpts = Object.assign({}, opt, {
    measure: measure
  });
  var lines = wordWrapLines(text, wrapOpts);

  // get max line width from all lines
  var maxLineWidth = lines.reduce(function (prev, line) {
    return Math.max(prev, line.width);
  }, 0);

  // As per CSS spec https://www.w3.org/TR/CSS2/visudet.html#line-height
  var AD = Math.abs(font.ascender - font.descender);
  var lineHeight = opt.lineHeight || font.unitsPerEm * DEFAULT_LINE_HEIGHT; // in em units
  var L = lineHeight - AD;

  // Y position is based on CSS line height calculation
  var x = 0;
  var y = -font.ascender - L / 2;
  var totalHeight = (AD + L) * lines.length;
  var preferredWidth = isFinite(width) ? width : maxLineWidth;
  var glyphs = [];
  var lastGlyph = null;

  // Layout by line
  for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    var line = lines[lineIndex];
    var start = line.start;
    var end = line.end;
    var lineWidth = line.width;

    // Layout by glyph
    for (var j = start, c = 0; j < end; j++, c++) {
      var char = text.charAt(j);
      var glyph = getGlyph(font, char);

      // TODO:
      // Align center & right are off by a couple pixels, need to revisit.
      if (j === start && align === "right") {
        x -= glyph.leftSideBearing;
      }

      // Apply kerning
      if (lastGlyph) {
        x += font.getKerningValue(glyph, lastGlyph) || 0;
      }

      // Align text
      var tx = 0;
      if (align === "center") {
        tx = (preferredWidth - lineWidth) / 2;
      } else if (align === "right") {
        tx = preferredWidth - lineWidth;
      }

      // Store glyph data
      glyphs.push({
        position: [x + tx, y],
        data: glyph,
        index: j,
        column: c,
        row: lineIndex
      });

      // Advance forward
      x += letterSpacing + getAdvance(glyph, char);
      lastGlyph = glyph;
    }

    // Advance down
    y -= lineHeight;
    x = 0;
  }

  // Compute left & right values
  var left = 0;
  if (align === "center") left = (preferredWidth - maxLineWidth) / 2;
  else if (align === "right") left = preferredWidth - maxLineWidth;
  var right = Math.max(0, preferredWidth - maxLineWidth - left);

  return {
    glyphs: glyphs,
    baseline: L / 2 + Math.abs(font.descender),
    leading: L,
    lines: lines,
    lineHeight: lineHeight,
    left: left,
    right: right,
    maxLineWidth: maxLineWidth,
    width: preferredWidth,
    height: totalHeight
  };

  function measure(text, start, end, width) {
    return computeMetrics(font, text, start, end, width, letterSpacing);
  }
}

function getRightSideBearing(glyph) {
  var glyphWidth = (glyph.xMax || 0) - (glyph.xMin || 0);
  var rsb = glyph.advanceWidth - glyph.leftSideBearing - glyphWidth;
  return rsb;
}

function computeMetrics(font, text, start, end, width, letterSpacing) {
  start = Math.max(0, start || 0);
  end = Math.min(end || text.length, text.length);
  width = width || Infinity;
  letterSpacing = letterSpacing || 0;

  var pen = 0;
  var count = 0;
  var curWidth = 0;

  for (var i = start; i < end; i++) {
    var char = text.charAt(i);

    // Tab is treated as multiple space characters
    var glyph = getGlyph(font, char);
    ensureMetrics(glyph);

    // determine kern value to next glyph
    var kerning = 0;
    if (i < end - 1) {
      var nextGlyph = getGlyph(font, text.charAt(i + 1));
      kerning += font.getKerningValue(glyph, nextGlyph);
    }

    // determine if the new pen or width is above our limit
    var xMax = glyph.xMax || 0;
    var xMin = glyph.xMin || 0;
    var glyphWidth = xMax - xMin;
    var rsb = getRightSideBearing(glyph);
    var newWidth = pen + glyph.leftSideBearing + glyphWidth + rsb;
    if (newWidth > width) {
      break;
    }

    pen += letterSpacing + getAdvance(glyph, char) + kerning;
    curWidth = newWidth;
    count++;
  }

  return {
    start: start,
    end: start + count,
    width: curWidth
  };
}

function getGlyph(font, char) {
  var isTab = char === "\t";
  return font.charToGlyph(isTab ? " " : char);
}

function getAdvance(glyph, char) {
  // TODO: handle tab gracefully
  return glyph.advanceWidth;
}

function ensureMetrics(glyph) {
  // Opentype.js only builds its paths when the getter is accessed
  // so we force it here.
  return glyph.path;
}
