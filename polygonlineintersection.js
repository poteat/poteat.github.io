


var fps = 60;
var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');
var Mouse = new Mouse();

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);

var LinePoint = null;

function init()
{
	length_slider = Create_Slider(20, 20, 200, 30, "Angle", 20, 0, 180, 90);

	/* Efficiency test with 2000 points
	for (var i = 0; i < 2000; i++)
	{
		var x = Math.random()*400 + 50;
		var y = Math.random()*400 + 50;

		Points.createPoint(x, y);
	}*/

	LinePoint = Points.createPoint(250, 250, "blue");
	
	Points.createPoint(100, 300);
	Points.createPoint(250, 100);
	Points.createPoint(400, 300);
	Points.createPoint(300, 400);
	Points.createPoint(100, 250);
	Points.createPoint(150, 150);
	Points.createPoint(400, 200);
	Points.createPoint(350, 150);
	Points.createPoint(190, 380);
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	for (var i = 0; i < Sliders.length; i++)
	{
		Sliders[i].draw();
	}

	Points.draw();





	var Vertices = new Array();


	// all except 0th, which is linepoint.
	for (var i = 1; i < Points.x.length; i++)
	{
		if (Points.x[i] != null)
		{
			var x = Points.x[i].x;
			var y = Points.x[i].y;

			Vertices.push([x, y, false]);
		}
	}

	var ConcaveVertices = concaveHull(Vertices, 0);


	// Draw the concave hull.

	ctx.strokeStyle = "black";
	ctx.beginPath();

	for (var i = 0; i < ConcaveVertices.length; i++)
	{
		var V_i = ConcaveVertices[i];
		var V = Vertices[V_i];
		var x = V[0];
		var y = V[1];

		if (i == 0)
		{
			ctx.moveTo(x, y);
		}
		else
		{
			ctx.lineTo(x, y);
		}

		if (i == ConcaveVertices.length - 1)
		{
			var V_i = ConcaveVertices[0];
			var V = Vertices[V_i];
			var x = V[0];
			var y = V[1];

			ctx.lineTo(x, y);
		}

	}

	ctx.stroke();


	// Build the Hull of vertices (Array of vertices in order of polygon edges)

	var Hull = new Array();

	for (var i = 0; i < ConcaveVertices.length; i++)
	{
		var V_i = ConcaveVertices[i];
		var V = Vertices[V_i];

		Hull.push(V);
	}


	// Get parameters, and call intersection function.

	var x = Points.x[LinePoint].x;
	var y = Points.x[LinePoint].y;
	var ang = (90-Sliders[length_slider].value)/180*Math.PI;
	
	var intersects = getIntersectionPoints(x, y, ang, Hull, true);

	if (intersects != false)
	{
		ctx.lineWidth = 3;
		ctx.strokeStyle = "blue";
		ctx.beginPath();
		ctx.moveTo(intersects[0][0], intersects[0][1]);
		ctx.lineTo(intersects[1][0], intersects[1][1]);
		ctx.stroke();
	}
	


}
 

function getIntersectionPoints(x, y, ang, Hull, permissive)
{
	if (permissive == undefined)
	{
		permissive = false;
	}

	if (permissive == true)
	{
		var Intersections = new Array();
	}

    var Left = new Array();
    var Right = new Array();
	
	for (var i = 0; i < Hull.length; i++)
	{
		var V1 = Hull[i];
		var V2 = Hull[(i + 1) % Hull.length];

		var p = intersects(x, y, ang, V1[0], V1[1], V2[0], V2[1])

		if (permissive == true)
		{

		}

		if (p != false)
		{
			if (permissive == false)
			{
				if (Math.abs(p[0] - x) < .001)
				{
					if (p[1] < y)
					{
						Left.push(p);
					}
					else
					{
						Right.push(p);
					}
				}
				else
				{
					if (p[0] < x)
					{
						Left.push(p);
					}
					else
					{
						Right.push(p);
					}
				}
			}
			else
			{
				Intersections.push(p);
			}
		}
	}

	if (permissive == false)
	{
		var closest_left;

		for (var i = 0; i < Left.length; i++)
		{
			if (i == 0)
			{
				var closest_left = Left[i];
				var closest_delta = Math.abs(Left[i][0] - x) + Math.abs(Left[i][1] - y)
			}

			var p = Left[i];

			var delta = Math.abs(p[0] - x) + Math.abs(p[1] - y);

			if (delta < closest_delta)
			{
				var closest_left = p;
				var closest_delta = delta;
			}
		}

		var closest_right;

		for (var i = 0; i < Right.length; i++)
		{
			if (i == 0)
			{
				var closest_right = Right[i];
				var closest_delta = Math.abs(Right[i][0] - x) + Math.abs(Right[i][1] - y)
			}

			var p = Right[i];

			var delta = Math.abs(p[0] - x) + Math.abs(p[1] - y);

			if (delta < closest_delta)
			{
				var closest_right = p;
				var closest_delta = delta;
			}
		}

		if (closest_left != undefined && closest_right != undefined)
		{
			return [closest_left, closest_right];
		}
		else
		{
			return false;
		}
	}
	else
	{

		// Calculate average position of all colinear intersection points.

		var x_avg = 0;
		var y_avg = 0;

		for (var i = 0; i < Intersections.length; i++)
		{
			var p = Intersections[i];
			x_avg += p[0];
			y_avg += p[1];
		}

		x_avg /= Intersections.length;
		y_avg /= Intersections.length;


		// Group all intersection points based on whether they are to the left or right of the average point.
		for (var i = 0; i < Intersections.length; i++)
		{
			var p = Intersections[i];

			if (Math.abs(p[0] - x_avg) < .001)
			{
				if (p[1] < y_avg)
				{
					Left.push(p);
				}
				else
				{
					Right.push(p);
				}
			}
			else
			{
				if (p[0] < x_avg)
				{
					Left.push(p);
				}
				else
				{
					Right.push(p);
				}
			}
		}

		// Find the maximum and the Left and Right array, and return those points

		var max_left;
		var max_delta = 0;
		for (var i = 0; i < Left.length; i++)
		{
			var p = Left[i];

			var delta = Math.abs(p[0] - x_avg) + Math.abs(p[1] - y_avg);

			if (delta > max_delta)
			{
				max_left = p;
				max_delta = delta;
			}
		}

		var max_right;
		var max_delta = 0;
		for (var i = 0; i < Right.length; i++)
		{
			var p = Right[i];

			var delta = Math.abs(p[0] - x_avg) + Math.abs(p[1] - y_avg);

			if (delta > max_delta)
			{
				max_right = p;
				max_delta = delta;
			}
		}

		if (max_left != undefined && max_right != undefined)
		{
			return [max_left, max_right];
		}
		else
		{
			return false;
		}

	}
}


function intersects(x, y, ang, x1, y1, x2, y2)
{
	var A1 = Math.cos(ang);
	var B1 = Math.sin(ang);
	var C1 = B1*y + A1*x;

	var A2 = y2 - y1;
	var B2 = x1 - x2;
	var C2 = A2*x1 + B2*y1;

	var D = A1*B2 - A2*B1;
	var Dx = C1*B2 - C2*B1;
	var Dy = C2*A1 - C1*A2;

	if (D == 0)
	{
		return false;
	}

	var x = Dx/D;
	var y = Dy/D;

	if (x - Math.min(x1, x2) >= -.001 && x - Math.max(x1, x2) <= .001)
	{
		if (y - Math.min(y1, y2) >= -.001 && y - Math.max(y1, y2) <= .001)
		{
			return [x, y];
		}
	}

	return false;


}
















var Sliders = new Array();

function Create_Slider(x, y, width, height, text, bar_width, min_val, max_val, default_val)
{
	var id = Sliders.length;
	Sliders.push(new Slider(x, y, width, height, text, bar_width, min_val, max_val, default_val, id));

	return id;
}

function Slider(x, y, width, height, text, bar_width, min_val, max_val, default_val, id)
{
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.text = text;
	this.bar_width = bar_width;
	this.min_val = min_val;
	this.max_val = max_val;
	this.default_val = default_val;

	this.activated = true;

	this.value = default_val;

	var setting = (default_val - min_val)/(max_val - min_val);

	if (setting >= 0 && setting <= 1)
	{
		this.setting = setting;
	}
	else if (setting < 0)
	{
		this.setting = 0;
	}
	else if (setting > 1)
	{
		this.setting = 1;
	}

	this.id = id;
}

Slider.prototype.draw = function()
{
	ctx.beginPath();
	ctx.rect(this.x, this.y, this.width, this.height);
	ctx.fillStyle = "silver";
	ctx.fill();
	ctx.lineWidth = 1;
	ctx.strokeStyle = 'black';
	ctx.stroke();

	var box_xpos = this.x  + this.setting*(this.width - this.bar_width);
	var box_ypos = this.y;

	var box_width = this.bar_width;
	var box_height = this.height;

	var box_right = box_xpos + box_width;
	var box_bottom = box_ypos + box_height;


	if (this.held)
	{
		var setting = (Mouse.x - this.x - box_width/2) / (this.width - box_width);
		if (setting >= 0 && setting <= 1)
		{
			this.setting = setting;
		}
		else if (setting < 0)
		{
			this.setting = 0;
		}
		else if (setting > 1)
		{
			this.setting = 1;
		}
	}


	if (Mouse.x > box_xpos && Mouse.x < box_right && Mouse.y > box_ypos && Mouse.y < box_bottom)
	{
		this.hover = true;

		if (this.activated == false)
		{
			ctx.fillStyle = "darkgrey";
		}
		else if (this.activated == true)
		{
			ctx.fillStyle = "limegreen";
		}

		if (Mouse.down == true)
		{
			this.held = true;
		}
		else if (Mouse.down != true)
		{
			this.held = false;
		}
	}
	else
	{
		this.hover = false;

		if (this.activated == false)
		{
			ctx.fillStyle = "grey";
		}
		else if (this.activated == true)
		{
			ctx.fillStyle = "lightgreen";
		}
		
		if (Mouse.down != true)
		{
			this.held = false;
		}
	}

	this.value = this.min_val + this.setting*(this.max_val - this.min_val);

	ctx.beginPath();
	ctx.rect(box_xpos, box_ypos, box_width, box_height);
	ctx.fill();
	ctx.lineWidth = 1;
	ctx.strokeStyle = 'black';
	ctx.stroke();

	ctx.fillStyle = "black";
	ctx.fillText("" + (this.value).toFixed(2), this.x + 13, this.y + 3 + this.height/2);

	ctx.fillText(this.text, this.x, this.y - 5);
};

Slider.prototype.setValue = function(val)
{
	this.setting = (val - this.min_val)/(this.max_val - this.min_val);
	this.value = val;
}

Slider.prototype.setActive = function(activated)
{
	this.activated = activated;
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
		size = "black";
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
	evt.preventDefault();

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

    Mouse.down = true;
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

	Mouse.down = false;
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














