let lib = require("./lib.js");
let utils = require("./utils.js");

module.exports = {
    ...lib,
    onEvt: utils.onEvt,
    onEvtOnce: utils.onEvtOnce,
    $: utils.$,
    requireCSS: utils.requireCSS,
    onDrag: utils.onDrag,
};
