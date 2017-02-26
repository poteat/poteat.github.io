// Takes in x and y position of center point, as well as angle.

// The 'Hull' structure is an array of Vertex objects in order
// of the edges of the polygon.

// This requires some preprocessing from just calling ConcaveHull -
// ConcaveHull returns an array of _references_ to the entire Vertex
// array.

// One must first build an array only including the concave vertices.

// I'm not sure what 'permissive' does.  Best to keep it set to 'true'.

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

	// 

	for (var i = 0; i < Hull.length; i++)
	{
		var V1 = Hull[i];
		var V2 = Hull[(i + 1) % Hull.length];

		var p = _intersects(x, y, ang, V1[0], V1[1], V2[0], V2[1])

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


function _intersects(x, y, ang, x1, y1, x2, y2)
{
	var A1 = Math.cos(ang);
	var B1 = Math.sin(ang);
	var C1 = B1 * y + A1 * x;

	var A2 = y2 - y1;
	var B2 = x1 - x2;
	var C2 = A2 * x1 + B2 * y1;

	var D = A1 * B2 - A2 * B1;
	var Dx = C1 * B2 - C2 * B1;
	var Dy = C2 * A1 - C1 * A2;

	if (D == 0)
	{
		return false;
	}

	var x = Dx / D;
	var y = Dy / D;

	if (x - Math.min(x1, x2) >= -.001 && x - Math.max(x1, x2) <= .001)
	{
		if (y - Math.min(y1, y2) >= -.001 && y - Math.max(y1, y2) <= .001)
		{
			return [x, y];
		}
	}

	return false;


}
