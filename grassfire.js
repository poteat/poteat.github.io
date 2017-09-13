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

	var grid = new Array(this.width);
	for (var i = 0; i < grid.length; i++)
	{
		grid[i] = new Array(this.height);
		for (var j = 0; j < grid[i].length; j++)
		{
			var pixel_index = (i + j*this.height)*4;
			var pixel_value = imagedata.data[pixel_index+3];

			if (pixel_value == 0)
			{
				pixel_value = 0;
			}
			else
			{
				pixel_value = 1;
			}

			grid[i][j] = pixel_value;
		}
	}


	for (var i = 0; i < grid.length; i++)
	{
		for (var j = 0; j < grid[i].length; j++)
		{
			try{var north = grid[i][j-1];}
			catch(e){var north = 0;}
			
			try{var west = grid[i-1][j];}
			catch(e){var west = 0;}

			if (grid[i][j] != 0)
			{
				grid[i][j] = 1 + Math.min(north, west);
			}
		}
	}

	for (var i = grid.length - 1; i >= 0; i--)
	{
		for (var j = grid[i].length - 1; j >= 0; j--)
		{
			try{var south = grid[i][j+1];}
			catch(e){var south = 0;}

			try{var east = grid[i+1][j];}
			catch(e){var east = 0;}

			if (grid[i][j] != 0)
			{
				grid[i][j] = 1 + Math.min(grid[i][j], south, east);
			}
		}
	}



	// find max grid number

	var max = 0;

	for (var i = 0; i < grid.length; i++)
	{
		for (var j = 0; j < grid[i].length; j++)
		{
			var v = grid[i][j];

			if (v > max)
			{
				max = v;
			}
		}
	}

	console.log(max);



	// Go through grid and set number based on percentage of max (*255);

	for (var i = 0; i < grid.length; i++)
	{
		for (var j = 0; j < grid[i].length; j++)
		{
			grid[i][j] = grid[i][j] / max * 255;
			var pixel_index = (i + j*this.height)*4;
			var value = grid[i][j];

			if (value == 0)
			{
				value = 255;
			}

			imagedata.data[pixel_index] = value;
			imagedata.data[pixel_index + 1] = value;
			imagedata.data[pixel_index + 2] = value;
			imagedata.data[pixel_index + 3] = 255;
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