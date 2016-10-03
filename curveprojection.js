

var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

var BCurve;
var PSet;

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);



// Initializes the bezier curve with 4 points, and a sampling rate
// of 100 lines per draw.
function init()
{
	var samplingRate = 100;

	var p1 = new Point(5, 400);
	var p2 = new Point(100, 50);
	var p3 = new Point(400, 450);
	var p4 = new Point(470, 200);

	var points = [p1, p2, p3, p4];

	BCurve = new Bezier(points, samplingRate);

	PSet = new Projection();
	PSet.appendPoint(100, 200);
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	BCurve.draw();
	PSet.draw();
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






// The Bezier curve as it is implemented has a dynamic number of control points,
// a sampling rate, (for purposes of drawing and arc length), and an internal array
// that maps the parameter t onto arc length.
function Bezier(points, samples)
{
	this.controlPoint = points; // 'controlPoint' is an array
	this.samples = samples;
	this.arcLength = new Array(this.samples);
}

Bezier.prototype.draw = function()
{
	// Draw each control point
	for (var i = 0; i < this.controlPoint.length; i++)
	{
		this.controlPoint[i].draw();
	}

	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.moveTo(this.controlPoint[0].x, this.controlPoint[0].y);

	var p = new Point(this.controlPoint[0].x, this.controlPoint[0].y);
	var p_old = new Point(0, 0);
	var totalLength = 0;

	for (var i = 1; i <= this.samples; i++)
	{
		p_old.x = p.x;
		p_old.y = p.y;

		this.calc(i/this.samples, p);

		totalLength += p.dist(p_old.x, p_old.y);
		this.arcLength[i] = totalLength;

		ctx.lineTo(p.x, p.y);
	}

	ctx.stroke();

	// Draw initial guess points

	var numOfResolutionPoints = 6;

	this.arrayOfResolutionPoints = new Array(numOfResolutionPoints);

	for (var i = 0; i < numOfResolutionPoints; i++)
	{
		var p = new Point(0, 0, true, 3, "blue");

		var t = i/(numOfResolutionPoints - 1);

		this.calc(t, p);

		this.arrayOfResolutionPoints[i] = p;

		p.draw();
	}
};

Bezier.prototype.calc = function(t, p)
{
	var n = this.controlPoint.length - 1; // 1
	var delta = 0;
	var x = 0;
	var y = 0;
	for (var i = 0; i <= n; i++)
	{
		delta = binom(n, i)*Math.pow(1-t, n-i)*Math.pow(t, i);
		x += delta * this.controlPoint[i].x;
		y += delta * this.controlPoint[i].y;
	}

	p.x = x;
	p.y = y;
};


// Used by the mouse interactivity code to find the closest
// control point from any coordinates (mouse coordinates)
Bezier.prototype.closest = function(x, y)
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
Bezier.prototype.removePoint = function(pID)
{
	this.controlPoint.splice(pID, 1);
};

// Takes a point as a parameter, and adds that to the
// end of the controlPoint array.
Bezier.prototype.appendPoint = function(p)
{
	this.controlPoint.push(p);
};





function Projection()
{
	this.points = new Array();
}

Projection.prototype.appendPoint = function(x, y)
{
	var p = new Point(x, y, false);

	p.projection = 0.5;

	this.points.push(p);
};

Projection.prototype.removePoint = function(pID)
{
	this.points.splice(pID, 1);
};

Projection.prototype.closest = function(x, y)
{
	var closestID = 0;
	closestDistance = 99999;

	currentDistance = 0;

	for (var i = 0; i < this.points.length; i++)
	{
		currentDistance = this.points[i].dist(x, y);
		if (currentDistance < closestDistance)
		{
			closestID = i;
			closestDistance = currentDistance;
		}
	}

	return closestID;
};

Projection.prototype.draw = function()
{

	ctx.strokeStyle = "black";
	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i].draw();
	}

	var draw_point = new Point(0, 0);

	for (var i = 0; i < this.points.length; i++)
	{
		var p = this.points[i];
		var i = p.closestResolutionPoint();

		var t = i/(BCurve.arrayOfResolutionPoints.length-1);

		p.projection = t;
		p.refineProjection();

		var p_res = BCurve.arrayOfResolutionPoints[i];

		ctx.strokeStyle = "grey";
		ctx.beginPath();
		ctx.moveTo(p.x, p.y);
		ctx.lineTo(p_res.x, p_res.y);
		ctx.stroke();

		var proj_p = new Point(0, 0);
		BCurve.calc(p.projection, proj_p);
		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(p.x, p.y);
		ctx.lineTo(proj_p.x, proj_p.y);
		ctx.stroke();
	}
};





function Point(x, y, fill, size, color)
{
	if (fill == undefined)
	{
		fill = true;
	}

	if (size == undefined)
	{
		size = 5;
	}

	if (color == undefined)
	{
		color = "black";
	}

	this.x = x;
	this.y = y;
	this.fill = fill;
	this.size = size;
	this.color = color;
}

Point.prototype.draw = function()
{
	ctx.fillStyle = this.color;
	ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI*2, true);
    if (this.fill)
    {
	    ctx.fill();
	}
	else
	{
		ctx.stroke();
	}
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

Point.prototype.refineProjection = function()
{
	var delta = .025;
	var threshold = 0;

	var t = this.projection;
	var dist = this.distToParameter(t);

	var previous_state = 0;

	for (var i = 0; i < 10; i++)
	{
		var dist_inc = this.distToParameter(t + delta);
		var dist_dec = this.distToParameter(t - delta);

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

	this.projection = t;
};

// Function to be minimized
Point.prototype.distToParameter = function(t)
{
	var p = new Point(0, 0);
	BCurve.calc(t, p);
	return this.dist(p.x, p.y);
}

// From a set of N fixed initial res points, find the closest.
// Initial condition from which to refine using gradient descent.
Point.prototype.closestResolutionPoint = function()
{
	var min_dist = 999999;
	var min_i = -1;

	for (var i = 0; i < BCurve.arrayOfResolutionPoints.length; i++)
	{
		var p = BCurve.arrayOfResolutionPoints[i];
		
		var dist = this.dist(p.x, p.y);

		if (dist < min_dist)
		{
			min_dist = dist;
			min_i = i;
		}
	}

	return min_i;
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
	if (Mouse.objHeld != null)
	{
		Mouse.objHeld.moveTo(Mouse.x, Mouse.y);
    }
}, false);

cvs.addEventListener('mousedown', function(evt)
{
    var cID = BCurve.closest(Mouse.x, Mouse.y);
    var pID = PSet.closest(Mouse.x, Mouse.y);

    if (BCurve.controlPoint[cID].dist(Mouse.x, Mouse.y) < PSet.points[pID].dist(Mouse.x, Mouse.y))
    {
    	Mouse.objHeld = BCurve.controlPoint[cID];
    }
    else
    {
    	Mouse.objHeld = PSet.points[pID];
    }

    if (Mouse.objHeld.dist(Mouse.x, Mouse.y) > 20)
    {
        Mouse.objHeld = null;
    }
    else
    {
    	Mouse.objHeld.moveTo(Mouse.x, Mouse.y);
    }

}, false);

cvs.addEventListener('mouseleave', function(evt)
{
	Mouse.objHeld = null;
}, false);

cvs.addEventListener('mouseup', function(evt)
{
	Mouse.objHeld = null;
}, false);

cvs.addEventListener('dblclick', function(evt)
{
	var mx = Mouse.x;
	var my = Mouse.y;

	if (!evt.shiftKey)
	{
		var cID = BCurve.closest(mx, my);

		if (BCurve.controlPoint[cID].dist(mx, my) < 20)
		{
			BCurve.removePoint(cID);
		}
		else
		{
			var p = new Point(mx, my);
			BCurve.appendPoint(p);
		}
	}
	else
	{
		var pID = PSet.closest(mx, my)

		if (PSet.points[pID].dist(mx, my) < 20)
		{
			PSet.removePoint(pID);
		}
		else
		{
			PSet.appendPoint(mx, my);
		}
	}
}, false);


init();