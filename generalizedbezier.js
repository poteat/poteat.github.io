

var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

var BCurve;

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);

init();



// Initializes the bezier curve with 4 points, and a sampling rate
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

	BCurve = new Bezier(points, samplingRate);
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	BCurve.draw();
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


/* TODO: Fix drawTick code for generalized curves
	var n = 7; // # of t parameter ticks

	for (var i = 1; i <= n; i++)
	{
		this.drawTick(i/(n+1), 5, p);
	}
*/

	ctx.fillText("Arc Length: " + Math.round(totalLength) + "px", 20, 20);

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



/*
QuadraticBezier.prototype.drawTick = function(t, l, p)
{
	this.calc(t, p);

	var A = this.controlPoint[0].x;
	var B = this.controlPoint[0].y;
	var C = this.controlPoint[1].x;
	var D = this.controlPoint[1].y;
	var E = this.controlPoint[2].x;
	var F = this.controlPoint[2].y;
	var S = t;

	var x = p.x - (-l) / (2*Math.sqrt(Math.pow(-A+C+t*(A-2*C+E), 2)+Math.pow(-B+D+t*(B-2*D+F), 2))) * (t*(2*B-4*D+2*F) + (2*D-2*B));
	var y = p.y + (-l) / (2*Math.sqrt(Math.pow(-A+C+t*(A-2*C+E), 2)+Math.pow(-B+D+t*(B-2*D+F), 2))) * (t*(2*A-4*C+2*E) + (2*C-2*A));

	var x2 = p.x - (l) / (2*Math.sqrt(Math.pow(-A+C+t*(A-2*C+E), 2)+Math.pow(-B+D+t*(B-2*D+F), 2))) * (t*(2*B-4*D+2*F) + (2*D-2*B));
	var y2 = p.y + (l) / (2*Math.sqrt(Math.pow(-A+C+t*(A-2*C+E), 2)+Math.pow(-B+D+t*(B-2*D+F), 2))) * (t*(2*A-4*C+2*E) + (2*C-2*A));

	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x2, y2);
	ctx.stroke();
};
*/

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






function Point(x, y)
{
	this.x = x;
	this.y = y;
}

Point.prototype.draw = function()
{
    ctx.beginPath();
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
		BCurve.controlPoint[Mouse.objHeld].moveTo(Mouse.x, Mouse.y);
    }
}, false);

cvs.addEventListener('mousedown', function(evt)
{
    var cID = BCurve.closest(Mouse.x, Mouse.y);

    if (BCurve.controlPoint[cID].dist(Mouse.x, Mouse.y) < 20)
    {
        Mouse.holding = true;
        Mouse.objHeld = cID;
    }

    if (Mouse.holding)
    {
    	BCurve.controlPoint[cID].moveTo(Mouse.x, Mouse.y);
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
}, false);