var fps = 60;
var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var svg = document.getElementById('svg');

var changed = true;

var Mouse = new Mouse();

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);

function init()
{

	length_slider = Create_Slider(20, 20, 200, 30, "Length Threshold", 20, 0, 300, 100);

	/* Efficiency test with 2000 points
	for (var i = 0; i < 2000; i++)
	{
		var x = Math.random()*400 + 50;
		var y = Math.random()*400 + 50;

		Points.createPoint(x, y);
	}*/
	
	Points.createPoint(100, 300);
	Points.createPoint(250, 100);
	Points.createPoint(400, 300);
	Points.createPoint(300, 400);
	Points.createPoint(100, 250);
	Points.createPoint(150, 150);
	Points.createPoint(245, 200);
	Points.createPoint(280, 280);
	Points.createPoint(200, 270);
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	for (var i = 0; i < Sliders.length; i++)
	{
		Sliders[i].draw();
	}













	// The above code draws the boundary by calling the concaveHull complete function.
	// The following code gets the internal step - the delaunay triangulation edge list, and draws it.
	// The following code is a subset of concaveHull and may be removed.


	// The "Vertices" array is an array of 3-tuples.  The first two elements represent cartesian position, while the last element
	// will be a boolean variable representing whether or not this vertex is a boundary vertex, to be determined later.
	var Vertices = new Array();

	for (var i = 0; i < Points.x.length; i++)
	{
		if (Points.x[i] != null)
		{
			var x = Points.x[i].x;
			var y = Points.x[i].y;

			Vertices.push([x, y, false]);
		}
	}

	var triangles_result = Delaunay.triangulate(Vertices);

	// The "Triangles" array is an array of 6-tuples.  The first 3 elements refer to 3 triangle vertices.  The last 3 elements refer to 3 triangle edges.
	// Those edges are to be defined later.
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

	Edges.sort(function(a,b){return (a[0] - b[0]) + (a[1] - b[1])*(a[0] - b[0] == 0)})

	// There are still duplicates, so we define a new array.  Now, each Edge will be a 4-tuple: 2 elements being points, and
	// 2 elements being triangles.  The second element is null if the Edge is a boundary edge.

	var Edges_new = new Array();

	// Push the first element onto the new array.
	Edges_new.push([Edges[0][0], Edges[0][1], Edges[0][2], null])

	for (var i = 1; i < Edges.length; i++)
	{
		var E = Edges[i];
		var E_last = Edges_new[Edges_new.length-1]; // The last "merged" edge

		// If the latest merged edge and the current edge are almost the same,
		// merge them into one 4-tuple.
		if (E[0] == E_last[0] && E[1] == E_last[1])
		{
			var min_T = Math.min(E[2], E_last[2]);
			var max_T = Math.max(E[2], E_last[2]);

			E_last[2] = min_T;
			E_last[3] = max_T;
		}
		else // Else, merge the edge into the array, leaving the second triangle
		{	 // slot empty for now.
			Edges_new.push([E[0], E[1], E[2], null]);
		}
	}

	// The new Edge structure is completed, so we can discard the previous proto-array.
	Edges = Edges_new;

	// Finally, the Edge structure must be sorted in terms of the Euclidean distance between its two vertices:
	Edges.sort(function(a,b){return lengthOfEdge(Vertices, b) - lengthOfEdge(Vertices, a)});




	for (var i = 0; i < Edges.length; i++)
	{
		var E = Edges[i];
		var v1 = Vertices[E[0]];
		var v2 = Vertices[E[1]];

		ctx.strokeStyle = "lightgrey";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(v1[0], v1[1]);
		ctx.lineTo(v2[0], v2[1]);
		ctx.stroke();
	}


















	var Vertices = new Array();

	for (var i = 0; i < Points.x.length; i++)
	{
		if (Points.x[i] != null)
		{
			var x = Points.x[i].x;
			var y = Points.x[i].y;

			Vertices.push([x, y, false]);
		}
	}

	var ConcaveVertices = concaveHull(Vertices, Sliders[length_slider].value);





	// Draw the concave hull.
	ctx.strokeStyle = "black";
	ctx.lineWidth = 1;
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







	// SVG draw process.

	if (changed)
	{
		var svgns = "http://www.w3.org/2000/svg";

		// Remove all svg objects (circles and lines)
		while (svg.firstChild)
		{
			svg.removeChild(svg.firstChild);
		}

		// Draw delaunay triangulation lines
		for (var i = 0; i < Edges.length; i++)
		{
			var E = Edges[i];
			var v1 = Vertices[E[0]];
			var v2 = Vertices[E[1]];

		    var line = document.createElementNS(svgns, "line");

		    line.setAttributeNS(null, "x1", v1[0]);
		    line.setAttributeNS(null, "y1", v1[1]);
		    line.setAttributeNS(null, "x2", v2[0]);
		    line.setAttributeNS(null, "y2", v2[1]);
		    line.setAttributeNS(null, "stroke", "lightgrey");
		    line.setAttributeNS(null, "stroke-width", 1.1);
		    
		    svg.appendChild(line);
		}


		// Draw all vertices
		for (var i = 0; i < Vertices.length; i++)
		{
			var v = Vertices[i];
			
			var circle = document.createElementNS(svgns, "circle");

			circle.setAttributeNS(null, "cx", v[0]);
			circle.setAttributeNS(null, "cy", v[1]);
			circle.setAttributeNS(null, "r",  5);
			circle.setAttributeNS(null, "fill", "black");

			svg.appendChild(circle);
		}

		// Draw concave hull
		for (var i = 0; i < ConcaveVertices.length; i++)
		{
			var V_i = ConcaveVertices[i];
			var V = Vertices[V_i];
			var x1 = V[0];
			var y1 = V[1];


			var V_i2 = ConcaveVertices[(i + 1) % ConcaveVertices.length];
			var V2 = Vertices[V_i2];

			var x2 = V2[0];
			var y2 = V2[1];


		    var line = document.createElementNS(svgns, "line");

		    line.setAttributeNS(null, "x1", x1);
		    line.setAttributeNS(null, "y1", y1);
		    line.setAttributeNS(null, "x2", x2);
		    line.setAttributeNS(null, "y2", y2);
		    line.setAttributeNS(null, "stroke", "black");
		    line.setAttributeNS(null, "stroke-width", 1.1);
		    
		    svg.appendChild(line);
		}	

		changed = false;	
	}









	Points.draw();

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
    ctx.arc(this.x, this.y, 4, 0, Math.PI*2, true);
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
		changed = true;
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
    	changed = true;
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
		changed = true;
		Points.removePoint(cID);
	}
	else
	{
		changed = true;
		Points.createPoint(mx, my);
	}
}, false);

init();














