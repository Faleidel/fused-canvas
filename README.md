# fused-canvas an easy to use framework agnostic graph canvas library

## Installation

`npm install fused-canvas`

## Usage

```javascript
import { FusedCanvas, createFusedCanvas } from 'fused-canvas';

/*
<!-- You need to provide these elements to the createFusedCanvas function. You don't need these specific id's (or any id's at all) just two divs one in the other -->
<div id="viewport">
    <div id="canvas">
    </div>
</div>
*/

const fusedCanvas = createFusedCanvas({
    viewport: document.getElementById('viewport'), // Viewport and canvas are mendatory
    canvas: document.getElementById('canvas'),
    mouseDown0Action: undefined, // mouseDownActions right now only support "pan". 0, 1 and 2 are the mouse buttons
    mouseDown1Action: "pan",
    mouseDown2Action: "pan",
    scrollAction: "scroll", // Can be scroll or zoom
    scrollCtrlAction: "zoom", // Can be scroll or zoom
    fitToScreen: true, // If true the canvas will fit to the screen on init
    yScaling: 1, // The scaling of the y axis, is used to compress the y axis when using dagre layout
    //possible values are "TB", "BT", "LR", "RL" or null
    // null will do no automatic layouting. TB means top to bottom, BT means bottom to top, LR means left to right and RL means right to left
    dagre: null,
});

/*
createFusedCanvas returns an object with the following properties:

interface FusedCanvas {
    container: HTMLElement; // This is the viewport element
    view: {
        panX: number;
        panY: number;
        zoom: number;
    };
    fitToScreen: () => void; // When called will fit the graph to the viewport
}
*/
```
