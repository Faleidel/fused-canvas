const {
    $,
    requireCSS,
    onEvt,
    onEvtOnce,
    makeEventEmitter,
    getAngle,
    trustX,
    trustY,
    hasParentWhich
} = require("./utils");
const dagre = require("@dagrejs/dagre");

requireCSS(`
.fused-canvas-component {
    user-select: text;
    position: absolute;
}
`);

function handleZoom(canvas, clientX, clientY, delta, view, applyViewport) {
    let bounds = JSON.parse(JSON.stringify(canvas.getBoundingClientRect()));
    bounds.left -= 10;
    bounds.top -= 10;
    let oldBounds = bounds;
    
    let cursorX = clientX;
    let cursorY = clientY;
    
    const pointerX = (cursorX - bounds.left) / bounds.width;
    const pointerY = (cursorY - bounds.top) / bounds.height;
    
    if (Math.abs(delta) < 0.1) delta *= 20;
    else delta *= 2;
    view.zoom *= 1 + delta;
    
    applyViewport();
    
    bounds = JSON.parse(JSON.stringify(canvas.getBoundingClientRect()));
    bounds.left -= 10;
    bounds.top -= 10;
    
    let newBoundsLeft = cursorX - pointerX * bounds.width;
    let newBoundsTop = cursorY - pointerY * bounds.height;
    
    view.panX += (newBoundsLeft - bounds.left);
    view.panY += (newBoundsTop - bounds.top);
}

function createFusedCanvas({
    viewport,
    canvas,
    mouseDown0Action = "select",
    mouseDown1Action = "pan",
    mouseDown2Action = null,
    scrollAction = "scroll",
    scrollCtrlAction = "zoom",
    fitToScreen = true,
    yScaling = 3, // When using dagrejs compound=true there is more y space, I don't know why
    arrowLength = 7,
    arrowPitch = 30,
    dagre = null
}) {
    let mouseDownActions = [mouseDown0Action, mouseDown1Action, mouseDown2Action];
    
    viewport.style.overflow = "hidden";
    viewport.style.userSelect = "none";
    viewport.style.position = "relative";
    
    // Important for future calculations
    canvas.style.minHeight = "10px";
    
    let view = {
        zoom: 1,
        panX: 0,
        panY: 0
    };
    let isDragging = false;
    let selectedElement = undefined;
    let onUnselect = undefined;
    let dragging = false;
    
    function selectElement(element, cb) {
        selectedElement = element;
        
        if (onUnselect) onUnselect();
        
        onUnselect = cb;
    }
    function unselectElement() {
        selectedElement = undefined;
        
        if (onUnselect) {
            onUnselect();
            onUnselect = undefined;
        }
    }
    
    function applyViewport() {
        if (view.zoom < 0.03) view.zoom = 0.03;
        
        canvas.style.transform = `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`;
        viewport.style.backgroundPosition = `${view.panX}px ${view.panY}px, 50px 50px`;
        
        viewport.style.setProperty('--zoom', view.zoom);
        viewport.style.setProperty('--panX', view.panX);
        viewport.style.setProperty('--panY', view.panY);
    }
    applyViewport();
    
    onEvt(document.body, ["click"], viewport, e => {
        if (e.target == canvas || e.target == viewport) {
            unselectElement();
        }
    });
    
    let lastMouseMove = {clientX: 0, clientY: 0};
    onEvt(document.body, ["mousemove"], viewport, e => {
        lastMouseMove = e;
    });
    
    onEvt(document.body, ["keydown", "touchstart"], viewport, e => {
        let bounds = viewport.getBoundingClientRect();
        let cx = e.clientX || lastMouseMove?.clientX;
        let cy = e.clientY || lastMouseMove?.clientY;
        if (cx >= bounds.left && cx <= bounds.right &&
            cy >= bounds.top && cy <= bounds.bottom) {}
        else return;
        
        // TODO document.body to change
        if (!dragging && ((e.type == "keydown" && e.code == "Space" && e.target == document.body) || (e.type == "touchstart"))) {
            dragging = true;
            
            let startX = e.clientX;
            let startY = e.clientY;
            
            let lastPitch = undefined;
            
            const remove = onEvt(document.body, ["mousemove", "touchmove"], viewport, e => {
                e.preventDefault();
                
                let eX = e.clientX ?? e.touches[0].clientX;
                let eY = e.clientY ?? e.touches[0].clientY;
                
                if (e.touches && e.touches.length == 2) {
                    let currentPitch = Math.sqrt(
                        Math.pow(Math.abs(e.touches[0].clientX - e.touches[1].clientX), 2)
                      + Math.pow(Math.abs(e.touches[0].clientY - e.touches[1].clientY), 2)
                    );
                    
                    if (lastPitch != undefined) {
                        handleZoom(
                            canvas,
                            (e.touches[0].clientX + e.touches[0].clientX) / 2,
                            (e.touches[1].clientY + e.touches[1].clientY) / 2,
                            (currentPitch - lastPitch) / 1000,
                            view,
                            applyViewport
                        );
                    }
                    
                    lastPitch = currentPitch;
                    
                    eX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    eY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                }
                
                if (startX == undefined) {
                    startX = eX;
                    startY = eY;
                }
                
                view.panX += (eX - startX);
                view.panY += (eY - startY);
                
                startX = eX;
                startY = eY;
                
                applyViewport();
            });
            
            let remove2;
            remove2 = onEvt(document.body, ["keyup", "mouseleave", "touchend"], viewport, e => {
                if (e.type == "mouseleave" || e.type =="touchend" || (e.type == "keyup" && e.code == "Space")) {
                    remove();
                    remove2();
                    dragging = false;
                }
            });
        }
    });
    
    function handleMousePan(e) {
        e.preventDefault();
        
        let startX = e.clientX;
        let startY = e.clientY;
        
        const mouseMove = e => {
            view.panX += (e.clientX - startX);
            view.panY += (e.clientY - startY);
            startX = e.clientX;
            startY = e.clientY;
            applyViewport();
        };
        
        const mouseUp = e => {
            e.preventDefault();
            document.removeEventListener("mousemove", mouseMove);
            document.removeEventListener("mouseup", mouseUp);
        };
        
        document.addEventListener("mousemove", mouseMove);
        document.addEventListener("mouseup", mouseUp);
    }
    
    onEvt(viewport, "mousedown", e => {
        if (mouseDownActions[e.button] == "pan")
            handleMousePan(e);
    });
    
    viewport.onwheel = e => {
        function zoom() {
            e.preventDefault();
            handleZoom(canvas, e.clientX, e.clientY, -e.deltaY/1000, view, applyViewport);
            applyViewport();
        }
        
        if (e.ctrlKey) {
            if (scrollCtrlAction == "zoom") {
                zoom();
            }
        } else {
            if (scrollAction == "zoom") {
                zoom();
            }
            if (scrollAction == "scroll") {
                e.preventDefault();
                // maxHeight is for child components that have a scrollable zone which want's to capture the wheel event
                if (!hasParentWhich(e.target, t => t.classList.contains("maxHeight"))) {
                    view.panY -= e.deltaY;
                    applyViewport();
                }
            }
        }
    };
    
    function handleNewBox(node) {
        const obs2 = new MutationObserver(evt => {
            console.log(evt);
            canvas.querySelectorAll("edge").forEach(edge => createBasicEdge(edge, yScaling, arrowLength, arrowPitch));
        });
        obs2.observe(node, {attributes: true, attributeFilter: ["style"]});
        
        const obs3 = new ResizeObserver(elements => {
            canvas.querySelectorAll("edge").forEach(edge => createBasicEdge(edge, yScaling, arrowLength, arrowPitch));
        });
        obs3.observe(node);
    }
    
    const observer = new MutationObserver(list => {
        if (dagre) {
            handleDagre(canvas, dagre, yScaling);
            canvas.querySelectorAll("edge").forEach(edge => createBasicEdge(edge, yScaling, arrowLength, arrowPitch));
        }
        list.forEach(record => {
            record.addedNodes.forEach(node => {
                if (node.tagName == "EDGE") {
                    createBasicEdge(node, yScaling, arrowLength, arrowPitch);
                } else if (node.classList.contains("fused-canvas-component")) {
                    handleNewBox(node);
                }
            })
        });
    });
    observer.observe(canvas, {childList: true});
    
    if (dagre) {
        handleDagre(canvas, dagre, yScaling);
    }
    
    function doFitToScreen(padding = 100) {
        let viewportBounds = viewport.getBoundingClientRect();
        let elements = [...canvas.children].filter(x => x.tagName != "EDGE");
        
        if (elements.length == 0) return;
        
        function getGraphBounds() {
            let bounds = {
                minX: 999999999,
                maxX: -99999999,
                minY: 999999999,
                maxY: -99999999
            };
            
            elements.forEach(box => {
                let cbb = JSON.parse(JSON.stringify(box.getBoundingClientRect()));
                cbb.left -= viewportBounds.left;
                cbb.top -= viewportBounds.top;
                
                if (cbb.left < bounds.minX)              bounds.minX = cbb.left;
                if (cbb.top  < bounds.minY)              bounds.minY = cbb.top;
                if (cbb.left + cbb.width  > bounds.maxX) bounds.maxX = cbb.left + cbb.width;
                if (cbb.top  + cbb.height > bounds.maxY) bounds.maxY = cbb.top  + cbb.height;
            });
            
            bounds.minX -= padding;
            bounds.minY -= padding;
            bounds.maxX += padding;
            bounds.maxY += padding;
            
            return bounds;
        }
        
        let bounds = getGraphBounds();
        
        let width = bounds.maxX - bounds.minX;
        let height = bounds.maxY - bounds.minY;
        
        view.zoom = Math.min(
            view.zoom / (width/viewportBounds.width),
            view.zoom / (height/viewportBounds.height)
        );
        
        applyViewport();
        
        bounds = getGraphBounds();
        
        view.panX -= bounds.minX + ((bounds.maxX - bounds.minX)/2) - viewportBounds.width/2;
        view.panY -= bounds.minY + ((bounds.maxY - bounds.minY)/2) - viewportBounds.height/2;
        
        applyViewport();
    }
    if (fitToScreen) doFitToScreen();
    
    canvas.querySelectorAll("edge").forEach(edge => createBasicEdge(edge, yScaling, arrowLength, arrowPitch));
    canvas.querySelectorAll(".fused-canvas-component").forEach(node => {
        handleNewBox(node);
    });
    
    return {
        container: canvas,
        view,
        fitToScreen: doFitToScreen,
    };
}

function handleDagre(canvas, direction, yScaling) {
    let nodes = [];
    let edges = [];
    let clusters = [];
    
    let cs = getComputedStyle(canvas);
    let zoom = cs.getPropertyValue('--zoom');
    
    [...canvas.children].forEach(child => {
        if (child.nodeName == "EDGE") {
            edges.push({
                id:   child.getAttribute("id"),
                from: child.getAttribute("data-from"),
                to:   child.getAttribute("data-to"),
            });
        } else if (child.nodeName == "CLUSTER") {
            clusters.push({
                id:       child.getAttribute("id"),
                children: child.getAttribute("data-children").split(",")
            });
        } else {
            let bounds = child.getBoundingClientRect();
            
            nodes.push({
                id:     child.getAttribute("id"),
                width:  bounds.width / zoom,
                height: bounds.height / zoom,
            });
        }
    });
    
    const dagreGraph = new dagre.graphlib.Graph({compound: true});
    dagreGraph.setGraph({ rankdir: direction });
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: node.width, height: node.height * yScaling });
    });
    clusters.forEach(cluster => {
        dagreGraph.setNode(cluster.id, {});
        cluster.children.forEach(child => {
            dagreGraph.setParent(child, cluster.id);
        });
    });
  
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.from, edge.to);
    });
    
    dagre.layout(dagreGraph);
    
    dagreGraph.edges().forEach(e => {
        [...canvas.children].forEach(child => {
            if (child.nodeName == "EDGE" && child.getAttribute("data-from") == e.v && child.getAttribute("data-to") == e.w) {
                child.setAttribute("data-points", JSON.stringify(dagreGraph.edge(e)));
            }
        });
    });
    
    nodes.forEach(node => {
        const position = dagreGraph.node(node.id);
        let div = document.getElementById(node.id);
        div.style.left = position.x - position.width/2 + "px";
        div.style.top = (position.y - position.height/2)/yScaling + "px";
    });
    
    clusters.forEach(cluster => {
        const position = dagreGraph.node(cluster.id);
        let div = document.getElementById(cluster.id);
        div.style.left = position.x - position.width/2 + "px";
        div.style.top = (position.y - position.height/2)/yScaling + "px";
        div.style.width = position.width + "px";
        div.style.height = position.height/yScaling + "px";
        
        div.style.position = "absolute";
        div.style.borderRadius = "10px";
        div.style.background = "rgba(174, 168, 168, 0.48)";
    });
}

function createFusedBox(x, y, text) {
    let div = document.createElement("div");
    div.classList.add("fused-canvas-box");
    div.classList.add("fused-canvas-component");
    if (text) div.innerText = text;
    
    div.style.left = x + "px";
    div.style.top = y + "px";
    
    return {
        div
    };
}

requireCSS(`
    .lineObject {
        pointer-events: none;
        position: absolute;
    }
    
    .lineObject .clickLine {
        pointer-events: all;
    }
    
    .lineDragCorner {
        width: 10px;
        height: 10px;
        position: absolute;
        border-radius: 10px;
        margin-left: -4px;
        margin-top: -4px;
        pointer-events: all;
    }
    
    .dragging.lineObject * {
        pointer-events: none;
    }
    
    .lineObject.selected .lineDragCorner {
        background: black;
    }
`);
function createBasicEdge(div, yScaling, arrowLength, arrowPitch) {
    //if (!div) div = document.createElement("div");
    div.innerHTML = "";
    let from = document.getElementById(div.getAttribute("data-from"));
    let to   = document.getElementById(div.getAttribute("data-to"  ));
    let points = JSON.parse(div.getAttribute("data-points") || JSON.stringify({points: []})).points;
    points.forEach(point => point.y = point.y/yScaling);
    
    div.classList.add("lineObject");
    
    let line = {};
    let lineBounds = {};
    
    let view = { panX: 0, panY: 0, zoom: 1 };
    
    let boundsFrom = from.getBoundingClientRect();
    let boundsTo   = to.getBoundingClientRect();
    
    let directionFrom = 0;
    let directionTo = 0;
    
    function updateEverything() {
        let cs = getComputedStyle(div);
        view.zoom = cs.getPropertyValue('--zoom');
        view.panX = cs.getPropertyValue('--panX');
        view.panY = cs.getPropertyValue('--panY');
        
        let attachesFrom = [
            { x: parseFloat(from.style.left || "0") + boundsFrom.width/2/view.zoom
            , y: parseFloat(from.style.top || "0")
            , dx: 0, dy: -1
            },
            { x: parseFloat(from.style.left || "0") + boundsFrom.width/2/view.zoom
            , y: parseFloat(from.style.top || "0") + boundsFrom.height/view.zoom
            , dx: 0, dy: 1
            },
            { x: parseFloat(from.style.left || "0")
            , y: parseFloat(from.style.top || "0") + boundsFrom.height/2/view.zoom
            , dx: -1, dy: 0
            },
            { x: parseFloat(from.style.left || "0") + boundsFrom.width/view.zoom
            , y: parseFloat(from.style.top || "0") + boundsFrom.height/2/view.zoom
            , dx: 1, dy: 0
            },
        ];
        let attachesTo = [
            { x: parseFloat(to.style.left || "0") + boundsTo.width/2/view.zoom
            , y: parseFloat(to.style.top || "0")
            , dx: 0, dy: -1
            },
            { x: parseFloat(to.style.left || "0") + boundsTo.width/2/view.zoom
            , y: parseFloat(to.style.top || "0") + boundsTo.height/view.zoom
            , dx: 0, dy: 1
            },
            { x: parseFloat(to.style.left || "0")
            , y: parseFloat(to.style.top || "0") + boundsTo.height/2/view.zoom
            , dx: -1, dy: 0
            },
            { x: parseFloat(to.style.left || "0") + boundsTo.width/view.zoom
            , y: parseFloat(to.style.top || "0") + boundsTo.height/2/view.zoom
            , dx: 1, dy: 0
            },
        ];
        
        let minDistance = Infinity;
        let closestPair = [];
        
        for (let point1 of attachesFrom) {
            for (let point2 of attachesTo) {
                let distance = Math.sqrt(
                    Math.pow((point2.x - point1.x)/2, 2) + Math.pow(point2.y - point1.y, 2)
                );
    
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPair = [point1, point2];
                }
            }
        }
        
        let attachFrom = closestPair[0];
        let attachTo = closestPair[1];
        directionFrom = {
            "1,0": 0,
            "0,1": 1,
            "-1,0": 2,
            "0,-1": 3
        }[closestPair[0].dx + "," + closestPair[0].dy];
        directionTo = {
            "-1,0": 0,
            "0,-1": 1,
            "1,0": 2,
            "0,1": 3
        }[closestPair[1].dx + "," + closestPair[1].dy];
        
        line.x = attachFrom.x;
        line.y = attachFrom.y;
        line.x2 = attachTo.x;
        line.y2 = attachTo.y;
        
        if (points.length == 0) {
            lineBounds.x = Math.min(line.x, line.x2);
            lineBounds.y = Math.min(line.y, line.y2);
            lineBounds.width = Math.abs(line.x - line.x2);
            lineBounds.height = Math.abs(line.y - line.y2);
        } else {
            lineBounds.x = Math.min(...points.map(p => p.x));
            lineBounds.y = Math.min(...points.map(p => p.y));
            let maxX = Math.max(...points.map(p => p.x));
            let maxY = Math.max(...points.map(p => p.y));
            lineBounds.width = Math.abs(lineBounds.x - maxX);
            lineBounds.height = Math.abs(lineBounds.y - maxY);
        }
        
        div.style.left = lineBounds.x + "px";
        div.style.top  = lineBounds.y + "px";
    }
    updateEverything();
    
    let padding = 300;
    let halfPadding = padding/2;
    
    let bezierStrength = Math.abs(line.y - line.y2);
    
    let bezierDeltaXFrom = (directionFrom == 0 || directionFrom == 2) ? bezierStrength : 0;
    let bezierDeltaYFrom = (directionFrom == 0 || directionFrom == 2) ? 0 : -bezierStrength;
    bezierDeltaXFrom *= directionFrom == 2 ? -1 : 1;
    bezierDeltaYFrom *= directionFrom == 1 ? -1 : 1;
    
    let bezierDeltaXTo = (directionTo == 0 || directionTo == 2) ? bezierStrength : 0;
    let bezierDeltaYTo = (directionTo == 0 || directionTo == 2) ? 0 : -bezierStrength;
    bezierDeltaXTo *= directionTo == 2 ? -1 : 1;
    bezierDeltaYTo *= directionTo == 1 ? -1 : 1;
    
    if (points.length != 0) directionFrom = 1;
    
    let arrowAngle = directionTo * 90;
    let arrowX = line.x2 - lineBounds.x + halfPadding;
    let arrowY = line.y2 - lineBounds.y + halfPadding;
    
    if (points.length != 0) {
        let lastPoint = points.length-1;
        arrowAngle = getAngle(points[lastPoint-1].x, points[lastPoint-1].y, points[lastPoint].x, points[lastPoint].y);
        arrowX = points[lastPoint].x - lineBounds.x + halfPadding;
        arrowY = points[lastPoint].y - lineBounds.y + halfPadding;
    }
    
    let refs = $(div, makeId => `
        <svg style="position: relative" ${makeId("svg", () => ({
            style: {
                left: -halfPadding + "px",
                top: -halfPadding + "px",
            },
            width: Math.abs(line.x - line.x2) + padding,
            height: Math.abs(line.y - line.y2) + padding }))}>
            <path ${makeId("clickLine2", () => {
                let startX = line.x - lineBounds.x + halfPadding;
                let startY = line.y - lineBounds.y + halfPadding;
                let endX = line.x2 - lineBounds.x + halfPadding;
                let endY = line.y2 - lineBounds.y + halfPadding;
                
                if (points.length == 0) {
                    let d = [
                       "M", startX, startY,
                        "C",
                        startX + bezierDeltaXFrom, startY + bezierDeltaYFrom + ",",
                        endX   - bezierDeltaXTo,   endY   - bezierDeltaYTo   + ",",
                        endX                 , endY
                    ].join(" ");
                    return { d };
                } else {
                    let dArray = [
                        "M", points[0].x + halfPadding - lineBounds.x, points[0].y + halfPadding - lineBounds.y,
                        "Q", points[1].x + halfPadding - lineBounds.x, points[1].y + halfPadding - lineBounds.y,
                             points[2].x + halfPadding - lineBounds.x, points[2].y + halfPadding - lineBounds.y
                    ];
                    
                    let rest = points.slice(3);
                    for (let pi = 0 ; pi < rest.length ; pi += 1) {
                        dArray.push("T", rest[pi].x + halfPadding - lineBounds.x, rest[pi].y + halfPadding - lineBounds.y);
                    }
                    
                    return { d: dArray.join(" ") };
                }
            })} style="fill: none; stroke: black; stroke-width: 1px"/>
            <path class="arrow" ${makeId("arrow", () => {
                return {
                    d: [
                        "M", arrowX - trustX(arrowAngle + arrowPitch, arrowLength), arrowY - trustY(arrowAngle + arrowPitch, arrowLength),
                        "L", arrowX, arrowY,
                        "L", arrowX - trustX(arrowAngle - arrowPitch, arrowLength), arrowY - trustY(arrowAngle - arrowPitch, arrowLength)
                    ].join(" ")
                };
            })} style="fill: black; stroke-width: 1px"/>
        </svg> 
    `);
    
    return {
        div
    };
}

module.exports = {
    createFusedCanvas,
    createFusedBox
};
