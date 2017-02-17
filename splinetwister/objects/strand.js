function Strand()
{
	this.originPoint;
	this.originPoint_T;

	this.optimize_button;
	this.angle_slider;
	this.offset_slider;

	this.strand_gap;
	this.angle;
	this.offset;

	this.initialize();
}

Strand.prototype.initialize = function()
{
	this.originPoint = new Point(0, 0, 0);
	this.originPoint_T = new Point(0, 0, 0, 'blue', 7);

	optimize_button = Create_ToggleButton(550, 30, 70, 25, "Optimize");
	angle_slider = Create_Slider(550, 60, 150, 20, "Angle", 10, 0, 179.99, 45);
	offset_slider = Create_Slider(550, 90, 150, 20, "Offset", 10, -1.99, 2, 0);

	this.optimize_button = ToggleButtons[optimize_button];
	this.angle_slider = Sliders[angle_slider];
	this.offset_slider = Sliders[offset_slider];

	var coords = BPerimeter.getSurfaceCentroid();
	var avgt = coords[0];
	var avgu = coords[1];

	this.setOrigin(avgt, avgu);

	this.angle = 45;
	this.offset = 0;
	this.strand_gap = 5;


	this.setAngle(45, 0);
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

Strand.prototype.setAngle = function(angle_degrees, offset)
{
	var width_of_gap = this.strand_gap;

	var angle = angle_degrees * Math.PI / 180;

	var perpendicular_angle = (angle_degrees + 90) * Math.PI / 180;

	// Search for parameters in surface space that give a real space distance of
	// 2 angstrom offset.

	var target = offset;

	var starting_p = this.originPoint;

	var t1 = starting_p.t;
	var u1 = starting_p.u;

	var sumdist = 0;
	var i = 0;
	var prev_coords = null;

	var delta = 0.001;

	var t = t1;
	var u = u1;

	var i = 0;

	var dir = sign(target);

	var delta_t = -dir * delta * Math.sin(perpendicular_angle);
	var delta_u = dir * delta * Math.cos(perpendicular_angle);

	var dx = 0;
	var dy = 0;

	while (i < 5 / delta) // Search for a max 5 Angstroms surface-space)
	{
		t += delta_t;
		u += delta_u;

		var coords = BSurface.calc(t, u);

		if (i == 0)
		{
			sumdist += this.distBetweenSamples(coords[0], coords[1], coords[2],
				starting_p.x, starting_p.y, starting_p.z);
		}
		else
		{
			sumdist += this.distBetweenSamples(coords[0], coords[1], coords[2],
				prev_coords[0], prev_coords[1], prev_coords[2]);
		}

		prev_coords = coords;

		if (sumdist > Math.abs(target))
		{
			dx = t - t1;
			dy = u - u1;

			break;
		}

		i++;
	}



	Hull = BPerimeter.vertices;

	intersects = getIntersectionPoints(this.originPoint.t + dx,
		this.originPoint.u + dy, angle, Hull, true);

	if (!intersects)
	{
		return;
	}

	coords1 = BSurface.calc(intersects[0][0], intersects[0][1]);
	coords2 = BSurface.calc(intersects[1][0], intersects[1][1]);

	// Linearly interpolate between two intersections points on surface space.

	var t1 = intersects[0][0];
	var u1 = intersects[0][1];

	var t2 = intersects[1][0];
	var u2 = intersects[1][1];

	var N = 100;

	this.points = new Array();
	this.points_T = new Array();

	for (var i = 0; i < N; i++)
	{
		var P = i / (N - 1);

		var t = t1 + P * (t2 - t1);
		var u = u1 + P * (u2 - u1);

		var coords = BSurface.calc(t, u);

		var sample = new Point(coords[0], coords[1], coords[2]);

		sample.t = t;
		sample.u = u;

		var sample_T = new Point(0, 0, 0, 'black', 3)

		this.points.push(sample);
		this.points_T.push(sample_T);
	}



	// Estimate arclength of entire arc.

	var sumdist = 0;

	this.points[0].sumdist = 0;

	for (var i = 1; i < this.points.length; i++)
	{
		var p = this.points[i - 1];
		var p2 = this.points[i];

		var dist = p.dist(p2);

		sumdist += dist;

		//console.log(sumdist);

		p2.sumdist = sumdist;
	}


	// Given arclength estimation, find points closest to the 1/5 2/5 3/5 4/5 
	// definition to populate the midPoints array.

	var i = 0;

	this.midPoints = new Array();
	this.midPoints_T = new Array();

	for (var j = 1; j < 5; j++)
	{
		var target = sumdist * (j / 5);

		while (i < this.points.length)
		{
			var p = this.points[i];
			var p_T = this.points_T[i];

			if (p.sumdist > target)
			{
				this.midPoints.push(p);
				this.midPoints_T.push(p_T);

				//console.log(p.sumdist);
				break;
			}

			i++;
		}
	}





	var target = width_of_gap;
	var delta = .005; // 0.1 Angstrom delta for search


	this.midPointsLeft = new Array();
	this.midPointsLeft_T = new Array();

	var perpendicular_angle = (angle_degrees + 90) * Math.PI / 180;

	for (var j = 0; j < this.midPoints.length; j++)
	{
		var starting_p = this.midPoints[j];

		var t1 = starting_p.t;
		var u1 = starting_p.u;

		var sumdist = 0;
		var i = 0;
		var prev_coords = null;

		var t = t1;
		var u = u1;

		var i = 0;

		var delta_t = -delta * Math.sin(perpendicular_angle);
		var delta_u = delta * Math.cos(perpendicular_angle);

		while (i < 10 / delta) // Search for a max 10 Angstroms surface-space)
		{
			t += delta_t;
			u += delta_u;

			var coords = BSurface.calc(t, u);

			if (i == 0)
			{
				sumdist += this.distBetweenSamples(coords[0], coords[1],
					coords[2], starting_p.x, starting_p.y, starting_p.z);
			}
			else
			{
				sumdist += this.distBetweenSamples(coords[0], coords[1],
					coords[2], prev_coords[0], prev_coords[1], prev_coords[2]);
			}

			prev_coords = coords;

			if (sumdist > target)
			{
				var p = new Point(coords[0], coords[1], coords[2]);
				var p_T = new Point(coords[0], coords[1], coords[2], "black",
					3);


				this.midPointsLeft.push(p);
				this.midPointsLeft_T.push(p_T);

				break;
			}

			i++;
		}
	}







	this.midPointsRight = new Array();
	this.midPointsRight_T = new Array();

	var perpendicular_angle = (angle_degrees - 90) * Math.PI / 180;

	for (var j = 0; j < this.midPoints.length; j++)
	{
		var starting_p = this.midPoints[j];

		var t1 = starting_p.t;
		var u1 = starting_p.u;

		var sumdist = 0;
		var i = 0;
		var prev_coords = null;

		var t = t1;
		var u = u1;

		var i = 0;

		var delta_t = -delta * Math.sin(perpendicular_angle);
		var delta_u = delta * Math.cos(perpendicular_angle);

		while (i < 10 / delta) // Search for a max 10 Angstroms surface-space)
		{
			t += delta_t;
			u += delta_u;

			var coords = BSurface.calc(t, u);

			if (i == 0)
			{
				sumdist += this.distBetweenSamples(coords[0], coords[1],
					coords[2], starting_p.x, starting_p.y, starting_p.z);
			}
			else
			{
				sumdist += this.distBetweenSamples(coords[0], coords[1],
					coords[2], prev_coords[0], prev_coords[1], prev_coords[2]);
			}

			prev_coords = coords;

			if (sumdist > target)
			{
				var p = new Point(coords[0], coords[1], coords[2]);
				var p_T = new Point(coords[0], coords[1], coords[2], "black",
					3);


				this.midPointsRight.push(p);
				this.midPointsRight_T.push(p_T);

				break;
			}

			i++;
		}
	}


	this.updateScore();

	this.updateTransformedPoints();
}

Strand.prototype.updateScore = function()
{
	this.angles = new Array();

	// Calculate angle between mid and left arrays.

	for (var i = 1; i < this.midPointsLeft.length; i++)
	{
		var p1 = this.midPoints[i - 1];
		var p2 = this.midPoints[i];

		var p3 = this.midPointsLeft[i - 1];
		var p4 = this.midPointsLeft[i];

		var angle = this.angleBetweenTwoVectors(p2.x - p1.x, p2.y - p1.y, p2.z -
			p1.z, p4.x - p3.x, p4.y - p3.y, p4.z - p3.z, p1, p3);
		angle *= 180 / Math.PI;

		this.angles.push(angle);
	}

	// Calculate angle between mid and right arrays.

	for (var i = 1; i < this.midPointsRight.length; i++)
	{
		var p1 = this.midPoints[i - 1];
		var p2 = this.midPoints[i];

		var p3 = this.midPointsRight[i - 1];
		var p4 = this.midPointsRight[i];

		var angle = this.angleBetweenTwoVectors(p2.x - p1.x, p2.y - p1.y, p2.z -
			p1.z, p4.x - p3.x, p4.y - p3.y, p4.z - p3.z, p1, p3);
		angle *= 180 / Math.PI;

		this.angles.push(angle);
	}


	var max_ang = 0;
	var max_i = -1;

	for (var i = 0; i < this.angles.length; i++)
	{
		var ang = this.angles[i];

		if (Math.abs(ang) > max_ang)
		{
			max_ang = ang;
			max_i = i;
		}
	}

	this.max_ang = max_ang;



	// Calculate average twist angle

	var avg_ang = 0;

	for (var i = 0; i < this.angles.length; i++)
	{
		var ang = this.angles[i];
		avg_ang += ang;
	}

	this.avg_ang = avg_ang / this.angles.length;


	this.maxAnglePoints = new Array();

	if (max_i != -1)
	{
		if (max_i < 3) // left
		{
			var p1 = this.midPointsLeft_T[max_i];
			var p2 = this.midPointsLeft_T[max_i + 1]


			p1.color = "black";



			p2.color = "black";


		}
		else // right
		{
			max_i -= 3;

			var p1 = this.midPointsRight_T[max_i];
			var p2 = this.midPointsRight_T[max_i + 1]

			p1.color = "black";
			p2.color = "black";
		}

		this.maxAnglePoints.push(p1);
		this.maxAnglePoints.push(p2);
	}
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

Strand.prototype.optimizeAngle = function()
{
	// Do 10 linear interpolants to find rough max angle.
	var min_ang = 0;
	var max_ang = 179.99;
	var N = 10;

	var delta = (max_ang - min_ang) / (N - 1);

	var angles = new Array(N);
	var scores = new Array(N);

	for (var i = 0; i < N; i++)
	{
		var ang = min_ang + (max_ang - min_ang) * i / (N - 1);
		this.setAngle(ang);
		scores[i] = this.max_ang;
		angles[i] = ang;
	}

	// Calculate angle with largest score

	var max_score = -9999;
	var max_i = -1;
	for (var i = 0; i < scores.length; i++)
	{
		var score = scores[i];
		if (score > max_score)
		{
			max_score = score;
			var max_i = i;
		}
	}

	if (max_i < 0)
	{
		// Error, maximum score not found.
	}

	// Rough max angle found, begin iterative improvement process, starting with
	// rough delta/2

	delta = delta / 2;

	console.log("Initial change delta: " + delta);

	var current_score = scores[max_i];
	var current_angle = angles[max_i]; // Rough optimal angle


	while (delta > .005)
	{
		this.setAngle(current_angle + delta);
		var current_score_plus = this.max_ang;
		var current_angle_plus = current_angle + delta;
		var score_change_plus = current_score_plus - current_score;


		this.setAngle(current_angle - delta);
		var current_score_minus = this.max_ang;
		var current_angle_minus = current_angle - delta;
		var score_change_minus = current_score_minus - current_score;


		// Two delta-scores found, choose larger one

		if (score_change_plus >= score_change_minus && score_change_plus > 0)
		{
			// Plus results in score increase, take it.
			current_score = current_score_plus;
			current_angle = current_angle_plus;
			delta = delta / 2;
		}
		else if (score_change_minus > score_change_plus && score_change_minus >
			0)
		{
			// Minus results in score increase, take it.
			current_score = current_score_minus;
			current_angle = current_angle_minus;
			delta = delta / 2;
		}
		else
		{
			// Both results in score decrease, half the search delta and try 
			// again.
			delta = delta / 2;
		}

		console.log(delta + ":  Score: " + current_score);
	}


	// We now have the best angle for this particular origin point.
	this.angle_slider.setValue(current_angle);
	this.angle = current_angle;

	console.log("Best angle: " + current_angle);

	this.optimized = true;
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

	var ang = (ang) / 180 * Math.PI;

	var _cos = Math.cos(ang);
	var _sin = Math.sin(ang);

	for (var i = 0; i < points.length; i++)
	{
		var p = points[i];

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

		var coords = BSurface.calc(p.t + sign * dt, p.u + sign * du);

		var p_new = new Point(coords[0], coords[1], coords[2]);
		p_new.t = p.t + sign * dt;
		p_new.u = p.u + sign * du;

		projected.push(p_new);
	}

	return projected;
}

Strand.prototype.cullExteriorPoints = function(points)
{
	// Returns set of points which are inside of the hull boundary.  If none of the 
	// given points are inside the hull boundary, returns false.

	var culled = new Array();

	for (var i = 0; i < points.length; i++)
	{
		var p = points[i];

		intersect = getIntersectionPoints(p.t, p.u, this.angle / 180 * Math.PI,
			BPerimeter.vertices, false);

		if (intersect != false)
		{
			culled.push(p)
		}
	}

	if (culled.length > 0)
	{
		return culled;
	}
	else
	{
		return false;
	}
}

Strand.prototype.updateDownload = function()
{

	this.originStrandPoints = new Array();
	this.originStrandPoints_T = new Array();

	var Hull = BPerimeter.vertices;

	var intersects = getIntersectionPoints(this.originPoint.t,
		this.originPoint.u, (this.angle) / 180 * Math.PI, Hull, true);

	// First, we generate the central strand.  We do this by finding the two
	// perimeter collision points, and arbitrarily scaling them up.

	// Acquire the deltas:

	var dx1 = intersects[0][0] - this.originPoint.t;
	var dy1 = intersects[0][1] - this.originPoint.u;

	var dx2 = intersects[1][0] - this.originPoint.t;
	var dy2 = intersects[1][1] - this.originPoint.u;

	// Scale up the deltas by two:

	var scale = 1.5;

	var dx1 = this.originPoint.t + dx1 * scale;
	var dy1 = this.originPoint.u + dy1 * scale;

	var dx2 = this.originPoint.t + dx2 * scale;
	var dy2 = this.originPoint.u + dy2 * scale;

	// Linearly interpolate in (t,u) space between the collision points, and 
	// place the resulting points in local set centralStrand;

	var number_of_samples = 100;

	var centralStrand = new Array();
	var delta = 1 / number_of_samples;

	for (var t = 0; t <= 1; t += delta)
	{
		var dx = dx1 + (dx2 - dx1) * t;
		var dy = dy1 + (dy2 - dy1) * t;

		var coords = BSurface.calc(dx, dy);

		var p = new Point(coords[0], coords[1], coords[2]);
		p.t = dx;
		p.u = dy;

		centralStrand.push(p);
	}

	// For each central strand point, project at the perpendicular angle
	// by a small delta until the euclidean distance is greater than or equal to
	// the strand gap.

	var ang = this.angle;
	var dist = this.strand_gap;

	var Strands = new Array();

	var projected;


	// Generate strands to the left and right.

	for (var s = -1; s < 2; s += 2)
	{
		for (var i = 0; true; i++)
		{
			if (i == 0)
			{
				projected = this.euclideanShift(centralStrand, ang, s * dist);
			}
			else
			{
				projected = this.euclideanShift(projected, ang, s * dist);
			}

			var culled = this.cullExteriorPoints(projected);

			if (culled != false)
			{
				for (var i = 0; i < culled.length; i++)
				{
					var p = culled[i];
					Strands.push(p);
				}
			}
			else
			{
				break;
			}
		}
	}

	var culled = this.cullExteriorPoints(centralStrand);

	for (var i = 0; i < culled.length; i++)
	{
		var p = culled[i];
		Strands.push(p);
	}

	this.strandSamples = Strands;
	this.strandSamples_T = new Array();

	for (var i = 0; i < this.strandSamples.length; i++)
	{
		var p_T = new Point(0, 0, 0, "darkred", 1);
		this.strandSamples_T.push(p_T);
	}


	// We now happily have the full set of strand sample points, so we can 
	// generate a pdb file and hook it to the button (magic)

	// Create new array of strand samples to perform work on.

	var sample_points = new Array();

	for (var i = 0; i < this.strandSamples.length; i++)
	{
		var p = this.strandSamples[i];

		var p_copy = new Point(p.x, p.y, p.z);

		sample_points.push(p_copy);
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
	this.updateStrandMap(this.angle, this.offset, this.strand_gap);


	if (!this.optimized)
	{
		if ((this.angle_slider.value != this.angle) ||
			(this.offset_slider.value != this.offset))
		{
			this.angle = this.angle_slider.value;

			this.offset = this.offset_slider.value;

			this.setAngle(this.angle, this.offset);
		}
	}

	if (this.optimize_button.activated)
	{
		this.optimizeAngle();
		this.optimize_button.activated = false;
	}

	// Draw strand samples

	if (this.strandSamples)
	{
		for (var i = 0; i < this.strandSamples.length; i++)
		{
			var p = this.strandSamples[i];
			var p_T = this.strandSamples_T[i];

			p_T.moveTo(p);
			p_T.scaleFactor(zoom);
			p_T.rotateY(yaw);
			p_T.rotateX(pitch);

			p_T.draw();
		}
	}

	// Draw textual output

	ctx.fillStyle = "black";
	ctx.fillText("Max Ang (deg): " + this.max_ang, 10, 100);

	ctx.fillText("Avg Ang (deg): " + this.avg_ang, 10, 70);
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

	var intersects = getIntersectionPoints(this.originPoint.t,
		this.originPoint.u, (this.angle) / 180 * Math.PI, Hull, true);

	// First, we generate the central strand.  We do this by finding the two
	// perimeter collision points, and arbitrarily scaling them up.

	// Acquire the deltas:

	var dx1 = intersects[0][0] - this.originPoint.t;
	var dy1 = intersects[0][1] - this.originPoint.u;

	var dx2 = intersects[1][0] - this.originPoint.t;
	var dy2 = intersects[1][1] - this.originPoint.u;

	var scale = 2;

	var dx1 = this.originPoint.t + dx1 * scale;
	var dy1 = this.originPoint.u + dy1 * scale;

	var dx2 = this.originPoint.t + dx2 * scale;
	var dy2 = this.originPoint.u + dy2 * scale;

	// dx1, dy1, dx2, dy2 now represent surface coordinates that we want to
	// generate strand 0 from.

	var number_of_samples = 50;

	var delta = 1 / number_of_samples;

	this.strandMap[0] = new Array();

	this.strandMap[0][0] = this.originPoint;

	var dx1 = intersects[0][0];
	var dy1 = intersects[0][1];

	var dx2 = intersects[1][0];
	var dy2 = intersects[1][1];

	// Linearly interpolate from centroid to (dx1, dy1).

	var i = 1;

	var scale = 2;

	for (var t = delta; t <= 1; t += delta)
	{
		var dx = this.originPoint.t + scale * t * (dx1 - this.originPoint.t);
		var dy = this.originPoint.u + scale * t * (dy1 - this.originPoint.u);

		var p = BSurface.sample(dx, dy);

		this.strandMap[0][i] = p;

		i++;
	}

	// Linearly interpolate from centroid the other way, assigning to negative
	// indice space.

	var i = 1;

	for (var t = delta; t <= 1; t += delta)
	{
		var dx = this.originPoint.t + scale * t * (dx2 - this.originPoint.t);
		var dy = this.originPoint.u + scale * t * (dy2 - this.originPoint.u);

		var p = BSurface.sample(dx, dy);

		this.strandMap[0][-i] = p;

		i++;
	}

	this.strandMap_T = new Array();
	this.strandMap_T[0] = new Array();

	var length = 0;

	for (var i = -49; i <= 49; i++)
	{
		var p = this.strandMap[0][i];

		if (p != undefined)
		{
			this.strandMap_T[0][i] = p.clone("black", 5);
			this.strandMap_T[0][i].transform(p);
			this.strandMap_T[0][i].draw();
			length++;
		}
	}



	console.log(length);



}

Strand.prototype.updateTransformedPoints = function()
{
	this.originPoint_T.moveTo(this.originPoint);
	this.originPoint_T.scaleFactor(zoom);
	this.originPoint_T.rotateY(yaw);
	this.originPoint_T.rotateX(pitch);

	for (var i = 0; i < this.points_T.length; i++)
	{
		this.points_T[i].moveTo(this.points[i]);
		this.points_T[i].scaleFactor(zoom);
		this.points_T[i].rotateY(yaw);
		this.points_T[i].rotateX(pitch);
	}

	if (this.midPointsLeft_T != undefined)
	{
		for (var i = 0; i < this.midPointsLeft_T.length; i++)
		{
			this.midPointsLeft_T[i].moveTo(this.midPointsLeft[i]);
			this.midPointsLeft_T[i].scaleFactor(zoom);
			this.midPointsLeft_T[i].rotateY(yaw);
			this.midPointsLeft_T[i].rotateX(pitch);
		}
	}

	if (this.midPointsRight_T != undefined)
	{
		for (var i = 0; i < this.midPointsRight_T.length; i++)
		{
			this.midPointsRight_T[i].moveTo(this.midPointsRight[i]);
			this.midPointsRight_T[i].scaleFactor(zoom);
			this.midPointsRight_T[i].rotateY(yaw);
			this.midPointsRight_T[i].rotateX(pitch);
		}
	}
}
