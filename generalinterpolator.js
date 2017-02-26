var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();


var knots;
var controlPoints;


function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	var points = [knots, controlPoints];

	for (var type = 0; type <= 1; type++)
	{
		var array = points[type];

		for (var i = 0; i < array.length; i++)
		{
			var p = array[i];

			if (p != undefined)
			{
				p.draw();
			}

		}
	}

	setInterpolationVector();


	var samples = 100;

	var samplePoints = new Array();

	for (var t = 0; t <= 1; t += 1 / (samples - 1))
	{
		var p = new Point();
		bezier(t, p);

		samplePoints.push(p);
	}

	for (var i = 0; i < samplePoints.length - 1; i++)
	{
		var p1 = samplePoints[i];
		var p2 = samplePoints[i + 1];

		ctx.strokeStyle = "black";
		ctx.lineWidth = 1;

		ctx.beginPath();
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.stroke();
	}


}

// t_vector's length is size-2, monotonically increasing
// 0 < a < b < ... c < 1
function createMixingFunction(size, t_vector)
{
	var mixer = new Array(size);

	mixer[size - 1] = new Array(size);

	for (var i = 0; i < size; i++)
	{
		mixer[size - 1][i] = 1;
	}

	mixer[size - 2] = new Array(size);

	for (var i = 0; i < size; i++)
	{
		var t = (size - 1 - i) / (size - 1);
		mixer[size - 2][i] = t;
	}

	for (var row = size - 3; row >= 0; row--)
	{
		mixer[row] = new Array(size);

		for (var col = 0; col < size; col++)
		{
			if (col <= row)
			{
				if (col == 0)
				{
					mixer[row][col] = 1;
				}
				else
				{
					mixer[row][col] = mixer[row + 1][col + 1];
				}

			}
			else
			{
				mixer[row][col] = 0;
			}
		}
	}
	/*
	for (var i = 0; i < size; i++)
	{
		console.log(mixer[i]);
	}
	*/
	return math.matrix(mixer);
}

// t_vector's length is size-2, monotonically increasing
// 0 < a < b < ... c < 1
function createTimingFunction(size, t_vector)
{
	var timer = new Array(size);

	for (var i = 0; i < size; i++)
	{
		timer[i] = new Array(size);
		timer[i][0] = 1;
	}

	for (var row = 0; row < size; row++)
	{
		var t;

		if (row == 0)
		{
			t = 0;
		}
		else if (row == size - 1)
		{
			t = 1;
		}
		else
		{
			t = t_vector[row - 1];
		}

		timer[row][1] = t;
	}

	for (var col = 2; col < size; col++)
	{
		for (var row = 0; row < size; row++)
		{
			timer[row][col] = timer[row][col - 1] * timer[row][1];
		}
	}

	/*	for (var i = 0; i < size; i++)
		{
			console.log(timer[i]);
		}*/

	return math.inv(math.matrix(timer));
}

// t-vector's size is 2 less than x_vector
function getControlVector(t_vector, x_vector)
{
	var size = x_vector.length;

	var x_column = new Array(size);

	for (var i = 0; i < size; i++)
	{
		x_column[i] = new Array(1);
		x_column[i][0] = x_vector[i];
	}

	var mixer = createMixingFunction(size);

	var timer = createTimingFunction(size, t_vector);

	var result = math.multiply(mixer, timer);

	result = math.multiply(result, x_vector)._data;

	// Cut off the first and last entry, and return!
	return result.splice(1, result.length - 2);
}

// Fast version of binomial coefficient, or "n choose k"
function binom(n, k)
{
	var prod = 1;
	for (i = 1; i <= k; i++)
	{
		prod *= (n + 1 - i) / i;
	}

	return prod;
}

function bezier(t, p)
{
	var sorted_points = new Array();

	for (var i = 0; i < controlPoints.length; i++)
	{
		var _p = controlPoints[i];
		if (_p != undefined)
		{
			var p_new = new Point(_p.x, _p.y);
			sorted_points.push(p_new);
		}
	}

	sorted_points.sort(function(a, b)
	{
		return a.x - b.x;
	});

	var n = sorted_points.length - 1; // 1
	var delta = 0;
	var y = 0;
	for (var i = 0; i <= n; i++)
	{
		delta = binom(n, i) * Math.pow(1 - t, n - i) * Math.pow(t, i);
		y += delta * sorted_points[i].y;
	}


	var range = sorted_points[sorted_points.length - 1].x - sorted_points[0].x;

	p.x = sorted_points[0].x + t * range;



	p.y = y;
}

function setInterpolationVector()
{
	var _knots = new Array();

	for (var i = 0; i < knots.length; i++)
	{
		var p = knots[i];

		if (p != undefined)
		{
			_knots.push(p);
		}
	}

	var _controls = new Array();

	for (var i = 0; i < knots.length; i++)
	{
		var p = controlPoints[i];

		if (p != undefined)
		{
			_controls.push(p);
		}
	}

	_knots.sort(function(a, b)
	{
		return a.x - b.x;
	});

	_controls.sort(function(a, b)
	{
		return a.x - b.x;
	});

	var size = _knots.length;

	if (size == 1)
	{
		return;
	}

	var t_vector = new Array(size);

	var range = _knots[_knots.length - 1].x - _knots[0].x;

	for (var i = 0; i < size; i++)
	{
		t_vector[i] = (_knots[i].x - _knots[0].x) / range;
	}

	t_vector = t_vector.splice(1, t_vector.length - 2);

	var x_vector = new Array(size);

	for (var i = 0; i < size; i++)
	{
		x_vector[i] = _knots[i].y;
	}

	var control_vector = getControlVector(t_vector, x_vector);

	_controls[0].x = _knots[0].x;
	_controls[0].y = _knots[0].y;

	_controls[size - 1].x = _knots[size - 1].x;
	_controls[size - 1].y = _knots[size - 1].y;


	for (var i = 1; i < size - 1; i++)
	{
		_controls[i].x = _knots[i].x;
		_controls[i].y = control_vector[i - 1];
	}
}

function init()
{
	knots = new Array();
	controlPoints = new Array();

	knots.push(new Point(100, 100, true));
	controlPoints.push(new Point(100, 50, false));

	knots.push(new Point(400, 300, true));
	controlPoints.push(new Point(400, 350, false));

	knots.push(new Point(270, 500, true));
	controlPoints.push(new Point(270, 550, false));

	//createMixingFunction(4);
	//createTimingFunction(4, [1 / 3, 2 / 3]);

	// result = getControlVector([], [10, 7]);

	setInterpolationVector();

	mainloop = setInterval("main();", 1000 / fps);
}





function closest(array)
{
	if (array.length == 0)
	{
		return false;
	}

	min_p = array[0];
	min_dist = min_p.dist(Mouse.x, Mouse.y);

	for (var i = 1; i < array.length; i++)
	{
		var p = array[i];

		if (p != undefined)
		{
			var dist = p.dist(Mouse.x, Mouse.y);

			if (dist < min_dist)
			{
				min_dist = dist;
				min_p = p;
			}
		}

	}

	return {
		p: min_p,
		dist: min_dist
	}
}




function Point(x, y, knot)
{
	this.x = x;
	this.y = y;
	this.knot = knot;

	this.id = controlPoints.length;
}

Point.prototype.draw = function()
{
	var size = 5;

	ctx.fillStyle = "black";
	ctx.beginPath();
	ctx.arc(this.x, this.y, size, 0, Math.PI * 2, true);
	ctx.fill();

	if (this.knot)
	{
		ctx.fillStyle = "white";
		ctx.beginPath();
		ctx.arc(this.x, this.y, size - 2, 0, Math.PI * 2, true);
		ctx.fill();
	}

};

Point.prototype.dist = function(x, y)
{
	return Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2));
};

Point.prototype.moveTo = function(x, y)
{
	if (this.knot)
	{
		this.x = x;
		this.y = y;

		controlPoints[this.id].x = this.x;
	}
	else
	{
		this.y = y;
	}
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
	ctx.arc(Mouse.x, Mouse.y, 5, 0, Math.PI * 2, true);
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
	Mouse.updatePos(evt)
	if (Mouse.holding != undefined)
	{
		Mouse.holding.moveTo(Mouse.x, Mouse.y);
	}
}, false);

cvs.addEventListener('mousedown', function(evt)
{
	if (Mouse.holding == undefined)
	{
		var min_knot = closest(knots);
		var min_control = closest(controlPoints);

		if (min_knot.dist < 20)
		{
			Mouse.holding = min_knot.p;
		}
	}

	evt.preventDefault();
}, false);

cvs.addEventListener('mouseleave', function(evt)
{
	Mouse.holding = undefined;
}, false);

cvs.addEventListener('mouseup', function(evt)
{
	Mouse.holding = undefined;
}, false);

cvs.addEventListener('dblclick', function(evt)
{
	var min_knot = closest(knots);
	var min_control = closest(controlPoints);

	if (min_knot.dist < 20)
	{
		var index = min_knot.p.id;
		delete knots[index];
		delete controlPoints[index];
	}
	else if (min_control.dist < 20)
	{
		var index = min_control.p.id;

		delete knots[index];
		delete controlPoints[index];
	}
	else
	{
		knots.push(new Point(Mouse.x, Mouse.y, true));
		controlPoints.push(new Point(Mouse.x, Mouse.y - 50, false));
	}
}, false);








init();
