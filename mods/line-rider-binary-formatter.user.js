// ==UserScript==

// @name         Binary Formatter
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Adds support for loading and saving track data to the LRB data format
// @version      0.1.1
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-binary-formatter.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-binary-formatter.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

function main () {
    const {
        React,
        store
    } = window;

    const e = React.createElement;

    function saveToBin(jsonData) {
        /*
        In theory, this metadata array will be populated with whatever mod manager is implemented by the core version, but
        for now it includes all of the base definitions + definitions for web-specific features
        */
        const mods = [
            {name: "base.simline", version: 0, numSections: 1, optional: false},
            {name: "base.redmult", version: 0, numSections: 1, optional: false},
            {name: "base.scnline", version: 0, numSections: 1, optional: false},
            {name: "base.gridver", version: 0, numSections: 1, optional: false},
            {name: "web.script", version: 0, numSections: 1, optional: true, msg: "Scripts are web-only"},
            {name: "web.layers", version: 0, numSections: 3, optional: true, msg: "Layers are web-only"},
            {name: "web.riders", version: 0, numSections: 1, optional: true, msg: "Riders are web-only"},
            {name: "web.duration", version: 0, numSections: 1, optional: true, msg: "Duration is web-only"},
            {name: "web.details", version: 0, numSections: 3, optional: true, msg: "Details are web-only"},
            {name: "web.startpos", version: 0, numSections: 1, optional: true, msg: "Start position is web-only"}
        ]

        const binArray = []

        const writeSectionEntry = (index, sectionPointer, sectionLength) => {
            for (let i = 3; i >= 0; i--) {
                binArray[index + 3 - i] = (0xFF & (sectionPointer >> (8 * i)))
                binArray[index + 7 - i] = (0xFF & (sectionLength >> (8 * i)))
            }
        }

        const pushFloats = (arr) => {
            const floatArray = new Float64Array(arr.length)
            for (let i = 0; i < arr.length; i++) {
                floatArray[i] = arr[i]
            }

            const byteArray = new Uint8Array(floatArray.buffer)
            for(let i = 0; i < byteArray.length; i++) {
                binArray.push(byteArray[i])
            }
        }

        const pushU_X = (n, x) => {
            if (x > 32) {
                console.error(`${x}bit is too large for bit ops!`)
                return
            }

            if (x !== 8 && x !== 16 && x !== 32) {
                console.error(`Invalid option ${x}`)
                return
            }

            for (let i = (x >> 3) - 1; i >= 0; i--) {
                binArray.push(0xFF & (n >> (8 * i)))
            }
        }

        let simLines = []
        let sceneryLines = []
        let multipliers = []
        let simLayerIds = []
        let scnLayerIds = []

        for (const line of jsonData.lines) {
            if (line.type == 2) {
                sceneryLines.push(line)
                scnLayerIds.push(line.layer || 0)
            } else {
                if (line.type == 1) {
                    multipliers.push(line.multiplier || 1)
                }
                simLines.push(line)
                simLayerIds.push(line.layer || 0)
            }
        }
        
        // LRB Magic Number
        binArray.push(0x4C)
        binArray.push(0x52)
        binArray.push(0x42)

        // LRB Version 0
        binArray.push(0x00)

        // Mod Count
        const count = mods.length
        pushU_X(count, 16)

        const sectionPointerDict = {}

        // Mod Table
        for (const mod of mods) {
            // Mod Name
            binArray.push(mod.name.length)
            for(let i = 0; i < mod.name.length; i++) {
                binArray.push(mod.name.charCodeAt(i))
            }

            // Mod Version
            pushU_X(mod.version, 16)
            
            // Mod Section Table
            binArray.push(mod.numSections)
            sectionPointerDict[mod.name] = binArray.length

            for (let i = 0; i < mod.numSections * 8; i++) { // Allocate space for numSections x 2 x U32 values
                binArray.push(0);
            }

            // Mod Optional Info
            if (!mod.optional) {
                binArray.push(0)
            } else {
                binArray.push(1)
                binArray.push(mod.msg.length)
                for(let i = 0; i < mod.msg.length; i++) {
                    binArray.push(mod.msg.charCodeAt(i))
                }
            }
        }

        for(const mod of mods) {
            let sectionPointer

            switch (mod.name) {
                case "web.script": {
                    /*
                    Section 1
                    Length: U32 = Length of the script string
                    Script: utf8[Length] = Script string
                    */
                    let { script } = jsonData.trackData

                    script = script || ""

                    sectionPointer = binArray.length

                    pushU_X(script.length, 32)
                    for(let i = 0; i < script.length; i++) {
                        pushU_X(script.charCodeAt(i), 8)
                    }

                    writeSectionEntry(sectionPointerDict[mod.name], sectionPointer, binArray.length - sectionPointer)
                    break
                }
                case "web.startpos": {
                    /*
                    Section 1
                    X: F64 = The x value of the start position
                    Y: F64 = The y value of the start position
                    */
                    const { startPosition } = jsonData.trackData

                    sectionPointer = binArray.length

                    pushFloats([startPosition.x, startPosition.y])

                    writeSectionEntry(sectionPointerDict[mod.name], sectionPointer, binArray.length - sectionPointer)
                    break
                }
                case "web.details": {
                    /*
                    Section 1
                    Length: U32 = Length of the label string
                    Label: utf8[Length] = Track label string

                    Section 2
                    Length: U32 = Length of the creator string
                    Creator: utf8[Length] = Track creator string

                    Section 3
                    Length: U32 = Length of the description string
                    Description: utf8[Length] = Track description string
                    */
                    let { label, creator, description } = jsonData.trackData

                    label = label || ""
                    creator = creator || ""
                    description = description || ""
                    
                    sectionPointer = binArray.length

                    pushU_X(label.length, 32)
                    for(let i = 0; i < label.length; i++) {
                        pushU_X(label.charCodeAt(i), 8)
                    }

                    writeSectionEntry(sectionPointerDict[mod.name], sectionPointer, binArray.length - sectionPointer)

                    sectionPointer = binArray.length

                    pushU_X(creator.length, 32)
                    for(let i = 0; i < creator.length; i++) {
                        pushU_X(creator.charCodeAt(i), 8)
                    }

                    writeSectionEntry(sectionPointerDict[mod.name] + 8, sectionPointer, binArray.length - sectionPointer)

                    sectionPointer = binArray.length

                    pushU_X(description.length, 32)
                    for(let i = 0; i < description.length; i++) {
                        pushU_X(description.charCodeAt(i), 8)
                    }

                    writeSectionEntry(sectionPointerDict[mod.name] + 16, sectionPointer, binArray.length - sectionPointer)
                    break
                }
                case "web.duration": {
                    /*
                    Section 1
                    Duration: U32 = The track duration
                    */
                    let { duration } = jsonData

                    duration = duration || 1200

                    sectionPointer = binArray.length

                    pushU_X(duration, 32)

                    writeSectionEntry(sectionPointerDict[mod.name], sectionPointer, binArray.length - sectionPointer)
                    break
                }
                case "base.gridver": {
                    /*
                    Section 1
                    GridVersion: U8 = Version of grid algorithm
                    */
                    let version = jsonData.trackData.version || "6.2"
                    let versionNum = {"6.0": 0, "6.1": 1, "6.2": 2}[version]

                    sectionPointer = binArray.length

                    pushU_X(versionNum, 8)

                    writeSectionEntry(sectionPointerDict[mod.name], sectionPointer, binArray.length - sectionPointer)
                    break
                }
                case "web.riders": {
                    /*
                    Section 1
                    Count: U8 = Number of riders
                    Riders: rider[Count] = Rider array

                    Rider Def
                    X: F64 = Start position x
                    Y: F64 = Start position y
                    VX: F64 = Start velocity x
                    VY: F64 = Start velocity y
                    A: F64 = Start angle
                    Remount flag: U8 = 0000000R (R = Remountable)
                    */

                    let { riders } = jsonData.trackData

                    riders = riders || []

                    sectionPointer = binArray.length

                    pushU_X(riders.length, 8)

                    for(let i = 0; i < riders.length; i++) {
                        pushFloats([riders[i].startPosition.x, riders[i].startPosition.y, riders[i].startVelocity.x, riders[i].startVelocity.y, riders[i].startAngle || 0])
                        let rFlag = riders[i].remountable ? 1 : 0
                        pushU_X(rFlag, 8)
                    }

                    writeSectionEntry(sectionPointerDict[mod.name], sectionPointer, binArray.length - sectionPointer)
                    break
                }
                case "web.layers": {
                    /*
                    Section 1
                    Count: U16 = Number of layers
                    Layers: layer[Count] = Layer array

                    Layer Def
                    id: U16 = Layer ID
                    Name length: U8 = Length of layer name
                    Name: utf-8 string of length [Name length] = Layer name string
                    Flags: u8 = 000000AB (A = Layer is visible, B = Layer is editable)

                    Section 2
                    Count: U32 = Number of simulation lines
                    ID Array: U16[Count] = Id of layer that this simulation line is on.

                    Section 3
                    Count: U32 = Number of scenery lines
                    ID Array: U16[Count] = Id of layer that this scenery line is on.
                    */

                    let { layers } = jsonData

                    layers = layers || []

                    sectionPointer = binArray.length

                    pushU_X(layers.length, 16)

                    for(let i = 0; i < layers.length; i++) {
                        pushU_X(layers[i].id, 16)
                        pushU_X(layers[i].name.length, 8)

                        for (let j = 0; j < layers[i].name.length; j++) {
                            pushU_X(layers[i].name.charCodeAt(j), 8)
                        }

                        let vFlag = layers[i].visible ? 1 : 0
                        let eFlag = layers[i].editable ? 1 : 0

                        pushU_X((vFlag << 1) | (eFlag), 8)
                    }

                    writeSectionEntry(sectionPointerDict[mod.name], sectionPointer, binArray.length - sectionPointer)

                    sectionPointer = binArray.length

                    pushU_X(simLayerIds.length, 32)
                    for (let i = 0; i < simLayerIds.length; i++) {
                        pushU_X(simLayerIds[i], 16)
                    }

                    writeSectionEntry(sectionPointerDict[mod.name] + 8, sectionPointer, binArray.length - sectionPointer)

                    sectionPointer = binArray.length

                    pushU_X(scnLayerIds.length, 32)
                    for (let i = 0; i < scnLayerIds.length; i++) {
                        pushU_X(scnLayerIds[i], 16)
                    }

                    writeSectionEntry(sectionPointerDict[mod.name] + 16, sectionPointer, binArray.length - sectionPointer)
                    break
                }
                case "base.scnline": {
                    /*
                    Section 1
                    Count: U32 = Number of scenery lines
                    Lines: SceneryLine[Count] = Layer array

                    SceneryLine Def
                    id: U32 = Line ID
                    x1: F64 = First x point of line
                    y1: F64 = First y point of line
                    x2: F64 = Second x point of line
                    y2: F64 = Second y point of line
                    */

                    sectionPointer = binArray.length

                    pushU_X(sceneryLines.length, 32)

                    for(let i = 0; i < sceneryLines.length; i++) {
                        pushU_X(sceneryLines[i].id, 32)
                        pushFloats([sceneryLines[i].x1, sceneryLines[i].y1, sceneryLines[i].x2, sceneryLines[i].y2])
                    }

                    writeSectionEntry(sectionPointerDict[mod.name], sectionPointer, binArray.length - sectionPointer)
                    break
                }
                case "base.redmult": {
                    /*
                    Section 1
                    Count: U32 = Number of red lines
                    Multipliers: F64[Count] = Array of red multipliers
                    */

                    sectionPointer = binArray.length

                    pushU_X(multipliers.length, 32)
                    pushFloats(multipliers)

                    writeSectionEntry(sectionPointerDict[mod.name], sectionPointer, binArray.length - sectionPointer)
                    break
                }
                case "base.simline": {
                    /*
                    Section 1
                    Count: U32 = Number of simulation lines
                    Lines: SimLine[Count] = Array of simulation lines

                    SimLine Def
                    id: u32 = Line ID
                    Flags: u8 = 0000ABCD (A = Accel line type, B = Line is flipped, C = Left extension, D = Right extension)
                    x1: F64 = First x point of line
                    y1: F64 = First y point of line
                    x2: F64 = Second x point of line
                    y2: F64 = Second y point of line
                    */
                   
                    sectionPointer = binArray.length

                    pushU_X(simLines.length, 32)
                    for(let i = 0; i < simLines.length; i++) {
                        pushU_X(simLines[i].id, 32)

                        let tFlag = simLines[i].type
                        let fFlag = simLines[i].flipped
                        let lFlag = simLines[i].leftExtended
                        let rFlag = simLines[i].rightExtended

                        pushU_X((tFlag << 3) | (fFlag << 2) | (lFlag << 1) | (rFlag), 8)

                        pushFloats([simLines[i].x1, simLines[i].y1, simLines[i].x2, simLines[i].y2])
                    }

                    writeSectionEntry(sectionPointerDict[mod.name], sectionPointer, binArray.length - sectionPointer)
                    break
                }
                default: break
            }
        }

        // Writing to binary array
        const size = binArray.length

        console.log(`${(size / 4294967295).toFixed(1)}% capacity`)

        const binData = new Uint8Array(size)
        for(let i = 0; i < size; i++) {
            binData[i] = binArray[i]
        }

        return binData
    }

    function loadFromBin(binData) {
        const view = new Uint8Array(binData)

        // File type check
        if (!(view[0] === 0x4C && view[1] === 0x52 && view[2] === 0x42)) {
            throw new Error('Invalid LRB File!')
        }
        
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
        }

        // Header info
        const fileVersion = view[3]
        const numMods = (view[4] << 8) | view[5]

        console.log(`File Version ${fileVersion}`)

        let simLayerIds = []
        let scnLayerIds = []
        let mults = []
        let offset = 6

        // Mod data
        for (let modIndex = 0; modIndex < numMods; modIndex++) {
            // Metadata
            const modNameLength = view[offset]
            offset += 1
            let modName = []
            for (let i = 0; i < modNameLength; i++) {
                modName.push(view[offset])
                offset += 1
            }
            const modNameString = String.fromCharCode(...modName)
            const modVersion = (view[offset] << 8) | view[offset + 1]
            offset += 2
            console.log(`Loading mod ${modNameString} v${modVersion}`)

            let modSections = []

            const numSections = view[offset]
            offset += 1
            for (let i = 0; i < numSections; i++) {
                const p = (view[offset] << 24) | (view[offset+1] << 16) | (view[offset+2] << 8) | view[offset+3]
                offset += 4
                const l = (view[offset] << 24) | (view[offset+1] << 16) | (view[offset+2] << 8) | view[offset+3]
                offset += 4
                modSections.push([p, l])
            }

            const modOptional = view[offset] === 1
            offset += 1

            if (modOptional) {
                const optMsgLength = view[offset]
                offset += 1
                let optMsg = []
                for (let i = 0; i < optMsgLength; i++) {
                    optMsg.push(view[offset])
                    offset += 1
                }
                const optMsgString = String.fromCharCode(...optMsg)
                console.warn(`Warning: ${optMsgString}`)
            }

            // Section Data
            for (let sectionIndex = 0; sectionIndex < numSections; sectionIndex++) {
                const [secOffset, secLength] = modSections[sectionIndex]
                let secViewArr = []
                for (let i = 0; i < secLength; i++) {
                    secViewArr.push(view[secOffset + i])
                }
                const secView = new Uint8Array(secViewArr)

                switch (modNameString) {
                    case "web.script": {
                        const scriptLength = (secView[0] << 24) | (secView[1] << 16) | (secView[2] << 8) | secView[3]
                        let script = []
                        for (let i = 0; i < scriptLength; i++) {
                            script.push(secView[i + 4])
                        }
                        newTrack.script = String.fromCharCode(...script)
                        break
                    }
                    case "web.startpos": {
                        const floatView = new Float64Array(secView.buffer)
                        newTrack.startPosition = {"x": floatView[0], "y": floatView[1]}
                        break
                    }
                    case "web.details": {
                        const detailLength = (secView[0] << 24) | (secView[1] << 16) | (secView[2] << 8) | secView[3]
                        let detail = []
                        for (let i = 0; i < detailLength; i++) {
                            detail.push(secView[i + 4])
                        }
                        const detailString = String.fromCharCode(...detail)

                        if (sectionIndex == 0) {
                            newTrack.label = detailString
                        } else if (sectionIndex == 1) {
                            newTrack.creator = detailString
                        } else {
                            newTrack.description = detailString
                        }
                        break
                    }
                    case "web.duration": {
                        newTrack.duration = (secView[0] << 24) | (secView[1] << 16) | (secView[2] << 8) | secView[3]
                        break
                    }
                    case "base.gridver": {
                        const versionNum = secView[0]
                        const version = ["6.0", "6.1", "6.2"][versionNum]
                        newTrack.version = version
                        break
                    }
                    case "web.riders": {
                        const numRiders = secView[0]
                        for (let i = 0; i < numRiders; i++) {
                            const innerOffset = 1 + i * 41
                            let partial = new Uint8Array(40)

                            for (let j = 0; j < 40; j++) {
                                partial[j] = secView[innerOffset + j]
                            }

                            const floatView = new Float64Array(partial.buffer)
                            const canRemount = secView[innerOffset + 40] & 0x01 !== 0

                            newTrack.riders.push({
                                "remountable": canRemount,
                                "startPosition": { "x": floatView[0], "y": floatView[1] },
                                "startVelocity": { "x": floatView[2], "y": floatView[3] },
                                "startAngle": floatView[4]
                            })
                        }
                        break
                    }
                    case "web.layers": {
                        if (sectionIndex === 0) {
                            const numLayers = (secView[0] << 8) | (secView[1])
                            let innerOffset = 2
                            
                            for (let i = 0; i < numLayers; i++) {
                                const layerId = (secView[innerOffset] << 8) | (secView[innerOffset + 1])
                                innerOffset += 2
                                const layerNameLength = secView[innerOffset]
                                innerOffset += 1
                                let layerName = []
                                for (let j = 0; j < layerNameLength; j++) {
                                    layerName.push(secView[innerOffset])
                                    innerOffset += 1
                                }
                                const layerNameString = String.fromCharCode(...layerName)
                                const layerFlags = secView[innerOffset]
                                innerOffset += 1

                                const layerVisible = (layerFlags & 0x02) !== 0
                                const layerEditable = (layerFlags & 0x01) !== 0

                                newTrack.layers.push({
                                    "editable": layerEditable,
                                    "id": layerId,
                                    "name": layerNameString,
                                    "visible": layerVisible
                                })
                            }
                        } else if (sectionIndex === 1) {
                            const numLines = (secView[0] << 24) | (secView[1] << 16) | (secView[2] << 8) | secView[3]
                            let innerOffset = 4
                            for (let i = 0; i < numLines; i++) {
                                simLayerIds.push((secView[innerOffset] << 8) | (secView[innerOffset + 1]))
                                innerOffset += 2
                            }
                        } else {
                            const numLines = (secView[0] << 24) | (secView[1] << 16) | (secView[2] << 8) | secView[3]
                            let innerOffset = 4
                            for (let i = 0; i < numLines; i++) {
                                scnLayerIds.push((secView[innerOffset] << 8) | (secView[innerOffset + 1]))
                                innerOffset += 2
                            }
                        }
                        break
                    }
                    case "base.scnline": {
                        const numScnLines = (secView[0] << 24) | (secView[1] << 16) | (secView[2] << 8) | secView[3]
                        let innerOffset = 4
                        for (let i = 0; i < numScnLines; i++) {
                            const id = (secView[innerOffset] << 24) | (secView[innerOffset + 1] << 16) | (secView[innerOffset + 2] << 8) | secView[innerOffset + 3]
                            innerOffset += 4
                            let partial = new Uint8Array(32)
                            for (let j = 0; j < 32; j++) {
                                partial[j] = secView[innerOffset]
                                innerOffset += 1
                            }
                            const floatView = new Float64Array(partial.buffer)

                            newTrack.lines.push({
                                "id": id,
                                "type": 2,
                                "x1": floatView[0],
                                "y1": floatView[1],
                                "x2": floatView[2],
                                "y2": floatView[3]
                            })
                        }
                        break
                    }
                    case "base.redmult": {
                        const numRedLines = (secView[0] << 24) | (secView[1] << 16) | (secView[2] << 8) | secView[3]
                        let innerOffset = 4
                        for (let i = 0; i < numRedLines; i++) {
                            let partial = new Uint8Array(8)
                            for (let j = 0; j < 8; j++) {
                                partial[j] = secView[innerOffset]
                                innerOffset += 1
                            }
                            const floatView = new Float64Array(partial.buffer)
                            mults.push(floatView[0])
                        }
                        break
                    }
                    case "base.simline": {
                        const numSimLines = (secView[0] << 24) | (secView[1] << 16) | (secView[2] << 8) | secView[3]
                        let innerOffset = 4
                        for (let i = 0; i < numSimLines; i++) {
                            const id = (secView[innerOffset] << 24) | (secView[innerOffset + 1] << 16) | (secView[innerOffset + 2] << 8) | secView[innerOffset + 3]
                            innerOffset += 4
                            const flags = secView[innerOffset]
                            innerOffset += 1

                            let partial = new Uint8Array(32)
                            for (let j = 0; j < 32; j++) {
                                partial[j] = secView[innerOffset]
                                innerOffset += 1
                            }
                            const floatView = new Float64Array(partial.buffer)

                            const accelFlag = (flags & 0x08) !== 0
                            const flippedFlag = (flags & 0x04) !== 0
                            const leftExtFlag = (flags & 0x02) !== 0
                            const rightExtFlag = (flags & 0x01) !== 0

                            newTrack.lines.push({
                                "id": id,
                                "type": accelFlag ? 1 : 0,
                                "flipped": flippedFlag,
                                "leftExtended": leftExtFlag,
                                "rightExtended": rightExtFlag,
                                "x1": floatView[0],
                                "y1": floatView[1],
                                "x2": floatView[2],
                                "y2": floatView[3]
                            })
                        }
                        break
                    }
                    default: break
                }
            }
        }

        let scnLayerPointer = 0
        let simLayerPointer = 0
        let multPointer = 0

        for (let i = 0; i < newTrack.lines.length; i++) {
            if (newTrack.lines[i].type === 2) {
                if (scnLayerIds[scnLayerPointer] !== 0) {
                    newTrack.lines[i].layer = scnLayerIds[scnLayerPointer]
                }
                scnLayerPointer += 1
            }
            if (newTrack.lines[i].type === 1) {
                if (scnLayerIds[scnLayerPointer] !== 1) {
                    newTrack.lines[i].multiplier = mults[multPointer]
                }
                multPointer += 1
            }
            if (newTrack.lines[i].type === 1 || newTrack.lines[i].type === 0) {
                if (simLayerIds[simLayerPointer] !== 0) {
                    newTrack.lines[i].layer = simLayerIds[simLayerPointer]
                }
                simLayerPointer += 1
            }
        }
        
        return newTrack;
    }

    class BinaryFormatterModComponent extends React.Component {
        constructor (props) {
            super(props);

            this.state = {
                active: false
            };
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
                    { style: { display: 'flex', flexDirection: 'column' } },
                    "Load File",
                    e(
                        "input",
                        {
                            type: "file",
                            onChange: () => this.onFileChange().then(result => {
                                store.dispatch({ type: "LOAD_TRACK", payload: loadFromBin(result) });
                            }).catch(err => {
                                console.error("Error loading file: ", err.message);
                            })
                        }
                    ),
                    e(
                        "button",
                        {
                            style: { width: '3em' },
                            onClick: () => {
                                const binData = saveToBin({
                                    trackData: store.getState().trackData,
                                    layers: store.getState().simulator.engine.engine.state.layers.toArray(),
                                    lines: store.getState().simulator.engine.linesList.toArray(),
                                    duration: store.getState().player.maxIndex,
                                });
                                const a = document.createElement("a");
                                const blob = new Blob([binData], {type: "octet/stream"});
                                const url = window.URL.createObjectURL(blob);
                                a.href = url;
                                let name = store.getState().trackData.label;
                                if(name === "") name = "new_track";
                                a.download = `${name}.LRB`;
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
