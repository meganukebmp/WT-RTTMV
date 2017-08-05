"use strict";

var map_generation;
var map_image = new Image();
var map_canvas;
var map_canvas_ctx;
var map_grid_color = "white"; // color for grid and text

// locations of the data we're parsing.
var dataLocations  = {
  "state"     : "state",        // various states of aircraft. Speed, flaps, etc
  "mission"   : "mission.json", // the mission breifing
  "map_info"  : "map_info.json",// unsure
  "gamechat"  : "gamechat",     // chat, unknown format
  "indicators": "indicators",   // unsure
  "map_obj"   : "map_obj.json", // an array of objects on map.
  "map.img"   : "map.img"       // Generate new with ?gen=N. N from map_info
};
// store data here;
var dataObjects = {
  "state":null,"mission":null,"map_info":null,
  "gamechat":null,"indicators":null,"map_obj":null
};

// initialization function. Ran on page load
function init() {

  map_canvas = document.getElementById("map_canvas");
  map_canvas_ctx = map_canvas.getContext("2d");

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
  //request_data("map_obj");
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
      dataObjects[this.indexValue.target] = null; // update value in dataObjects
    });
  }
}

// use the gen= function to grap map.img
function generate_map() {
  // if map_info
  if (dataObjects["map_info"]) {
    // update map if old map != new map
    if (map_generation != dataObjects["map_info"]["map_generation"]) {
      map_generation = dataObjects["map_info"]["map_generation"]; // get map ID from json
      map_image.src = "http://localhost:8111/map.img?gen=" + map_generation; // change map image
    };
  }
}

// most drawing will happen here. every 25ms
function draw_map() {
  // match canvas to parent.
  map_canvas.width = $(map_canvas).parent().width();
  map_canvas.height = $(map_canvas).parent().height();;
  // do some aspect ratio calculations for when we're rescaling.
  let ratio = map_image.width / map_image.height;
  let pratio = map_canvas.width / map_canvas.height;
  // do some aspect ratio calculations
  let imageScale;
  if (ratio<pratio) {
    imageScale = map_canvas.height / map_image.height;
  }
  else {
    imageScale = map_canvas.width / map_image.width;
  }

  // clear canvas
  map_canvas_ctx.clearRect(0, 0, map_canvas.width, map_canvas.height);
  // draw map
  map_canvas_ctx.drawImage(map_image, 0, 0, map_image.width*imageScale, map_image.height*imageScale);
  // draw grid
  draw_map_grid(imageScale);
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
      map_canvas_ctx.fillText(i+1,i*gridStep+gridStep/2, 10);
      map_canvas_ctx.textAlign = "right"; // text positioning
      // draw letters by calling fromCharCode()
      map_canvas_ctx.fillText(String.fromCharCode(97+i).toUpperCase(), 10, i*gridStep+gridStep/2);
    }
  }
}

// on page load call init(); Keep at bottom!
$(function(){
  init();
});
