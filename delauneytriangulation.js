var fps = 60;
var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');
var Mouse = new Mouse();

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);

first_execution = true;

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

	var vertices = new Array();

	for (var i = 0; i < Points.x.length; i++)
	{
		if (Points.x[i] != null)
		{
			var x = Points.x[i].x;
			var y = Points.x[i].y;

			vertices.push([x, y]);
		}
	}

	var triangles_result = Delaunay.triangulate(vertices);

	// The "Triangles" array is an array of 3-tuples, each element of each 3-tuple corresponding to a index in the Vertices array.
	var Triangles = new Array();

	for (var i = 0; i < triangles_result.length; i += 3)
	{
		var v1 = triangles_result[i];
		var v2 = triangles_result[i + 1];
		var v3 = triangles_result[i + 2];
		Triangles.push([v1, v2, v3]);
	}


	// The "Edges" array is an array of 3-tuples, the first two elements being two Vertex indices.  The last element is the Triangle index of the edge.
	var Edges = new Array();

	for (var i = 0; i < Triangles.length; i++)
	{
		// Each edge of the triangle is a 3-tuple of two vertices and one triangle.
		var T = Triangles[i];
		var E1 = [ Math.min(T[0], T[1]), Math.max(T[0],T[1]), i ];
		var E2 = [ Math.min(T[1], T[2]), Math.max(T[1],T[2]), i ];
		var E3 = [ Math.min(T[2], T[0]), Math.max(T[2],T[0]), i ];

		Edges.push(E1, E2, E3);
	}

	// Right now, there are duplicates in the Edge array.  To remove, first we sort WRT the first vertex index of each edge.
	// We do this using an anonymous function and a built-in optimized comparison-sorting procedure.

	Edges.sort(function(a,b){return a[0] - b[0]})


	if (first_execution)
	{
		for (var i = 0; i < Edges.length; i++)
		{
			var E = Edges[i];
			var v1 = E[0];
			var v2 = E[1];
			var t =  E[2];

			console.log("" + E[0] + " " + E[1] + " " + t);
		}
	}

	first_execution = false;

/*
	var Edges_new = new Array();

	Edges_new.push()

	for (var i = 0; i < Edges.length; i++)
	{
		var E = Edges[i];

		i
	}*/


	

	ctx.beginPath();

	for (var i = 0; i < Triangles.length; i++)
	{
		var T = Triangles[i];
		var p1 = Points.x[T[0]];
		var p2 = Points.x[T[1]];
		var p3 = Points.x[T[2]];

		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.lineTo(p3.x, p3.y);
		ctx.lineTo(p1.x, p1.y);
	}
	
	ctx.stroke();
}



















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














