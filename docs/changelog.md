---
layout: page
title: Changelog
permalink: /changelog/
---

<style>
  h3 {
    text-decoration: underline;
    margin: 2em 0 0 0;
  }
</style>

### 2025-02-16
#### More Controls Mod
- Added label for number of lines selected

### 2025-02-15
#### Transform Mod
- Added animation section with camera locking

### 2025-02-14
#### Command Editor
- Fixed multirider issues

#### Shade Mod
- Added scenery thickness support

#### Scenery Width Mod
- Width picker now mounts near toolbar

### 2025-02-12
#### Command Editor
- Added support for layer automation (40 and 60 fps)

### 2025-02-03
- Mass fixed subscription issue with unmounted components

#### TenPC Mod
- Changed from using multilines to accurate multipliers

### 2025-02-01
#### Command Editor
- Refactored everything into JSX reusable components
- Updated UI styles
- Moved trigger dropdowns to top

#### Alternative Mod API
- Fixed styling issues

#### More Controls Mod
- Fixed loading track crash

### 2025-01-21
#### Transform Mod
- Renamed "preserve scenery width" checkbox to "scale width"

### 2025-01-20
#### Alternative Mod API
- Created alternative mod api hybrid

#### Remove Duplicates Mod
- Removed commit button for less button presses

### 2025-01-19
#### Command Editor
- Fixed skins not updating for multiriders
- Fixed gravity crash caused by cache reset
- Refactored gravity function

### 2025-01-16
#### Noise Mod
- Fixed line width implementation

### 2025-01-12
#### Noise Mod
- Created mod to generate randomly transformed shapes

### 2025-01-09
#### 3D Renderer Mod
- Created mod to render STL files

### 2025-01-06
#### Realistic Tree Generator
- Ported recursive tree generator as option
- Added support for generating 3d-projected meshes based off of [proctree.js](https://github.com/supereggbert/proctree.js/)

### 2025-01-05
#### Realistic Tree Generator
- Created mod for generating realistic tree outlines

### 2025-01-04
#### ZigZag Mod
- Added height noise slider

### 2024-12-23
#### Command Editor
- Fixed gravity multirider issues
- Attempted fix for gravity crash issues

### 2024-12-20
#### Command Editor
- Added camera capture button

### 2024-12-17
#### Improved API
- Move scrollbar to left side

### 2024-12-06
#### Chain Select Mod
- Added tool for selecting chain of lines

### 2024-11-30
#### Image Mod
- Works with new layer folder api

#### Shade Mod
- Subtracted slightly from offset value

#### Improved API
- Edited spacing values

### 2024-11-29
#### Selection Metadata
- Added option for editing scenery thickness

#### Scenery Width Picker
- Created mod to add number picker for scenery width

#### Selection Transform
- Added option to scale scenery width in addition to overall shape

#### Bezier Tool
- Added option for scenery width

#### SVG Exporter
- Line width exports to stroke size

### 2024-11-23
#### Binary Formatter
- Created prototype binary formatter mod for saving and loading tracks in proposed binary format

### 2024-11-18
#### Command Editor
- Added multiple riders option to gravity triggers
- Backwards compatibility fix with previous files

### 2024-11-09
#### Command Editor
- Changed print script to copy script button
- UI changes

### 2024-10-26
#### Command Editor
- Added gravity triggers
- Added undo/redo

### 2024-10-25
#### Command Editor
- Added crash detection and autosaving
- Added settings saving to local storage
- Updated save/load system
- Updated UI layout
- Fixed firefox not rendering skin

### 2024-10-06
#### Image Mod
- Updated mod UI and added higher resolution option

#### Bookmark Mod
- Updated mod UI

#### More Controls Mod
- No longer standalone window, requires api to register
- Fixed bug with rider array not being committed

#### Improved API
- Added minify button and search bar

### 2024-10-05
#### More Controls Mod
- Added rider start properties section

### 2024-10-04
#### Image Mod
- Added asynchronous rendering

### 2024-08-28
#### Selection Transform Mod
- Forked [existing transform mod](https://github.com/ethanjli/linerider-userscript-mods/blob/master/selection-transform.user.js) and added ui improvements

### 2024-08-21
#### More Controls Mod
- Fixed bug related to input not casting to number

### 2024-08-18
#### More Controls Mod
- Created a new mod that allows inspection and editing of normally hidden/obscure properties

### 2024-08-15
#### Improved API
- Fixed resizing errors
- Added position and size data to local cache

### 2024-08-14
#### Improved API
- Fixed appearing over timeline by default
- Created draggable, resizeable container

#### Zigzag Mod
- Added offset mode, which creates a tangential curve along selection

### 2024-08-13
#### Improved API
- Added ability to resize container

### 2024-08-12
#### Selection Shader Mod
- Forked [existing shader mod](https://github.com/EmergentStudios/linerider-userscript-mods/blob/master/selection-shader-mod.user.js) and fixed crashing bug with other mods

#### Improved API
- Changed look back from dropdown for regular mods
- Removed settings and set flexible width and height

### 2024-08-04
#### XAnimator 2
- Fixed changes not committing on locked layers
- Added unlock frame group button

### 2024-08-03
#### XAnimator 2
- Added XAnimator 2 mod, which combines animation mod with automated layer generation

### 2024-04-16
#### Animation Mod
- Fixed layer undefined bug

### 2024-04-14
#### Animation Mod
- Fixed broken layer reference
- Added option to have separate layers

### 2024-04-01
#### Hotkey Mod
- Archived

### 2024-03-29
#### Remove Dupes
- Created mod for removing duplicated green lines in a selection

#### SVG Exporter
- Created mod for exporting selection of lines to svg

### 2024-02-10
#### Sudoku Mod
- Created mod for generating sudoku puzzles

### 2024-02-05
#### Bookmark Mod
- Fixed bug with text input not being casted as integer

### 2024-02-04
#### Bookmark Mod
- Added bpm marker generator

### 2024-02-01
#### Bookmark Mod
- Changed order of adding to list and rendered buttons on top
- Fixed unsized div expanding height indefinitely

### 2024-01-31
#### Bookmark Mod
- Created mod for bookmarking timeline indices

### 2024-01-27
- Created that re-skins the rider as a car, controllable with WASD

### 2024-01-03
#### Improved API
- Repositioned tool dropdown

### 2023-12-17
#### TenPC Mod
- Fixed force live being on when inactive

### 2023-12-07
#### TenPC Mod
- Added force live button

### 2023-11-16
#### TenPC Mod
- Implemented proper physics frame retrieval

### 2023-11-14
#### Zigzag Mod
- Created mod for rendering zigzag along continuous curve of lines

### 2023-10-21
#### TenPC Generator Mod
- Added multirider support

### 2023-10-10
#### Improved API
- Added sorting and formatting to mod names

### 2023-05-27
#### Hotkey Mod
- Minor ui changes

### 2023-05-26
#### Hotkey Mod
- Fixed mac hotkey support

### 2023-05-08
#### Animation Mod
- Fixed bug with layer commits

### 2023-02-23
#### Command Editor
- Created mod to add UI to commonly used scripting methods

### 2022-12-14
#### Image Mod
- Adjusted UI defaults

### 2022-12-04
#### Image Mod
- Added color clamp setting
- Optimized line count
- Refactored layer commits
- Removed image size limit

### 2022-09-06
#### Image Mod
- Doubled color clamp
- Doubled resolution cap

### 2022-08-26
#### Font Gen Mod
- Created mod for generating custom fonts

### 2022-08-08
#### Text Mod
- Fixed unknown character bug
- Fixed spacing bugs

### 2022-08-06
#### Text Mod
- Created mod for generating text from a custom font file

### 2022-08-01
#### Shape Mod
- Created a simple polygon generator

#### Template Userscipt Mod
- Created template userscript for developers to create their own userscripts off of
