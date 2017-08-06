"use strict";

// map variables
var map_generation; // the map number to use for ?gen=
var map_image = new Image(); // the map image
var map_canvas; // the canvas element itself
var map_canvas_ctx; // canvas context
var map_grid_color = "#555"; // color for grid and text
var map_loaded = false; // if the map is loaded. Exists to prevent infinite load
var map_lastCalledTime; // exists for delta time calculation for animations.

// spinner variables.
var spinner_angle = 0; // rotation angle of the spinner
var spinner_image = new Image(); // image of the spinner
spinner_image.src = "images/spinner.png"; // the location of the spinner image/

// locations of the data we're parsing.
var dataLocations  = {
  "state"     : "state",        // various states of aircraft. Speed, flaps, etc
  "mission"   : "mission.json", // the mission breifing
  "map_info"  : "map_info.json",// info about the map. Grab grid and mapID
  "gamechat"  : "gamechat",     // chat, JSON, requires last id
  "indicators": "indicators",   // unsure
  "map_obj"   : "map_obj.json", // an array of objects on map.
  "map.img"   : "map.img"       // Generate new with ?gen=N. N from map_info
};
// store data here;
var dataObjects = {
  "state":null,"mission":null,"map_info":null,
  "gamechat":null,"indicators":null,"map_obj":null
};
// control variables for zooming and panning using offsets.
var mapControls = {
  ox: 0,
  oy: 0,
  zoom: 1
}

// initialization function. Ran on page load
function init() {

  map_canvas = document.getElementById("map_canvas"); // canvas element
  map_canvas_ctx = map_canvas.getContext("2d"); // canvas context element

  // scroll wheel event listener
  // IE9, Chrome, Safari, Opera
  map_canvas.addEventListener("mousewheel", onmousewheel, false);
  // Firefox
  map_canvas.addEventListener("DOMMouseScroll", onmousewheel, false);

  request_data("map_info"); // TODO keep here?

  // interval calling the updater function to get request the files from server
  setInterval(function(){
    updateSlow();
  },500); // value obtained from official map implementation

  // interval calling the updater function to get request the files from server
  setInterval(function(){
    updateFast();
  },25); // value obtained from official map implementation
}

// slow updater function. Call stuff every 500ms
function updateSlow() {
  //request_data("state");
  //request_data("indicators");
  request_data("map_info");
  generate_map();
}
// fast updater function. Call stuff every 25ms
function updateFast() {
  // to prevent the whole thing from locking up and never rendering the map
  if (map_loaded) {
    request_data("map_obj"); // get map objects
  }

  draw_map(); // redraw map
}

// request some data and put it in dataObjects
function request_data(target) {
  // check if target valid
  if (dataLocations[target]) {
    // send ajax request to the WarThunder local server.
    $.ajax({
      url: "http://localhost:8111/" + dataLocations[target],
      indexValue: {"target":target}, // hack to pass variables
      beforeSend: function( xhr ) {
        xhr.overrideMimeType( "text/plain; charset=x-user-defined" );
      }
    })
    .done(function(data){
      // data successfully received
      if (data) {
        dataObjects[this.indexValue.target] = JSON.parse(data); // update value in dataObjects
      }
    })
    .fail(function() {
      // data unsuccessfully received
      console.error("Failed to get resource ::", dataObjects[this.indexValue.target], " :: [AJAX Request error.]");
      //dataObjects[this.indexValue.target] = null; // update value in dataObjects
    });
  }
}

// use the gen= function to grap map.img
function generate_map() {
  // if map_info
  if (dataObjects["map_info"]) {
    // update map if old map != new map
    if (map_generation != dataObjects["map_info"]["map_generation"]) {
      // make sure to stall requests so that we can load the new map
      map_loaded = false;
      map_generation = dataObjects["map_info"]["map_generation"]; // get map ID from json
      map_image.src = "http://localhost:8111/map.img?gen=" + map_generation; // change map image
      // callback function. Unstall when image downloaded.
      map_image.onload = function(){
        map_loaded=true;
      }
    };
  }
}

// most drawing will happen here. every 25ms
function draw_map() {
  // time delta calculations
  if (!map_lastCalledTime) {
    map_lastCalledTime = performance.now(); // startup value
  }
  // calculate time delta by substracting then from now
  let dt = (performance.now() - map_lastCalledTime)/1000;
  map_lastCalledTime = performance.now(); // reset

  // match canvas to parent.
  map_canvas.width = $(map_canvas).parent().width();
  map_canvas.height = $(map_canvas).parent().height();;

  // do some aspect ratio calculations for when we're rescaling.
  let ratio = map_image.width / map_image.height;
  let pratio = map_canvas.width / map_canvas.height;
  // do some aspect ratio calculations
  let imageScale;
  // check if landscape or portrait and set scale factor appropriately
  if (ratio<pratio) {
    imageScale = map_canvas.height / map_image.height;
  }
  else {
    imageScale = map_canvas.width / map_image.width;
  }

  // clear canvas
  map_canvas_ctx.clearRect(0, 0, map_canvas.width, map_canvas.height);

  // save canvas context
  map_canvas_ctx.save();
  map_canvas_ctx.translate(mapControls.ox, mapControls.oy);
  // draw map
  map_canvas_ctx.drawImage(map_image, 0, 0, map_image.width*imageScale, map_image.height*imageScale);
  // draw grid
  draw_map_grid(imageScale);
  // draw map objects
  draw_map_objects(imageScale);
  // draw loading spinner when map not loaded
  draw_map_spinner(imageScale, dt);
  // DEBUG FPS counter
  map_canvas_ctx.fillStyle = "#0f0";
  map_canvas_ctx.textAlign = "left"; // < doesnt make any sense...
  map_canvas_ctx.fillText("FPS: " + Math.floor(1/dt), 20-mapControls.ox, 20-mapControls.oy);
  // restore canvas context
  map_canvas_ctx.restore();
}

// function to draw the map grid on the map
function draw_map_grid(imageScale) {
  // make sure we're not parsing air
  if (dataObjects["map_info"]) {
    // make some binds and scale calculations
    let mapW = dataObjects["map_info"]["map_max"][0]*2;
    let mapH = dataObjects["map_info"]["map_max"][1]*2;
    let gridStep = dataObjects["map_info"]["grid_steps"][0];
    let maxGrid = mapW / gridStep; // get the max grid squares visible
    let gridScale = map_canvas.width / mapW; // get a scale multiplier
    gridStep = gridStep*gridScale; // rescale for clarity

    // iterate based on the number of visible squares
    for (let i=0;i<maxGrid;i++) {
      // some aesthetic tweaks
      map_canvas_ctx.lineWidth = .4;
      map_canvas_ctx.strokeStyle = map_grid_color;
      map_canvas_ctx.fillStyle = map_grid_color;
      map_canvas_ctx.font = "13px Courier New";
      // draw both lines.
      // drawing them both in the same iterator since maps are square.
      map_canvas_ctx.beginPath();
      map_canvas_ctx.moveTo(Math.floor(i*gridStep), 0);
      map_canvas_ctx.lineTo(Math.floor(i*gridStep), map_canvas.height);
      map_canvas_ctx.moveTo(0, Math.floor(i*gridStep));
      map_canvas_ctx.lineTo(map_canvas.height, Math.floor(i*gridStep));
      map_canvas_ctx.stroke();
      // draw the grid numbers and letters on the map.
      map_canvas_ctx.textAlign = "center"; // text positioning
      map_canvas_ctx.fillText(i+1,i*gridStep+gridStep/2, 10-mapControls.oy);
      map_canvas_ctx.textAlign = "right"; // text positioning
      // draw letters by calling fromCharCode()
      map_canvas_ctx.fillText(String.fromCharCode(97+i).toUpperCase(), 10-mapControls.ox, i*gridStep+gridStep/2);
    }
  }
}

// draw a spinner while waiting for the map image
function draw_map_spinner(imageScale, dt) {
  // draw spinner only if map is unloaded
  if (!map_loaded) {
    let scale = spinner_image.width;
    let halfScale = spinner_image.width/2;
    // save context so we affect only what's between here and restore. Push, Pop
    map_canvas_ctx.save();
    spinner_angle = spinner_angle + 100*dt; // increment spinner angle
    // weird hack. Draw everything at 0, 0. Then translate to middle of canvas
    map_canvas_ctx.translate(map_canvas.width/2, map_canvas.height/2);
    map_canvas_ctx.font = "20px Courier New";
    map_canvas_ctx.textAlign = "center"; // text positioning
    map_canvas_ctx.fillText("Loading map...", 0, 0);
    // rotate from 0, 0. (Actually middle since we translated)
    map_canvas_ctx.rotate(spinner_angle*Math.PI/180);
    map_canvas_ctx.drawImage(spinner_image, 0-halfScale, 0-halfScale, scale, scale);
    // Pop. All canvas properties are back to what they were prior.
    map_canvas_ctx.restore()
  }
}

// function to draw various objects, aircraft, bases, etc on map
function draw_map_objects(imageScale) {
  // if we have objects to iterate through
  if (dataObjects["map_obj"]) {
    let arrObj = dataObjects["map_obj"];
    // iterate through all objects
    for (let i=0;i<arrObj.length;i++) {
      let obj = arrObj[i];
      let x = obj["x"] * map_canvas.width; // get X
      let y = obj["y"] * map_canvas.height; // get Y
      let dx = obj["dx"] * map_canvas.width; // get directional X
      let dy = obj["dy"] * map_canvas.height; // get directional Y

      // for all aircraft
      if (obj["type"] == "aircraft") {
        map_canvas_ctx.fillStyle = obj["color"];
        map_canvas_ctx.beginPath();
        map_canvas_ctx.arc(x,y,3,0,2*Math.PI);
        map_canvas_ctx.fill();
      }
    }
  }
}

// TODO
// On mouse scroll zoom
function onmousewheel(event) {
    // cross-browser wheel delta
    let e = window.event || e; // old IE support
    let x = e.clientX;
    let y = e.clientY;
    let delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

    console.log(x, y);
    if (map_loaded) {
      if (delta == 1) {
        mapControls.zoom = mapControls.zoom + 0.1;
      } else {
        mapControls.zoom = mapControls.zoom - 0.1;
      }
    }

    return false;
}

// on page load call init(); Keep at bottom!
$(function(){
  init();
});
