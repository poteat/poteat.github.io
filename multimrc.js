

var fps = 10;
var fov = 250;

var yaw = 0;
var pitch = 0;
var zoom = 1;

var density_threshold = 0.65;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

var mainloop;
clearInterval(mainloop);


function init()
{
	document.getElementById('mrc_file_1').addEventListener('change', loadLocalMRC, false);
	document.getElementById('mrc_file_2').addEventListener('change', loadLocalMRC, false);

	loadServerMRC("density_map.mrc");
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	for (var i = 0; i < DensityMaps.length; i++)
	{
		DensityMaps[i].draw();
	}
}

loadServerMRC = function(file)
{
	var oReq = new XMLHttpRequest();
	oReq.open("GET", "/" + file, true);
	oReq.responseType = "arraybuffer";

	oReq.onload = function (oEvent)
	{
		var arrayBuffer = oReq.response; // Note: not oReq.responseText
		if (arrayBuffer)
		{
			var byteArray = new Uint8Array(arrayBuffer);

			dataView = new DataView(arrayBuffer);

			new_map_id = Create_DensityMap(dataView);

			mainloop = setInterval("main();",1000/fps);
		}
	};

	oReq.send(null);
};

loadLocalMRC = function(evt)
{
	var num = (evt.target.id).replace("mrc_file_","") - 1;

	var file = evt.target.files[0];

	var fileReader = new FileReader();

	fileReader.readAsArrayBuffer(file);

	fileReader.onload = function (oEvent)
	{
		var arrayBuffer = oEvent.target.result;
		if (arrayBuffer)
		{
			var byteArray = new Uint8Array(arrayBuffer);

			dataView = new DataView(arrayBuffer);

			if (num == 0)
			{
				DensityMaps[num] = new DensityMap(dataView, "black")
			}
			else if (num < DensityMaps.length)
			{
				DensityMaps[num] = new DensityMap(dataView, "darkblue")
			}
			else
			{
				new_map_id = Create_DensityMap(dataView, "darkblue");

			}
		}
	};

}








var DensityMaps = new Array();

function Create_DensityMap(dataView, color = "black")
{
	var id = DensityMaps.length;
	DensityMaps.push(new DensityMap(dataView, color, id));

	return id;
}

function DensityMap(dataView, color, id)
{
	this.dataView = dataView;
	this.id = id;
	this.color = color;

	this.nx = this.readInt(0);
	this.ny = this.readInt(1);
	this.nz = this.readInt(2);
	this.mode = this.readInt(3);

	this.nxstart = this.readInt(4);
	this.nystart = this.readInt(5);
	this.nzstart = this.readInt(6);

	this.mx = this.readInt(7);
	this.my = this.readInt(8);
	this.mz = this.readInt(9);

	this.xlength = this.readFloat(10);
	this.ylength = this.readFloat(11);
	this.zlength = this.readFloat(12);

	this.alpha = this.readFloat(13);
	this.beta = this.readFloat(14);
	this.gamma = this.readFloat(15);

	this.mapc = this.readInt(16);
	this.mapr = this.readInt(17);
	this.maps = this.readInt(18);

	this.amin = this.readFloat(19);
	this.amax = this.readFloat(20);
	this.amean = this.readFloat(21);

	this.ispg = this.readInt(22);
	this.nsymbt = this.readInt(23);

	// Extra 29 ints of storage space

	this.xorigin = this.readFloat(23+29+1);
	this.yorigin = this.readFloat(23+29+2);

	this.nlabl = this.readInt(23+29+3);

	voxel = new Array();

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
				var density = this.readFloat(256 + (z*this.nx*this.ny + y*this.nx + x));
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

	this.structure = new Array(); // Immutable data points
	this.points = new Array(); // Points in camera space

	for (var z = 0; z < this.nz; z++)
	{
		for (var y = 0; y < this.ny; y++)
		{
			for (var x = 0; x < this.nx; x++)
			{
				var density = this.readFloat(256 + (z*this.nx*this.ny + y*this.nx + x));
				if (density > density_threshold)
				{
					var scale = 5;
					var p = new Point((x - x_avg)*scale, (y - y_avg)*scale, (z - z_avg)*scale, this.color);
					this.structure.push(p);
					this.points.push(p);
				}
			}
		}
	}

}

DensityMap.prototype.draw = function()
{
	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i].draw();
	}
};

DensityMap.prototype.changeDensity = function(evt)
{
	density_threshold = evt.target.value;

	DMap = new DensityMap();
};

DensityMap.prototype.readInt = function(i)
{
	i *= 4;
	return dataView.getInt32(i, true);
};

DensityMap.prototype.readFloat = function(i)
{
	i *= 4;
	return dataView.getFloat32(i, true);
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
	this.scale = fov/(fov+z3d); 
	this.x2d = (x3d * this.scale) + cvs.width/2;	
	this.y2d = (y3d * this.scale)  + cvs.height/2;

    if (this.scale > 0)
    {
	    ctx.beginPath();
	    ctx.fillStyle = this.color;
	    ctx.arc(this.x2d, this.y2d, this.scale, 0, Math.PI*2, true);
	    ctx.fill();
    }
};

Point.prototype.dist = function(x, y)
{
	return Math.sqrt( Math.pow(this.x2d - x, 2) + Math.pow(this.y2d - y, 2) );
};

Point.prototype.planeDist = function(A, B, C, D)
{
	return Math.abs(A*this.x + B*this.y + C*this.z + D)/Math.sqrt(A*A + B*B + C*C);
};

Point.prototype.moveTo = function(x, y)
{
    this.x = x;
    this.y = y;
};

Point.prototype.scaleFactor = function(factor)
{
	var p = new Point(this.x, this.y, this.z, this.color);

	p.x *= factor;
	p.y *= factor;
	p.z *= factor;

	return p;
};

Point.prototype.rotateX = function(angle)
{
	var p = new Point(this.x, this.y, this.z, this.color);

	y = this.y;
	z = this.z;

	var cosRX = Math.cos(angle);
	var sinRX = Math.sin(angle);

	tempy = y;
	tempz = z;

	y = (tempy * cosRX) + (tempz * -sinRX);
	z = (tempy * sinRX) + (tempz * cosRX);

	p.y = y;
	p.z = z;

	return p;
};

Point.prototype.rotateY = function(angle)
{
	var p = new Point(this.x, this.y, this.z, this.color);

	x = this.x;
	z = this.z;

	var cosRY = Math.cos(angle);
	var sinRY = Math.sin(angle);

	tempx = x;
	tempz = z;

	x = (tempx * cosRY) + (tempz * sinRY);
	z = (tempx * -sinRY) + (tempz * cosRY);

	p.x = x;
	p.z = z;

	return p;
};











































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
	ctx.arc(Mouse.x, Mouse.y, 5, 0, Math.PI*2, true);
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
		if (changed)
		{

			for (var i = 0; i < DensityMaps.length; i++)
			{
				for (var j = 0; j < DensityMaps[i].points.length; j++)
				{
					DensityMaps[i].points[j] = DensityMaps[i].structure[j].scaleFactor(zoom);
				}
			}
		}


		if (changed)
		{
			delta_pitch = (new_y - old_y)*.006;
			if (pitch + delta_pitch <= 90/180*3.1415 && pitch + delta_pitch >= -90/180*3.1415)
			{
				pitch += delta_pitch;
			}

			for (var i = 0; i < DensityMaps.length; i++)
			{
				for (var j = 0; j < DensityMaps[i].points.length; j++)
				{
					DensityMaps[i].points[j] = DensityMaps[i].points[j].rotateX(pitch);
				}
			}
		}

		if (changed)
		{
			var unpitch = false;
			if (pitch != 0)
			{

				for (var i = 0; i < DensityMaps.length; i++)
				{
					for (var j = 0; j < DensityMaps[i].points.length; j++)
					{
						DensityMaps[i].points[j] = DensityMaps[i].points[j].rotateX(-pitch);
					}
				}
				unpitch = true;
			}

			delta_yaw = (old_x - new_x)*.006;
			yaw += delta_yaw;

			for (var i = 0; i < DensityMaps.length; i++)
			{
				for (var j = 0; j < DensityMaps[i].points.length; j++)
				{
					DensityMaps[i].points[j] = DensityMaps[i].points[j].rotateY(yaw);
				}
			}

			if (unpitch)
			{

				for (var i = 0; i < DensityMaps.length; i++)
				{
					for (var j = 0; j < DensityMaps[i].points.length; j++)
					{
						DensityMaps[i].points[j] = DensityMaps[i].points[j].rotateX(pitch);
					}
				}
			}
		}

	}

}, false);

cvs.addEventListener('mousedown', function(evt)
{
	Mouse.down = true;

	// Check if the mouse is over any toggle or slider elements
	var hovering = false;


	if (hovering == false)
	{
		Mouse.holding = true; // Used for rotation
	}
   	
}, false);

cvs.addEventListener('mouseleave', function(evt)
{
	Mouse.holding = false;
	Mouse.objHeld = null;

	Mouse.down = false;
}, false);

cvs.addEventListener('mouseup', function(evt)
{
	Mouse.holding = false;
	Mouse.objHeld = null;

	Mouse.down = false;
}, false);

cvs.addEventListener('dblclick', function(evt)
{

}, false);

cvs.addEventListener('mousewheel',function(evt)
{
	var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
	evt.preventDefault();
    return false; 
}, false);

cvs.addEventListener("DOMMouseScroll",function(evt)
{
	var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));

	zoom *= (1 + delta*.1)

	for (var i = 0; i < DensityMaps.length; i++)
	{
		for (var j = 0; j < DensityMaps[i].points.length; j++)
		{
			DensityMaps[i].points[j] = DensityMaps[i].points[j].scaleFactor(1 + delta*.1);
		}
	}

	evt.preventDefault();
	return false;
}, false);


init();