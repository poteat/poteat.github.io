





// GLOBAL SCOPE DECLARATIVE HEADER
//
	// Camera and animation parameters
	var fps = 25;
	var fov = 250;
	var yaw = 10;
	var pitch = 0.7;
	var zoom = 1;

	// Canvas and drawing DOM objects
	var cvs = document.getElementById('canvas');
	var ctx = cvs.getContext('2d');

	// Global object declarations
	var Mouse = new Mouse();
	var BSurface;
	var DemingRegressor;
	var BProj;

	// Program entry and loop definition
	clearInterval(mainloop);
	var mainloop = setInterval("main();",1000/fps);
//






// Program entry point, runs once at initialization of application.
function init()
{
	loadServerMRC("density_map.mrc");

	BSurface = new Surface(4, 4, 30, 30);

	BPlane = new Plane(1, -3, 1, 2);

	BProj = new Projection();

	// BProj.appendPoint(0, 50, 0);

	updateTransformedPoints();
}




// Main program control loop, responsible for draw calls.
function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	BSurface.draw();
	if (DMap != undefined)
	{
		DMap.draw();
	}

	if (DMap != undefined)
	{
		var score = DMap.score();
		var normalized = Math.sqrt(score/DMap.points.length)

		ctx.fillText("Score: " + score, 10, 20);
		ctx.fillText("Normalized Score: " + normalized, 10, 30);
		ctx.fillText("Number of points: " + DMap.points.length, 10, 40);

		if (BSurface.finished)
		{
			ctx.fillText("Surface-Fitting Completed", 10, 50);
		}

	}

	if (DMap != undefined)
	{
		if (BPlane.finished == false)
		{
			var change = BPlane.optimize();
			var score = BPlane.score();

			BPlane.last_score = score;

			ctx.fillText("Plane Score: " + score, 10, 60);
			ctx.fillText("Change: " + change, 10, 70);

			if (change < .000001)
			{
				// Rotate DMap
				BPlane.finished = true;

				DMap.rotateAxis(Math.acos(BPlane.B), BPlane.C, 0, -BPlane.A);

				DMap.updateTransformedPoints();

				// Calculate bounding box
				DMap.calculateBoundingBox();
			}

			BPlane.draw();
		}
		else
		{
			ctx.fillText("Plane Score: " + BPlane.last_score, 10, 70);
			ctx.fillText("Plane-Fitting Completed", 10, 80);
		}
	}
}






// updateTransformedPoints()
// ----------------------------------------------------------------------
// This function updates the "camera-transformed" set of points belonging to each object.
// The transformation consists of two rotations around the Y and X axes, by the yaw and
// pitch camera angles respectively.  There is also a scaling transformation for zoom.

function updateTransformedPoints()
{
	BSurface.updateTransformedPoints();
	if (DMap != undefined)
	{
		DMap.updateTransformedPoints();
	}

	BProj.updateTransformedPoints();
}










// ----------------------------------------------------------------------
// Global mathematical functions.
// ----------------------------------------------------------------------

// sign(x) returns -1 if x is negative, 1 if x is positive, and 0 if x is zero.
function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

// binomial(n,k) returns the binomial coefficient of n, k.  i.e. N select K.  Used primarily
// for generating surface points.
function binomial(n, k)
{
	var prod = 1;
	for (i = 1; i <= k; i++)
	{
		prod *= (n + 1 - i)/i;
	}

	return prod;
}





















function loadServerMRC(file)
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

			DMap = new DensityMap();
	
			updateTransformedPoints();

			mainloop = setInterval("main();",1000/fps);
		}
	};

	oReq.send(null);
}

var DMap;
var dataView;
var density_threshold = 0.65;

document.getElementById('density_threshold').addEventListener('change', changeDensity, false);

function changeDensity(evt)
{
	density_threshold = evt.target.value;

	BPlane = new Plane(1, -3, 1, 2);

	DMap = new DensityMap();
}

document.getElementById('mrc_file').addEventListener('change', loadLocalMRC, false);

function loadLocalMRC(evt)
{
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

			DMap = new DensityMap();

			updateTransformedPoints();

			if (BPlane != undefined)
			{
				BPlane = new Plane(1, -3, 1, 2);
				// Refit the new image
			}
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


function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
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

	this.xorigin = readFloat(23+29+1);
	this.yorigin = readFloat(23+29+2);

	this.nlabl = readInt(23+29+3);

	voxel = createArray(this.nx, this.ny, this.nz);

	var x_avg = 0;
	var y_avg = 0;
	var z_avg = 0;

	var num = 0;

	// Find center of data points (above threshold)
	for (var z = 0; z < this.nz; z++)
	{
		for (var y = 0; y < this.ny; y++)
		{
			for (var x = 0; x < this.nx; x++)
			{
				var density = readFloat(256 + (z*this.nx*this.ny + y*this.nx + x));
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

	this.points = new Array(); // Immutable data points
	this.points_T = new Array(); // Points in camera space

	for (var z = 0; z < this.nz; z++)
	{
		for (var y = 0; y < this.ny; y++)
		{
			for (var x = 0; x < this.nx; x++)
			{
				var density = readFloat(256 + (z*this.nx*this.ny + y*this.nx + x));
				if (density > density_threshold)
				{
					var scale = 5;
					var p = new Point((x - x_avg)*scale, (y - y_avg)*scale, (z - z_avg)*scale);
					var p2 = new Point(0, 0, 0);
					this.points.push(p);
					this.points_T.push(p2);
				}
			}
		}
	}


	this.updateTransformedPoints();
}

DensityMap.prototype.updateTransformedPoints = function()
{
	for (var i = 0; i < this.points.length; i++)
	{
		this.points_T[i].moveTo(this.points[i]);
		this.points_T[i].scaleFactor(zoom);
		this.points_T[i].rotateY(yaw);
		this.points_T[i].rotateX(pitch);
	}
};

var t = 0;
var lim = 10;

DensityMap.prototype.draw = function()
{
	for (var i = 0; i < this.points.length; i++)
	{
		this.points_T[i].draw();
	}

	if (t == lim)
	{
		for (var i = 0; i < this.points.length; i++)
		{
			var p = this.points[i];
			p.findClosestResPoint();
			p.refineProjection();
		}

		t = 0;
	}
	else
	{
		t++;
	}

	for (var i = 0; i < this.points.length; i++)
	{
			var p = this.points[i];
			var p_draw = this.points_T[i]
			coords = BSurface.calc(p.t, p.u);

			var proj = new Point(coords[0], coords[1], coords[2]);
			proj.scaleFactor(zoom);
			proj.rotateY(yaw);
			proj.rotateX(pitch);
			proj.draw(false);

			ctx.beginPath();
			ctx.moveTo(p_draw.x2d, p_draw.y2d);
			ctx.lineTo(proj.x2d, proj.y2d);
			ctx.stroke();
	}
};

DensityMap.prototype.rotateAxis = function(ang, ux, uy, uz)
{
	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i].rotateAxis(ang, ux, uy, uz);
	}
};

DensityMap.prototype.score = function()
{
	var sum_dist = 0;

	for (var i = 0; i < this.points.length; i++)
	{
		var p = this.points[i];
		var coords = BSurface.calc(p.t, p.u);
		var proj = new Point(coords[0], coords[1], coords[2]);
		sum_dist += Math.pow(p.dist(proj),2);
	}

	return sum_dist;
};

DensityMap.prototype.calculateBoundingBox = function()
{
	var avgx = 0;
	var avgz = 0;
	for (var i = 0; i < this.points.length; i++)
	{
		avgx += this.points[i].x;
		avgz += this.points[i].z;
	}

	avgx /= this.points.length;
	avgz /= this.points.length;

	var vr_x = 0; // Variance of x
	var vr_z = 0; // Variance of z
	var covr = 0; // Covariance of x and z
	for (var i = 0; i < this.points.length; i++)
	{
		var delta_x = this.points[i].x - avgx;
		var delta_z = this.points[i].z - avgz;

		vr_x += Math.pow(delta_x, 2);
		vr_z += Math.pow(delta_z, 2);
		covr = delta_x * delta_z;
	}
	vr_x /= (this.points.length - 1);
	vr_z /= (this.points.length - 1);
	covr /= (this.points.length - 1);

	slope = (vr_z - vr_x + Math.sqrt(Math.pow(vr_z-vr_x, 2) + 4*Math.pow(covr, 2)))/(2*covr);
	intersect = avgz - slope*avgx;

	var min_dist = 1;
	var max_dist = -1;
	var min_dist_id = -1;
	var max_dist_id = -1;
	var min_proj_dist = 1;
	var max_proj_dist = -1;
	var min_proj_dist_id = -1;
	var max_proj_dist_id = -1;

	var m = slope;
	var b = intersect;

	for (var i = 0; i < this.points.length; i++)
	{
		var dist = this.points[i].distFromLine(m, b);

		if (dist < min_dist)
		{
			min_dist = dist;
			min_dist_id = i;
		}

		if (dist > max_dist)
		{
			max_dist = dist;
			max_dist_id = i;
		}

		var x = this.points[i].x;
		var z = this.points[i].z;

		var projection_x = (x + m*(z - b))/(Math.pow(m, 2) + 1);
		var projection_z = (m*(x + m*z) + b)/(Math.pow(m, 2) + 1);

		var direction = sign(projection_x - avgx);

		var proj_dist = direction*Math.sqrt(Math.pow(projection_x - avgx,2) + Math.pow(projection_z - avgz, 2));

		if (proj_dist < min_proj_dist)
		{
			min_proj_dist = proj_dist;
			min_proj_dist_id = i;
		}

		if (proj_dist > max_proj_dist)
		{
			max_proj_dist = proj_dist;
			max_proj_dist_id = i;
		}

		this.points[i].color = "black";
	}

	
	this.points[min_dist_id].color = "purple";
	this.points[min_dist_id].size = 5;
	this.points[max_dist_id].color = "purple";
	this.points[max_dist_id].size = 5;

	this.points[min_proj_dist_id].color = "green";
	this.points[min_proj_dist_id].size = 5;
	this.points[max_proj_dist_id].color = "green";
	this.points[max_proj_dist_id].size = 5;

	var p1 = this.points[min_dist_id];
	var p2 = this.points[min_proj_dist_id];
	var p3 = this.points[max_dist_id];
	var p4 = this.points[max_proj_dist_id];

	var array = [[p1,p2], [p4,p3]]

	BSurface.setControlPoints(array);
};



















function Surface(X, Y, T, U)
{
	this.X = X;
	this.Y = Y;
	this.T = T;
	this.U = U;


	// Control points determine the shape of the curve.  Here, we define
	//  an initial array of size X, Y of these control points.  As well,
	//  we define the array of camera-transformed control points

	this.controlPoints = new Array(X);
	this.controlPoints_T = new Array(X);

	for (var i = 0; i < X; i++)
	{
		this.controlPoints[i] = new Array(Y);
		this.controlPoints_T[i] = new Array(Y);
	}

	var lower = -50;
	var upper = 50;

	for (var i = 0; i < X; i++)
	{
		for (var j = 0; j < Y; j++)
		{
			var x = lower + i/(X-1)*(upper - lower);
			var z = lower + j/(X-1)*(upper - lower);

			var width = 0;

			var y = Math.random()*width*2 - width; // Between -width and width

			this.controlPoints[i][j] = new Point(x, y, z)
			this.controlPoints_T[i][j] = new Point(x, y, z, "black", 2);
		}
	}






	// resPoints (Resolution points) are the initial estimate points for the heuristic
	//  point-projection algorithm.  They are a low-resolution sample of the curve, an
	//  array of small enough size that it is not prohibitive to find the minimum distance
	//  of the array of points from one point.  We also define the transformed version.

	var RX = X + 1;
	var RY = Y + 1;

	this.RX = RX;
	this.RY = RY;

	this.resPoints = new Array(RX);
	this.resPoints_T = new Array(RX);

	for (var i = 0; i < RX; i++)
	{
		this.resPoints[i] = new Array(RY);
		this.resPoints_T[i] = new Array(RY);
	}

	// We only need to allocate the object array here.  The correct values will be calculated
	//  in updatePoints();
	for (var i = 0; i < RX; i++)
	{
		for (var j = 0; j < RY; j++)
		{
			this.resPoints[i][j] = new Point(0, 0, 0)
			this.resPoints_T[i][j] = new Point(0, 0, 0, "blue", 1);
		}
	}






	// Draw point are the sample points of the surface which we use the render and display
	//  the shape of the surface.  As well, we define the array of camera-transformed 
	//  sample points.  (Which we need, of course, to draw on the screen).

	this.drawPoints = new Array(T);
	this.drawPoints_T = new Array(T);

	for (var i = 0; i < T; i++)
	{
		this.drawPoints[i] = new Array(U);
		this.drawPoints_T[i] = new Array(U);
	}

	// We only need to allocate the object array of draw points here; the point locations
	//  are calculated in the updatePoints() function.
	for (var i = 0; i < T; i++)
	{
		for (var j = 0; j < U; j++)
		{
			this.drawPoints[i][j] = new Point(0, 0, 0);
			this.drawPoints_T[i][j] = new Point(0, 0, 0);
		}
	}

	this.updatePoints();
};

Surface.prototype.setControlPoints = function(array_of_points)
{


	/*
	this.X = array_of_points.length;
	this.Y = array_of_points[0].length;

	this.controlPoints = new Array(this.X);
	this.controlPoints_T = new Array(this.X);

	for (var i = 0; i < this.X; i++)
	{
		this.controlPoints[i] = new Array(this.Y);
		this.controlPoints_T[i] = new Array(this.Y);

		for (var j = 0; j < this.Y; j++)
		{
			var p_original = array_of_points[i][j]
			var p = new Point(0, 0, 0);
			p.moveTo(p_original);
			var p2 = new Point(0, 0, 0);

			this.controlPoints[i][j] = p;
			this.controlPoints_T[i][j] = p2;
		}
	}*/

	this.points[0][0] = array_of_points[0][0];
	this.points[0][3] = array_of_points[0][1];
	this.points[3][0] = array_of_points[1][0];
	this.points[3][3] = array_of_points[1][1];

	this.updatePoints();
	this.updateTransformedPoints();
}

Surface.prototype.updatePoints = function()
{
	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			var t = 2*i/(this.T-1)-.5;
			var u = 2*j/(this.U-1)-.5;

			var coords = this.calc(t, u);
			var p = this.drawPoints[i][j];

			p.x = coords[0];
			p.y = coords[1];
			p.z = coords[2];
		}
	}

	for (var i = 0; i < this.RX; i++)
	{
		for (var j = 0; j < this.RY; j++)
		{
			var t = i/(this.RX-1);
			var u = j/(this.RY-1);

			var coords = this.calc(t, u);
			var p = this.resPoints[i][j];

			p.x = coords[0];
			p.y = coords[1];
			p.z = coords[2];
		}
	}
};

var opt_t = 0;
var opt_lim = 10;

Surface.prototype.draw = function()
{
	if (!BPlane.finished || this.finished)
	{
		opt_t = 0;
	}

	if (opt_t == opt_lim)
	{
		var score = DMap.score();

		for (var i = 0; i < this.X; i++)
		{
			for (var j = 0; j < this.Y; j++)
			{
				var p = this.controlPoints[i][j];
				this.optimizeControlPoint(p);
			}
		}
		this.updatePoints();
		this.updateTransformedPoints();

		var new_score = DMap.score();

		if (score == new_score)
		{
			this.finished = false;
		}

		opt_t = 0;
	}
	else
	{
		opt_t++;
	}

	// 'Draw' surface points to calculate their 'scale' (if negative, outside of cam space)
	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			this.drawPoints_T[i][j].draw(false);
		}
	}

	// Draw surface wireframe

	ctx.strokeStyle = "grey";

	ctx.beginPath();

	var needToMove = false;

	for (var i = 0; i < this.T; i++)
	{
		var j = 0;

		var p = this.drawPoints_T[i][j];

		if (p.scale > 0)
		{
			ctx.moveTo(p.x2d, p.y2d);
		}
		else
		{
			needToMove = true;
		}
		


		for (var j = 0; j < this.U; j++)
		{
			var p = this.drawPoints_T[i][j];


			if (p.scale > 0)
			{
				if (!needToMove)
				{
					ctx.lineTo(p.x2d, p.y2d);
				}
				else
				{
					ctx.moveTo(p.x2d, p.y2d);
					needToMove = false;
				}
			}
		}
	}

	var needToMove = false;

	for (var i = 0; i < this.U; i++)
	{
		var j = 0;

		var p = this.drawPoints_T[j][i];

		if (p.scale > 0)
		{
			ctx.moveTo(p.x2d, p.y2d)
		}
		else
		{
			needToMove = true;
		}
		

		for (var j = 0; j < this.T; j++)
		{
			var p = this.drawPoints_T[j][i];
			if (p.scale > 0)
			{
				if (!needToMove)
				{
					ctx.lineTo(p.x2d, p.y2d);
				}
				else
				{
					ctx.moveTo(p.x2d, p.y2d);
					needToMove = false;
				}
			}
			
		}
	}

	ctx.stroke();



	// Draw resolution points
	for (var i = 0; i < this.RX; i++)
	{
		for (var j = 0; j < this.RY; j++)
		{
			this.resPoints_T[i][j].draw();
		}
	}


	// Draw control points
	for (var i = 0; i < this.X; i++)
	{
		for (var j = 0; j < this.Y; j++)
		{
			this.controlPoints_T[i][j].draw();
		}
	}

};

Surface.prototype.closestControlPoint2D = function(obj)
{
	var closest = 999999;
	var closest_id = -1;

	for (var i = 0; i < this.controlPoints_T.length; i++)
	{
		for (var j = 0; j < this.controlPoints_T[i].length; j++)
		{
			var p = this.controlPoints_T[i][j];
			var dist = p.dist2d(obj);

			if (dist < closest)
			{
				closest = dist;
				closest_surface_x = i;
				closest_surface_y = j;
			}
		}
	}

	return [closest_surface_x, closest_surface_y];
};

Surface.prototype.moveControlPointTo2D = function(i, j, x2d, y2d)
{
	var p = this.controlPoints_T[i][j];

	var scale = p.scale;

	// Transform modified screen space coordinates into camera space coordinates
	p.x = (x2d - cvs.width/2) / scale;
	p.y = (y2d - cvs.height/2) / scale;
	p.z = fov/scale - fov;

	// Transform camera space coordinates into world space
	var p_world = new Point;
	p_world.moveTo(p);

	p_world.rotateX(-pitch);
	p_world.rotateY(-yaw);
	p_world.scaleFactor(1/zoom);

	this.controlPoints[i][j].moveTo(p_world);
};

// Given surface parameters t and u, this function returns the xyz coordinates of that surface location.
Surface.prototype.calc = function(t, u)
{
	var sum_x = 0;
	var sum_y = 0;
	var sum_z = 0;

	// Loop through control points
	for (var x = 0; x < this.X; x++)
	{
		for (var y = 0; y < this.Y; y++)
		{
			var control_point = this.controlPoints[x][y];
			var control_x = control_point.x;
			var control_y = control_point.y;
			var control_z = control_point.z;

			var product = this.basis(t, x, this.X - 1) * this.basis(u, y, this.Y - 1);

			sum_x += product*control_x;
			sum_y += product*control_y;
			sum_z += product*control_z;
		}
	}

	return [sum_x, sum_y, sum_z];
}

Surface.prototype.basis = function(t, i, n)
{
	return binomial(n, i)*Math.pow(t, i)*Math.pow(1-t,n-i);
};

Surface.prototype.optimizeControlPoint = function(p)
{
	var iterations = 4;

	var delta_x = 1;
	var delta_y = 1;
	var delta_z = 1;

	var threshold = 10;

	var score = DMap.score();

	var previous_state_x = 0;
	var previous_state_y = 0;
	var previous_state_z = 0;

	for (var i = 0; i < iterations; i++)
	{
		p.x += delta_x;
		var score_inc = DMap.score();
		p.x -= 2*delta_x;
		var score_dec = DMap.score();
		p.x += delta_x;

		if (score_inc < score_dec)
		{
			if (score - score_inc > threshold)
			{
				p.x += delta_x;
				score = score_inc;
			}
			else if (previous_state_x == 1)
			{
				delta_x /= 2;
			}
			previous_state_x = 1;
		}
		else if (score_dec < score_inc)
		{
			if (score - score_dec > threshold)
			{
				p.x -= delta_x;
				score = score_dec;
			}
			else if (previous_state_x == -1)
			{
				delta_x /= 2;
			}
			previous_state_x = -1;
		}

		p.y += delta_y;
		var score_inc = DMap.score();
		p.y -= 2*delta_y;
		var score_dec = DMap.score();
		p.y += delta_y;

		if (score_inc < score_dec)
		{
			if (score - score_inc > threshold)
			{
				p.y += delta_y;
				score = score_inc;
			}
			else if (previous_state_y == 1)
			{
				delta_y /= 2;
			}
			previous_state_y = 1;
		}
		else if (score_dec < score_inc)
		{
			if (score - score_dec > threshold)
			{
				p.y -= delta_y;
				score = score_dec;
			}
			else if (previous_state_y == -1)
			{
				delta_y /= 2;
			}
			previous_state_y = -1;
		}

		p.z += delta_z;
		var score_inc = DMap.score();
		p.z -= 2*delta_z;
		var score_dec = DMap.score();
		p.z += delta_z;

		if (score_inc < score_dec)
		{
			if (score - score_inc > threshold)
			{
				p.z += delta_z;
				score = score_inc;
			}
			else if (previous_state_z == 1)
			{
				delta_z /= 2;
			}
			previous_state_z = 1;
		}
		else if (score_dec < score_inc)
		{
			if (score - score_dec > threshold)
			{
				p.z -= delta_z;
				score = score_dec;
			}
			else if (previous_state_z == -1)
			{
				delta_z /= 2;
			}
			previous_state_z = -1;
		}
	}


};

Surface.prototype.updateTransformedPoints = function()
{
	for (var i = 0; i < this.X; i++)
	{
		for (var j = 0; j < this.Y; j++)
		{
			this.controlPoints_T[i][j].moveTo(this.controlPoints[i][j]);
			this.controlPoints_T[i][j].scaleFactor(zoom);
			this.controlPoints_T[i][j].rotateY(yaw);
			this.controlPoints_T[i][j].rotateX(pitch);
		}
	}

	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			this.drawPoints_T[i][j].moveTo(this.drawPoints[i][j]);
			this.drawPoints_T[i][j].scaleFactor(zoom);
			this.drawPoints_T[i][j].rotateY(yaw);
			this.drawPoints_T[i][j].rotateX(pitch);
		}
	}

	for (var i = 0; i < this.RX; i++)
	{
		for (var j = 0; j < this.RY; j++)
		{
			this.resPoints_T[i][j].moveTo(this.resPoints[i][j]);
			this.resPoints_T[i][j].scaleFactor(zoom);
			this.resPoints_T[i][j].rotateY(yaw);
			this.resPoints_T[i][j].rotateX(pitch);
		}
	}
}











































function Plane(A, B, C, D)
{
	this.A = A;
	this.B = B;
	this.C = C;
	this.D = D;

	this.points = new Array(); // Array of immutable points
	this.points_T = new Array(); // Array of points in camera space

	this.alpha = 0;
	this.beta = 0;
	this.delta = 0;

	this.generatePoints();

	this.finished = false;
}

Plane.prototype.generatePoints = function()
{
	this.points = this.points.splice(0, 0);
	this.points_T = this.points_T.splice(0, 0);

	this.A = Math.sin(this.alpha)*Math.cos(this.beta);
	this.B = Math.sin(this.alpha)*Math.sin(this.beta);
	this.C = Math.cos(this.alpha);
	this.D = this.delta;

	var max_array = [this.A, this.B, this.C];
	var max_i = 0;
	var max_val = 0;
	for (var i = 0; i < max_array.length; i++)
	{
		if (Math.abs(max_array[i]) > max_val)
		{
			max_val = Math.abs(max_array[i]);
			max_i = i;
		}
	}

	if (max_i == 0)
	{
		var size = 100;
		for (var y = -size; y <= size; y += 10)
		{
			for (var z = -size; z <= size; z += 10)
			{
				var x = (-this.D - this.B*y - this.C*z)/this.A;
				var p = new Point(x, y, z, this.color);
				var p2 = new Point(0, 0, 0);
				this.points.push(p);
				this.points_T.push(p2);
			}
		}
	}	
	else if (max_i == 1) // If 'B' is the highest term, generate y-vals
	{
		var size = 100;
		for (var x = -size; x <= size; x += 10)
		{
			for (var z = -size; z <= size; z += 10)
			{
				var y = (-this.D - this.A*x - this.C*z)/this.B;
				var p = new Point(x, y, z, this.color);
				var p2 = new Point(0, 0, 0);
				this.points.push(p);
				this.points_T.push(p2);
			}
		}
	}
	else if (max_i == 2) // If 'C' is the highest term, generate z-vals
	{
		var size = 100;
		for (var x = -size; x <= size; x += 10)
		{
			for (var y = -size; y <= size; y += 10)
			{
				var z = (-this.D - this.A*x - this.B*y)/this.C;
				var p = new Point(x, y, z, this.color);
				var p2 = new Point(0, 0, 0);
				this.points.push(p);
				this.points_T.push(p2);
			}
		}
	}

};

Plane.prototype.draw = function()
{
	this.generatePoints();
	this.updateTransformedPoints();

	for (var i = 0; i < this.points.length; i++)
	{
		this.points_T[i].draw();
	}
};

Plane.prototype.updateTransformedPoints = function()
{
	for (var i = 0; i < this.points.length; i++)
	{
		this.points_T[i].moveTo(this.points[i]);
		this.points_T[i].scaleFactor(zoom);
		this.points_T[i].rotateY(yaw);
		this.points_T[i].rotateX(pitch);
	}
}

Plane.prototype.distance = function(p)
{
	return this.A*p.x + this.B*p.y + this.C*p.z + this.D;
};

Plane.prototype.score = function()
{
	this.A = Math.sin(this.alpha)*Math.cos(this.beta);
	this.B = Math.sin(this.alpha)*Math.sin(this.beta);
	this.C = Math.cos(this.alpha);
	this.D = this.delta;

	var score = 0;

	for (var i = 0; i < DMap.points.length; i++)
	{
		score += Math.pow(this.distance(DMap.points[i]), 2);
	}

	return score;
};

Plane.prototype.optimize = function()
{
	var base_score = this.score();
	var cut_off = 50;
	var delta = .025;

	var new_alpha = this.alpha;

	this.alpha += delta;
	var inc_score = base_score - this.score();
	this.alpha -= delta;

	this.alpha -= delta;
	var dec_score = base_score - this.score();
	this.alpha += delta;

	if (inc_score > dec_score)
	{
		if (inc_score > cut_off)
		{
			new_alpha += delta;
		}
	}
	else if (dec_score > inc_score)
	{
		if (dec_score > cut_off)
		{
			new_alpha -= delta;
		}
	}



	var new_beta = this.beta;

	this.beta += delta;
	var inc_score = base_score - this.score();
	this.beta -= delta;

	this.beta -= delta;
	var dec_score = base_score - this.score();
	this.beta += delta;

	if (inc_score > dec_score)
	{
		if (inc_score > cut_off)
		{
			new_beta += delta;
		}
	}
	else if (dec_score > inc_score)
	{
		if (dec_score > cut_off)
		{
			new_beta -= delta;
		}
	}


	var delta = .5;

	var new_delta = this.delta;

	this.delta += delta;
	var inc_score = base_score - this.score();
	this.delta -= delta;

	this.delta -= delta;
	var dec_score = base_score - this.score();
	this.delta += delta;

	if (inc_score > dec_score)
	{
		if (inc_score > cut_off)
		{
			new_delta += delta;
		}
	}
	else if (dec_score > inc_score)
	{
		if (dec_score > cut_off)
		{
			new_delta -= delta;
		}
	}

	if (new_alpha > Math.PI)
	{
		new_alpha -= 2*Math.PI;
	}
	else if (new_alpha < -Math.PI)
	{
		new_alpha += 2*Math.PI;
	}


	if (new_beta > Math.PI)
	{
		new_beta -= 2*Math.PI;
	}
	else if (new_beta < -Math.PI)
	{
		new_beta += 2*Math.PI;
	}

	var total_change = Math.pow(this.alpha - new_alpha, 2) + Math.pow(this.beta - new_beta, 2) + Math.pow(this.delta - new_delta, 2);

	this.alpha = new_alpha;
	this.beta = new_beta;
	this.delta = new_delta;

	return total_change;
};





















function Projection()
{
	this.points = new Array();
	this.points_T = new Array();
}

Projection.prototype.appendPoint = function(x, y, z)
{
	this.points.push(new Point(x, y, z));
	this.points_T.push(new Point(0, 0, 0, "darkgreen", 4));

	this.updateTransformedPoints();
}

Projection.prototype.draw = function()
{
	for (var i = 0; i < this.points_T.length; i++)
	{
		var p = this.points_T[i];
		var para = this.findClosestResPoint(i);
		var closest_p = BSurface.resPoints_T[para[0]][para[1]];

		ctx.strokeStyle = "grey";
		ctx.beginPath();
		ctx.moveTo(p.x2d, p.y2d);
		ctx.lineTo(closest_p.x2d, closest_p.y2d);
		ctx.stroke();



		this.refineProjection(i);

		var coords = BSurface.calc(this.points[i].t, this.points[i].u);
		var proj = new Point(coords[0], coords[1], coords[2], "blue", 1);
		ctx.fillText("Min Dist: " + this.points[i].dist(proj), 20, 20);
		proj.scaleFactor(zoom);
		proj.rotateY(yaw);
		proj.rotateX(pitch);
		proj.draw();
		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(p.x2d, p.y2d);
		ctx.lineTo(proj.x2d, proj.y2d);
		ctx.stroke();


		p.draw();
	}
}

Projection.prototype.findClosestResPoint = function(i)
{
	var p = this.points[i];

	var min_dist = 99999999;
	var min_i = -1;
	var min_j = -1;

	for (var i = 0; i < BSurface.RX; i++)
	{
		for (var j = 0; j < BSurface.RY; j++)
		{
			var r = BSurface.resPoints[i][j];

			var dist = p.dist(r);

			if (dist < min_dist)
			{
				min_dist = dist;
				min_i = i;
				min_j = j;
			}
		}
	}

	p.t = min_i/(BSurface.RX - 1);
	p.u = min_j/(BSurface.RY - 1);

	return [min_i, min_j];
}

Projection.prototype.closestPoint2D = function(obj, threshold)
{
	var min_dist = 9999999;
	var min_i = -1;

	for (var i = 0; i < this.points_T.length; i++)
	{
		var p = this.points_T[i];

		var dist = p.dist2d(obj);

		if (dist < min_dist)
		{
			min_dist = dist;
			min_i = i;
		}
	}

	if (min_dist < threshold)
	{
		return min_i;
	}
	else
	{
		return -1;
	}
}

Projection.prototype.movePointTo2D = function(i, x2d, y2d)
{
	var p = this.points_T[i];

	var scale = p.scale;

	// Transform modified screen space coordinates into camera space coordinates
	p.x = (x2d - cvs.width/2) / scale;
	p.y = (y2d - cvs.height/2) / scale;
	p.z = fov/scale - fov;

	// Transform camera space coordinates into world space
	var p_world = new Point;
	p_world.moveTo(p);

	p_world.rotateX(-pitch);
	p_world.rotateY(-yaw);
	p_world.scaleFactor(1/zoom);

	this.points[i].moveTo(p_world);
}

Projection.prototype.updateTransformedPoints = function()
{
	for (var i = 0; i < this.points_T.length; i++)
	{
		this.points_T[i].moveTo(this.points[i]);
		this.points_T[i].scaleFactor(zoom);
		this.points_T[i].rotateY(yaw);
		this.points_T[i].rotateX(pitch);
	}
}





























function Point(x, y, z, color = "black", size = 1, id)
{
	this.x = x;
	this.y = y;
	this.z = z;
	this.color = color;
	this.size = size;

	this.id = id;
}

Point.prototype.draw = function(actually_draw = true)
{
	var x3d = this.x;
	var y3d = this.y; 
	var z3d = this.z; 
	this.scale = fov/(fov+z3d); 
	this.x2d = (x3d * this.scale) + cvs.width/2;	
	this.y2d = (y3d * this.scale) + cvs.height/2;

    if (this.scale > 0 && actually_draw)
    {
	    ctx.beginPath();
	    ctx.fillStyle = this.color;
	    ctx.arc(this.x2d, this.y2d, this.scale*this.size, 0, Math.PI*2, true);
	    ctx.fill();
    }
};

Point.prototype.dist2d = function(obj)
{
	return Math.sqrt( Math.pow(this.x2d - obj.x, 2) + Math.pow(this.y2d - obj.y, 2) );
};

Point.prototype.dist = function(obj)
{
	return Math.sqrt( Math.pow(this.x - obj.x, 2) + Math.pow(this.y - obj.y, 2) + Math.pow(this.z - obj.z, 2) );
};

Point.prototype.planeDist = function(A, B, C, D)
{
	return Math.abs(A*this.x + B*this.y + C*this.z + D)/Math.sqrt(A*A + B*B + C*C);
};

Point.prototype.moveTo = function(obj)
{
    this.x = obj.x;
    this.y = obj.y;
    this.z = obj.z;
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
};

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
};

Point.prototype.rotateZ = function(angle)
{
	var p = new Point(this.x, this.y, this.z, this.color);

	x = this.x;
	y = this.y;

	var cosRZ = Math.cos(angle);
	var sinRZ = Math.sin(angle);

	tempx = x;
	tempy = y;

	x = (tempx * cosRZ) + (tempy * -sinRZ);
	y = (tempx * sinRZ) + (tempy * cosRZ);

	this.x = x;
	this.z = z;
};

Point.prototype.rotateAxis = function(ang, ux, uy, uz)
{
	var x_new = this.x*(Math.cos(ang) + Math.pow(ux, 2)*(1-Math.cos(ang))) + this.y*(uy*ux*(1-Math.cos(ang))+uz*Math.sin(ang)) + this.z*(uz*ux*(1-Math.cos(ang))-uy*Math.sin(ang));
	var y_new = this.x*(ux*uy*(1-Math.cos(ang))-uz*Math.sin(ang)) + this.y*(Math.cos(ang)+Math.pow(uy,2)*(1-Math.cos(ang))) + this.z*(uz*uy*(1-Math.cos(ang))+ux*Math.sin(ang));
	var z_new = this.x*(ux*uz*(1-Math.cos(ang))+uy*Math.sin(ang)) + this.y*(uy*uz*(1-Math.cos(ang))-ux*Math.sin(ang)) + this.z*(Math.cos(ang)+Math.pow(uz,2)*(1-Math.cos(ang)));

	this.x = x_new;
	this.y = y_new;
	this.z = z_new;
};

Point.prototype.distFromLine = function(slope, intersect)
{
	return (slope*this.x - this.z + intersect)/Math.sqrt(Math.pow(slope, 2) + 1);
};

// Given surface parameters t and u, this function returns the distance to that surface location.
Point.prototype.distToParameter = function(t, u)
{
	var coords = BSurface.calc(t, u);
	var x = coords[0];
	var y = coords[1];
	var z = coords[2];
	return Math.sqrt(Math.pow(this.x-x, 2) + Math.pow(this.y-y, 2) + Math.pow(this.z-z, 2));
};

Point.prototype.findClosestResPoint = function()
{
	var min_dist = 99999999;
	var min_i = -1;
	var min_j = -1;

	for (var i = 0; i < BSurface.RX; i++)
	{
		for (var j = 0; j < BSurface.RY; j++)
		{
			var r = BSurface.resPoints[i][j];

			var dist = this.dist(r);

			if (dist < min_dist)
			{
				min_dist = dist;
				min_i = i;
				min_j = j;
			}
		}
	}

	this.t = min_i/(BSurface.RX - 1);
	this.u = min_j/(BSurface.RY - 1);

	return [min_i, min_j];
};

Point.prototype.refineProjection = function()
{
	var gap = 1/(BSurface.RX - 1);

	var iterations = 10;

	var delta_t = gap/iterations;
	var delta_u = gap/iterations;

	var threshold = 0;

	var t = this.t;
	var u = this.u;
	var dist = this.distToParameter(t, u);

	var previous_state_t = 0;
	var previous_state_u = 0;

	for (var i = 0; i < iterations; i++)
	{
		var dist_inc = this.distToParameter(t + delta_t, u);
		var dist_dec = this.distToParameter(t - delta_t, u);

		if (dist_inc < dist_dec)
		{
			if (dist - dist_inc > threshold)
			{
				t = t + delta_t;
				dist = dist_inc;
			}
			else if (previous_state_t == 1)
			{
				delta_t /= 2;
			}
			previous_state_t = 1;
		}
		else if (dist_dec < dist_inc)
		{
			if (dist - dist_dec > threshold)
			{
				t = t - delta_t;
				dist = dist_dec;
			}
			else if (previous_state_t == -1)
			{
				delta_t /= 2;
			}
			previous_state_t = -1;
		}


		var dist_inc = this.distToParameter(t, u + delta_u);
		var dist_dec = this.distToParameter(t, u - delta_u);

		if (dist_inc < dist_dec)
		{
			if (dist - dist_inc > threshold)
			{
				u = u + delta_u;
				dist = dist_inc;
			}
			else if (previous_state_u == 1)
			{
				delta_u /= 2;
			}
			previous_state_u = 1;
		}
		else if (dist_dec < dist_inc)
		{
			if (dist - dist_dec > threshold)
			{
				u = u - delta_u;
				dist = dist_dec;
			}
			else if (previous_state_u == -1)
			{
				delta_u /= 2;
			}
			previous_state_u = -1;
		}
	}

	if (t > 1)
	{
		//t = 1;
	}
	else if (t < 0)
	{
		//t = 0;
	}

	if (u > 1)
	{
		//u = 1;
	}
	else if (u < 0)
	{
		//u = 0;
	}

	this.t = t;
	this.u = u;
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
	this.x = evt.clientX - rect.left - 1;
	this.y = evt.clientY - rect.top - 1;
};

cvs.addEventListener('mousemove', function(evt)
{
	var old_x = Mouse.x;
	var old_y = Mouse.y;
	Mouse.updatePos(evt)
	var new_x = Mouse.x;
	var new_y = Mouse.y;

	var changed = (old_x != new_x) || (old_y != new_y);

	if (Mouse.down)
	{
		if (Mouse.holding)
		{
			if (Mouse.held_type == 0)
			{
				BSurface.moveControlPointTo2D(Mouse.held_id[0], Mouse.held_id[1], Mouse.x, Mouse.y);
				BSurface.updatePoints();
			}
			else if (Mouse.held_type == 1)
			{
				BProj.movePointTo2D(Mouse.held_id, Mouse.x, Mouse.y)
			}
		}
		else if (changed)
		{
			delta_pitch = (new_y - old_y)*.006;
			if (pitch + delta_pitch <= 90/180*3.1415 && pitch + delta_pitch >= -90/180*3.1415)
			{
				pitch += delta_pitch;
			}

			delta_yaw = (old_x - new_x)*.006;
			yaw += delta_yaw;
		}

		updateTransformedPoints();
	}

}, false);

cvs.addEventListener('mousedown', function(evt)
{
	Mouse.down = true;

	// Check if mouse is over a point
	var closest_id = BSurface.closestControlPoint2D(Mouse);
	var closest_control_point = BSurface.controlPoints_T[closest_id[0]][closest_id[1]];
	
	var closest_dist = closest_control_point.dist2d(Mouse);
	if (closest_dist < 15)
	{
		Mouse.holding = true;
		Mouse.held_id = closest_id;
		Mouse.held_type = 0;
	}

	var closest_id = BProj.closestPoint2D(Mouse, 15)
	if (closest_id != -1)
	{
		Mouse.holding = true;
		Mouse.held_id = closest_id;
		Mouse.held_type = 1;
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

	updateTransformedPoints();

	evt.preventDefault();
	return false;
}, false);


init();