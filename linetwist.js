var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

var LT;

var mainloop = setInterval("main();",1000/fps);

function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

function init()
{
	var points = new Array();

	points.push(new Point(300, 300));
	points.push(new Point(150, 100));
	points.push(new Point(400, 200));
	points.push(new Point(100, 250));

	LT = new LineTwist(points)
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	LT.draw();

}





function LineTwist(points)
{
	this.points = points;

	this.drawPoint = new Array();

	this.projectedPoint = new Array();
	for (var i = 0; i < this.points.length; i++)
	{
		this.projectedPoint[i] = new Point(0, 0, "blue", 3);
	}

	for (var i = 0; i < 2; i++)
	{
		this.drawPoint[i] = new Point(0, 0);
	}

	this.linepoints = new Array();

	this.avgx = 0;
	this.avgy = 0;

	this.variance_x = 0;
	this.variance_y = 0;
	this.variance_xy = 0;

	this.slope = 0;
	this.intersect = 0;

	this.updated = true;

	this.updateLinePoints();
}

LineTwist.prototype.updateLinePoints = function()
{
	this.linepoints = new Array();

	for (var i = 0; i < this.points.length; i += 2)
	{
		var P1 = this.points[i];
		var P2 = this.points[i+1];

		var dx = P2.x - P1.x;
		var dy = P2.y - P1.y;

		for (t = 0; t <= 1; t += .05)
		{
			this.linepoints.push(new Point(P1.x + dx*t, P1.y + dy*t,"black",2))
		}
	}

	this.updateShape();
	this.updated = true;
}

LineTwist.prototype.draw = function()
{

	if (this.updated != true)
	{
		this.updateLinePoints();
	}


	// Output statistical information
	ctx.fillText("Mean x,y: " + Math.round(this.avgx) + " " + Math.round(this.avgy), 10, 15);
	ctx.fillText("Variance in x: " + this.variance_x, 10, 25);
	ctx.fillText("Variance in y: " + this.variance_y, 10, 35);
	ctx.fillText("Covariance: " + this.variance_xy, 10, 45);

	ctx.fillText("Slope: " + this.slope, 10, 55);
	ctx.fillText("Intersect: " + this.intersect, 10, 65);


	ctx.beginPath();
	ctx.strokeStyle = "black";
	ctx.moveTo(this.drawPoint[0].x, this.drawPoint[0].y);
	ctx.lineTo(this.drawPoint[1].x, this.drawPoint[1].y);
	ctx.stroke();

	for (var i = 0; i < this.linepoints.length; i++)
	{
		var P = this.linepoints[i];
		P.draw();
	}

	for (var i = 0; i < this.points.length; i++)
	{
		var P = this.points[i];
		P.draw();
	}

	for (var i = 0; i < this.points.length; i += 2)
	{
		var P1 = this.points[i];
		var P2 = this.points[i+1];

		ctx.beginPath();
		ctx.strokeStyle = "black";
		ctx.moveTo(P1.x, P1.y);
		ctx.lineTo(P2.x, P2.y);
		ctx.stroke();
	}



	// Calculate average of projected control points.

	var sumx = 0;
	var sumy = 0;
	var L = this.projectedPoint.length;
	for (var i = 0; i < L; i++)
	{
		var P = this.projectedPoint[i];
		P.color = "blue";
		sumx += P.x;
		sumy += P.y;
	}

	sumx /= L;
	sumy /= L;

	// For each projected control point, find the signed distance from the average.
	// and find min and maximum, and set their color to orange.

	var mindist = 1000;
	var maxdist = -1000;

	var min_i;
	var max_i;

	var L = this.projectedPoint.length;
	for (var i = 0; i < L; i++)
	{
		var P = this.projectedPoint[i]
		var dist = P.dist(sumx, sumy)*sign(P.x - sumx);

		if (dist > maxdist)
		{
			maxdist = dist;
			max_i = i;
		}

		if (dist < mindist)
		{
			mindist = dist;
			min_i = i;
		}
	}

	this.projectedPoint[min_i].color = "orangered";
	this.projectedPoint[max_i].color = "orangered";

	ctx.beginPath();
	ctx.strokeStyle = "orangered";
	ctx.moveTo(this.projectedPoint[min_i].x,this.projectedPoint[min_i].y);
	ctx.lineTo(this.projectedPoint[max_i].x,this.projectedPoint[max_i].y);
	ctx.stroke();

	var found = false;

	ctx.beginPath();
	ctx.strokeStyle = "blue";

	for (var i = 0; i < this.projectedPoint.length; i++)
	{
		var P = this.projectedPoint[i];
		if (i != min_i && i != max_i)
		{
			if (!found)
			{
				ctx.moveTo(P.x, P.y);
				found = true;
			}
			else
			{
				ctx.lineTo(P.x, P.y);
			}
		}
	}

	ctx.stroke();

	for (var i = 0; i < this.projectedPoint.length; i++)
	{
		var P = this.projectedPoint[i];
		P.draw();
	}
};

// Returns orthogonal distance of a point
LineTwist.prototype.dist = function(x, y)
{
	return Math.abs(-(x-this.origin.x)*this.norm_p.x - (y-this.origin.y)*this.norm_p.y + this.d);
}

LineTwist.prototype.closest = function(x, y)
{
	var dist = 0;
	var mindist = 99999;
	var min_index = -1;

	for (var i = 0; i < this.points.length; i++)
	{
		if (this.points[i] != null)
		{
			dist = this.points[i].dist(x, y);

			if (dist < mindist)
			{
				min_index = i;
				mindist = dist;
			}
		}
	}

	return min_index;
}

LineTwist.prototype.updateMean = function()
{
	var sumx = 0;
	var sumy = 0;

	var L = this.linepoints.length;

	for (i = 0; i < L; i++)
	{
		var P = this.linepoints[i];

		sumx += this.linepoints[i].x;
		sumy += this.linepoints[i].y;
	}

	sumx /= L;
	sumy /= L;

	this.avgx = sumx;
	this.avgy = sumy;
}

LineTwist.prototype.updateVariance = function()
{
	var sumx = 0;
	var sumy = 0;
	var sumxy = 0;

	var L = this.linepoints.length

	for (i = 0; i < L; i++)
	{
		var P = this.linepoints[i];

		deltax = P.x - this.avgx;
		deltay = P.y - this.avgy;

		sumx += Math.pow(deltax, 2);
		sumy += Math.pow(deltay, 2);
		sumxy += deltax*deltay;
	}

	sumx /= L - 1;
	sumy /= L - 1;
	sumxy /= L - 1;

	this.variance_x = sumx;
	this.variance_y = sumy;
	this.variance_xy = sumxy;
}

LineTwist.prototype.updateShape = function()
{
	this.updateMean();
	this.updateVariance();

	var vx = this.variance_x;
	var vy = this.variance_y;
	var vxy = this.variance_xy;

	this.slope = (vy - vx + Math.sqrt(Math.pow(vy-vx, 2) + 4*Math.pow(vxy, 2)))/(2*vxy);
	this.intersect = this.avgy - this.slope*this.avgx;

	this.updateDrawParameters();

	for (var i = 0; i < this.points.length; i++)
	{
		var P = this.points[i];

		var projected_coords = this.projectPointOntoLine(P.x, P.y);

		this.projectedPoint[i].x = projected_coords[0];
		this.projectedPoint[i].y = projected_coords[1];
	}
}

LineTwist.prototype.updateDrawParameters = function()
{
	var m = this.slope;
	var b = this.intersect;

	var left_y = b;
	var right_y = m*cvs.width+b;
	var top_x = -b/m;
	var bottom_x = (cvs.height - b)/m;

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

// Given a coordinate, project this coordinate onto the Deming line.
// Return an array containing new point coordinates.
LineTwist.prototype.projectPointOntoLine = function(x, y)
{
	var m = this.slope;
	var b = this.intersect;

	var A = -m;
	var B = 1;
	var C = -b;

	var x_new = (B*(B*x-A*y)-A*C)/(A*A+B*B);
	var y_new = (A*(-B*x+A*y)-B*C)/(A*A+B*B);

	return [x_new, y_new];
}




function Point(x, y, color, size)
{
	if (color == undefined)
	{
		color = "black";
	}

	if (size == undefined)
	{
		size = 5;
	}

	this.x = x;
	this.y = y;
	this.color = color;
	this.size = size;
}

Point.prototype.draw = function()
{
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.arc(this.x, this.y, this.size, 0, Math.PI*2, true);
    ctx.fill();

    ctx.fillStyle = "black";
};

Point.prototype.dist = function(x, y)
{
	return Math.sqrt( Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2) );
};

Point.prototype.moveTo = function(x, y)
{
    this.x = x;
    this.y = y;

    LT.updated = false;
};

Point.prototype.distFromLine = function(slope, intersect)
{
	return (slope*this.x - this.y + intersect)/Math.sqrt(Math.pow(slope, 2) + 1);
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
	if (Mouse.holding)
	{
		LT.points[Mouse.objHeld].moveTo(Mouse.x, Mouse.y);
    }
}, false);

cvs.addEventListener('mousedown', function(evt)
{
    var cID = LT.closest(Mouse.x, Mouse.y);

    if (LT.points[cID].dist(Mouse.x, Mouse.y) < 20)
    {
        Mouse.holding = true;
        Mouse.objHeld = cID;
    }

    if (Mouse.holding)
    {
    	LT.points[cID].moveTo(Mouse.x, Mouse.y);
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

	var cID = LT.closest(mx, my);

	if (LT.points[cID].dist(mx, my) < 20)
	{
		// LT.removePoint(cID);
	}
	else
	{
		//LT.createPoint(mx, my);
	}
}, false);

init();
