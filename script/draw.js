class canvasDrawable {
    constructor(c) {
        this.canvas = document.getElementById(c);
        this.ctx = this.canvas.getContext("2d");

        this.background = {
            image: null,
            color: "#000",
            mode: "original",
            width: 100,
            height: 100
        };

        this.zoom = 1;
        this.minZoom = 1;

        this.lastFrame = 0;
    }

    // background image setter
    setBackgroundImage(path) {
        if (!this.background.image) {
            let image = document.createElement("img");
            this.background.image = image;
            if (DEBUG) console.log("initializing background image element");
            
            // Wait for image load to set dimensions
            this.background.image.onload = function() {
                if (DEBUG) console.log("Image done loading");

                let naturalWidth = this.background.image.naturalWidth;
                let naturalHeight = this.background.image.naturalHeight;

                // correct aspect ratio
                if (naturalWidth > naturalHeight) {
                    this.zoom = this.canvas.width / naturalWidth;
                } else {
                    this.zoom = this.canvas.height / naturalHeight;
                }
                this.minZoom = this.zoom;

                this.background.width = naturalWidth;
                this.background.height = naturalHeight;
            }.bind(this);
        }
        // change image path
        this.background.image.src = path;
    }

    setZoom(z) {
        this.zoom = z;
    }

    getZoom() {
        return this.zoom;
    }

    drawCanvas(t) {
        // always fill background color
        this.ctx.fillStyle = this.background.color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        // attempt to draw background image
        if (this.background.image) {
            this.ctx.drawImage(this.background.image, 0, 0, this.background.width*this.zoom, this.background.height*this.zoom);
        }

        // remove this from release
        if (DEBUG) {
            let dt = (t-this.lastFrame)/1000;
            this.lastFrame = t;
            this.ctx.fillStyle = "#0F0";
            this.ctx.font = "15px monospace";
            this.ctx.fillText("WT-RTTMV", 2, 14);
            this.ctx.fillText(Math.floor(1/dt) + " FPS", 2, 30);
        }

        requestAnimationFrame(this.drawCanvas.bind(this));
    }
}
