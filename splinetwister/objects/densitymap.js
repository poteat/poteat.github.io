function DensityMap(pdb_string)
{
	if (pdb_string == undefined)
	{
		this.createFromMRC();
	}
	else
	{
		lines = pdb_string.split("\n");

		this.points = new Array();
		this.points_T = new Array();

		for (var i = 0; i < lines.length; i++)
		{
			var current_line = lines[i];

			// Replace multiple space segments in line with one space each:
			current_line_min = current_line.replace(/  +/g, ' ');

			var datum = current_line_min.split(" ");
			var type = datum[0];
			if (type == "ATOM")
			{
				var coord_substring = current_line.substring(30, 55);
				coord_substring = coord_substring.replace(/  +/g, ' ');
				var coord_datum = coord_substring.split(" ");

				var x = Number(coord_datum[1]);
				var y = Number(coord_datum[2]);
				var z = Number(coord_datum[3]);

				var p = new Point(x, y, z);
				var p_t = new Point(0, 0, 0);

				this.points.push(p);
				this.points_T.push(p_t);
			}
		}

		// Calculate average position

		var avgx = 0;
		var avgy = 0;
		var avgz = 0;

		for (var i = 0; i < this.points.length; i++)
		{
			var p = this.points[i];

			avgx += p.x;
			avgy += p.y;
			avgz += p.z;
		}

		avgx /= this.points.length;
		avgy /= this.points.length;
		avgz /= this.points.length;

		this.x_avg = avgx;
		this.y_avg = avgy;
		this.z_avg = avgz;


		// Renormalize points WRT avg position

		for (var i = 0; i < this.points.length; i++)
		{
			var p = this.points[i];

			p.x -= avgx;
			p.y -= avgy;
			p.z -= avgz;
		}



		this.scale = 1;


	}

	// Min and max parameter projections of voxel data points
	//  Used to decide how much of surface to draw.
	this.min_t = 0;
	this.max_t = 1;
	this.min_u = 0;
	this.max_u = 1;
}

DensityMap.prototype.createFromFit = function(x_avg, y_avg, z_avg, rot_theta,
	rot_ux, rot_uy, rot_uz, min_t, max_t, min_u, max_u)
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

	// Extra 25 ints of storage space

	this.xorigin = readFloat(23 + 26);
	this.yorigin = readFloat(23 + 27);
	this.zorigin = readFloat(23 + 28);

	this.scale = this.xlength / this.mx; // The size of each voxel in Angstroms

	//this.nlabl = readInt(23+29+3);

	voxel = createArray(this.nx, this.ny, this.nz);

	this.x_avg = x_avg;
	this.y_avg = y_avg;
	this.z_avg = z_avg;

	this.points = new Array(); // Immutable data points
	this.points_T = new Array(); // Points in camera space

	for (var z = 0; z < this.nz; z++)
	{
		for (var y = 0; y < this.ny; y++)
		{
			for (var x = 0; x < this.nx; x++)
			{
				var density = readFloat(256 + (z * this.nx * this.ny + y *
					this.nx + x));
				if (density > density_threshold)
				{
					var scale = this.scale;
					var p = new Point(((x + this.xorigin) - x_avg) * scale,
						((y + this.yorigin) - y_avg) * scale, ((z +
							this.zorigin) - z_avg) * scale);
					var p2 = new Point(0, 0, 0);
					this.points.push(p);
					this.points_T.push(p2);
				}
			}
		}
	}

	this.rot_theta = rot_theta;
	this.rot_ux = rot_ux;
	this.rot_uy = rot_uy;
	this.rot_uz = rot_uz;

	DMap.rotateAxis(DMap.rot_theta, DMap.rot_ux, DMap.rot_uy, DMap.rot_uz);

	this.min_t = min_t;
	this.max_t = max_t;
	this.min_u = min_u;
	this.max_u = max_u;
}

DensityMap.prototype.createFromMRC = function()
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

	// Extra 25 ints of storage space

	this.xorigin = readFloat(23 + 26);
	this.yorigin = readFloat(23 + 27);
	this.zorigin = readFloat(23 + 28);

	this.scale = this.xlength / this.mx; // The size of each voxel in Angstroms

	//this.nlabl = readInt(23+29+3);

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
				var density = readFloat(256 + (z * this.nx * this.ny + y *
					this.nx + x));
				if (density > density_threshold)
				{
					num++;

					x_avg += (x * this.scale + this.xorigin);
					y_avg += (y * this.scale + this.yorigin);
					z_avg += (z * this.scale + this.zorigin);
				}
			}
		}
	}

	x_avg /= num;
	y_avg /= num;
	z_avg /= num;

	this.x_avg = x_avg;
	this.y_avg = y_avg;
	this.z_avg = z_avg;

	this.points = new Array(); // Immutable data points
	this.points_T = new Array(); // Points in camera space

	for (var z = 0; z < this.nz; z++)
	{
		for (var y = 0; y < this.ny; y++)
		{
			for (var x = 0; x < this.nx; x++)
			{
				var density = readFloat(256 + (z * this.nx * this.ny + y *
					this.nx + x));
				if (density > density_threshold)
				{
					var scale = this.scale;

					var p = new Point(
						x * scale + this.xorigin - x_avg,
						y * scale + this.yorigin - y_avg,
						z * scale + this.zorigin - z_avg);

					p.density = density;

					var p2 = new Point(0, 0, 0);
					this.points.push(p);
					this.points_T.push(p2);
				}
			}
		}
	}
};

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
var lim = 20;

DensityMap.prototype.draw = function()
{
	if (BSurface.finished)
	{
		// If the surface has been matched, lets draw the voxels transparently.

		ctx.globalAlpha = .5;
	}

	for (var i = 0; i < this.points.length; i++)
	{
		this.points_T[i].draw();

		if (this.extension == 'pdb')
		{
			// alert(this.points_T[i].x + " " + this.points_T[i].y + " " + 
			// this.points_T[i].z);
		}
	}

	if (t == lim)
	{
		if (BSurface.finished == false)
		{
			this.updateProjection();
		}
	}
	else
	{
		t++;
	}

	for (var i = 0; i < this.points.length; i++)
	{
		var p = this.points[i];
		var p_draw = this.points_T[i]
	}

	ctx.globalAlpha = 1;
};

DensityMap.prototype.updateProjection = function(permissive)
{
	var min_t = 1;
	var max_t = 0;
	var min_u = 1;
	var max_u = 0;

	for (var i = 0; i < this.points.length; i++)
	{
		var p = this.points[i];
		p.findClosestResPoint();
		p.refineProjection(permissive);

		if (p.t < min_t)
		{
			min_t = p.t;
		}

		if (p.t > max_t)
		{
			max_t = p.t;
		}

		if (p.u < min_u)
		{
			min_u = p.u;
		}

		if (p.u > max_u)
		{
			max_u = p.u;
		}

		this.min_t = min_t;
		this.max_t = max_t;
		this.min_u = min_u;
		this.max_u = max_u;
	}
	t = 0;
}

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
		sum_dist += p.density * Math.pow(p.dist(proj), 2);
	}

	this.saved_score = Math.sqrt(sum_dist / this.points.length);

	return this.saved_score;
};

DensityMap.prototype.generateCroppedSurface = function(num_X, num_Y)
{
	this.updateProjection();

	var size_t = this.max_t - this.min_t;
	var delta_t = size_t / (num_X - 1);

	var size_u = this.max_u - this.min_u;
	var delta_u = size_u / (num_Y - 1);

	// Instantiate a bit array of dimensions [num_x, num_y] to false.
	var bit_array = new Array(num_X);
	for (var i = 0; i < num_X; i++)
	{
		bit_array[i] = new Array(num_Y);

		for (var j = 0; j < num_Y; j++)
		{
			bit_array[i][j] = false;
		}
	}

	for (var i = 0; i < this.points.length; i++)
	{
		var p = this.points[i];
		var t = p.t;
		var u = p.u;

		// Convert value to array coordinate
		t = clamp(Math.round((t - this.min_t) / delta_t), 0, num_X - 1);

		u = clamp(Math.round((u - this.min_u) / delta_u), 0, num_Y - 1);

		bit_array[t][u] = true;
	}

	var points = new Array();

	for (var i = 0; i < num_X; i++)
	{
		for (var j = 0; j < num_Y; j++)
		{
			if (bit_array[i][j] == true)
			{
				var t = i * delta_t + this.min_t;
				var u = j * delta_u + this.min_u;

				var coords = BSurface.calc(t, u);
				var p = new Point(coords[0], coords[1], coords[2]);

				points.push(p);
			}
		}
	}

	return points;
}

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

	slope = (vr_z - vr_x + Math.sqrt(Math.pow(vr_z - vr_x, 2) + 4 *
		Math.pow(covr, 2))) / (2 * covr);
	intersect = avgz - slope * avgx;

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

		var projection_x = (x + m * (z - b)) / (Math.pow(m, 2) + 1);
		var projection_z = (m * (x + m * z) + b) / (Math.pow(m, 2) + 1);

		var direction = sign(projection_x - avgx);

		var proj_dist = direction * Math.sqrt(Math.pow(projection_x - avgx, 2) +
			Math.pow(projection_z - avgz, 2));

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


	var p1 = this.points[min_dist_id];
	var p2 = this.points[min_proj_dist_id];
	var p3 = this.points[max_dist_id];
	var p4 = this.points[max_proj_dist_id];

	var p1_T = this.points_T[min_dist_id];
	var p2_T = this.points_T[min_proj_dist_id];
	var p3_T = this.points_T[max_dist_id];
	var p4_T = this.points_T[max_proj_dist_id];

	p1_T.color = "green";
	p3_T.color = "green";
	p2_T.color = "black";
	p4_T.color = "black";
	p1_T.size = 5;
	p2_T.size = 5;
	p3_T.size = 5;
	p4_T.size = 5;

	var array = [
		[p1, p2],
		[p4, p3]
	];

	BSurface.setControlPoints(array);
};
