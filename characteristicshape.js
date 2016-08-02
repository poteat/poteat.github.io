var fps = 60;
var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');
var Mouse = new Mouse();

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);

function init()
{
	length_slider = Create_Slider(20, 20, 200, 30, "Length Threshold", 20, 0, 1, .5);

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

first_execution = true;

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	for (var i = 0; i < Sliders.length; i++)
	{
		Sliders[i].draw();
	}

//	Points.draw();


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



	// Now that we have built the "Edges" structure, we can complete the "Edge" references in each "Triangle" array.
	// We do this by looping through all edges, and pushing their indices onto their triangles.

	for (var i = 0; i < Edges.length; i++)
	{
		var E = Edges[i];

		var t1 = Triangles[E[2]];
		t1.push(i);

		if (E[3] != null)
		{
			var t2 = Triangles[E[3]]; // May be null, if E is a boundary edge.
			t2.push(i);
		}
	}



	// The "Boundary" array is an array of indices, each pointing to a boundary edge in the Edges array.
	var Boundary = new Array();

	// We build the boundary array by looping through the Edges array, and pushing boundary edge indices.
	// The boundary array will already be sorted in terms of edge length.
	for (var i = 0; i < Edges.length; i++)
	{
		var E = Edges[i];

		if (E[3] == null) // If E is a boundary edge,
		{
			Boundary.push(i);
		}
	}


	// Now that we have the "Boundary" structure, we can define the third tuple of the "Vertex" structure,
	// whether or not each Vertex is a boundary Vertex.
	for (var i = 0; i < Boundary.length; i++)
	{
		var B = Boundary[i];
		var E = Edges[B];
		var v1 = Vertices[E[0]];
		var v2 = Vertices[E[1]];

		v1[2] = true;
		v2[2] = true;
	}

	// The pre-processing is now done.

	// Now, we need to define the length threshold with which to cull edges.  To normalize this parameter, we
	// set it as a percentage between the shortest and longest edge.

	// In this demo, that percentage is given by a slider GUI element.

	var longest_edge = lengthOfEdge(Vertices, Edges[0]);
	var shortest_edge = lengthOfEdge(Vertices, Edges[Edges.length-1]);

	var range = longest_edge - shortest_edge;

	var percentage = Sliders[length_slider].value;

	var length = shortest_edge + range*percentage;
	
	while (Boundary.length != 0)
	{
		var B = Boundary[0]; // Work on the longest boundary edge.
		Boundary.splice(0, 1);

		var E = Edges[B];
		var l = lengthOfEdge(Vertices, E);

		if (l > length)
		{
			var T_i = E[2]; // Triangle of boundary edge
			var T = Triangles[T_i];

			// T is of length 3.  Find the triangle corner which isn't
			// also a member of edge E.  (Vertex adjacent).
			var V_adjacent;

			for (var i = 0; i < 3; i++)
			{
				var V = T[i];
				if (V != E[0] && V != E[1])
				{
					V_adjacent = V;
				}
			}

			// If the adjacent vertex is not a boundary vertex, remove the edge from Edges et al.
			if (Vertices[V_adjacent][2] == false)
			{
				// Remove the triangle from memory of all of its edges
				for (var i = 3; i < T.length; i++)
				{
					var Edge_constitutent_index = T[i];

					// Insert the two revealed triangle edges into the boundary array.
					if (Edge_constitutent_index != B)
					{
						var Edge_constitutent = Edges[T[i]];

						// Swap the triangle data of the edge around so it is correct and ordered.
						if (Edge_constitutent[2] == T_i)
						{
							Edge_constitutent[2] = Edge_constitutent[3];
							Edge_constitutent[3] = null;
						}
						else if (Edge_constitutent[3] == T_i)
						{
							Edge_constitutent[3] = null;
						}

						// Set the adjacent vertex to be a boundary vertex

						Vertices[V_adjacent][2] = true;
				
						insertBoundaryByLength(Vertices, Edges, Boundary, Edge_constitutent_index);
					}
				}

				Triangles[T_i] = null; // Empty out its slot in the Triangles array.
				// (Later, the Triangles array will need to be re-flattened)

				Edges[B] = null;
			}
		}
	}



	// We are finished with the culling process.  We can now reflatten the arrays.
	// By "reflatten", we reindex the arrays, removing all null elements.

	// The Triangles and Edges array need to be flattened, and the Boundary array
	// must be rebuilt from scratch.

	// This is the "post-processing" series of steps.



	// First, we reindex the Triangle array, saving only the vertices.  The edges need to be filled out
	// later.

	var Triangles_new = new Array();

	for (var i = 0; i < Triangles.length; i++)
	{
		var T = Triangles[i];

		if (T != null)
		{
			var v1 = T[0];
			var v2 = T[1];
			var v3 = T[2];

			var new_T = [v1, v2, v3];

			Triangles_new.push(new_T);
		}
	}

	Triangles = Triangles_new;


	// Now, we perform the same Edge-array building process as before:


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



	// Now that we have built the "Edges" structure, we can complete the "Edge" references in each "Triangle" array.
	// We do this by looping through all edges, and pushing their indices onto their triangles.

	for (var i = 0; i < Edges.length; i++)
	{
		var E = Edges[i];

		var t1 = Triangles[E[2]];
		t1.push(i);

		if (E[3] != null)
		{
			var t2 = Triangles[E[3]]; // May be null, if E is a boundary edge.
			t2.push(i);
		}
	}

	// The "Boundary" array is an array of indices, each pointing to a boundary edge in the Edges array.
	var Boundary = new Array();

	// We build the boundary array by looping through the Edges array, and pushing boundary edge indices.
	// The boundary array will already be sorted in terms of edge length.
	for (var i = 0; i < Edges.length; i++)
	{
		var E = Edges[i];

		if (E[3] == null) // If E is a boundary edge,
		{
			Boundary.push(i);
		}
	}






	/*

	The post-processing step is now complete.  The resulting relational map is as follows:

	Vertices = {x, y, b}, where b is true if boundary vertex, false if interior vertex

	Triangles = {v1, v2, v3, e1, e2, e3}
		where v1 v2 v3 are the vertices making up the triangle (indices to the Vertices array)
		where e1 e2 e3 are the edges making up the triangles (indices to the Edges array)

	Edges = {v1, v2, T1, T2}
		where v1 v2 are the vertices making up the edges
		where T1 and (optionally) T2 are the triangles made up of the edge
			(An edge can have a maximum of two triangles, one on each side)
			If the edge is on the boundary, T2 is null, because there is only
			one triangle on its side.

	This relational map lends itself well to rapid data traversal in triangularizations, and
	shares some similarities with how spreadsheet software and relational databases work.

	*/







	// Here, we draw the concave hull as black lines

	ctx.strokeStyle = "black";
	ctx.beginPath();
	for (var i = 0; i < Boundary.length; i++)
	{
		var B = Boundary[i];
		var E = Edges[B];
		var v1 = Vertices[E[0]];
		var v2 = Vertices[E[1]];

		ctx.moveTo(v1[0], v1[1]);
		ctx.lineTo(v2[0], v2[1]);
	}
	ctx.stroke();


	// Then, we draw the vertices: Exterior vertices are black, interior vertices are red.

	for (var i = 0; i < Vertices.length; i++)
	{
		var V = Vertices[i];
		var x = V[0];
		var y = V[1];
		var boundary = V[2];

		if (boundary)
		{
			ctx.fillStyle = "black";
		}
		else
		{
			ctx.fillStyle = "red";
		}

		ctx.beginPath();
		ctx.arc(x, y, 5, 0, Math.PI*2, true);
		ctx.fill();
	}



}






function lengthOfEdge(Vertices, Edge)
{
	if (Edge == null)
	{
		return null;
	}
	var v1 = Vertices[Edge[0]];
	var v2 = Vertices[Edge[1]];
	var dist = Math.sqrt(Math.pow(v1[0]-v2[0],2) + Math.pow(v1[1]-v2[1],2));

	return dist;
}


// This is an O(n) sorted-array insertion function.  Technically, insertion can be reduced to lg(n) by using
// the B-tree data structure instead of an array.  However, currently, the fact that the Boundary is an array
// makes the asymptotic complexity of the entire implementation n^2.
function insertBoundaryByLength(Vertices, Edges, Boundary_Array, Edge_index)
{
	var insert_i = -1

	for (var i = 0; i < Boundary_Array.length; i++)
	{
		var B = Boundary_Array[i];
		var B_Edge = Edges[B];

		var B_length = lengthOfEdge(Vertices, B_Edge);

		var Edge = Edges[Edge_index];
		var E_length = lengthOfEdge(Vertices, Edge);

		if (Math.abs(B_length - E_length) < .0001)
		{
			//return;
		}

		if (E_length > B_length)
		{
			insert_i = i;
			break;
		}
	}

	if (insert_i != -1)
	{
		Boundary_Array.splice(insert_i, 0, Edge_index);
	}
	else
	{
		Boundary_Array.push(Edge_index);
	}

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














