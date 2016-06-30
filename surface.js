

var fps = 30;
var fov = 250;
var yaw = 10;
var pitch = 0.7;
var zoom = 1;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

var BSurface;
var BPlane;
var DemingRegressor;

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);



function init()
{
	loadServerMRC("density_map.mrc");
	BSurface = new Surface(2, 2, 20, 20, 3, 3);

	worldTransformation()

	BPlane = new Plane(1, -3, 1, 2);
}

var initial_fit = false;

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	BSurface.draw();
	if (DMap != undefined)
	{
		DMap.draw();
	}

	ctx.fillStyle = "black";

	ctx.fillText("Yaw:   " + yaw, 10, 10);
	ctx.fillText("Pitch: " + pitch, 10, 20);
	ctx.fillText("Zoom:  " + zoom, 10, 30);

	if (DMap != undefined && !initial_fit)
	{
		var score = DMap.score();

		ctx.fillText("Score: " + score, 10, 50);
	}

	if (DMap != undefined)
	{
		if (BPlane.finished == false)
		{
			var change = BPlane.optimize();
			var score = BPlane.score();

			BPlane.last_score = score;

			ctx.fillText("Plane Score: " + score, 10, 70);
			ctx.fillText("Change: " + change, 10, 80);

			if (change < .00000000001)
			{
				// Rotate DMap
				BPlane.finished = true;

				DMap.rotateAxisStructure(Math.acos(BPlane.B), BPlane.C, 0, -BPlane.A);

				DMap.scaleFactor(zoom, true);
				DMap.rotateY(yaw);
				DMap.rotateX(pitch);

				// Calculate bounding box
				DMap.calculateBoundingBox();
				initial_fit = true;
			}

			BPlane.draw();
		}
		else
		{
			ctx.fillText("Plane Score: " + BPlane.last_score, 10, 70);
			ctx.fillText("Plane-Fitting Completed", 10, 80);
		}
	}

	if (initial_fit)
	{
		var acc_score = DMap.score();

		ctx.fillText("Hard Score: " + acc_score, 10, 60);
	}
}

function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }



















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
	
			worldTransformation();

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

			worldTransformation();

			if (BPlane != undefined)
			{
				BPlane.finished = false;
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

	this.structure = new Array(); // Immutable data points
	this.points = new Array(); // Points in camera space

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
					var p2 = new Point((x - x_avg)*scale, (y - y_avg)*scale, (z - z_avg)*scale);
					this.structure.push(p);
					this.points.push(p2);
				}
			}
		}
	}


	worldTransformation();
}

DensityMap.prototype.draw = function()
{
	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i].draw();
	}
};

DensityMap.prototype.scaleFactor = function(zoom, from_untransformed_points)
{
	for (var i = 0; i < this.points.length; i++)
	{
		if (from_untransformed_points)
		{
			this.points[i].moveTo(this.structure[i].scaleFactor(zoom));
		}
		else
		{
			this.points[i].moveTo(this.points[i].scaleFactor(zoom));
		}
	}
};

DensityMap.prototype.rotateX = function(pitch)
{
	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i].moveTo(this.points[i].rotateX(pitch));
	}
};

DensityMap.prototype.rotateY = function(yaw)
{
	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i].moveTo(this.points[i].rotateY(yaw));
	}
};

DensityMap.prototype.rotateXStructure = function(pitch)
{
	for (var i = 0; i < this.structure.length; i++)
	{
		this.structure[i].moveTo(this.structure[i].rotateX(pitch));
	}
};

DensityMap.prototype.rotateYStructure = function(yaw)
{
	for (var i = 0; i < this.structure.length; i++)
	{
		this.structure[i].moveTo(this.structure[i].rotateY(yaw));
	}
};

DensityMap.prototype.rotateZStructure = function(roll)
{
	for (var i = 0; i < this.structure.length; i++)
	{
		this.structure[i].moveTo(this.structure[i].rotateZ(roll));
	}
};

DensityMap.prototype.rotateAxisStructure = function(ang, ux, uy, uz)
{
	for (var i = 0; i < this.structure.length; i++)
	{
		this.structure[i].rotateAxis(ang, ux, uy, uz);
	}
};

DensityMap.prototype.score = function()
{
	var sum_dist = 0;

	for (var i = 0; i < this.structure.length; i++)
	{
		sum_dist += this.structure[i].closestSurfaceDistance();
	}

	return sum_dist;
};

DensityMap.prototype.softScore = function()
{
	var sum_dist = 0;

	for (var i = 0; i < this.structure.length; i++)
	{
		this.structure[i].closestResolutionPoint();
		sum_dist += Math.pow(this.structure[i].refineProjection(),2);
	}

	return sum_dist;
}

DensityMap.prototype.calculateBoundingBox = function()
{
	var avgx = 0;
	var avgz = 0;
	for (var i = 0; i < this.structure.length; i++)
	{
		avgx += this.structure[i].x;
		avgz += this.structure[i].z;
	}

	avgx /= this.structure.length;
	avgz /= this.structure.length;

	var vr_x = 0; // Variance of x
	var vr_z = 0; // Variance of z
	var covr = 0; // Covariance of x and z
	for (var i = 0; i < this.structure.length; i++)
	{
		var delta_x = this.structure[i].x - avgx;
		var delta_z = this.structure[i].z - avgz;

		vr_x += Math.pow(delta_x, 2);
		vr_z += Math.pow(delta_z, 2);
		covr = delta_x * delta_z;
	}
	vr_x /= (this.structure.length - 1);
	vr_z /= (this.structure.length - 1);
	covr /= (this.structure.length - 1);

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

	for (var i = 0; i < this.structure.length; i++)
	{
		var dist = this.structure[i].distFromLine(m, b);

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

		var x = this.structure[i].x;
		var z = this.structure[i].z;

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

		this.structure[i].color = "black";
	}

	
	this.points[min_dist_id].color = "purple";
	this.points[min_dist_id].size = 5;
	this.points[max_dist_id].color = "purple";
	this.points[max_dist_id].size = 5;

	this.points[min_proj_dist_id].color = "green";
	this.points[min_proj_dist_id].size = 5;
	this.points[max_proj_dist_id].color = "green";
	this.points[max_proj_dist_id].size = 5;

	var p1 = this.structure[min_dist_id];
	var p2 = this.structure[min_proj_dist_id];
	var p3 = this.structure[max_dist_id];
	var p4 = this.structure[max_proj_dist_id];

	BSurface.setControlPoints(p1, p2, p3, p4);
};

















































// Fast version of binomial coefficient, or "n choose k"
function binom(n, k)
{
	var prod = 1;
	for (i = 1; i <= k; i++)
	{
		prod *= (n + 1 - i)/i;
	}

	return prod;
}

function Surface(X, Y, T, U, RX, RY)
{
	this.X = X;
	this.Y = Y;
	this.T = T;
	this.U = U;
	this.RX = RX;
	this.RY = RY;

	// Control points
	this.array_of_ids = new Array(X); // Populate 'x' slots
	this.array_of_transformed_ids = new Array(X);

	for (var i = 0; i < X; i++)
	{
		this.array_of_ids[i] = new Array(Y);
		this.array_of_transformed_ids[i] = new Array(Y);
	}

	// M is associated with x
	// N is associated with Y

	// Each 'x' slot has Y 'y' slots inside of it.  array[x][y] to get one specific one.

	var lower = -50;
	var upper = 50;

	var i = 0;
	var j = 0;

	for (var i = 0; i < X; i++)
	{
		for (var j = 0; j < Y; j++)
		{
			var x = lower + i/(X-1)*(upper - lower);
			var z = lower + j/(X-1)*(upper - lower);

			var width = 00;

			var y = Math.random()*width*2 - width; // Between -width and width

			this.array_of_ids[i][j] = Points.createPoint(x, y, z, "black", 2);
			this.array_of_transformed_ids[i][j] = Points.createPoint(x, y, z, "black", 2);
		}
	}




	// Resolution points
	this.array_of_resolution_ids = new Array(RX);

	for (var i = 0; i < RX; i++)
	{
		this.array_of_resolution_ids[i] = new Array(RY);
	}

	for (var i = 0; i < RX; i++)
	{
		for (var j = 0; j < RY; j++)
		{
			this.array_of_resolution_ids[i][j] = Points.createPoint(0, 0, 0);
		}
	}


	// Draw points
	this.array_of_draw_ids = new Array(T); // Populate 'x' slots
	this.array_of_transformed_draw_ids = new Array(T);

	for (var i = 0; i < T; i++)
	{
		this.array_of_draw_ids[i] = new Array(U);
		this.array_of_transformed_draw_ids[i] = new Array(U);
	}

	var i = 0;
	var j = 0;

	for (var i = 0; i < T; i++)
	{
		for (var j = 0; j < U; j++)
		{
			this.array_of_draw_ids[i][j] = Points.createPoint(0, 0, 0);
			this.array_of_transformed_draw_ids[i][j] = Points.createPoint(0, 0, 0);
		}
	}

	this.updatePoints();
};

// Given points define a square, with points either going in clockwise, or counter-clockwise, order.
Surface.prototype.setControlPoints = function(p1, p2, p3, p4)
{
	X = 2;
	Y = 2;

	// Control points
	this.array_of_ids = new Array(X); // Populate 'x' slots
	this.array_of_transformed_ids = new Array(X);

	for (var i = 0; i < X; i++)
	{
		this.array_of_ids[i] = new Array(Y);
		this.array_of_transformed_ids[i] = new Array(Y);
	}

	this.array_of_ids[0][0] = Points.createPoint(p1.x, p1.y, p1.z, "black", 2);
	this.array_of_ids[0][1] = Points.createPoint(p2.x, p2.y, p2.z, "black", 2);
	this.array_of_ids[1][1] = Points.createPoint(p3.x, p3.y, p3.z, "black", 2);
	this.array_of_ids[1][0] = Points.createPoint(p4.x, p4.y, p4.z, "black", 2);

	this.array_of_transformed_ids[0][0] = Points.createPoint(p1.x, p1.y, p1.z, "black", 2);
	this.array_of_transformed_ids[0][1] = Points.createPoint(p2.x, p2.y, p2.z, "black", 2);
	this.array_of_transformed_ids[1][1] = Points.createPoint(p3.x, p3.y, p3.z, "black", 2);
	this.array_of_transformed_ids[1][0] = Points.createPoint(p4.x, p4.y, p4.z, "black", 2);

	this.updatePoints();
	worldTransformation();
};

Surface.prototype.draw = function()
{

	// 'Draw' surface points to calculate their 'scale' (if negative, outside of cam space)
	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			Points.x[this.array_of_transformed_draw_ids[i][j]].draw(false);
		}
	}

	// Draw surface wireframe

	ctx.strokeStyle = "grey";

	ctx.beginPath();

	var needToMove = false;

	for (var i = 0; i < this.T; i++)
	{
		var j = 0;

		var p = Points.x[this.array_of_transformed_draw_ids[i][j]];

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
			var p = Points.x[this.array_of_transformed_draw_ids[i][j]];


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

		var p = Points.x[this.array_of_transformed_draw_ids[j][i]];

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
			var p = Points.x[this.array_of_transformed_draw_ids[j][i]];
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


	// Draw control points
	for (var i = 0; i < this.X; i++)
	{
		for (var j = 0; j < this.Y; j++)
		{
			Points.x[this.array_of_transformed_ids[i][j]].draw();
		}
	}

};

Surface.prototype.closestControlPoint2D = function(obj)
{
	var closest = 999999;
	var closest_id = -1;

	for (var i = 0; i < this.array_of_transformed_ids.length; i++)
	{
		for (var j = 0; j < this.array_of_transformed_ids[i].length; j++)
		{
			var p = Points.x[this.array_of_transformed_ids[i][j]];
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
	var p = Points.x[this.array_of_transformed_ids[i][j]];

	var scale = p.scale;

	// Transform modified screen space coordinates into camera space coordinates
	p.x = (x2d - cvs.width/2) / scale;
	p.y = (y2d - cvs.height/2) / scale;
	p.z = fov/scale - fov;

	// Transform camera space coordinates into world space

	var p_world = new Point;
	p_world.moveTo(p);

	p_world.moveTo(p_world.rotateX(-pitch));
	p_world.moveTo(p_world.rotateY(-yaw));
	p_world.moveTo(p_world.scaleFactor(1/zoom));

	Points.x[this.array_of_ids[i][j]].moveTo(p_world);
};

Surface.prototype.scaleFactor = function(zoom, from_untransformed_points)
{
	for (var i = 0; i < this.X; i++)
	{
		for (var j = 0; j < this.Y; j++)
		{
			if (from_untransformed_points)
			{
				Points.x[this.array_of_transformed_ids[i][j]].moveTo(Points.x[this.array_of_ids[i][j]].scaleFactor(zoom));
			}
			else
			{
				Points.x[this.array_of_transformed_ids[i][j]].moveTo(Points.x[this.array_of_transformed_ids[i][j]].scaleFactor(zoom));
			}
		}
	}

	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			if (from_untransformed_points)
			{
				Points.x[this.array_of_transformed_draw_ids[i][j]].moveTo(Points.x[this.array_of_draw_ids[i][j]].scaleFactor(zoom));
			}
			else
			{
				Points.x[this.array_of_transformed_draw_ids[i][j]].moveTo(Points.x[this.array_of_transformed_draw_ids[i][j]].scaleFactor(zoom));
			}
		}
	}
};

Surface.prototype.rotateX = function(pitch)
{
	for (var i = 0; i < this.X; i++)
	{
		for (var j = 0; j < this.Y; j++)
		{
			Points.x[this.array_of_transformed_ids[i][j]].moveTo(Points.x[this.array_of_transformed_ids[i][j]].rotateX(pitch));
		}
	}

	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			Points.x[this.array_of_transformed_draw_ids[i][j]].moveTo(Points.x[this.array_of_transformed_draw_ids[i][j]].rotateX(pitch));
		}
	}
};

Surface.prototype.rotateY = function(yaw)
{
	for (var i = 0; i < this.X; i++)
	{
		for (var j = 0; j < this.Y; j++)
		{
			Points.x[this.array_of_transformed_ids[i][j]].moveTo(Points.x[this.array_of_transformed_ids[i][j]].rotateY(yaw));
		}
	}

	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			Points.x[this.array_of_transformed_draw_ids[i][j]].moveTo(Points.x[this.array_of_transformed_draw_ids[i][j]].rotateY(yaw));
		}
	}
};

Surface.prototype.updatePoints = function()
{
	var delta_t = 1/(this.T-1);
	var delta_u = 1/(this.U-1);

	var t = 0;

	for (var x = 0; x < this.T; x++)
	{
		var u = 0;

		for (var y = 0; y < this.U; y++)
		{
			this.calc(x, y, t, u)

			u += delta_u;
		}
		t += delta_t;
	}



	// Update resolution points

	var RX = this.RX;
	var RY = this.RY;

	for (var x = 0; x < RX; x++)
	{
		for (var y = 0; y < RY; y++)
		{
			var t = x/(RX-1);
			var u = y/(RY-1);

			var p = Points.x[this.array_of_resolution_ids[x][y]];

			var r = this.calc_coords(t, u);
			p.x = r[0];
			p.y = r[1];
			p.z = r[2];
		}
	}
};

Surface.prototype.calc = function(x_i, y_i, t, u)
{
	var sum_x = 0;
	var sum_y = 0;
	var sum_z = 0;

	for (var x = 0; x < this.X; x++)
	{
		for (var y = 0; y < this.Y; y++)
		{
			var control_x = Points.x[this.array_of_ids[x][y]].x;
			var control_y = Points.x[this.array_of_ids[x][y]].y;
			var control_z = Points.x[this.array_of_ids[x][y]].z;

			var product = this.basis(t, x, this.X - 1) * this.basis(u, y, this.Y - 1);

			sum_x += product*control_x;
			sum_y += product*control_y;
			sum_z += product*control_z;
		}
	}

	var p = Points.x[this.array_of_draw_ids[x_i][y_i]];

	p.x = sum_x;
	p.y = sum_y;
	p.z = sum_z;

};

// Given surface parameters t and u, this function returns the xyz coordinates of that surface location.
Surface.prototype.calc_coords = function(t, u)
{
	var sum_x = 0;
	var sum_y = 0;
	var sum_z = 0;

	// Loop through control points
	for (var x = 0; x < this.X; x++)
	{
		for (var y = 0; y < this.Y; y++)
		{
			var control_point = Points.x[this.array_of_ids[x][y]];
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
	return binom(n, i)*Math.pow(t, i)*Math.pow(1-t,n-i);
};

Surface.prototype.binom = function(n, k)
{
	var prod = 1;
	for (i = 1; i <= k; i++)
	{
		prod *= (n + 1 - i)/i;
	}

	return prod;
};

Surface.prototype.parametersClosestToCoordinates = function(x_i, y_i, z_i)
{
	var t = .5;
	var u = .5;

	var step = .05;

	var coords = this.calc_coords(t, u);
	var x = coords[0];
	var y = coords[1];
	var z = coords[2];

	var dist = Math.pow(x_i - x, 2) + Math.pow(y_i - y, 2) + Math.pow(z_i - z, 2);


	t += step;

	var coords = this.calc_coords(t, u);
	var x = coords[0];
	var y = coords[1];
	var z = coords[2];

	var dist_plus = Math.pow(x_i - x, 2) + Math.pow(y_i - y, 2) + Math.pow(z_i - z, 2);


	t -= 2*step;

	var coords = this.calc_coords(t, u);
	var x = coords[0];
	var y = coords[1];
	var z = coords[2];

	var dist_minus = Math.pow(x_i - x, 2) + Math.pow(y_i - y, 2) + Math.pow(z_i - z, 2);

	if (dist - dist_plus > dist - dist_minus)
	{

	}
};















function Plane(A, B, C, D)
{
	this.A = A;
	this.B = B;
	this.C = C;
	this.D = D;

	this.structure = new Array(); // Array of immutable points

	this.points = new Array(); // Array of points in camera space

	this.alpha = 0;
	this.beta = 0;
	this.delta = 0;

	this.generatePoints();

	this.finished = false;
}

Plane.prototype.generatePoints = function()
{
	this.structure = this.structure.splice(0, 0);
	this.points = this.points.splice(0, 0);

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
				this.structure.push(p);
				this.points.push(p);
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
				this.structure.push(p);
				this.points.push(p);
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
				this.structure.push(p);
				this.points.push(p);
			}
		}
	}

};

Plane.prototype.draw = function()
{
	this.generatePoints();

	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i] = this.points[i].rotateY(yaw);
	}

	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i] = this.points[i].rotateX(pitch);
	}

	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i].draw();
	}
};

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

	for (var i = 0; i < DMap.structure.length; i++)
	{
		score += Math.pow(this.distance(DMap.structure[i]), 2);
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

























function _Points()
{
	this.x = new Array();
}

var Points = new _Points()

_Points.prototype.createPoint = function(x, y, z, color = "black", size = 1)
{
	var id = this.x.length;
	this.x.push(new Point(x, y, z, color, size, id));

	return id;
};

_Points.prototype.closest = function(obj)
{
	var dist = 0;
	var mindist = 99999;
	var min_index = -1;

	for (var i = 0; i < this.x.length; i++)
	{
		if (this.x[i] != null)
		{
			dist = this.x[i].dist2d(obj);

			if (dist < mindist)
			{
				min_index = i;
				mindist = dist;
			}
		}
	}

	return min_index;
};

_Points.prototype.draw = function()
{
	for (var i = 0; i < this.x.length; i++)
	{
		if (this.x[i] != null)
		{
			this.x[i].draw();
		}

	}
};

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

Point.prototype.distSquare = function(obj)
{
	return Math.pow(this.x - obj.x, 2) + Math.pow(this.y - obj.y, 2) + Math.pow(this.z - obj.z, 2);
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

	p.x = x;
	p.z = z;

	return p;
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


// From a set of N fixed initial res points, find the closest.
// Initial condition from which to refine using gradient descent.
Point.prototype.closestResolutionPoint = function()
{
	var min_dist = 99999999999;
	var min_x = -1;
	var min_y = -1;

	for (var x = 0; x < BSurface.RX; x++)
	{
		for (var y = 0; y < BSurface.RY; y++)
		{
			var p = Points.x[BSurface.array_of_resolution_ids[x][y]];
			var dist = this.distSquare(p);

			if (dist < min_dist)
			{
				min_dist = dist;
				min_x = x;
				min_y = y;
			}

		}
	}

	this.t = min_x/(BSurface.RX - 1);
	this.u = min_y/(BSurface.RY - 1);

	return Math.sqrt(min_dist);
};



// This function does a brute-force shortest distance calculation of O(n) given a set of draw points of the surface.
Point.prototype.closestSurfaceDistance = function()
{
	var mindist = 9999999999999;

	var min_i = -1;
	var min_j = -1;

	for (var i = 0; i < BSurface.T; i++)
	{
		for (var j = 0; j < BSurface.U; j++)
		{
			var p = Points.x[BSurface.array_of_draw_ids[i][j]];

			var dist = Math.pow(this.x - p.x, 2) + Math.pow(this.y - p.y, 2) + Math.pow(this.z - p.z, 2);

			if (dist < mindist)
			{
				min_i = i;
				min_j = j;
				mindist = dist;
			}
		}
	}

	this.t = min_i/(BSurface.T-1);
	this.u = min_j/(BSurface.U-1);

	return mindist;
};

Point.prototype.refineProjection = function()
{
	var delta = 1/(BSurface.RX*2);
	var threshold = 0;

	var t = this.t;
	var u = this.u;

	var dist = this.distToParameter(t, u);

	var previous_state = 0;

	for (var i = 0; i < 10; i++)
	{
		var dist_inc = this.distToParameter(t + delta, u);
		var dist_dec = this.distToParameter(t - delta, u);

		if (dist_inc < dist_dec)
		{
			if (dist - dist_inc > threshold)
			{
				t = t + delta;
				dist = dist_inc;
			}
			else if (previous_state == 1)
			{
				delta /= 2;
			}
			previous_state = 1;
		}
		else if (dist_dec < dist_inc)
		{
			if (dist - dist_dec > threshold)
			{
				t = t - delta;
				dist = dist_dec;
			}
			else if (previous_state == -1)
			{
				delta /= 2;
			}
			previous_state = -1;
		}
	}

	if (t > 1)
	{
		t = 1;
	}
	else if (t < 0)
	{
		t = 0;
	}

	this.t = t;

	return this.distToParameter(this.t, u);
};

// Given surface parameters t and u, this function returns the distance to that surface location.
Point.prototype.distToParameter = function(t, u)
{
	var coords = BSurface.calc_coords(t, u);
	var x = coords[0];
	var y = coords[1];
	var z = coords[2];
	return Math.sqrt(Math.pow(this.x-x, 2) + (this.y-y, 2) + (this.z-z, 2));
};

Point.prototype.distFromLine = function(slope, intersect)
{
	return (slope*this.x - this.z + intersect)/Math.sqrt(Math.pow(slope, 2) + 1);
};
























function worldTransformation()
{
	BSurface.scaleFactor(zoom, true);
	BSurface.rotateY(yaw);
	BSurface.rotateX(pitch);

	if (DMap != undefined)
	{
		DMap.scaleFactor(zoom, true);
		DMap.rotateY(yaw);
		DMap.rotateX(pitch);
	}
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
			BSurface.moveControlPointTo2D(Mouse.held_id[0], Mouse.held_id[1], Mouse.x, Mouse.y);
			BSurface.updatePoints();
			worldTransformation();
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

			worldTransformation();
		}
	}

}, false);

cvs.addEventListener('mousedown', function(evt)
{
	Mouse.down = true;


	// Check if mouse is over a point
	var closest_id = BSurface.closestControlPoint2D(Mouse);
	var closest_control_point = Points.x[BSurface.array_of_transformed_ids[closest_id[0]][closest_id[1]]];
	
	var closest_dist = closest_control_point.dist2d(Mouse);
	if (closest_dist < 15)
	{
		Mouse.holding = true;
		Mouse.held_id = closest_id;
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

	BSurface.scaleFactor(1 + delta*.1, false);
	DMap.scaleFactor(1 + delta*.1, false);

	evt.preventDefault();
	return false;
}, false);


init();