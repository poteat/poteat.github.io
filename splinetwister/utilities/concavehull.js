// Takes in array of 2-tuples, ex: [ [1,2], [3,4], [5,6] ];
// In no particular order (a set)...
// Representing a set of planar points.

// Returns array of 2-tuples, in a particular cyclic order, representing
// the concave hull of the set of points.

function concaveHull(array_of_points, length_threshold)
{
	// The "Vertices" array is an array of 3-tuples.  The first two elements represent cartesian position, while the last element
	// will be a boolean variable representing whether or not this vertex is a boundary vertex, to be determined later.
	var Vertices = new Array();

	for (var i = 0; i < array_of_points.length; i++)
	{
		var x = array_of_points[i][0];
		var y = array_of_points[i][1];

		Vertices.push([x, y, false]);
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
		var E1 = [Math.min(T[0], T[1]), Math.max(T[0], T[1]), i];
		var E2 = [Math.min(T[1], T[2]), Math.max(T[1], T[2]), i];
		var E3 = [Math.min(T[2], T[0]), Math.max(T[2], T[0]), i];

		Edges.push(E1, E2, E3);
	}

	// Right now, there are duplicates in the Edge array.  To remove, first we sort WRT the first vertex index of each edge.
	// We do this using an anonymous function and a built-in optimized comparison-sorting procedure.

	Edges.sort(function(a, b)
	{
		return (a[0] - b[0]) + (a[1] - b[1]) * (a[0] - b[0] == 0)
	})

	// There are still duplicates, so we define a new array.  Now, each Edge will be a 4-tuple: 2 elements being points, and
	// 2 elements being triangles.  The second element is null if the Edge is a boundary edge.

	var Edges_new = new Array();

	// Push the first element onto the new array.
	Edges_new.push([Edges[0][0], Edges[0][1], Edges[0][2], null])

	for (var i = 1; i < Edges.length; i++)
	{
		var E = Edges[i];
		var E_last = Edges_new[Edges_new.length - 1]; // The last "merged" edge

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
		{ // slot empty for now.
			Edges_new.push([E[0], E[1], E[2], null]);
		}
	}

	// The new Edge structure is completed, so we can discard the previous proto-array.
	Edges = Edges_new;

	// Finally, the Edge structure must be sorted in terms of the Euclidean distance between its two vertices:
	Edges.sort(function(a, b)
	{
		return lengthOfEdge(Vertices, b) - lengthOfEdge(Vertices, a)
	});



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

	// Now, we need to define the length threshold with which to cull edges.

	var length = length_threshold;

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
		var E1 = [Math.min(T[0], T[1]), Math.max(T[0], T[1]), i];
		var E2 = [Math.min(T[1], T[2]), Math.max(T[1], T[2]), i];
		var E3 = [Math.min(T[2], T[0]), Math.max(T[2], T[0]), i];

		Edges.push(E1, E2, E3);
	}

	// Right now, there are duplicates in the Edge array.  To remove, first we sort WRT the first vertex index of each edge.
	// We do this using an anonymous function and a built-in optimized comparison-sorting procedure.

	Edges.sort(function(a, b)
	{
		return (a[0] - b[0]) + (a[1] - b[1]) * (a[0] - b[0] == 0)
	})

	// There are still duplicates, so we define a new array.  Now, each Edge will be a 4-tuple: 2 elements being points, and
	// 2 elements being triangles.  The second element is null if the Edge is a boundary edge.

	var Edges_new = new Array();

	// Push the first element onto the new array.
	Edges_new.push([Edges[0][0], Edges[0][1], Edges[0][2], null])

	for (var i = 1; i < Edges.length; i++)
	{
		var E = Edges[i];
		var E_last = Edges_new[Edges_new.length - 1]; // The last "merged" edge

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
		{ // slot empty for now.
			Edges_new.push([E[0], E[1], E[2], null]);
		}
	}

	// The new Edge structure is completed, so we can discard the previous proto-array.
	Edges = Edges_new;

	// Finally, the Edge structure must be sorted in terms of the Euclidean distance between its two vertices:
	Edges.sort(function(a, b)
	{
		return lengthOfEdge(Vertices, b) - lengthOfEdge(Vertices, a)
	});



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





	// Create a set of all edges and anti-edge 2-tuples on the boundary, except for the first.

	var ConcaveEdges = new Array();

	for (var i = 1; i < Boundary.length; i++)
	{
		var B = Boundary[i];
		var E = Edges[B];

		var v1 = E[0];
		var v2 = E[1];

		ConcaveEdges.push([v1, v2]);
		ConcaveEdges.push([v2, v1]);
	}

	// Sort all convex edges according to first vertex index, increasing.
	ConcaveEdges.sort(
		function(a, b)
		{
			return (a[0] - b[0]) + (a[1] - b[1]) * (a[0] - b[0] == 0);
		})


	var ConcaveVertices = new Array();

	ConcaveVertices.push(Edges[Boundary[0]][0]); // Push the very first boundary vertex.
	ConcaveVertices.push(Edges[Boundary[0]][1]); // Push the very first boundary vertex.

	var seeking = Edges[Boundary[0]][1]; // The next vertex to find, connected


	while (ConcaveEdges.length != 0)
	{
		var index = ConcaveEdges.indexOf(seeking);
		var seeking2 = ConcaveEdges[index][1]

		ConcaveEdges.splice(index, 1);

		var index2 = ConcaveEdges.indexOf(seeking2, seeking);

		ConcaveEdges.splice(index2, 1);

		ConcaveVertices.push(seeking2);

		seeking = seeking2;
	}

	ConcaveVertices.splice(ConcaveVertices.length - 1, 1);

	/*
	for (var i = 0; i < ConcaveVertices.length; i++)
	{
		var CV = ConcaveVertices[i];
		console.log(CV);
	}/*/


	return ConcaveVertices;
}


function lengthOfEdge(Vertices, Edge)
{
	if (Edge == null)
	{
		return null;
	}
	var v1 = Vertices[Edge[0]];
	var v2 = Vertices[Edge[1]];
	var dist = Math.sqrt(Math.pow(v1[0] - v2[0], 2) + Math.pow(v1[1] - v2[1], 2));

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


Array.prototype.indexOf = function(target1, target2)
{
	var min = 0;
	var max = this.length - 1;
	var guess;

	while (min <= max)
	{
		guess = Math.floor((max + min) / 2);

		if (this[guess][0] === target1)
		{
			if (this[guess][1] === target2 || target2 == undefined)
			{
				return guess;
			}
			else if (this[guess + 1][1] === target2)
			{
				return guess + 1;
			}
			else if (this[guess - 1][1] === target2)
			{
				return guess - 1;
			}
		}
		else if (this[guess][0] < target1)
		{
			min = guess + 1;
		}
		else
		{
			max = guess - 1;
		}

	}

	return -1;
}