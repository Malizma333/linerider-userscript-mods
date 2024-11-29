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

### 2024-11-29
#### Selection Metadata
- Added option for editing scenery thickness
#### Scenery Width Picker
- Created mod to add number picker for scenery width
#### Selection Transform
- Added option to scale scenery width in addition to overall shape

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
