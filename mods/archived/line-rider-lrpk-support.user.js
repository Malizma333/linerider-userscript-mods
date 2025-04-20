// ==UserScript==

// @name         LRPK Support
// @namespace    https://www.linerider.com/
// @author       Tobias Bessler
// @description  Adds support for loading and saving track data to the LRPK compressed data format
// @version      0.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL
// @updateURL
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

// Credit to https://github.com/kevansevans/OpenLR/wiki/The-LRPK-Format for the formatting specifications

/*
{
  "label": "",
  "creator": "",
  "description": "",
  "duration": 1200,
  "version": "6.2",
  "startPosition": {"x": 0,"y": 0},
  "riders": [
    {"startPosition":{"x":0,"y":0},"startVelocity":{"x":0.4,"y":0},"startAngle":0}
  ],
  "layers": [{"id": 0,"name": "Base Layer","visible": true,"editable": true}],
  "script": "",
  "lines": [
    {"id": 1,"type": 0,"x1": 0,"y1": 0,"x2": 0,"y2": 1, "flipped": false, "leftExtended": false, "rightExtended": false},
    {"id": 2,"type": 1,"x1": 0,"y1": 0,"x2": 0,"y2": 1, "flipped": false, "leftExtended": false, "rightExtended": false, "multiplier": 1},
    {"id": 3,"type": 2,"x1": 0,"y1": 0,"x2": 0,"y2": 1}
  ]
}
*/

function main () {
  const {
      React,
      store
  } = window;

  const versionLabel = document.querySelector("span[title=\"production_browser_cold_latest\"]");

  const e = React.createElement;

  class LRPK_IO {
      constructor() {
          this.c = Object.freeze({
              MAGIC_NUM: 0x4C52504B,
              HEAD_SIZE: 12,
          });
      }

      getSourceRevision() {
          let versionString = versionLabel.firstElementChild.innerHTML;
          let versionNum = parseInt(versionString.split('.')[0]);

          return versionNum;
      }

      getDirList(data) {
          const dirMap = [
              ["VERSINFO", 0],
              ["TRACKDEF", 0],
              ["LINEDEF ", 0],
              ["LINEDECO", 0],
              ["RIDERDEF", 0],
              ["LINESPEC", 0],
              ["METADATA", 0],
              ["LAYERDEF", 0],
              ["SCRPTDEF", 0]
          ];

          dirMap[0][1] += this.c.HEAD_SIZE;
          dirMap[0][1] += dirMap.length * 16;

          dirMap[1][1] += 6;

          for(let i = 1; i < dirMap.length; i++) {
              dirMap[i][1] += dirMap[i-1][1];
          }

          return dirMap;
      }

      saveTo(jsonData) {
          const SAVE_SIZE = 4096;
          const binData = new Uint8Array(SAVE_SIZE);
          const store4Byte = (val, off) => {
              binData[off] = (val >> 24) & 0xFF;
              binData[off+1] = (val >> 16) & 0xFF;
              binData[off+2] = (val >> 8) & 0xFF;
              binData[off+3] = val & 0xFF;
          }
          const dirList = this.getDirList(jsonData);
          let binPointer;

          // File head
          store4Byte(this.c.MAGIC_NUM, 0);
          store4Byte(dirList.length, 4);
          store4Byte(this.c.HEAD_SIZE, 8);

          for(let i = 0; i < dirList.length; i++) {
              // Store each directory name and pointer
              binPointer = this.c.HEAD_SIZE + i * 16;
              let dirName = dirList[i][0];
              let dirPointer = dirList[i][1];
              let dirPointerStart = dirPointer & 0xFFFF;
              let dirPointerEnd = dirPointer >> 16;
              let dirNameStart, dirNameEnd = 0;

              for(let j = 0; j < 4; j++) {
                  dirNameStart <<= 8;
                  dirNameEnd <<= 8;
                  dirNameStart += dirName.charCodeAt(j);
                  dirNameEnd += dirName.charCodeAt(j+4);
              }

              store4Byte(dirNameStart, binPointer);
              store4Byte(dirNameEnd, binPointer + 4);
              store4Byte(dirPointerStart, binPointer + 8);
              store4Byte(dirPointerEnd, binPointer + 12);
          }

          // VERSINFO
          binPointer = dirList[0][1];
          binData[binPointer] = 0x00; // Not dev save
          binData[binPointer+1] = 0x02; // Line Rider Web
          binData[binPointer+2] = 0xFF; // No library version
          binData[binPointer+3] = 0x01; // Normal save type
          const source = this.getSourceRevision();
          binData[binPointer+4] = source >> 8;
          binData[binPointer+5] = source & 0xFF;

          // TRACKDEF
          binPointer = dirList[1][1];
          binData[binPointer] = jsonData.label.length;
          for(let i = 0; i < jsonData.label.length; i++) {
              binData[binPointer + 1 + i] = jsonData.label.charCodeAt(i);
          }
          binPointer += 1 + jsonData.label.length;

          binData[binPointer] = jsonData.creator.length;
          for(let i = 0; i < jsonData.creator.length; i++) {
              binData[binPointer + 1 + i] = jsonData.creator.charCodeAt(i);
          }
          binPointer += 1 + jsonData.creator.length;

          binData[binPointer] = 0x02;

          return binData;
      }

      loadFrom(binData) {
          return {
              startPosition: { x: 0, y: 0 },
              version: "6.2",
              riders: [
                  {startPosition: {x: 0, y: 0}, startVelocity: {x: 0.4, y: 0}},
                  {startPosition: {x: 0, y: 30}, startVelocity: {x: 0.4, y: 0}}
              ]
          };
      }
  }

  class LRPKModComponent extends React.Component {
      constructor (props) {
          super(props);

          this.state = {
              active: false
          };

          this.lrpk_io = new LRPK_IO();
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
              fileReader.readAsDataURL(file);
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
                  null,
                  "Load File",
                  e(
                      "input",
                      {
                          type: "file",
                          onChange: () => this.onFileChange().then(result => {
                              store.dispatch({
                                  type: "LOAD_TRACK",
                                  payload: this.lrpk_io.loadFrom(result)
                              });
                          }).catch(err => {
                              console.error(err.message);
                          })
                      }
                  ),
                  e(
                      "button",
                      {
                          onClick: () => {
                              const binData = this.lrpk_io.saveTo(store.getState().trackData);
                              const a = document.createElement("a");
                              const blob = new Blob([binData], {type: "octet/stream"});
                              const url = window.URL.createObjectURL(blob);
                              a.href = url;
                              let name = store.getState().trackData.label;
                              if(name === "") name = "new_track";
                              a.download = `${name}.LRPK`;
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(url);
                          }
                      },
                      "Save"
                  )
              ),
              e(
                  "button",
                  {
                      style: { backgroundColor: this.state.active ? "lightblue" : null },
                      onClick: this.onActivate.bind(this)
                  },
                  "LRPK"
              )
          );
      }
  }

  window.registerCustomSetting(LRPKModComponent);
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
