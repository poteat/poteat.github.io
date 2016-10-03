var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var DemingRegressor = new Line(1, 1, 100, 300);

var Mouse = new Mouse();


clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);



function init()
{
	Points.createPoint(100, 300);
	Points.createPoint(250, 100);
	Points.createPoint(400, 300);
	Points.createPoint(300, 400);
	Points.createPoint(100, 250);
	Points.createPoint(150, 150);
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	Points.draw();

	DemingRegressor.updateDrawParameters();
	DemingRegressor.draw();

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

function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }







function Line(slope, intersect)
{
	if (slope == undefined)
	{
		slope = 0;
	}

	if (intersect == undefined)
	{
		intersect = 0;
	}

	this.slope = slope;
	this.intersect = intersect;

	this.draw_updated = false;

	this.drawPoint = new Array(2);
	this.drawPoint[0] = new Point(0, 0);
	this.drawPoint[1] = new Point(0, 0);
}

Line.prototype.setShape = function(slope, intersect)
{
	if (this.slope == slope && this.intersect == intersect)
	{
		return;
	}

	this.slope = slope;
	this.intersect = intersect;

	this.draw_updated = false;
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













function _Points()
{
	this.updateFit = false;
	this.numOfPoints = 0;

	this.x = new Array();

	this.centerPoint = new Point(0, 0, "blue");
}

var Points = new _Points();

_Points.prototype.createPoint = function(x, y, color, size)
{
	if (color == undefined)
	{
		color = "black";
	}

	if (size == undefined)
	{
		size = 1;
	}

	var id = this.x.length;
	this.x.push(new Point(x, y, color, size, id));

	this.updateFit = true;
	this.numOfPoints++;

	return id;
};

_Points.prototype.removePoint = function(id)
{
	this.updateFit = true;
	this.numOfPoints--;

	delete this.x[id];
}

_Points.prototype.closest = function(x, y)
{
	var dist = 0;
	var mindist = 99999;
	var min_index = -1;

	for (var i = 0; i < this.x.length; i++)
	{
		if (this.x[i] != null)
		{
			dist = this.x[i].dist(x, y);

			if (dist < mindist)
			{
				min_index = i;
				mindist = dist;
			}
		}
	}

	return min_index;
};

_Points.prototype.draw = function()
{
	for (var i = 0; i < this.x.length; i++)
	{
		if (this.x[i] != null)
		{
			this.x[i].draw();
		}

	}

	if (this.updateFit == true)
	{
		this.updateFitParameters();
	}

	this.centerPoint.x = this.avgx;
	this.centerPoint.y = this.avgy;
	this.centerPoint.draw();

	this.findEdgePoints();


	ctx.fillText("Mean x,y: " + Math.round(this.avgx) + " " + Math.round(this.avgy), 10, 15);
	ctx.fillText("Variance in x: " + this.variance_x, 10, 25);
	ctx.fillText("Variance in y: " + this.variance_y, 10, 35);
	ctx.fillText("Covariance: " + this.variance_xy, 10, 45);

	ctx.fillText("Slope: " + this.slope, 10, 55);
	ctx.fillText("Intersect: " + this.intersect, 10, 65);
};

_Points.prototype.updateFitParameters = function()
{
	this.updateMeans();
	this.updateVariances();

	var vx = this.variance_x;
	var vy = this.variance_y;
	var vxy = this.variance_xy;

	this.slope = (vy - vx + Math.sqrt(Math.pow(vy-vx, 2) + 4*Math.pow(vxy, 2)))/(2*vxy);
	this.intersect = this.avgy - this.slope*this.avgx;

	DemingRegressor.setShape(this.slope, this.intersect);
};

_Points.prototype.updateMeans = function()
{
	var sumx = 0;
	var sumy = 0;
	for (i = 0; i < this.x.length; i++)
	{
		if (this.x[i] != null)
		{
			sumx += this.x[i].x;
			sumy += this.x[i].y;
		}
	}

	sumx /= this.numOfPoints;
	sumy /= this.numOfPoints;

	this.avgx = sumx;
	this.avgy = sumy;
};

_Points.prototype.updateVariances = function()
{
	var sumx = 0;
	var sumy = 0;
	var sumxy = 0;
	for (i = 0; i < this.x.length; i++)
	{
		if (this.x[i] != null)
		{
			deltax = this.x[i].x - this.avgx;
			deltay = this.x[i].y - this.avgy;

			sumx += Math.pow(deltax, 2);
			sumy += Math.pow(deltay, 2);
			sumxy += deltax*deltay;
		}
	}

	sumx /= this.numOfPoints - 1;
	sumy /= this.numOfPoints - 1;
	sumxy /= this.numOfPoints - 1;

	this.variance_x = sumx;
	this.variance_y = sumy;
	this.variance_xy = sumxy;
};

_Points.prototype.findEdgePoints = function()
{
	var min_dist = 1;
	var max_dist = -1;

	var min_dist_id = -1;
	var max_dist_id = -1;

	var min_proj_dist = 1;
	var max_proj_dist = -1;

	var min_proj_dist_id = -1;
	var max_proj_dist_id = -1;

	var m = DemingRegressor.slope;
	var b = DemingRegressor.intersect;

	for (var i = 0; i < this.x.length; i++)
	{
		if (this.x[i] != null)
		{
			var dist = this.x[i].distFromLine(m, b);

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

			var x = this.x[i].x;
			var y = this.x[i].y;

			var projection_x = (x + m*(y - b))/(Math.pow(m, 2) + 1);
			var projection_y = (m*(x + m*y) + b)/(Math.pow(m, 2) + 1);

			var direction = sign(projection_x - this.avgx);

			var proj_dist = direction*Math.sqrt(Math.pow(projection_x - this.avgx,2) + Math.pow(projection_y - this.avgy, 2));

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

			this.x[i].color = "black";
		}
	}

	
	this.x[min_dist_id].color = "purple";
	this.x[max_dist_id].color = "purple";

	this.x[min_proj_dist_id].color = "green";
	this.x[max_proj_dist_id].color = "green";
	

	// Calculating four "corner" box points.

	var p1 = this.calculateBoxPoint(min_dist_id, min_proj_dist_id);
	var p2 = this.calculateBoxPoint(min_dist_id, max_proj_dist_id);
	var p3 = this.calculateBoxPoint(max_dist_id, max_proj_dist_id);
	var p4 = this.calculateBoxPoint(max_dist_id, min_proj_dist_id);

	ctx.beginPath();
	ctx.strokeStyle = "black";
	ctx.moveTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.lineTo(p3.x, p3.y);
	ctx.lineTo(p4.x, p4.y);
	ctx.lineTo(p1.x, p1.y);
	ctx.stroke();


};

_Points.prototype.calculateBoxPoint = function(p1_id, p2_id)
{
	var p1 = this.x[p1_id]; // First point has slope of m
	var p2 = this.x[p2_id]; // Second point has slope of 1/m

	var m1 = this.slope;
	var m2 = -1/m1;

	var x = (-m2*p2.x+p2.y+m1*p1.x-p1.y)/(m1-m2);
	var y = m1*x-m1*p1.x+p1.y;

	var p = new Point(x, y, "blue");
	return p;
};

function Point(x, y, color)
{
	if (color == undefined)
	{
		color = "black";
	}
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

    Points.updateFit = true;
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
		Points.x[Mouse.objHeld].moveTo(Mouse.x, Mouse.y);
    }
}, false);

cvs.addEventListener('mousedown', function(evt)
{
    var cID = Points.closest(Mouse.x, Mouse.y);

    if (Points.x[cID].dist(Mouse.x, Mouse.y) < 20)
    {
        Mouse.holding = true;
        Mouse.objHeld = cID;
    }

    if (Mouse.holding)
    {
    	Points.x[cID].moveTo(Mouse.x, Mouse.y);
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

	var cID = Points.closest(mx, my);

	if (Points.x[cID].dist(mx, my) < 20)
	{
		Points.removePoint(cID);
	}
	else
	{
		Points.createPoint(mx, my);
	}
}, false);

init();
