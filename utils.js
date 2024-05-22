function $(fe, f) {
    let map = {};
    let attrFunctions = {};
    
    let frag = createFragmentFromStr(f((name, arg2, arg3) => {
        let index;
        let attrFunction;
        
        if (typeof arg2 == 'function') {
            attrFunction = arg2;
            index = arg3;
        } else {
            index = arg2;
        }
        
        let id = name + '_' + Math.floor(Math.random() * 999999);
        
        if (index == undefined) {
            map[name] = id;
        } else {
            if (map[name] == undefined)
                map[name] = [];
            
            map[name].push(id);
        }
        
        attrFunctions[name] = attrFunction;
        
        return ` id="${id}" `;
    }));
    
    Object.keys(map).forEach(name => {
        if (typeof map[name] == 'string') {
            map[name] = frag.getElementById(map[name]);
            
            if (attrFunctions[name]) {
                map[name].$update = () => applyAttrs(map[name], attrFunctions[name](map[name]));
                map[name].$update();
            }
        } else {
            map[name] = map[name].map(id => frag.getElementById(id));
        }
    });
    
    if (fe instanceof Node) {
        fe.innerHTML = "";
        fe.appendChild(frag);
    } else {
        fe(frag);
    }
    
    map.$update = () => {
        Object.keys(map).forEach(k => {
            if (map[k].$update) {
                map[k].$update();
            }
        });
    };
    
    return map;
}

function applyAttrs(target, attrs) {
    Object.keys(attrs).forEach(attr => {
        if (attr == "style") {
            Object.keys(attrs.style).forEach(style => {
		target.style[style] = attrs.style[style];
	    });
        } else if (attr == "ref") {
            Object.keys(attrs.ref).forEach(key => {
		target[key] = attrs.ref[key];
	    });
        } else if (attr == "class") {
            let value = attrs[attr];
            
            if (value instanceof Array) {
                value = value.filter(x => !!x).join(" ");
            }
            
            target.setAttribute(attr, value);
        } else if (attr == "content") {
            let refs = $(target, attrs[attr]);
            if (attrs.afterContent) {
                attrs.afterContent(refs);
            }
        } else {
            if (attrs[attr] == undefined)
                target.removeAttribute(attr);
            else
                target.setAttribute(attr, attrs[attr]);
        }
    });
}

function createFragmentFromStr(htmlStr) {
    let frag = document.createDocumentFragment()
    let temp = document.createElement('div');
    temp.innerHTML = htmlStr;
    
    while(temp.firstChild)
        frag.appendChild(temp.firstChild);
    
    return frag;
} 

function makeEventEmitter() {
    let listeners = [];
    
    return {
        emit: (eventName, data) => {
            listeners.filter(({ name }) => name === eventName)
                     .forEach(({ callback }) => callback(data));
        },
        on: (name, callback) => {
            if (typeof callback === 'function' && typeof name === 'string') {
                listeners.push({ name, callback });
            } else {
                throw new Error('Invalid arguments in .on of eventEmitter');
            }
        },
        off: (eventName, callback) => {
            listeners = listeners.filter(listener => !(listener.name === eventName && listener.callback === callback));
        }
    };
}

function generateRandomID() {
    return Math.round(Math.random() * 999999) + "";
}

let cssList = [];
function requireCSS(css) {
    cssList.push(css);
    let cssContainer = document.getElementById("allCss");
    if (!cssContainer) {
        cssContainer = document.createElement("style");
        cssContainer.setAttribute("id", "allCss");
        document.head.appendChild(cssContainer);
    }
    cssContainer.innerHTML = cssList.join("\n");
}

function makePopUpMenu(x, y) {
    let container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.position = "absolute";
    container.style.top = "0px";
    container.style.left = "0px";
    container.style.backgroundColor = "rgba(0, 0, 0, 0.08)";
    container.onclick = e => { e.target == container && container.remove() };
    
    document.body.appendChild(container);
    let div = document.createElement("div");
    div.close = () => container.remove();
    container.appendChild(div);
    
    div.style.position = "absolute";
    div.style.background = "white";
    div.style.padding = "10px";
    div.style.border = "1px solid var(--green)";
    div.style.borderRadius = "3px";
    
    let isLeft = x < innerWidth / 2;
    let isTop = y < innerHeight / 2;
    
    if (isLeft)
        div.style.left = x + "px";
    else
        div.style.right = (innerWidth - x) + "px";
    
    if (isTop)
        div.style.top = y + "px";
    else
        div.style.bottom = (innerHeight - y) + "px";
    
    return div;
}

// usedBy is optional in which case it contains callback
function onEvt(target, evts, usedBy, callback) {
    if (!callback) {
        callback = usedBy;
        usedBy = undefined;
    }
    
    if (typeof evts == 'string')
	evts = [evts];
    
    function handler(e) {
        if (usedBy && !isAttachedToDOM(usedBy)) {
            evts.forEach(evt => target.removeEventListener(evt, handler));
            
            return;
        }
        
        if (e.touches?.[0] || e.changedTouches?.[0]) {
            e.clientX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX;
            e.clientY = e.touches[0]?.clientY || e.changedTouches[0]?.clientY;
        }
        
        callback(e);
    }
    
    evts.forEach(evt => target.addEventListener(evt, handler));
    
    return () => evts.forEach(evt => target.removeEventListener(evt, handler));
}

function onSimpleClick(target, callback) {
    let downEvent;
    return onEvt(target, ["click", "mousedown"], evt => {
        if (evt.type == "mousedown") downEvent = evt;
        else {
            if (Math.abs(evt.clientX - downEvent.clientX) < 3 && Math.abs(evt.clientY - downEvent.clientY) < 3) {
                callback(evt);
            }
        }
    });
}

function onEvtOnce(target, evts, callback) {
    let off = onEvt(target, evts, e => {
	off();
	callback(e);
    });
    
    return off;
}

function onDrag(target, usedBy, options) {
    if (!options) {
        options = usedBy;
        usedBy = undefined;
    }
    
    function startHandler(e) {
        if (!options.guard || options.guard(e)) {
            e.stopPropagation();
            e.preventDefault();
            
            let lastX = e.clientX;
            let lastY = e.clientY;
            let firstX = lastX;
            let firstY = lastY;
            
            document.body.style.userSelect = "none";
            
            const rmv = onEvt(document.body, ["mousemove", "touchmove"], e => {
                options.onmove({
                    event: e,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    deltaClientX: e.clientX - lastX,
                    deltaClientY: e.clientY - lastY,
                });
                
                lastX = e.clientX;
                lastY = e.clientY;
            });
            
            onEvtOnce(document.body, ["mouseup", "mouseleave", "touchend"], e => {
                if (Math.abs(e.clientX - firstX) > 2 || Math.abs(e.clientY - firstY) > 2) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                
                rmv();
                document.body.style.userSelect = "unset";
                
                if (options.onend)
                    options.onend(e);
            });
        }
    }
    
    onEvt(target, ["mousedown", "touchstart"], usedBy, startHandler);
    
    return {
        start: startHandler
    };
}

function isAttachedToDOM(target) {
    let isAttached = false;
    let node = target;
    
    while (node) {
        if (node == document.body) {
            isAttached = true;
            break;
        }
        node = node.parentNode;
    }
    
    return isAttached;
}

function hasParentWhich(target, func) {
    while (target && target != document.body) {
        if (func(target)) {
            return target;
        }
        target = target.parentNode;
    }
}

function attachInterval(target, func, delay) {
    let id = setInterval(() => {
        if (!isAttachedToDOM(target)) {
	    clearInterval(id);
	    return;
	}
	
	func();
    }, delay);
}

function httpGet(url) {
    return fetch(url, {
        headers: {
            "Authorization": localStorage.accessToken
        }
    }).then(res => res.json());
}

function httpPost(url, body) {
    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": localStorage.accessToken
        },
        body: JSON.stringify(body)
    }).then(res => res.json());
}

// canvas is refs.canvas in page render
function clientPosToPagePos(evt, zoom, canvas) {
    let bounds = canvas.getBoundingClientRect();
    
    let cursorX = evt.clientX || evt.touches[0].clientX;
    let cursorY = evt.clientY || evt.touches[0].clientY;
    
    let pointerX = (cursorX - bounds.left) / bounds.width;
    let pointerY = (cursorY - bounds.top) / bounds.height;
    
    pointerX *= bounds.width / zoom;
    pointerY *= bounds.height / zoom;
    
    return {
        clientX: pointerX,
        clientY: pointerY,
    };
}

function trustX(angle, power) {
    return Math.cos(angle * (Math.PI / 180)) * power;
}

function trustY(angle, power) {
    return Math.sin(angle * (Math.PI / 180)) * power;
}

function getAngle(tx, ty, mx, my) {
    let dx = mx - tx;
    let dy = my - ty;
    
    return Math.atan2( dy , dx ) / (Math.PI*2) * 360;
}

module.exports = {
    $,
    requireCSS,
    onEvt,
    onEvtOnce,
    makeEventEmitter,
    getAngle,
    trustX,
    trustY,
    hasParentWhich,
    onDrag,
    makePopUpMenu,
    clientPosToPagePos,
    onSimpleClick,
};
