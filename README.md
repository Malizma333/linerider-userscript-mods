# linerider-userscript-mods

A collection of tampermonkey userscripts that modify linerider.com

## Usage

1. You need to install the [Tampermonkey browser extension](https://tampermonkey.net/)
2. You have to install `custom-tools-api.user.js` from the main branch or `line-rider-improved-api.user.js` from the mods folder to get the other mods to work
3. To install mods from this repo, click on any mod file and then click "Raw" to bring up the tampermonkey install page

[Video showing how to install mods](https://streamable.com/v4wzx)

## Mods

### Template Mod

Has a basic example of how to write a mod for new Line Rider mod developers. The mod itself generates a rectangle.

### Shape Mod

Generates a regular polygon, based on a selected line as the radius and a given number of sides.

### Text Mod (Warning: Non-user friendly, recommend using the svg mod linked [here](https://github.com/Conqu3red/linerider-userscript-mods/blob/master/mods/svg-mod.user.js))

Generates text typed in a text box. Needs a font json file, which can be found in the font folder.

### Font Generator Mod

Assists in creating a custom font out of line selections to be used in the text generator. Has different style options like spacing, line height, and Y-offsets. WARNING: Reloading the page resets the stored font data!

### Spiral Mod

Generates some neat spiral-like patterns when given an offset and a length.

### Image Mod

Generates an image from any supported image file format. Includes clamping feature for limiting number of layersBe careful about rendering larger images as it may crash the site.

### Maze Mod

Generates a green-line maze given a width and height. Best paired with a WASD controller.

### Tree Mod

Generates a recursive, randomized tree structure based on range of branches, size, and iterations.

### Geometrize Image Mod

Converts a Geometrize Desktop json export into line rider. Only works with Geometrize Desktop, with the only shape set to lines.

### Graph Mod

Generates a graph given a correctly formatted function of x.
