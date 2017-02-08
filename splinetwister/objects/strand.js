function Strand()
{
	this.originPoint = new Point(0, 0, 0);
	this.originPoint_T = new Point(0, 0, 0, 'blue', 7);

	optimize_button = Create_ToggleButton(550, 30, 70, 25, "Optimize");
	angle_slider = Create_Slider(550, 60, 150, 20, "Angle", 10, 0, 179.99, 45);
	offset_slider = Create_Slider(550, 90, 150, 20, "Offset", 10, -1.99, 2, 0);

	this.optimize_button = ToggleButtons[optimize_button];
	this.angle_slider = Sliders[angle_slider];
	this.offset_slider = Sliders[offset_slider];


	// Current only used for pdb render
	this.strand_gap = 5;



	// Calculate center surface position of all hull points.

	Hull = BPerimeter.vertices;

	var avgt = 1;
	var avgu = 1;

	for (var i = 0; i < Hull.length; i++)
	{
		var V = Hull[i];

		avgt += Math.pow(V[0], 2);
		avgu += Math.pow(V[1], 2);
	}

	avgt /= Hull.length;
	avgu /= Hull.length;

	avgt = Math.sqrt(avgt);
	avgu = Math.sqrt(avgu);

	avgt = 0;
	avgu = 0;

	for (var i = 0; i < DMap.points.length; i++)
	{
		var p = DMap.points[i];
		avgt += p.t;
		avgu += p.u;
	}

	avgt /= DMap.points.length;
	avgu /= DMap.points.length;


	var coords = BSurface.calc(avgt, avgu);

	this.originPoint.x = coords[0];
	this.originPoint.y = coords[1];
	this.originPoint.z = coords[2];

	this.originPoint.t = avgt;
	this.originPoint.u = avgu;

	this.angle = 45;
	this.offset = 0;

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

	this.setAngle(this.angle, 0);
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
		scores[i] = this.avg_ang;
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


	while (delta > .05)
	{
		this.setAngle(current_angle + delta);
		var current_score_plus = this.avg_ang;
		var current_angle_plus = current_angle + delta;
		var score_change_plus = current_score_plus - current_score;


		this.setAngle(current_angle - delta);
		var current_score_minus = this.avg_ang;
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

/**
 * Given the internal state of the Strand object, generate a point set which
 * represents the best estimate for the surface-bound strand positions.
 *
 * Specifically, the main strand position is defined by a single angle and 
 * offset tuple. From the main strand specification, we walk the surface
 * perpendicularly until the euclidean distance is equal to the chosen strand
 * gap.
 *
 * This function does not modify internal state except for:
 *  this.strandSamples
 *  this.strandSampleS_T
 */
Strand.prototype.updateDownload = function()
{
	// We first generate the two perpendicular hull collision points so we can 
	// later find the origin points of each strand

	var Hull = BPerimeter.vertices;

	var intersects = getIntersectionPoints(this.originPoint.t,
		this.originPoint.u, (this.angle + 90) / 180 * Math.PI, Hull, true);

	// Now using coords1 and coords2, we linearly interpolate between them and 
	// the origin point in the surface space, generating 100 points on each 
	// side.

	this.originStrandPoints = new Array();
	this.originStrandPoints_T = new Array();

	var num = 1000;

	var arclength = 0;

	var prev_x = this.originPoint.t;
	var prev_y = this.originPoint.u;

	var prev = BSurface.calc(prev_x, prev_y);

	for (var t = 0; t < 1; t += 1 / num)
	{
		var x = this.originPoint.t + (intersects[0][0] - this.originPoint.t) *
			t;
		var y = this.originPoint.u + (intersects[0][1] - this.originPoint.u) *
			t;

		var coords = BSurface.calc(x, y);

		var dist = Math.sqrt(Math.pow(coords[0] - prev[0], 2) +
			Math.pow(coords[1] - prev[1], 2) + Math.pow(coords[2] -
				prev[2], 2));

		arclength += dist;

		prev = coords;

		if (arclength > this.strand_gap)
		{
			arclength -= this.strand_gap;

			var p = new Point(coords[0], coords[1], coords[2]);
			var p_T = new Point(0, 0, 0, "darkred", 5)

			// Must save the surface coordinates to do further surface collision
			// projections later on.
			p.t = x;
			p.u = y;

			this.originStrandPoints.push(p)
			this.originStrandPoints_T.push(p_T);
		}
	}


	// Now we do this process of finding the strand origin points again, but on 
	// this opposite side of the main strand.

	// intersects = getIntersectionPoints(this.originPoint.t, this.originPoint.u
	// , (this.angle + 90)/180*Math.PI, Hull, true);

	var num = 1000;

	var arclength = 0;

	var prev_x = this.originPoint.t;
	var prev_y = this.originPoint.u;

	var prev = BSurface.calc(prev_x, prev_y);

	for (var t = 0; t < 1; t += 1 / num)
	{
		var x = this.originPoint.t + (intersects[1][0] - this.originPoint.t) *
			t;
		var y = this.originPoint.u + (intersects[1][1] - this.originPoint.u) *
			t;

		var coords = BSurface.calc(x, y);

		var dist = Math.sqrt(Math.pow(coords[0] - prev[0], 2) +
			Math.pow(coords[1] - prev[1], 2) + Math.pow(coords[2] - prev[2],
				2));

		arclength += dist;

		prev = coords;

		if (arclength > this.strand_gap)
		{
			arclength -= this.strand_gap;

			var p = new Point(coords[0], coords[1], coords[2]);
			var p_T = new Point(0, 0, 0, "darkred", 5)

			// Must save the surface coordinates to do further surface collision
			// projections later on.
			p.t = x;
			p.u = y;

			this.originStrandPoints.push(p)
			this.originStrandPoints_T.push(p_T);
		}
	}

	// Finally, add the origin point.

	this.originStrandPoints.push(this.originPoint);
	this.originStrandPoints_T.push(this.originPoint_T);


	// Now that we have the origin strand points, iterate through them, project 
	// them orthogonally to find the collision points, iterate between the 
	// collision points at some specified delta of resolution, and append each 
	// sample point to an array to be rendered.

	this.strandSamples = new Array();
	this.strandSamples_T = new Array();

	for (var i = 0; i < this.originStrandPoints.length; i++)
	{
		var p = this.originStrandPoints[i];

		var intersects = getIntersectionPoints(p.t, p.u, (this.angle) / 180 *
			Math.PI, Hull, true);

		// Now we linearly interpolate between the intersect coordinates.

		var num = 100;

		for (var t = 0; t < 1; t += 1 / num)
		{
			var x = intersects[0][0] + (intersects[1][0] - intersects[0][0]) *
				t;
			var y = intersects[0][1] + (intersects[1][1] - intersects[0][1]) *
				t;

			var coords = BSurface.calc(x, y);

			var p = new Point(coords[0], coords[1], coords[2]);
			var p_T = new Point(0, 0, 0, "black", 3);

			this.strandSamples.push(p);
			this.strandSamples_T.push(p_T);
		}

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



	// Draw debug perpindicular collision lines


	if (this.originStrandPoints)
	{
		for (var i = 0; i < this.originStrandPoints.length; i++)
		{
			var p = this.originStrandPoints[i];
			var p_T = this.originStrandPoints_T[i];

			p_T.moveTo(p);
			p_T.scaleFactor(zoom);
			p_T.rotateY(yaw);
			p_T.rotateX(pitch);

			p_T.draw();
		}
	}



	// Draw middle strand line

	var needToMove = true;

	ctx.strokeStyle = "darkgrey";
	ctx.lineWidth = 10;

	ctx.beginPath();

	for (var i = 0; i < this.points_T.length; i++)
	{
		var p = this.points_T[i];

		p.draw(false) // Calculate scale.

		if (p.scale > 0) // Inside window
		{
			if (needToMove)
			{
				ctx.moveTo(p.x2d, p.y2d);
				needToMove = false;
			}
			else
			{
				ctx.lineTo(p.x2d, p.y2d);
			}
		}
		else
		{
			needToMove = true;
		}
	}

	ctx.stroke();

	ctx.lineWidth = 1; // Reset line width.



	this.originPoint_T.draw();

	// Draw midpoint lines

	var needToMove = true;

	ctx.strokeStyle = "black";
	ctx.lineWidth = 2;

	ctx.beginPath();

	for (var i = 0; i < this.midPoints_T.length; i++)
	{
		var p = this.midPoints_T[i];

		p.draw(false) // Calculate scale.

		if (p.scale > 0) // Inside window
		{
			if (needToMove)
			{
				ctx.moveTo(p.x2d, p.y2d);
				needToMove = false;
			}
			else
			{
				ctx.lineTo(p.x2d, p.y2d);
			}
		}
		else
		{
			needToMove = true;
		}
	}

	ctx.stroke();

	ctx.lineWidth = 1; // Reset line width.






	// Draw left midpoint lines

	var needToMove = true;

	ctx.strokeStyle = "black";
	ctx.lineWidth = 2;

	ctx.beginPath();

	for (var i = 0; i < this.midPointsLeft_T.length; i++)
	{
		var p = this.midPointsLeft_T[i];

		p.draw(false) // Calculate scale.

		if (p.scale > 0) // Inside window
		{
			if (needToMove)
			{
				ctx.moveTo(p.x2d, p.y2d);
				needToMove = false;
			}
			else
			{
				ctx.lineTo(p.x2d, p.y2d);
			}
		}
		else
		{
			needToMove = true;
		}
	}

	ctx.stroke();

	ctx.lineWidth = 1; // Reset line width.




	// Draw left midpoint lines

	var needToMove = true;

	ctx.strokeStyle = "black";
	ctx.lineWidth = 2;

	ctx.beginPath();

	for (var i = 0; i < this.midPointsRight_T.length; i++)
	{
		var p = this.midPointsRight_T[i];

		p.draw(false) // Calculate scale.

		if (p.scale > 0) // Inside window
		{
			if (needToMove)
			{
				ctx.moveTo(p.x2d, p.y2d);
				needToMove = false;
			}
			else
			{
				ctx.lineTo(p.x2d, p.y2d);
			}
		}
		else
		{
			needToMove = true;
		}
	}

	ctx.stroke();

	ctx.lineWidth = 1; // Reset line width.




	// Draw maximum angle line

	ctx.beginPath();
	ctx.strokeStyle = "black";
	ctx.lineWidth = 2;

	for (var i = 0; i < this.maxAnglePoints.length; i++)
	{
		var p = this.maxAnglePoints[i];
		if (p != undefined)
		{
			p.draw(false);

			if (i == 0)
			{
				if (p.scale > 0)
				{
					ctx.moveTo(p.x2d, p.y2d);
				}
				else
				{
					break;
				}
			}
			else
			{
				if (p.scale > 0)
				{
					ctx.lineTo(p.x2d, p.y2d)
				}
				else
				{
					break;
				}
			}
		}
	}

	ctx.stroke();




	ctx.lineWidth = 1;




	// Draw midpoints

	for (var i = 0; i < this.midPoints_T.length; i++)
	{
		var p = this.midPoints_T[i];
		p.draw();
	}


	// Draw left midpoints

	for (var i = 0; i < this.midPointsLeft_T.length; i++)
	{
		var p = this.midPointsLeft_T[i];
		p.draw();
	}

	// Draw right midpoints

	for (var i = 0; i < this.midPointsRight_T.length; i++)
	{
		var p = this.midPointsRight_T[i];
		p.draw();
	}


	// Draw textual output

	ctx.fillStyle = "black";
	ctx.fillText("Max Ang (deg): " + this.max_ang, 10, 100);

	ctx.fillText("Avg Ang (deg): " + this.avg_ang, 10, 70);
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
