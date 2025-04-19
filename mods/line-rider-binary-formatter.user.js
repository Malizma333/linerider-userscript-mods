// ==UserScript==

// @name         Binary Formatter
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Adds support for loading and saving track data to the LRB data format
// @version      0.2.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-binary-formatter.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-binary-formatter.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

/**
 * In theory, this metadata array will be populated with whatever mod manager is implemented by the core version, but
 * for now it includes all of the base definitions + definitions for web-specific features
 */
const modDirectory = [
  {name: "base.gridver", version: 0, flags: { optional: false, physics: false, camera: false, scenery: false, extra_data: true }},
  {name: "base.label", version: 0, flags: { optional: true, physics: false, camera: false, scenery: false, extra_data: true }, message: "Track label not loaded (optional)"},
  {name: "base.scnline", version: 0, flags: { optional: false, physics: false, camera: false, scenery: false, extra_data: true }},
  {name: "base.simline", version: 0, flags: { optional: false, physics: false, camera: false, scenery: false, extra_data: true }},
  {name: "base.startoffset", version: 0, flags: { optional: false, physics: false, camera: false, scenery: false, extra_data: true }},
];

const supportedMods = new Set(["base.gridver", "base.label", "base.scnline", "base.simline", "base.startoffset"]);

class LRBWriter {
  #binList = [];
  #modTableEntryLocations = {};
  #lookups = {};

  constructor() {}

  /**
     * Converts a given .track.json to an LRB file formatted as a U8 array
     */
  fromJson(jsonData) {
    this.#clearData();
    this.#constructLookups(jsonData);

    // Magic Number
    this.#pushU8(0x4C);
    this.#pushU8(0x52);
    this.#pushU8(0x42);

    // LRB Version
    this.#pushU8(0);

    // Mod Count
    this.#pushU16(modDirectory.length);

    // Mod Table
    for (const mod of modDirectory) {
      // Mod Name
      this.#pushLengthU8String(mod.name);

      // Mod Version
      this.#pushU16(mod.version);

      // Mod Flags
      this.#pushFlags([false, false, false, mod.flags.extra_data, mod.flags.scenery, mod.flags.camera, mod.flags.physics, mod.flags.optional]);

      // Mod Data Address
      if (mod.flags.extra_data) {
        this.#modTableEntryLocations[mod.name] = BigInt(this.#binList.length);

        // Allocate space for data address information
        this.#pushU64(0n);
        this.#pushU64(0n);
      }

      // Mod Optional Message
      if (mod.flags.optional) {
        this.#pushLengthU8String(mod.message);
      }
    }

    for (const mod of modDirectory) {
      const sectionPointer = BigInt(this.#binList.length);

      switch (mod.name) {
      case "base.gridver": {
        /**
                     * grid version: U8 = the grid algorithm version used by the track
                     */

        const version = jsonData.trackData.version || "6.2";
        const versionNum = {"6.2": 0, "6.1": 1, "6.0": 2}[version];
        this.#pushU8(versionNum);

        break;
      }
      case "base.label": {
        /**
                     * label: string = the track's label
                     */

        const label = jsonData.trackData.label || "";
        this.#pushLengthU16String(label);

        break;
      }
      case "base.scnline": {
        /**
                     * count: U32 = the amount of lines written
                     * lines: scnline[count] = [
                     *   id: u32 = the line's ID
                     *   x1: f64 = the x position of the 1st point
                     *   y1: f64 = the y position of the 1st point
                     *   x2: f64 = the x position of the 2nd point
                     *   y2: f64 = the y position of the 2nd point
                     * ]
                     */

        this.#pushU32(this.#lookups.sceneryLines.length);

        for (const sceneryLine of this.#lookups.sceneryLines) {
          this.#pushU32(sceneryLine.id);
          this.#pushF64Array([sceneryLine.x1, sceneryLine.y1, sceneryLine.x2, sceneryLine.y2]);
        }

        break;
      }
      case "base.simline": {
        /**
                     * count: U32 = the amount of lines written
                     * lines: simline[count] = [
                     *   id: u32 = the line's ID
                     *   flags: u8 = Line flags 0000DCBA
                     *   x1: f64 = the x position of the 1st point
                     *   y1: f64 = the y position of the 1st point
                     *   x2: f64 = the x position of the 2nd point
                     *   y2: f64 = the y position of the 2nd point
                     * ]
                     * Line flag defs: A = Red line, B = inverted, C = left extension, D = right extension
                     */

        this.#pushU32(this.#lookups.simLines.length);

        for (const simLine of this.#lookups.simLines) {
          this.#pushU32(simLine.id);
          this.#pushFlags([false, false, false, false, simLine.rightExtended, simLine.leftExtended, simLine.flipped, simLine.type === 1]);
          this.#pushF64Array([simLine.x1, simLine.y1, simLine.x2, simLine.y2]);
        }

        break;
      }
      case "base.startoffset": {
        /**
                     * X: F64 = the X coordinate of the start offset
                     * Y: F64 = the Y coordinate of the start offset (remember +Y is down)
                     */

        this.#pushF64Array([jsonData.trackData.startPosition.x, jsonData.trackData.startPosition.y]);

        break;
      }
      }

      const sectionLength = BigInt(this.#binList.length) - sectionPointer;
      this.#writeModEntryPointer(mod.name, sectionPointer, sectionLength);
    }

    return this.#retrieveU8Array();
  }

  #pushU8(x) {
    this.#binList.push(x);
  }

  #pushU16(x) {
    this.#binList.push(0xFF & x);
    this.#binList.push(x >> 8);
  }

  #pushU32(x) {
    for (let i = 0; i < 4; i++) {
      this.#binList.push(0xFF & (x >> (8 * i)));
    }
  }

  #pushU64(x) {
    if (typeof x !== "bigint") {
      throw new Error("[pushU64] argument must be BigInteger!");
    }

    for (let i = 0n; i < 8n; i++) {
      this.#binList.push(Number(0xFFn & (x >> (8n * i))));
    }
  }

  /**
     * Writes the char codes of a fixed length string. Note that, while charCodeAt supports
     * UTF-16 values, we're only considering single byte length chars.
     */
  #pushFixedString(string) {
    for (let i = 0; i < string.length; i++) {
      this.#pushU8(string.charCodeAt(i));
    }
  }

  /**
     * Pushes the (U8) length of the string before pushing the string itself
     */
  #pushLengthU8String(string) {
    this.#pushU8(string.length);
    this.#pushFixedString(string);
  }

  /**
     * Pushes the (U16) length of the string before pushing the string itself
     */
  #pushLengthU16String(string) {
    this.#pushU16(string.length);
    this.#pushFixedString(string);
  }

  /**
     * Pushes the (U32) length of the string before pushing the string itself
     */
  #pushLengthU32String(string) { // TODO: Unused
    this.#pushU32(string.length);
    this.#pushFixedString(string);
  }

  /**
     * Writes a list of double precision floating point values, since we're often writing more than one at a time
     */
  #pushF64Array(arr) {
    const floatArray = new Float64Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
      floatArray[i] = arr[i];
    }

    const byteArray = new Uint8Array(floatArray.buffer);
    for(let i = 0; i < byteArray.length; i++) {
      this.#pushU8(byteArray[i]);
    }
  }

  /**
     * Writes a list of boolean flags to a single U8, where the first flag in the list is the highest significant bit
     */
  #pushFlags(flagArray) {
    if (flagArray.length !== 8) {
      throw new Error("[writeFlags] flagArray was invalid length!");
    }

    let flagInt = 0;
    for (let i = 0; i < 8; i++) {
      flagInt <<= 1;
      if (flagArray[i]) {
        flagInt += 1;
      }
    }

    this.#pushU8(flagInt);
  }

  /**
     * Pushes a boolean value to a full byte space
     */
  #pushBoolean(boolean) { // TODO: Unused
    if (boolean) {
      this.#binList.push(1);
    } else {
      this.#binList.push(0);
    }
  }

  /**
     * Writes mod data address information to the appropriate place in the mod table
     * TODO: This should utilize BigIntegers/U64s when writing a full implementataion
     */
  #writeModEntryPointer(modName, entryPointer, entryLength) {
    const index = this.#modTableEntryLocations[modName];
    for (let i = 0n; i < 8n; i++) {
      this.#binList[index + i] = Number(0xFFn & (entryPointer >> (8n * i)));
      this.#binList[index + 8n + i] = Number(0xFFn & (entryLength >> (8n * i)));
    }
  }

  /**
     * Convert the Number[] binList to a Uint8Array and return it
     */
  #retrieveU8Array() {
    const size = this.#binList.length;
    const binData = new Uint8Array(size);

    for(let i = 0; i < size; i++) {
      binData[i] = this.#binList[i];
    }

    return binData;
  }

  /**
     * Reset computed data and lookup tables
     */
  #clearData() {
    this.#binList = [];
    this.#modTableEntryLocations = {};
    this.#lookups = {};
  }

  /**
     * Creates lookups ahead of time for lines, line ids, and layer ids to break out among various mods
     */
  #constructLookups(jsonData) {
    this.#lookups = {
      simLines: [],
      sceneryLines: [],
      multipliers: [],
      simLayerIds: [],
      scnLayerIds: [],
    };

    for (const line of jsonData.lines) {
      if (line.type === 2) {
        this.#lookups.sceneryLines.push(line);
        this.#lookups.scnLayerIds.push(line.layer || 0);
      } else {
        if (line.type === 1) {
          this.#lookups.multipliers.push(line.multiplier || 1);
        }
        this.#lookups.simLines.push(line);
        this.#lookups.simLayerIds.push(line.layer || 0);
      }
    }
  }
};

/**
 * The "consume" functions in this class are written with the side effect of modifying the current index
 * in the file view. Maybe there's a better way to do this?
 */
class LRBParser {
  #view = null;
  #viewPointer = 0;

  constructor() {}

  /**
     * Converts a given LRB to a .track.json file formatted as an object
     */
  toJson(binData) {
    this.#view = new Uint8Array(binData);
    this.#viewPointer = 0;
    let newTrack = {
      "version": "6.2",
      "startPosition": { "x": 0, "y": 0 },
      "label": "",
      "creator": "",
      "description": "",
      "duration": 1200,
      "layers": [],
      "lines": [],
      "riders": [],
      "script": ""
    };
    let modAddressOffsets = {};

    // File type check
    const magicNumber = this.#consumeFixedString(3);
    if (magicNumber !== "LRB") {
      throw new Error("Invalid LRB File!");
    }

    // Version
    const fileVersion = this.#consumeU8();

    console.info(`Loading LRB v${fileVersion}`);

    const numMods = this.#consumeU16();

    // Mod Table
    for (let modIndex = 0; modIndex < numMods; modIndex++) {
      // Mod Name
      const modName = this.#consumeLengthU8String();

      // Mod Version
      const modVersion = this.#consumeU16();

      console.info(`Loading mod ${modName} v${modVersion}`);

      // Mod Flags
      // 0 0 0 extra_data scenery camera physics optional
      const modFlags = this.#consumeFlags();

      // Mod Data Address
      if (modFlags[3]) {
        const offset = this.#consumeU64();
        const length = this.#consumeU64();
        modAddressOffsets[modName] = [offset, length];
      }

      // Check if mod is supported
      let supported = supportedMods.has(modName);

      let optionalMessage = "";
      if (modFlags[7]) {
        optionalMessage = this.#consumeLengthU8String();
      }

      if (!supported) {
        console.warn("This mod is not supported.");
        if (modFlags[4]) {
          console.warn("Ignoring it may affect scenery rendering.");
        }
        if (modFlags[5]) {
          console.warn("Ignoring it may affect camera functionality.");
        }
        if (modFlags[6]) {
          console.warn("Ignoring it may affect track physics.");
        }
        if (modFlags[7]) {
          console.warn(optionalMessage);
        } else {
          throw new Error(`Required mod ${modName} was not supported`);
        }
      }
    }

    for (const modName of Object.keys(modAddressOffsets)) {
      // Just set the view pointer to the index of the mod's extra data.
      // TODO: Extra data length is unused
      // TODO: This should use BigInteger/U64
      this.#viewPointer = Number(modAddressOffsets[modName][0]);

      // Extra Mod Data
      switch (modName) {
      case "base.gridver": {
        const versionNum = this.#consumeU8();
        newTrack.version = ["6.2", "6.1", "6.0"][versionNum];
        break;
      }
      case "base.label": {
        newTrack.label = this.#consumeLengthU16String();
        break;
      }
      case "base.scnline": {
        const numLines = this.#consumeU32();
        for (let i = 0; i < numLines; i++) {
          const id = this.#consumeU32();
          const [x1, y1, x2, y2] = this.#consumeF64Array(4);

          newTrack.lines.push({
            "id": id,
            "type": 2,
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2
          });
        }

        break;
      }
      case "base.simline": {
        const numLines = this.#consumeU32();
        for (let i = 0; i < numLines; i++) {
          const id = this.#consumeU32();
          // 0 0 0 0 rightExtended leftExtended flipped red
          const lineFlags = this.#consumeFlags();
          const [x1, y1, x2, y2] = this.#consumeF64Array(4);

          newTrack.lines.push({
            "id": id,
            "type": lineFlags[7] ? 1 : 0,
            "flipped": lineFlags[6],
            "leftExtended": lineFlags[5],
            "rightExtended": lineFlags[4],
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2
          });
        }

        break;
      }
      case "base.startpos": {
        const [x, y] = this.#consumeF64Array(2);
        newTrack.startPosition = {"x": x, "y": y};
        break;
      }
      default: break;
      }
    }

    return newTrack;
  }

  /**
     * Consumes a single byte into a number
     * @returns {Number}
     */
  #consumeU8() {
    const x = this.#view[this.#viewPointer];
    this.#viewPointer += 1;
    return x;
  }

  /**
     * Consumes two bytes into a number
     * @returns {Number}
     */
  #consumeU16() {
    const x = (this.#view[this.#viewPointer + 1] << 8) | this.#view[this.#viewPointer];
    this.#viewPointer += 2;
    return x;
  }

  /**
     * Consumes four bytes into a number
     * @returns {Number}
     */
  #consumeU32() {
    let x = 0;
    let bytes = [];

    for (let i = 0; i < 4; i++) {
      bytes.push(this.#view[this.#viewPointer]);
      this.#viewPointer += 1;
    }

    for (let i = 0; i < 4; i++) {
      x <<= 8;
      x |= bytes.pop();
    }

    return x;
  }

  /**
     * Consumes eight bytes into a BigInteger
     * @returns {BigInt}
     */
  #consumeU64() {
    let x = 0n;
    let bytes = [];

    for (let i = 0; i < 8; i++) {
      bytes.push(this.#view[this.#viewPointer]);
      this.#viewPointer += 1;
    }

    for (let i = 0; i < 8; i++) {
      x <<= 8n;
      x |= BigInt(bytes.pop());
    }

    return x;
  }

  /**
     * Consumes a fixed UTF-8 string of a given length
     * @param {number} length Length of the fixed string, in bytes
     * @returns {string}
     */
  #consumeFixedString(length) {
    let string = [];

    for (let i = 0; i < length; i++) {
      string.push(this.#consumeU8());
    }

    return String.fromCharCode(...string);
  }

  /**
     * Consumes a string prefixed with the U8 length
     * @returns {string}
     */
  #consumeLengthU8String() {
    const length = this.#consumeU8();
    return this.#consumeFixedString(length);
  }

  /**
     * Consumes a string prefixed with the U16 length
     * @returns {string}
     */
  #consumeLengthU16String(string) {
    const length = this.#consumeU16();
    return this.#consumeFixedString(length);
  }

  /**
     * Consumes a string prefixed with the U32 length
     * @returns {string}
     */
  #consumeLengthU32String(string) { // TODO: Unused
    const length = this.#consumeU32();
    return this.#consumeFixedString(length);
  }

  /**
     * Consumes a list of double-precision floats into a list of numbers
     * @param {number} length Count of floats to consume into the array
     * @returns {Number[]}
     */
  #consumeF64Array(length) {
    const byteArray = new Uint8Array(length * 8);
    for(let i = 0; i < byteArray.length; i++) {
      byteArray[i] = this.#consumeU8();
    }

    const floatArray = new Float64Array(byteArray.buffer);
    let floatList = [];
    for (let i = 0; i < length; i++) {
      floatList.push(floatArray[i]);
    }

    return floatList;
  }

  /**
     * Consumes a boolean array of flags from a byte
     * @returns {boolean[]}
     */
  #consumeFlags() {
    let flagsIntValue = this.#consumeU8();
    let flags = [];

    for (let i = 0; i < 8; i++) {
      flags.push(flagsIntValue & 1 === 1);
      flagsIntValue >>= 1;
    }

    flags.reverse();

    return flags;
  }

  /**
     * Consumes a single boolean value from a byte
     * @returns {boolean}
     */
  #consumeBoolean() { // TODO: Unused
    const boolIntValue = this.#consumeU8();
    return boolIntValue === 1;
  }
};

function main () {
  const {
    React,
    store
  } = window;

  const e = React.createElement;

  class BinaryFormatterModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false
      };

      this.writer = new LRBWriter();
      this.parser = new LRBParser();
    }

    onFileChange () {
      return new Promise((resolve) => {
        const file = event.target.files[0];
        const fileReader = new FileReader();
        if (file == null) return;

        fileReader.fileName = event.target.files[0].name;
        fileReader.onloadend = () => {
          resolve(fileReader.result);
        };
        fileReader.readAsArrayBuffer(file);
      });
    }

    onSave () {
      try {
        const binData = this.writer.fromJson({
          trackData: store.getState().trackData,
          layers: store.getState().simulator.engine.engine.state.layers.toArray(),
          lines: store.getState().simulator.engine.linesList.toArray(),
          duration: store.getState().player.maxIndex,
        });
        const a = document.createElement("a");
        const blob = new Blob([binData], {type: "octet/stream"});
        const url = window.URL.createObjectURL(blob);
        const name = store.getState().trackData.label || "new_track";
        a.href = url;
        a.download = `${name}.LRB`;
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (e) {
        console.error(`Failed to write: ${e.message}`);
      }
    }

    onLoad () {
      this.onFileChange().then(result => {
        const track = this.parser.toJson(result);
        const a = document.createElement("a");
        const url = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(track));
        const name = track.label;
        a.href = url;
        a.download = `${name}.track.json`;
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }).catch(err => {
        console.error(`Failed to load: ${err.message}`);
      });
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false });
      } else {
        this.setState({ active: true });
      }
    }

    render () {
      return e(
        "div",
        null,
        this.state.active && e(
          "div",
          { style: { display: "flex", flexDirection: "column" } },
          e(
            "div",
            { style: { display: "flex", flexDirection: "row", alignItems: "center" } },
            "Load",
            e("input", { type: "file", onChange: () => this.onLoad() })
          ),
          e("button", { style: { width: "3em" }, onClick: () => this.onSave() }, "Save")
        ),
        e(
          "button",
          {
            style: { backgroundColor: this.state.active ? "lightblue" : null },
            onClick: this.onActivate.bind(this)
          },
          "Binary Formatter"
        )
      );
    }
  }

  window.registerCustomSetting(BinaryFormatterModComponent);
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
