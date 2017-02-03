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

	this.A = Math.sin(this.alpha) * Math.cos(this.beta);
	this.B = Math.sin(this.alpha) * Math.sin(this.beta);
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
		var size = 20;
		for (var y = -size; y <= size; y += 2)
		{
			for (var z = -size; z <= size; z += 2)
			{
				var x = (-this.D - this.B * y - this.C * z) / this.A;
				var p = new Point(x, y, z, this.color);
				var p2 = new Point(0, 0, 0);
				this.points.push(p);
				this.points_T.push(p2);
			}
		}
	}
	else if (max_i == 1) // If 'B' is the highest term, generate y-vals
	{
		var size = 20;
		for (var x = -size; x <= size; x += 2)
		{
			for (var z = -size; z <= size; z += 2)
			{
				var y = (-this.D - this.A * x - this.C * z) / this.B;
				var p = new Point(x, y, z, this.color);
				var p2 = new Point(0, 0, 0);
				this.points.push(p);
				this.points_T.push(p2);
			}
		}
	}
	else if (max_i == 2) // If 'C' is the highest term, generate z-vals
	{
		var size = 20;
		for (var x = -size; x <= size; x += 2)
		{
			for (var y = -size; y <= size; y += 2)
			{
				var z = (-this.D - this.A * x - this.B * y) / this.C;
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
	return this.A * p.x + this.B * p.y + this.C * p.z + this.D;
};

Plane.prototype.score = function()
{
	this.A = Math.sin(this.alpha) * Math.cos(this.beta);
	this.B = Math.sin(this.alpha) * Math.sin(this.beta);
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
	var cut_off = 0;
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
		new_alpha -= 2 * Math.PI;
	}
	else if (new_alpha < -Math.PI)
	{
		new_alpha += 2 * Math.PI;
	}


	if (new_beta > Math.PI)
	{
		new_beta -= 2 * Math.PI;
	}
	else if (new_beta < -Math.PI)
	{
		new_beta += 2 * Math.PI;
	}

	var total_change = Math.pow(this.alpha - new_alpha, 2) + Math.pow(
		this.beta - new_beta, 2) + Math.pow(this.delta - new_delta, 2);

	this.alpha = new_alpha;
	this.beta = new_beta;
	this.delta = new_delta;

	return total_change;
};
