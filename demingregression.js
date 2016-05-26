

var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

var LReg;

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);

init();



// Initializes the LinearReg curve with 4 points, and a sampling rate
// of 100 lines per draw.
// Initializes the LinearReg curve with 4 points, and a sampling rate
// of 100 lines per draw.
function init()
{
	var samplingRate = 100;

	var p1 = new Point(100, 300);
	var p2 = new Point(250, 100);
	var p3 = new Point(400, 300);
	var p4 = new Point(300, 400);
	var p5 = new Point(100, 250);
	var p6 = new Point(50, 50);

	var points = [p1, p2, p3, p4, p5, p6];

	LReg = new LinearReg(points, samplingRate);
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	LReg.draw();
//	ctx.fillText("10 choose 5 = " + binom(10, 5), 20, 20);


}


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






// The Line object takes an angle, and an origin distance, and an origin, and draws a line corresponding to those parameters.
// When 0 <= angle < 2pi and 0 <= distance, the function always maps to one unique line, including vertical ones.
// This formulation is a slight modification of the Hessian normal form of lines and planes.

// Placing the origin close to the center of your data gives certain convenient properties for optimization algorithms based on the
// specification of the line angle and distance.  (In the context and usage of linear regression).

// It uses some intermediary state variables for efficient calculation and drawing.  It calculates
//   A Point object corresponding to a point on the unit circle at (angle), and
//   Two Point objects corresponding to the points that intersect the drawing box.

// These state variables only change when angle and distance changes.  The state variables are within the following ranges:
//   -1 <= x <= 1, -1 <= y <= 1, sqrt(x^2+y^2) = 1
//   and the box x and y are in a box-like fashion

// Finally, a bool remembers if draw parameters need to be updated.  This is because we
// don't want to update the drawing parameters if we are not drawing.
function Line(angle, distance, origin_x, origin_y)
{
	this.angle = angle;
	var normx = Math.cos(angle);
	var normy = Math.sin(angle);
	this.norm_p = new Point(normx, normy);
	this.d = distance;

	this.draw_updated = false;

	this.origin = new Point(origin_x, origin_y);

	this.drawPoint = new Array(2);
	this.drawPoint[0] = new Point(0, 0);
	this.drawPoint[1] = new Point(0, 0);
}

Line.prototype.setShape = function(new_angle, new_distance)
{
	if ( this.angle == new_angle && this.d == new_distance )
	{
		return;
	}

	this.angle = new_angle;
	this.norm_p.x = Math.cos(new_angle);
	this.norm_p.y = Math.sin(new_angle);

	this.d = new_distance;

	this.draw_updated = false;
};

Line.prototype.setOrigin = function(new_originx, new_originy)
{
	this.origin.x = new_originx;
	this.origin.y = new_originy;
};

Line.prototype.draw = function()
{
	if (!this.draw_updated == true)
	{
		this.updateDrawParameters();
	}

	ctx.beginPath();
	ctx.strokeStyle = "black";
	ctx.moveTo(this.drawPoint[0].x, this.drawPoint[0].y);
	ctx.lineTo(this.drawPoint[1].x, this.drawPoint[1].y);
	ctx.stroke();
};

// Returns orthogonal distance of a point
Line.prototype.dist = function(x, y)
{
	return Math.abs(-(x-this.origin.x)*this.norm_p.x - (y-this.origin.y)*this.norm_p.y + this.d);
}

Line.prototype.updateDrawParameters = function()
{
	var distance = this.d;
	var normx = this.norm_p.x;
	var normy = this.norm_p.y;

	var left_y = ((0 + this.origin.y) * normx + distance) / (normy);
	var right_y = ((cvs.height - this.origin.y) * -normx + distance) / (normy);
	var top_x = ((0 + this.origin.x) * normy + distance) / (normx);
	var bottom_x = ((cvs.width - this.origin.x) * -normy + distance) / (normx);

	left_y += this.origin.x;
	right_y += this.origin.y;
	top_x += this.origin.x;
	bottom_x += this.origin.x;

	var left = left_y >= 0 && left_y <= cvs.width;
	var right = right_y >= 0 && right_y <= cvs.width;
	var top = top_x >= 0 && top_x <= cvs.width;
	var bottom = bottom_x >= 0 && bottom_x <= cvs.width;

	if (top && right)
	{
		this.drawPoint[0].x = top_x;
		this.drawPoint[0].y = 0;

		this.drawPoint[1].x = cvs.width;
		this.drawPoint[1].y = right_y;
	}
	else if (top && bottom)
	{
		this.drawPoint[0].x = top_x;
		this.drawPoint[0].y = 0;

		this.drawPoint[1].x = bottom_x;
		this.drawPoint[1].y = cvs.height;
	}
	else if (top && left)
	{
		this.drawPoint[0].x = top_x;
		this.drawPoint[0].y = 0;

		this.drawPoint[1].x = 0;
		this.drawPoint[1].y = left_y;
	}
	else if (right && bottom)
	{
		this.drawPoint[0].x = cvs.width;
		this.drawPoint[0].y = right_y;

		this.drawPoint[1].x = bottom_x;
		this.drawPoint[1].y = cvs.height;
	}
	else if (right && left)
	{
		this.drawPoint[0].x = cvs.width;
		this.drawPoint[0].y = right_y;

		this.drawPoint[1].x = 0;
		this.drawPoint[1].y = left_y;
	}
	else if (bottom && left)
	{
		this.drawPoint[0].x = bottom_x;
		this.drawPoint[0].y = cvs.height;

		this.drawPoint[1].x = 0;
		this.drawPoint[1].y = left_y;
	}
	else
	{
		this.drawPoint[0].x = 0;
		this.drawPoint[0].y = 0;

		this.drawPoint[1].x = 0;
		this.drawPoint[1].y = 0;
	}

	this.draw_updated = true;
};






// The LinearReg object is implemented as a set of points.  It is a 'set' in that the order of the points do not matter.
// The output, is a Line object of a parameter which minimizes the cost function.
function LinearReg(points, samples)
{
	this.controlPoint = points; // 'controlPoint' is an array
	this.avgx = 0;
	this.avgy = 0;

	this.fitLine = new Line(0, 0, cvs.width/2, cvs.height/2);
}


LinearReg.prototype.draw = function()
{
	// Draw each control point

	this.updateLineParameters();

	for (var i = 0; i < this.controlPoint.length; i++)
	{
		this.controlPoint[i].draw();
	}

	this.optimizeFit();

	// Draw and update line of best fit
	this.fitLine.updateDrawParameters();
	this.fitLine.draw();


	// Draw average center
	var p = new Point(this.avgx, this.avgy, "blue");
	p.draw();

	var score = this.score();
	ctx.fillStyle = "black";
	ctx.fillText("Score: " + score, 10, 20);

};

// Updates line parameters every time:
// stuff initializes
// a point is moved
// a point is removed
// a point is added
LinearReg.prototype.updateLineParameters = function()
{
	// Calculate average point.
	var _avgx = 0;
	var _avgy = 0;

	for (var i = 0; i < this.controlPoint.length; i++)
	{
		_avgx += this.controlPoint[i].x;
		_avgy += this.controlPoint[i].y;
	}

	this.avgx = _avgx / this.controlPoint.length;
	this.avgy = _avgy / this.controlPoint.length;

};

LinearReg.prototype.optimizeFit = function()
{
	var ang = this.fitLine.angle;
	var dist = this.fitLine.d;

	var epsilon = .1;

	this.fitLine.setShape(ang, dist);
	var score = this.score();

	this.fitLine.setShape(ang, dist + epsilon);
	var score_plus = this.score();

	this.fitLine.setShape(ang, dist - epsilon);
	var score_minus = this.score();

	delta = -score_plus + score_minus;

//	ctx.fillText("delta: " + delta, 10, 60);
//	ctx.fillText("score plus: " + score_plus, 10, 70);
//	ctx.fillText("score minus: " + score_minus, 10, 80);

	this.fitLine.setShape(ang, dist + delta*epsilon);




	var ang = this.fitLine.angle;
	var dist = this.fitLine.d;

	var epsilon = .001;
	this.fitLine.setShape(ang, dist);
	var score = this.score();

	this.fitLine.setShape(ang + epsilon, dist);
	var score_plus = this.score();

	this.fitLine.setShape(ang - epsilon, dist);
	var score_minus = this.score();

	delta = -score_minus + score_plus;

	this.fitLine.setShape(ang - delta*epsilon, dist);
};

LinearReg.prototype.score = function()
{
	var sum = 0;
	
	for (var i = 0; i < this.controlPoint.length; i++)
	{
		sum += Math.pow(this.fitLine.dist(this.controlPoint[i].x, this.controlPoint[i].y), 2);
	}
}


// Used by the mouse interactivity code to find the closest
// control point from any coordinates (mouse coordinates)
LinearReg.prototype.closest = function(x, y)
{
	var closestID = 0;
	closestDistance = 99999;

	currentDistance = 0;

	for (var i = 0; i < this.controlPoint.length; i++)
	{
		currentDistance = this.controlPoint[i].dist(x, y);
		if (currentDistance < closestDistance)
		{
			closestID = i;
			closestDistance = currentDistance;
		}
	}

	return closestID;
};


// Takes a point index as a parameter, and splices that
// point away (It reindexes the point array).
LinearReg.prototype.removePoint = function(pID)
{
	this.controlPoint.splice(pID, 1);
};

// Takes a point as a parameter, and adds that to the
// end of the controlPoint array.
LinearReg.prototype.appendPoint = function(p)
{
	this.controlPoint.push(p);
};









function Point(x, y, color = "black")
{
	this.x = x;
	this.y = y;
	this.color = color;
}

Point.prototype.draw = function()
{
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.arc(this.x, this.y, 5, 0, Math.PI*2, true);
    ctx.fill();
};

Point.prototype.dist = function(x, y)
{
	return Math.sqrt( Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2) );
};

Point.prototype.moveTo = function(x, y)
{
    this.x = x;
    this.y = y;
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
	Mouse.updatePos(evt)
	if (Mouse.holding) {
		LReg.controlPoint[Mouse.objHeld].moveTo(Mouse.x, Mouse.y);
    }
}, false);

cvs.addEventListener('mousedown', function(evt)
{
    var cID = LReg.closest(Mouse.x, Mouse.y);

    if (LReg.controlPoint[cID].dist(Mouse.x, Mouse.y) < 20)
    {
        Mouse.holding = true;
        Mouse.objHeld = cID;
    }

    if (Mouse.holding)
    {
    	LReg.controlPoint[cID].moveTo(Mouse.x, Mouse.y);
    }
}, false);

cvs.addEventListener('mouseleave', function(evt)
{
	Mouse.holding = false;
	Mouse.objHeld = null;
}, false);

cvs.addEventListener('mouseup', function(evt)
{
	Mouse.holding = false;
	Mouse.objHeld = null;
}, false);

cvs.addEventListener('dblclick', function(evt)
{
	var mx = Mouse.x;
	var my = Mouse.y;

	var cID = LReg.closest(mx, my);

	if (LReg.controlPoint[cID].dist(mx, my) < 20)
	{
		LReg.removePoint(cID);
	}
	else
	{
		var p = new Point(mx, my);
		LReg.appendPoint(p);
	}
}, false);