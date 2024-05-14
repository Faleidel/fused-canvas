<h1 align="center">fused-canvas</h1>
<h2 align="center">an easy to use framework agnostic graph canvas library</h1>

![image](https://github.com/Faleidel/fused-canvas/assets/4857465/9206d041-a38d-41df-bc4f-6675a2098db2)


## Installation

`npm install fused-canvas`

## Usage

```javascript
import { FusedCanvas, createFusedCanvas } from 'fused-canvas';

/*
<!-- You need to provide the viewport and canvas to the createFusedCanvas function. You don't need these specific id's (or any id's at all) just two divs one in the other-->
<div id="viewport">
    <div id="canvas">
        <!-- To add a box to the graph you add a div with the class fused-canvas-component. Providing an id is optional -->
        <!-- Boxes, edges and clusters can be added before and after the initialization of the canvas -->
        <div id="box1" class="fused-canvas-component">Basic box 1</div>
        <div id="box2" class="fused-canvas-component">Basic box 2</div>
        <!-- To add an edge between boxes you provide and edge element with from and to containing id's -->
        <edge data-from="box1" data-to="box2"></edge>
        <!-- You can also create clusters which are group of nodes. The children are defined by a list of id separated by "," -->
        <cluster id="cluster1" data-children="box1,box2"></cluster>
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
    arrowLength: 7, // The length of the arrow head edges
    arrowPitch: 30,
    // possible values are "TB", "BT", "LR", "RL" or null
    // null will do no automatic layouting. TB means top to bottom, BT means bottom to top, LR means left to right and RL means right to left
    dagre: null,
});

// Elements can be added after the initialization of the canvas like this
const box3 = document.createElement('div');
box3.classList.add('fused-canvas-component');
box3.textContent = 'Basic box 3';
fusedCanvas.container.appendChild(box3);

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
