function Projection()
{
	this.points = new Array();
	this.points_T = new Array();
};

Projection.prototype.appendPoint = function(x, y, z)
{
	this.points.push(new Point(x, y, z));
	this.points_T.push(new Point(0, 0, 0, "darkgreen", 4));

	this.updateTransformedPoints();
};

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
};

Projection.prototype.refineProjection = function(i)
{
	var p = this.points[i];

	var gap = 1 / (BSurface.RX - 1);

	var iterations = 30;

	var delta_t = 2 * gap / iterations;
	var delta_u = 2 * gap / iterations;

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

	p.t = t;
	p.u = u;
};

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

	p.t = min_i / (BSurface.RX - 1);
	p.u = min_j / (BSurface.RY - 1);

	return [min_i, min_j];
};

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
};

Projection.prototype.movePointTo2D = function(i, x2d, y2d)
{
	var p = this.points_T[i];

	var scale = p.scale;

	// Transform modified screen space coordinates into camera space coordinates
	p.x = (x2d - cvs.width / 2) / scale;
	p.y = (y2d - cvs.height / 2) / scale;
	p.z = fov / scale - fov;

	// Transform camera space coordinates into world space
	var p_world = new Point;
	p_world.moveTo(p);

	p_world.rotateX(-pitch);
	p_world.rotateY(-yaw);
	p_world.scaleFactor(1 / zoom);

	this.points[i].moveTo(p_world);
};

Projection.prototype.updateTransformedPoints = function()
{
	for (var i = 0; i < this.points_T.length; i++)
	{
		this.points_T[i].moveTo(this.points[i]);
		this.points_T[i].scaleFactor(zoom);
		this.points_T[i].rotateY(yaw);
		this.points_T[i].rotateX(pitch);
	}
};
