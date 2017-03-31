var fps = 60;
var fov = 250;

var yaw = 0;
var pitch = 0;

var density_threshold = 0.6;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

var DMap;
var dataView;

var points = new Array();

init();

var mainloop;
clearInterval(mainloop);



function init()
{
	loadServerMRC("density_map.mrc");

	var numPoints = 00;

	for (var i = 0; i < numPoints; i++)
	{
		p = new Point((Math.random() * 200) - 100, (Math.random() * 200) - 100, (Math
			.random() * 200) - 100); // -200 <= x <= 200
		points.push(p);
	}
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	Object.keys(DMap).forEach(function(key, i)
	{
		ctx.fillText(key + ": " + eval("DMap." + key), 15, 15 + i * 15);
		// key: the name of the object key
		// index: the ordinal position of the key within the object 
	});

	for (var i = 0; i < points.length; i++)
	{
		points[i].draw();
	}

}

// Loads a MRC file (or any binary file) located on the web server.
// It then populates a Density Map object with the corresponding data.
function loadServerMRC(file)
{
	var oReq = new XMLHttpRequest();
	oReq.open("GET", "/" + file, true);
	oReq.responseType = "arraybuffer";

	oReq.onload = function(oEvent)
	{
		var arrayBuffer = oReq.response; // Note: not oReq.responseText
		if (arrayBuffer)
		{
			var byteArray = new Uint8Array(arrayBuffer);

			dataView = new DataView(arrayBuffer);

			DMap = new DensityMap();

			mainloop = setInterval("main();", 1000 / fps);

			//			window.alert(DMap.gamma);

			//			for (var i = 0; i < byteArray.byteLength; i++)
			//			{
			//				window.alert(byteArray[i]);
			//	    	}
		}
	};

	oReq.send(null);
}

document.getElementById('density_threshold').addEventListener('change',
	changeDensity, false);

function changeDensity(evt)
{
	density_threshold = evt.target.value;

	DMap = new DensityMap();
}

document.getElementById('mrc_file').addEventListener('change', loadLocalMRC,
	false);

function loadLocalMRC(evt)
{
	var file = evt.target.files[0];

	var fileReader = new FileReader();

	fileReader.readAsArrayBuffer(file);

	fileReader.onload = function(oEvent)
	{
		var arrayBuffer = oEvent.target.result;
		if (arrayBuffer)
		{
			var byteArray = new Uint8Array(arrayBuffer);

			dataView = new DataView(arrayBuffer);

			DMap = new DensityMap();

			//			mainloop = setInterval("main();",1000/fps);

			//			window.alert(DMap.gamma);

			//			for (var i = 0; i < byteArray.byteLength; i++)
			//			{
			//				window.alert(byteArray[i]);
			//	    	}
		}
	};
}


function readInt(i)
{
	i *= 4;
	return dataView.getInt32(i, true);
}

function readFloat(i)
{
	i *= 4;
	return dataView.getFloat32(i, true);
}


function createArray(length)
{
	var arr = new Array(length || 0),
		i = length;

	if (arguments.length > 1)
	{
		var args = Array.prototype.slice.call(arguments, 1);
		while (i--) arr[length - 1 - i] = createArray.apply(this, args);
	}

	return arr;
}


function DensityMap()
{
	this.nx = readInt(0);
	this.ny = readInt(1);
	this.nz = readInt(2);
	this.mode = readInt(3);

	this.nxstart = readInt(4);
	this.nystart = readInt(5);
	this.nzstart = readInt(6);

	this.mx = readInt(7);
	this.my = readInt(8);
	this.mz = readInt(9);

	this.xlength = readFloat(10);
	this.ylength = readFloat(11);
	this.zlength = readFloat(12);

	this.alpha = readFloat(13);
	this.beta = readFloat(14);
	this.gamma = readFloat(15);

	this.mapc = readInt(16);
	this.mapr = readInt(17);
	this.maps = readInt(18);

	this.amin = readFloat(19);
	this.amax = readFloat(20);
	this.amean = readFloat(21);

	this.ispg = readInt(22);
	this.nsymbt = readInt(23);

	// Extra 29 ints of storage space

	this.xorigin = readInt(23 + 29 + 1);
	this.yorigin = readInt(23 + 29 + 2);

	this.nlabl = readInt(23 + 29 + 3);

	voxel = createArray(this.nx, this.ny, this.nz);

	var x_avg = 0;
	var y_avg = 0;
	var z_avg = 0;

	var num = 0;

	for (var z = 0; z < this.nz; z++)
	{
		for (var y = 0; y < this.ny; y++)
		{
			for (var x = 0; x < this.nx; x++)
			{
				var density = readFloat(256 + (z * this.nx * this.ny + y * this.nx + x));
				if (density > density_threshold)
				{
					num++;

					x_avg += x;
					y_avg += y;
					z_avg += z;
				}
			}
		}
	}

	x_avg /= num;
	y_avg /= num;
	z_avg /= num;


	points = points.splice(0, 0);

	for (var z = 0; z < this.nz; z++)
	{
		for (var y = 0; y < this.ny; y++)
		{
			for (var x = 0; x < this.nx; x++)
			{
				var density = readFloat(256 + (z * this.nx * this.ny + y * this.nx + x));
				if (density > density_threshold)
				{
					var scale = 5;
					var p = new Point((x - x_avg) * scale, (y - y_avg) * scale, (z - z_avg) *
						scale);
					points.push(p);
				}
			}
		}
	}

}

DensityMap.prototype.draw = function()
{


	for (var z = 0; z < this.nz; z++)
	{
		for (var y = 0; y < this.ny; y++)
		{
			for (var x = 0; x < this.nx; x++)
			{
				if (voxel[x][y][z] > 0)
				{

					scale = fov / (fov + z);

					x2d = (x * scale) + cvs.width / 2;
					y2d = (y * scale) + cvs.height / 2;

					if (scale > 0)
					{
						ctx.beginPath();
						ctx.fillStyle = this.color;
						ctx.arc(x2d, y2d, scale, 0, Math.PI * 2, true);
						ctx.fill();
					}
				}

			}
		}
	}


};


function Point(x, y, z, color = "black")
{
	this.x = x;
	this.y = y;
	this.z = z;
	this.color = color;
}

Point.prototype.draw = function()
{
	var x3d = this.x;
	var y3d = this.y;
	var z3d = this.z;
	this.scale = fov / (fov + z3d);
	this.x2d = (x3d * this.scale) + cvs.width / 2;
	this.y2d = (y3d * this.scale) + cvs.height / 2;

	if (this.scale > 0)
	{
		ctx.beginPath();
		ctx.fillStyle = this.color;
		ctx.arc(this.x2d, this.y2d, this.scale, 0, Math.PI * 2, true);
		ctx.fill();
	}
};

Point.prototype.dist = function(x, y)
{
	return Math.sqrt(Math.pow(this.x2d - x, 2) + Math.pow(this.y2d - y, 2));
};

Point.prototype.moveTo = function(x, y)
{
	this.x = x;
	this.y = y;
};

Point.prototype.scaleFactor = function(factor)
{
	this.x *= factor;
	this.y *= factor;
	this.z *= factor;
};

Point.prototype.rotateX = function(angle)
{
	y = this.y;
	z = this.z;

	var cosRX = Math.cos(angle);
	var sinRX = Math.sin(angle);

	tempy = y;
	tempz = z;

	y = (tempy * cosRX) + (tempz * -sinRX);
	z = (tempy * sinRX) + (tempz * cosRX);

	this.y = y;
	this.z = z;
}

Point.prototype.rotateY = function(angle)
{
	x = this.x;
	z = this.z;

	var cosRY = Math.cos(angle);
	var sinRY = Math.sin(angle);

	tempx = x;
	tempz = z;

	x = (tempx * cosRY) + (tempz * sinRY);
	z = (tempx * -sinRY) + (tempz * cosRY);

	this.x = x;
	this.z = z;
}

function closestPoint(x, y)
{
	var closestID = 0;
	closestDistance = 99999;

	currentDistance = 0;

	for (var i = 0; i < points.length; i++)
	{
		currentDistance = points[i].dist(x, y);
		if (currentDistance < closestDistance)
		{
			closestID = i;
			closestDistance = currentDistance;
		}
	}

	return closestID;
}








function Mouse()
{
	this.x = 0;
	this.y = 0;
	this.down = false;
	this.inside = false;
	this.rclick = false;
}

Mouse.draw = function()
{
	ctx.beginPath();
	ctx.arc(Mouse.x, Mouse.y, 5, 0, Math.PI * 2, true);
	ctx.fill();
};

Mouse.updatePos = function(evt)
{
	var rect = cvs.getBoundingClientRect();
	this.x = (evt.clientX - rect.left - 1);
	this.y = (evt.clientY - rect.top - 1);
};








cvs.addEventListener('mousemove', function(evt)
{
	var old_x = Mouse.x;
	var old_y = Mouse.y;
	Mouse.updatePos(evt)
	var new_x = Mouse.x;
	var new_y = Mouse.y;

	var changed = (old_x != new_x) || (old_y != new_y);

	if (Mouse.holding)
	{
		if (old_y != new_y)
		{
			delta_pitch = (new_y - old_y) * .006;
			if (pitch + delta_pitch <= 90 / 180 * 3.1415 && pitch + delta_pitch >= -90 /
				180 * 3.1415)
			{
				pitch += delta_pitch;
				for (var i = 0; i < points.length; i++)
				{
					points[i].rotateX(delta_pitch);
				}
			}
		}

		if (old_x != new_x)
		{
			var unpitch = false;
			if (pitch != 0)
			{
				for (var i = 0; i < points.length; i++)
				{
					points[i].rotateX(-pitch);
					unpitch = true;
				}
			}

			delta_yaw = (old_x - new_x) * .006;
			yaw += delta_yaw;
			for (var i = 0; i < points.length; i++)
			{
				points[i].rotateY(delta_yaw);
			}

			if (unpitch)
			{
				for (var i = 0; i < points.length; i++)
				{
					points[i].rotateX(pitch);
				}
			}
		}

	}

}, false);

cvs.addEventListener('mousedown', function(evt)
{
	Mouse.holding = true;
}, false);

cvs.addEventListener('mouseleave', function(evt)
{
	Mouse.holding = false;
}, false);

cvs.addEventListener('mouseup', function(evt)
{
	Mouse.holding = false;
}, false);

cvs.addEventListener('dblclick', function(evt) {

}, false);

cvs.addEventListener('mousewheel', function(evt)
{
	var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
	evt.preventDefault();
	return false;
}, false);

cvs.addEventListener("DOMMouseScroll", function(evt)
{
	var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));

	for (var i = 0; i < points.length; i++)
	{
		points[i].scaleFactor(1 + delta * .1);
	}

	evt.preventDefault();
	return false;
}, false);
