"use strict";

var DEBUG = true;
var domain = "http://192.168.1.100:8111";

// initialization
function init() {
    let z = new canvasDrawable("map");
    z.drawCanvas();
    z.setBackgroundImage(domain + "/map.img");

    z.canvas.addEventListener("wheel", function(ev) {
        if (ev.deltaY > 0) {
            z.setZoom(z.getZoom() - z.getZoom() / 10);
        } else {
            z.setZoom(z.getZoom() + z.getZoom() / 10);
        }
        if (z.getZoom() <= z.minZoom) {
            z.setZoom(z.minZoom);
        }
    }, {passive: true})
}

// Wait for DOM load
document.addEventListener('DOMContentLoaded', init, false);
