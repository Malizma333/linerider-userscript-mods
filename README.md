# Line Rider Userscript Mods

A collection of userscripts that modify linerider.com and counterpart sites.

## Usage

1. You need to install the [Violentmonkey browser extension](https://violentmonkey.github.io/) or another viable user-script loader
2. You have to install `custom-tools-api.user.js` from the main branch or `line-rider-improved-api.user.js` from the mods folder to get the other mods to work
3. To install mods from this repo, click on any mod file and then click "Raw" to bring up the user-script installation page

[Video showing how to install mods](https://streamable.com/v4wzx)

# Notable Mods

## Images

### Geometrize Image Mod

Converts a [Geometrize Desktop](https://www.geometrize.co.uk/) JSON file export into line rider. Only works with the desktop version, with the only shape set to lines.

### Image Mod

Generates an image from any supported image file format. Includes clamping feature for limiting number of layers. Be careful about rendering larger images as it may crash the site.

### SVG Generator

Generates an svg file for download from a selection of lines.

## Generators

### Graph Mod

Generates a graph given a correctly formatted function of x.

### Shape Mod

Generates a regular polygon, based on a selected line as the radius and a given number of sides.

### Ten Point Cannon Mod

Generates a 10pc based on rider x and y speed. Works for multiple riders.

### Zig-Zag Mod

Generates a zig-zag or pipe structure along a selected continuous curve.

## Other

### Bookmark Mod

Allows for creating multiple bookmarked timestamps (flags), as opposed to having just one flag.

### Command Editor Mod

Adds UI to certain console features. See in-depth readme explanation [here](https://github.com/Malizma333/line-rider-command-editor-userscript/tree/master#readme)

### Improved Mod API

Adds some formatting improvements to the custom tools API, namely a dropdown and window sizing settings.

### More Controls

Adds some UI to hidden or hard to edit track properties.

### XAnimator 2

Inspired by the custom animation mod made for Rush E 3, adds animation capabilities to the Transform mod by adding automatic layer generation + automation, camera locking, and UI improvements.
