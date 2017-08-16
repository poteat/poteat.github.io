var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');
var grassfire_button = document.getElementById('run_grassfire');

var Mouse = new Mouse();
var Pix_Canvas = new PixelCanvas();

clearInterval(mainloop);
var mainloop = setInterval("main();", 1000 / fps);

function main()
{
    //ctx.clearRect(0, 0, cvs.width, cvs.height);

    Pix_Canvas.draw();
}




function PixelCanvas()
{
    this.width = cvs.width;
    this.height = cvs.height;

    // Create two-dimensional pixel_array(x, y)

    this.pixel_array = new Array(this.width);

    for (var i = 0; i < this.pixel_array.length; i++)
    {
        this.pixel_array[i] = new Array(this.height);

        for (var j = 0; j < this.pixel_array[i].length; j++)
        {
        	this.pixel_array[i][j] = 255;
        }
    }
}

PixelCanvas.prototype.draw = function()
{
	if (Mouse.down)
	{
		console.log("Mouse is down");
		ctx.beginPath();
		ctx.arc(Mouse.x, Mouse.y, 10, 2 * Math.PI, false);
		ctx.fillStyle = "black";
		ctx.fill();

		ctx.lineWidth = 20;

		ctx.beginPath();
		ctx.moveTo(Mouse.x, Mouse.y);
		ctx.lineTo(this.prev_x, this.prev_y);
		ctx.stroke();
	}

	this.prev_x = Mouse.x;
	this.prev_y = Mouse.y;
}

PixelCanvas.prototype.grassfire = function()
{
	var imagedata = ctx.getImageData(0, 0, this.width, this.height);

	for (var x = 0; x < this.width; x++)
	{
		for (var y = 0; y < this.height; y++)
		{
			var i = (x + y*this.height)*4;

			if (imagedata.data[i] == 0)
			{
				imagedata.data[i] = 128;
				imagedata.data[i+1] = 128;
				imagedata.data[i+2] = 128;
			}
		}
	}

	ctx.putImageData(imagedata, 0, 0);
}



grassfire_button.addEventListener('mousedown', function(evt)
{
	console.log("Running grassfire");
	Pix_Canvas.grassfire();
}, false);





function Mouse()
{
    this.x = 0;
    this.y = 0;
    this.down = false;
}

Mouse.draw = function()
{
    ctx.beginPath();
    ctx.arc(Mouse.x, Mouse.y, 5, 0, Math.PI * 2, true);
    ctx.fill();
}

Mouse.updatePos = function(evt)
{
    var rect = cvs.getBoundingClientRect();
    this.x = evt.clientX - rect.left - 1;
    this.y = evt.clientY - rect.top - 1;
}

cvs.addEventListener('mousemove', function(evt)
{
    Mouse.updatePos(evt)
}, false)

cvs.addEventListener('mousedown', function(evt)
{
    Mouse.down = true;
}, false)

cvs.addEventListener('mouseleave', function(evt)
{
    Mouse.down = false;
}, false)

cvs.addEventListener('mouseup', function(evt)
{
    Mouse.down = false;
}, false)