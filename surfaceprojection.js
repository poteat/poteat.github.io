





// GLOBAL SCOPE DECLARATIVE HEADER
//
	// Camera and animation parameters
	var fps = 30;
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
	var BProj;

	// Program entry and loop definition
	clearInterval(mainloop);
	var mainloop = setInterval("main();",1000/fps);
//






// Program entry point, runs once at initialization of application.
function init()
{
	BSurface = new Surface(4, 4, 30, 30)
	BProj = new Projection();

	BProj.appendPoint(25, -50, 0);

	updateTransformedPoints();
}




// Main program control loop, responsible for draw calls.
function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	BSurface.draw();
	BProj.draw();
}






// updateTransformedPoints()
// ----------------------------------------------------------------------
// This function updates the "camera-transformed" set of points belonging to each object.
// The transformation consists of two rotations around the Y and X axes, by the yaw and
// pitch camera angles respectively.  There is also a scaling transformation for zoom.

function updateTransformedPoints()
{
	BSurface.updateTransformedPoints();
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

			var width = 100;

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

Surface.prototype.updatePoints = function()
{
	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			var t = i/(this.T-1);
			var u = j/(this.U-1);

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

Surface.prototype.draw = function()
{
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

Projection.prototype.refineProjection = function(i)
{
	var p = this.points[i];

	var gap = 1/(BSurface.RX - 1);

	var iterations = 30;

	var delta_t = gap/iterations;
	var delta_u = gap/iterations;

	var threshold = 0;

	var t = p.t;
	var u = p.u;
	var dist = p.distToParameter(t, u);

	var previous_state_t = 0;
	var previous_state_u = 0;

	for (var i = 0; i < iterations; i++)
	{
		var dist_inc = p.distToParameter(t + delta_t, u);
		var dist_dec = p.distToParameter(t - delta_t, u);

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


		var dist_inc = p.distToParameter(t, u + delta_u);
		var dist_dec = p.distToParameter(t, u - delta_u);

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

	ctx.fillText("Delta: " + delta_t, 20, 40);

	p.t = t;
	p.u = u;
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





























function Point(x, y, z, color, size, id)
{
	if (color == undefined)
	{
		color = "black";
	}

	if (size == undefined)
	{
		size = 1;
	}

	this.x = x;
	this.y = y;
	this.z = z;
	this.color = color;
	this.size = size;

	this.id = id;
}

Point.prototype.draw = function(actually_draw)
{
	if (actually_draw == undefined)
	{
		actually_draw = true;
	}

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



// Given surface parameters t and u, this function returns the distance to that surface location.
Point.prototype.distToParameter = function(t, u)
{
	var coords = BSurface.calc(t, u);
	var x = coords[0];
	var y = coords[1];
	var z = coords[2];
	return Math.sqrt(Math.pow(this.x-x, 2) + Math.pow(this.y-y, 2) + Math.pow(this.z-z, 2));
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
	var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));

	zoom *= (1 + delta*.1)

	updateTransformedPoints();

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