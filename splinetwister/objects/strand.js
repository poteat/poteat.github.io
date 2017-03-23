function Strand()
{
	this.originPoint;

	this.optimize_button;
	this.angle_slider;
	this.offset_slider;

	this.strand_gap;
	this.angle;
	this.offset;

	this.strandMap;

	this.initialize();
}

Strand.prototype.initialize = function()
{
	this.originPoint = new Point(0, 0, 0);

	optimize_button = Create_ToggleButton(550, 30, 70, 25, "Optimize");
	angle_slider = Create_Slider(550, 60, 150, 20, "Angle", 10, 0, 179.99, 45);
	offset_slider = Create_Slider(550, 90, 150, 20, "Offset", 10, -1.99, 2, 0);
	gap_slider = Create_Slider(550, 120, 150, 20, "Gap", 10, 4, 5, 4.5);

	this.optimize_button = ToggleButtons[optimize_button];
	this.angle_slider = Sliders[angle_slider];
	this.offset_slider = Sliders[offset_slider];
	this.gap_slider = Sliders[gap_slider];

	var coords = BPerimeter.getSurfaceCentroid();
	var avgt = coords[0];
	var avgu = coords[1];

	this.setOrigin(avgt, avgu);

	this.angle = 45;
	this.offset = 0;
	this.strand_gap = 4.5;

	this.updateStrandMap(this.angle, this.offset, this.strand_gap);
}

Strand.prototype.importStrands = function(points)
{
	console.log("Import called");

	// We first define an array of arrays, each array representing a strand.
	// They initially are in arbitrary order, and we need to solve a matching
	// problem to find out their true relationship with the simulated strands.

	this.truePoints = new Array();

	this.truePoints[0] = new Array();

	var epsilon = 1;

	var prev_p = points[0];

	var s = 0;

	for (var i = 0; i < points.length; i++)
	{
		var p = points[i];

		var dist = p.dist(prev_p);

		if (p.dist(prev_p) < epsilon)
		{
			this.truePoints[s].push(p);
		}
		else
		{
			this.truePoints[s + 1] = new Array();
			s++;
			this.truePoints[s].push(p);
		}

		prev_p = p;
	}

	// Loop through all true strands, calculating their average x y z coord.

	var L = this.truePoints.length;
	var avg = new Array();

	for (var i = 0; i < L; i++)
	{
		var s = this.truePoints[i];

		console.log(s.length);

		var sum_x = 0;
		var sum_y = 0;
		var sum_z = 0;

		for (var j = 0; j < s.length; j++)
		{
			var p = s[j];

			sum_x += p.x;
			sum_y += p.y;
			sum_z += p.z;
		}

		sum_x /= s.length;
		sum_y /= s.length;
		sum_z /= s.length;

		avg.push(new Point(sum_x, sum_y, sum_z));
	}

	// Now that we have the true strand center points, find the delta of each
	// from the central surface point.  This is a simplified heuristic to find
	// the true strand which is associated with the central simulated strand.

	var min_dist = Infinity;
	var min_id = -1;

	for (var i = 0; i < avg.length; i++)
	{
		var p = avg[i];

		var dist = p.dist(this.originPoint);

		if (dist < min_dist)
		{
			min_dist = dist;
			min_id = i;
		}
	}


	// For the optimization process, we define, for each true strand, M sample
	// points that are uniformly spaced throughout the strand.

	M = 10;

	for (var i = 0; i < this.truePoints.length; i++)
	{
		var s = this.truePoints[i];

		var range = s.length - 1;

		s.samples = new Array();

		for (var j = 0; j < M; j++)
		{
			var t = j / (M - 1);

			var index = Math.round(t * range);

			s.samples[j] = s[index];
		}
	}



	this.scoreViaTrueStrand(this.strandMap[0], this.truePoints[2]);



	this.truePoints_T = new Array();

	for (var i = 0; i < this.truePoints.length; i++)
	{
		this.truePoints_T.push(new Array());

		for (var j = 0; j < this.truePoints[i].length; j++)
		{
			var color = "Black";
			color = i == min_id ? "Red" : color;

			var p = new Point(0, 0, 0, color, 3);
			p.transform(this.truePoints[i][j]);
			this.truePoints_T[i].push(p);
		}
	}
}

Strand.prototype.setOrigin = function(t, u)
{
	var coords = BSurface.calc(t, u);

	this.originPoint.x = coords[0];
	this.originPoint.y = coords[1];
	this.originPoint.z = coords[2];

	this.originPoint.t = t;
	this.originPoint.u = u;
}

Strand.prototype.angleBetweenTwoVectors = function(x1, y1, z1, x2, y2, z2, p1,
	p3)
{
	var l1 = Math.sqrt(Math.pow(x1, 2) + Math.pow(y1, 2) + Math.pow(z1, 2));
	var l2 = Math.sqrt(Math.pow(x2, 2) + Math.pow(y2, 2) + Math.pow(z2, 2));

	var dot = x1 * x2 + y1 * y2 + z1 * z2;

	var ang = Math.acos(dot / l1 / l2);

	// Twist direction calculation

	var cross_x = y1 * z2 - z1 * y2;
	var cross_y = z1 * x2 - x1 * z2;
	var cross_z = x1 * y2 - y1 * x2;

	var delta_x = p1.x - p3.x;
	var delta_y = p1.y - p3.y;
	var delta_z = p1.z - p3.z;

	var dot_dir = cross_x * delta_x + cross_y * delta_y + cross_z * delta_z;

	var dir = sign(dot_dir);

	return dir * ang;
}

Strand.prototype.distBetweenSamples = function(x1, y1, z1, x2, y2, z2)
{
	return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 -
		z2, 2));
}

Strand.prototype.linearInterpolate = function(x_array, y_array, x)
{
	// Linearly interpolates to find x from a table x_array; y_array
	// such that x_array and y_array have the same length, and are
	// sorted in terms of x_array.

	// Returns y extrema if x is outside of bounds (i.e. does no extrapolation)

	if (x_array.length == 0)
	{
		return 0;
	}

	if (x <= x_array[0])
	{
		return y_array[0];
	}

	for (var i = 1; i < x_array.length; i++)
	{
		var upper_bound = x_array[i];
		var lower_bound = x_array[i - 1];

		if (x <= upper_bound)
		{
			var range = upper_bound - lower_bound;
			var delta = x - lower_bound;
			var slope = (y_array[i] - y_array[i - 1]) / range;

			var y = y_array[i - 1] + delta * slope;

			return y;
		}
	}

	if (x > x_array[x_array.length - 1])
	{
		return y_array[x_array.length - 1];
	}
}

Strand.prototype.euclideanShift = function(points, ang, dist)
{
	// Takes in angle in degrees
	// 
	var projected = new Array();

	if (dist > 0)
	{
		var sign = 1;
	}
	else
	{
		dist = Math.abs(dist);
		var sign = -1;
	}

	// Currently 5
	var strand_gap = dist;



	var eps_dist = 0.01;
	var ang = this.angle;

	var N = 10;

	var x_ang_array = new Array();
	var y_ang_array = new Array();

	for (var t = 0; t <= 1; t += 1 / (N - 1))
	{
		var range = (points.length - 1) - points._length;

		var i = Math.round(points._length + t * range);

		var p1 = points[i];
		var p2 = points[i + 1];

		if (p2 == undefined)
		{
			break;
		}

		var angle_shift = 0;

		var delta = 45;

		for (var j = 0; j < 20; j++)
		{
			// Calculate the current angle
			// 
			var dt = p1.t + Math.cos((ang + angle_shift) / 180 * Math.PI) * eps_dist;
			var du = p1.u + Math.sin((ang + angle_shift) / 180 * Math.PI) * eps_dist;
			var p3 = BSurface.sample(dt, du);
			var delta_angle = Math.abs(this.angleBetween(p1, p2, p3));

			angle_shift += delta;
			var dt = p1.t + Math.cos((ang + angle_shift) / 180 * Math.PI) * eps_dist;
			var du = p1.u + Math.sin((ang + angle_shift) / 180 * Math.PI) * eps_dist;
			var p3 = BSurface.sample(dt, du);
			var delta_angle_plus = Math.abs(this.angleBetween(p1, p2, p3));

			angle_shift -= 2 * delta;
			var dt = p1.t + Math.cos((ang + angle_shift) / 180 * Math.PI) * eps_dist;
			var du = p1.u + Math.sin((ang + angle_shift) / 180 * Math.PI) * eps_dist;
			var p3 = BSurface.sample(dt, du);
			var delta_angle_minus = Math.abs(this.angleBetween(p1, p2, p3));

			if (Math.abs(delta_angle_plus - 90) < Math.abs(delta_angle_minus - 90))
			{
				angle_shift += 2 * delta;
			}

			delta /= 2;
		}

		if (i != points.length - 1)
		{
			x_ang_array.push(i);
			y_ang_array.push(angle_shift);
		}
		else
		{
			x_ang_array.push(points.length - 1)
			y_ang_array.push(0);
		}
	}



	// For a subset of points defined by N, build a look-up table of euclid
	// shifts.

	var N = 40;

	var x_array = new Array();
	var y_array = new Array();

	for (var t = 0; t <= 1; t += 1 / (N - 1))
	{
		var range = (points.length - 1) - points._length;

		var i = Math.round(points._length + t * range);

		var p = points[i];

		// Now we find the euclid shift for this particular point.

		var delta = 0.1;

		var shift_angle = this.linearInterpolate(x_ang_array, y_ang_array, i);

		var adjusted_ang = (ang + shift_angle) / 180 * Math.PI;

		var _cos = Math.cos(adjusted_ang);
		var _sin = Math.sin(adjusted_ang);

		var dt = _cos * delta;
		var du = _sin * delta;

		dist = p.distToParameter(p.t + sign * dt, p.u + sign * du);

		while (Math.abs(dist - strand_gap) > 0.001)
		{
			if (dist > strand_gap)
			{
				delta /= 2;

				dt -= _cos * delta;
				du -= _sin * delta;
			}
			else
			{
				dt += _cos * delta;
				du += _sin * delta;
			}

			dist = p.distToParameter(p.t + sign * dt, p.u + sign * du);
		}

		// Now |dt,du| represents the euclid shift parameter.

		x_array.push(i);
		y_array.push(Math.sqrt(dt * dt + du * du));
	}

	var neg_length = 0;

	for (var i = points._length; i < points.length; i++)
	{
		var p = points[i];

		/*

		var delta = 0.1;

		var dt = _cos * delta;
		var du = _sin * delta;

		dist = p.distToParameter(p.t + sign * dt, p.u + sign * du);

		while (Math.abs(dist - strand_gap) > 0.001)
		{
			if (dist > strand_gap)
			{
				delta /= 2;

				dt -= _cos * delta;
				du -= _sin * delta;
			}
			else
			{
				dt += _cos * delta;
				du += _sin * delta;
			}

			dist = p.distToParameter(p.t + sign * dt, p.u + sign * du);
		}

		//*/

		// New linear code START

		var delta = this.linearInterpolate(x_array, y_array, i);

		var shift_angle = this.linearInterpolate(x_ang_array, y_ang_array, i);

		var adjusted_ang = (ang + shift_angle) / 180 * Math.PI;

		var dt = Math.cos(adjusted_ang) * delta;
		var du = Math.sin(adjusted_ang) * delta;

		//*/
		// New linear code END



		var coords = BSurface.calc(p.t + sign * dt, p.u + sign * du);

		var p_new = new Point(coords[0], coords[1], coords[2]);
		p_new.t = p.t + sign * dt;
		p_new.u = p.u + sign * du;

		if (i >= 0)
		{
			projected[i] = p_new;
		}
		else
		{
			if (neg_length == 0)
			{
				neg_length = -i;
			}

			projected[i] = p_new;
		}

	}

	projected._length = -neg_length;

	return projected;
}

Strand.prototype.cullExteriorPoints = function(points)
{
	// Returns set of points which are inside of the hull boundary.  If none of the 
	// given points are inside the hull boundary, returns false.

	var culled = new Array();

	var neg_length = 0;

	for (var i = points._length; i < points.length; i++)
	{
		var p = points[i];

		intersect = getIntersectionPoints(p.t, p.u, 0,
			BPerimeter.vertices, false);

		if (intersect != false)
		{

			if (i >= 0)
			{
				culled[i] = p;
			}
			else
			{
				if (neg_length == 0)
				{
					neg_length = -i;
				}

				culled[i] = p;
			}
		}
	}

	if (culled.length > 0 || neg_length > 0)
	{
		culled._length = -neg_length;
		return culled;
	}
	else
	{
		return false;
	}
}

Strand.prototype.updateDownload = function()
{

	// We now happily have the full set of strand sample points, so we can 
	// generate a pdb file and hook it to the button (magic)

	// Create new array of strand samples to perform work on.

	var sample_points = new Array();

	var map = this.strandMap;

	for (var i = map._length; i < map.length; i++)
	{
		for (var j = map[i]._length; j < map[i].length; j++)
		{
			var p = map[i][j];

			if (p != undefined)
			{
				var p_copy = new Point(p.x, p.y, p.z);

				sample_points.push(p_copy);
			}
		}
	}

	// Undo plane and centering transformations
	for (var i = 0; i < sample_points.length; i++)
	{
		sample_points[i].rotateAxis(-DMap.rot_theta, DMap.rot_ux, DMap.rot_uy,
			DMap.rot_uz)

		sample_points[i].x += DMap.x_avg
		sample_points[i].y += DMap.y_avg
		sample_points[i].z += DMap.z_avg
	}

	var string = generatePDBString(sample_points);

	var file = generateTextFile(string);

	strand_dl.href = file;

	// Build filename by appending "_SplineFit" to the end of the input file

	var filename = DMap.filename;
	var exploded_filename = filename.split(".");

	var strand_filename = "";

	for (var i = 0; i < exploded_filename.length - 2; i++)
	{
		strand_filename += (exploded_filename[i] + ".");
	}
	strand_filename += (exploded_filename[i]);

	strand_filename += "_SplineFit_Strands.pdb";

	strand_dl.download = strand_filename;

}

Strand.prototype.draw = function()
{
	if ((this.angle_slider.value != this.angle) ||
		(this.offset_slider.value != this.offset) ||
		(this.gap_slider.value != this.strand_gap))
	{
		this.angle = this.angle_slider.value;
		this.offset = this.offset_slider.value;
		this.strand_gap = this.gap_slider.value;

		this.updateStrandMap(this.angle, this.offset, this.strand_gap);
	}

	this.drawMap();
	this.drawTrueStrands();

	if (this.truePoints != undefined)
	{
		// We call "scoreViaTrueStrand" to find the matching between a given
		// simulated strand and a given true strand.

		var score = this.scoreViaTrueStrand(this.strandMap[0], this.truePoints[2]);
		ctx.fillText("Score for initial matching process: " + score, 10, 80);

	}

}

Strand.prototype.drawMap = function()
{
	// Draw all strand map points:

	var map = this.strandMap_T;

	for (var i = map._length; i < map.length; i++)
	{
		for (var j = map[i]._length; j < map[i].length; j++)
		{
			var p = map[i][j];

			if (p != undefined)
			{
				p.draw();
			}
		}
	}

	// Draw all parallel strand lines (first part of grid)

	ctx.strokeStyle = "black";
	ctx.lineWidth = 1;

	for (var i = map._length; i < map.length; i++)
	{
		for (var j = map[i]._length; j < map[i].length - 1; j++)
		{
			var p1 = map[i][j];
			var p2 = map[i][j + 1];

			if (p1 != undefined && p2 != undefined)
			{
				if (p1.visible() || p2.visible())
				{
					ctx.beginPath();
					ctx.moveTo(p1.x2d, p1.y2d);
					ctx.lineTo(p2.x2d, p2.y2d);
					ctx.stroke();
				}
			}
		}
	}

	// Loop through all strands from left to right, drawing if both exist, and
	// at least one is visible.

	for (var i = map._length; i < map.length - 1; i++)
	{
		for (var j = map[i]._length; j < map[i].length; j++)
		{
			var p1 = map[i][j];
			var p2 = map[i + 1][j];

			if (p1 != undefined && p2 != undefined)
			{
				if (p1.visible() || p2.visible())
				{
					ctx.beginPath();
					ctx.moveTo(p1.x2d, p1.y2d);
					ctx.lineTo(p2.x2d, p2.y2d);
					ctx.stroke();
				}
			}
		}
	}
}

Strand.prototype.drawTrueStrands = function()
{
	if (this.truePoints_T != undefined)
	{
		for (var i = 0; i < this.truePoints_T.length; i++)
		{
			for (var j = 0; j < this.truePoints_T[i].length; j++)
			{
				var p = this.truePoints_T[i][j];
				p.draw();
			}
		}
	}
}

Strand.prototype.scoreViaTrueStrand = function(sim_strand, true_strand)
{
	// First, we find the closest M-point (for each sim-point).

	var score = 0;

	for (var i = 0; i < sim_strand.length; i++)
	{
		var p = sim_strand[i];

		var min_dist = Infinity;
		var min_index = -1;

		for (var j = 0; j < true_strand.samples.length; j++)
		{
			var sample = true_strand.samples[j];

			var dist = p.squareDist(sample);

			if (dist < min_dist)
			{
				min_dist = dist;
				min_index = j;
			}
		}

		// We have min_dist, so find the direction we need to search for the
		// local minimum. (Or if we even need to search further)

		var left_dist = min_index ?
			p.squareDist(true_strand[min_index - 1]) : Infinity;

		var right_dist = min_index - true_strand.length ?
			p.squareDist(true_strand[min_index + 1]) : Infinity;

		var direction;

		if (left_dist < right_dist && left_dist < min_dist)
		{
			direction = -1;
		}
		else if (right_dist < left_dist && right_dist < min_dist)
		{
			direction = 1;
		}
		else
		{
			score += min_dist;
			continue;
		}

		while (true)
		{
			min_index += direction;
			var dist = min_index ?
				p.squareDist(true_strand[min_index + direction]) : Infinity;

			if (dist < min_dist)
			{
				min_dist = dist;
			}
			else
			{
				min_index += direction;
				score += min_dist;
				break;
			}
		}
	}

	return Math.sqrt(score / sim_strand.length);
}

Strand.prototype.angleBetween = function(p1, p2, p3)
{
	// Returns the angle between p2-p1 and p3-p1.

	var x1 = p2.x - p1.x;
	var y1 = p2.y - p1.y;
	var z1 = p2.z - p1.z;

	var x2 = p3.x - p1.x;
	var y2 = p3.y - p1.y;
	var z2 = p3.z - p1.z;

	var dot = x1 * x2 + y1 * y2 + z1 * z2;
	var l1 = Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1);
	var l2 = Math.sqrt(x2 * x2 + y2 * y2 + z2 * z2);

	return Math.acos(dot / l1 / l2) / Math.PI * 180;
}

Strand.prototype.updateStrandMap = function(angle, offset, strand_gap)
{
	/**
	 * We may store the strand samples as a 2-dimensional arbitrary indice map,
	 * the first dimension specifying the strand (0 being the central strand).
	 * The second dimension specifies the particular strand points.  This
	 * dimension may be a subset of other strand samples, depending on the
	 * actual boundary of the surface.
	 */

	this.angle = angle;
	this.offset = offset;
	this.strand_gap = strand_gap;

	this.strandMap = new Array();

	// We first generate strand 0, positive samples.

	var Hull = BPerimeter.vertices;

	var offset_x = Math.cos((this.angle) / 180 * Math.PI) * this.offset;
	var offset_y = Math.sin((this.angle) / 180 * Math.PI) * this.offset;



	// Perform a temporary euclidean shift on the origin point to implement
	// the offset on strand generation.

	var coords = BPerimeter.getSurfaceCentroid();
	var avgt = coords[0];
	var avgu = coords[1];
	this.originPoint = BSurface.sample(avgt, avgu);
	var p = [this.originPoint]
	p._length = 0;
	p = this.euclideanShift(p, this.angle, offset);
	this.originPoint = p[0];





	var intersects = getIntersectionPoints(this.originPoint.t,
		this.originPoint.u, (this.angle) / 180 * Math.PI, Hull,
		true);

	// First, we generate the central strand.  We do this by finding the two
	// perimeter collision points, and arbitrarily scaling them up.

	// dx1, dy1, dx2, dy2 now represent surface coordinates that we want to
	// generate strand 0 from.

	var number_of_samples = 50;

	var delta = 1 / number_of_samples;

	this.strandMap[0] = new Array();

	this.strandMap[0][0] = this.originPoint;

	var len = 1.5 * BPerimeter.half_length;

	var dx1 = intersects[0][0];
	var dy1 = intersects[0][1];

	var dx2 = intersects[1][0];
	var dy2 = intersects[1][1];

	var l1 = Math.sqrt(Math.pow(this.originPoint.t - dx1, 2) + Math.pow(
		this.originPoint.u - dy1, 2));

	var l2 = Math.sqrt(Math.pow(this.originPoint.t - dx2, 2) + Math.pow(
		this.originPoint.u - dy2, 2));

	var l3 = Math.sqrt(Math.pow(dx1 - dx2, 2) + Math.pow(dy1 - dy2, 2));

	dx1 = this.originPoint.t + (dx1 - this.originPoint.t) / l1;
	dy1 = this.originPoint.u + (dy1 - this.originPoint.u) / l1;

	dx2 = this.originPoint.t + (dx2 - this.originPoint.t) / l2;
	dy2 = this.originPoint.u + (dy2 - this.originPoint.u) / l2;

	if (l3 + 0.001 < l1 + l2)
	{
		if (l1 < l2)
		{
			dx1 = this.originPoint.t - (dx1 - this.originPoint.t);
			dy1 = this.originPoint.u - (dy1 - this.originPoint.u);
		}
		else
		{
			dx2 = this.originPoint.t - (dx2 - this.originPoint.t);
			dy2 = this.originPoint.u - (dy2 - this.originPoint.u);
		}
	}

	// Linearly interpolate from centroid to (dx1, dy1).

	var i = 0;

	var scale = len;

	for (var t = delta; t <= 1; t += delta)
	{
		var dx = this.originPoint.t + scale * t * (dx1 - this.originPoint.t);
		var dy = this.originPoint.u + scale * t * (dy1 - this.originPoint.u);

		var p = BSurface.sample(dx, dy);

		i++;

		this.strandMap[0][i] = p;
	}

	// Linearly interpolate from centroid the other way, assigning to negative
	// indice space.

	var i = 0;

	for (var t = delta; t <= 1; t += delta)
	{
		var dx = this.originPoint.t + scale * t * (dx2 - this.originPoint.t);
		var dy = this.originPoint.u + scale * t * (dy2 - this.originPoint.u);

		var p = BSurface.sample(dx, dy);

		i++;

		this.strandMap[0][-i] = p;
	}

	this.strandMap[0]._length = -i;



	// Euclidean shift the central strand once in left and right directions.

	for (var sign = -1; sign <= 1; sign += 2)
	{
		var shifted = this.euclideanShift(this.strandMap[0], this.angle,
			sign * this.strand_gap);

		this.strandMap[1 * sign] = shifted;
	}

	this.strandMap._length = -1;


	// Cull central strand, and check the length.  If the length is zero, this
	// implies the central strand is not on the sheet, so we abort.

	var culled = this.cullExteriorPoints(this.strandMap[0]);

	if (culled._length != undefined)
	{
		this.strandMap[0] = culled;
	}
	else
	{
		console.log("Culled central strand is zero length.")
		return;
	}




	// At this point the central strand is culled, and we have both an immediate
	// right and left strand set.

	// We now take the left strand, extend it, and cull it, iteratively.
	// We also do the right strand side using the for-sign idiom.

	for (var sign = -1; sign <= 1; sign += 2)
	{
		var i = 1 * sign;

		while (true)
		{
			var extended = this.euclideanShift(this.strandMap[i], this.angle,
				sign * this.strand_gap);

			var culled = this.cullExteriorPoints(this.strandMap[i]);

			// var culled = this.strandMap[i];

			if (culled._length != undefined)
			{
				this.strandMap[i] = culled;
				this.strandMap[i + sign] = extended;
			}
			else
			{
				// if (culled != false)

				/**
				 * Here lied an absolutely mind-shattering bug, which over hours
				 * I tracked down and hunted.  Apparently, empty arrays are
				 * 'falsey', and thus return are == to false.  In my cull code,
				 * I either return a negative-indice array if there is a result,
				 * or I return 'false' if the resultant array is empty.
				 *
				 * This lead to a strange and obscure corner case where arrays
				 * purely formed from negatively indexed elements were not
				 * rendered on the viewer.  This may be the trickiest bug I've
				 * solved yet.
				 */

				this.strandMap[i] = new Array();
				this.strandMap[i]._length = 0;
				break;
			}

			i += sign;
		}

		if (sign == -1)
		{
			this.strandMap._length = i;
		}
	}



	// Create transposed version of strandMap

	this.strandMap_T = new Array();
	this.strandMap_T._length = this.strandMap._length;

	for (var i = this.strandMap._length; i < this.strandMap.length; i++)
	{
		this.strandMap_T[i] = new Array();
		this.strandMap_T[i]._length = this.strandMap[i]._length;

		for (var j = this.strandMap[i]._length; j < this.strandMap[i].length; j++)
		{
			var p = this.strandMap[i][j];

			if (p != undefined)
			{
				this.strandMap_T[i][j] = p.clone("black", 1);
				this.strandMap_T[i][j].transform(p);
			}
		}
	}

}

Strand.prototype.updateTransformedPoints = function()
{
	var map = this.strandMap_T;

	for (var i = map._length; i < map.length; i++)
	{
		for (var j = map[i]._length; j < map[i].length; j++)
		{
			var p = map[i][j];

			if (p != undefined)
			{
				p.transform(this.strandMap[i][j]);
			}
		}
	}

	if (this.truePoints_T != undefined)
	{
		for (var i = 0; i < this.truePoints_T.length; i++)
		{
			for (var j = 0; j < this.truePoints_T[i].length; j++)
			{
				var p = this.truePoints_T[i][j];
				p.transform(this.truePoints[i][j]);
			}
		}
	}
}
