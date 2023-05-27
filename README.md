# Line Rider Userscript Mods

A collection of tampermonkey userscripts that modify linerider.com and counterpart sites.

## Usage

1. You need to install the [Tampermonkey browser extension](https://tampermonkey.net/)
2. You have to install `custom-tools-api.user.js` from the main branch or `line-rider-improved-api.user.js` from the mods folder to get the other mods to work
3. To install mods from this repo, click on any mod file and then click "Raw" to bring up the tampermonkey install page

[Video showing how to install mods](https://streamable.com/v4wzx)

# Mods

## Text/Images

### Font Generator Mod

Assists in creating a custom font out of line selections to be used in the text generator. Has different style options like spacing, line height, and Y-offsets.

***(Warning: Reloading the page resets the stored font data!)***

### Geometrize Image Mod

Converts a [Geometrize Desktop](https://www.geometrize.co.uk/) json export into line rider. Only works with the desktop version, with the only shape set to lines.

### Image Mod

Generates an image from any supported image file format. Includes clamping feature for limiting number of layers. Be careful about rendering larger images as it may crash the site.

### Text Mod

Generates text typed in a text box. Needs a Line Rider font json file, which can be found in the font folder.

***(Warning: This mod only accepts custom Line Rider fonts. For general font files, it is recommended to use the [SVG Mod](https://github.com/Conqu3red/linerider-userscript-mods/blob/master/mods/svg-mod.user.js)) instead.***

## Generators

### Graph Mod

Generates a graph given a correctly formatted function of x.

### Maze Mod

Generates a green-line maze given a width and height. Goes well with the WASD controller.

### Shape Mod

Generates a regular polygon, based on a selected line as the radius and a given number of sides.

### Spiral Mod

Generates some neat spiral-like patterns when given an offset and a length.

### Tree Mod

Generates a recursive, randomized tree structure based on range of branches, size, and iterations.

## Other

### Animation Mod

Adds a tool for quickly generating frame-based animations. Built off of the updated transform mod.

### Command Editor Mod

Adds UI to certain console features. See in-depth readme explanation [here](https://github.com/Malizma333/line-rider-command-editor-userscript/tree/master#readme)

### Hotkey Mod

Mod that adds support for changing common hotkeys.

### Template Mod

Has a basic example of how to write a mod for new Line Rider mod developers. The mod itself generates a rectangle.
