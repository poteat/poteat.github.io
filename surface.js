

var fps = 60;
var fov = 250;
var yaw = 10;
var pitch = 0.7;
var zoom = 1;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

var BSurface;

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);



function init()
{
	BSurface = new Surface(4, 4, 20, 20);

	worldTransformation()
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	BSurface.draw();

	ctx.fillText("Yaw:   " + yaw, 10, 10);
	ctx.fillText("Pitch: " + pitch, 10, 20);
	ctx.fillText("Zoom:  " + zoom, 10, 30);

	var x = 0;
	var y = 4;

	ctx.fillText("x: " + Points.x[BSurface.array_of_draw_ids[x][y]].x, 10, 50)
	ctx.fillText("y: " + Points.x[BSurface.array_of_draw_ids[x][y]].y, 10, 60)
	ctx.fillText("z: " + Points.x[BSurface.array_of_draw_ids[x][y]].z, 10, 70)

//	BCurve.draw();
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






function Surface(X, Y, T, U)
{

	this.X = X;
	this.Y = Y;
	this.T = T;
	this.U = U;

	// Control points
	this.array_of_ids = new Array(X); // Populate 'x' slots
	this.array_of_transformed_ids = new Array(X);

	for (var i = 0; i < X; i++)
	{
		this.array_of_ids[i] = new Array(Y);
		this.array_of_transformed_ids[i] = new Array(Y);
	}

	// M is associated with x
	// N is associated with Y

	// Each 'x' slot has Y 'y' slots inside of it.  array[x][y] to get one specific one.

	var lower = -100;
	var upper = 100;

	var i = 0;
	var j = 0;

	for (var i = 0; i < X; i++)
	{
		for (var j = 0; j < Y; j++)
		{
			var x = lower + i/(X-1)*(upper - lower);
			var z = lower + j/(X-1)*(upper - lower);

			var width = 100;

			var y = Math.random()*width*2 - width; // Between -30 and 30

			this.array_of_ids[i][j] = Points.createPoint(x, y, z, "black", 2);
			this.array_of_transformed_ids[i][j] = Points.createPoint(x, y, z, "black", 2);
		}
	}





	// Draw points
	this.array_of_draw_ids = new Array(T); // Populate 'x' slots
	this.array_of_transformed_draw_ids = new Array(T);

	for (var i = 0; i < T; i++)
	{
		this.array_of_draw_ids[i] = new Array(U);
		this.array_of_transformed_draw_ids[i] = new Array(U);
	}

	var i = 0;
	var j = 0;

	for (var i = 0; i < T; i++)
	{
		for (var j = 0; j < U; j++)
		{
			this.array_of_draw_ids[i][j] = Points.createPoint(0, 0, 0);
			this.array_of_transformed_draw_ids[i][j] = Points.createPoint(0, 0, 0);
		}
	}



	this.updatePoints();


}

Surface.prototype.draw = function()
{

	// 'Draw' surface points to calculate their 'scale' (if negative, outside of cam space)
	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			Points.x[this.array_of_transformed_draw_ids[i][j]].draw(false);
		}
	}

	// Draw surface wireframe

	ctx.strokeStyle = "grey";

	ctx.beginPath();

	var needToMove = false;

	for (var i = 0; i < this.T; i++)
	{
		var j = 0;

		var p = Points.x[this.array_of_transformed_draw_ids[i][j]];

		if (p.scale > 0)
		{
			ctx.moveTo(p.x2d, p.y2d);
		}
		else
		{
			needToMove = true;
		}
		


		for (var j = 0; j < this.U; j++)
		{
			var p = Points.x[this.array_of_transformed_draw_ids[i][j]];


			if (p.scale > 0)
			{
				if (!needToMove)
				{
					ctx.lineTo(p.x2d, p.y2d);
				}
				else
				{
					ctx.moveTo(p.x2d, p.y2d);
					needToMove = false;
				}
			}
		}
	}

	var needToMove = false;

	for (var i = 0; i < this.U; i++)
	{
		var j = 0;

		var p = Points.x[this.array_of_transformed_draw_ids[j][i]];

		if (p.scale > 0)
		{
			ctx.moveTo(p.x2d, p.y2d)
		}
		else
		{
			needToMove = true;
		}
		

		for (var j = 0; j < this.T; j++)
		{
			var p = Points.x[this.array_of_transformed_draw_ids[j][i]];
			if (p.scale > 0)
			{
				if (!needToMove)
				{
					ctx.lineTo(p.x2d, p.y2d);
				}
				else
				{
					ctx.moveTo(p.x2d, p.y2d);
					needToMove = false;
				}
			}
			
		}
	}

	ctx.stroke();


	// Draw control points
	for (var i = 0; i < this.X; i++)
	{
		for (var j = 0; j < this.Y; j++)
		{
			Points.x[this.array_of_transformed_ids[i][j]].draw();
		}
	}

}

Surface.prototype.scaleFactor = function(zoom, from_untransformed_points)
{
	for (var i = 0; i < this.X; i++)
	{
		for (var j = 0; j < this.Y; j++)
		{
			if (from_untransformed_points)
			{
				Points.x[this.array_of_transformed_ids[i][j]].moveTo(Points.x[this.array_of_ids[i][j]].scaleFactor(zoom));
			}
			else
			{
				Points.x[this.array_of_transformed_ids[i][j]].moveTo(Points.x[this.array_of_transformed_ids[i][j]].scaleFactor(zoom));
			}
		}
	}

	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			if (from_untransformed_points)
			{
				Points.x[this.array_of_transformed_draw_ids[i][j]].moveTo(Points.x[this.array_of_draw_ids[i][j]].scaleFactor(zoom));
			}
			else
			{
				Points.x[this.array_of_transformed_draw_ids[i][j]].moveTo(Points.x[this.array_of_transformed_draw_ids[i][j]].scaleFactor(zoom));
			}
		}
	}
}

Surface.prototype.rotateX = function(pitch)
{
	for (var i = 0; i < this.X; i++)
	{
		for (var j = 0; j < this.Y; j++)
		{
			Points.x[this.array_of_transformed_ids[i][j]].moveTo(Points.x[this.array_of_transformed_ids[i][j]].rotateX(pitch));
		}
	}

	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			Points.x[this.array_of_transformed_draw_ids[i][j]].moveTo(Points.x[this.array_of_transformed_draw_ids[i][j]].rotateX(pitch));
		}
	}
}

Surface.prototype.rotateY = function(yaw)
{
	for (var i = 0; i < this.X; i++)
	{
		for (var j = 0; j < this.Y; j++)
		{
			Points.x[this.array_of_transformed_ids[i][j]].moveTo(Points.x[this.array_of_transformed_ids[i][j]].rotateY(yaw));
		}
	}

	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			Points.x[this.array_of_transformed_draw_ids[i][j]].moveTo(Points.x[this.array_of_transformed_draw_ids[i][j]].rotateY(yaw));
		}
	}
}

Surface.prototype.updatePoints = function()
{
	var delta_t = 1/(this.T-1);
	var delta_u = 1/(this.U-1);

	var t = 0;

	for (var x = 0; x < this.T; x++)
	{
		var u = 0;

		for (var y = 0; y < this.U; y++)
		{
			this.calc(x, y, t, u)

			u += delta_u;
		}
		t += delta_t;
	}
}

Surface.prototype.calc = function(x_i, y_i, t, u)
{
	var sum_x = 0;
	var sum_y = 0;
	var sum_z = 0;

	for (var x = 0; x < this.X; x++)
	{
		for (var y = 0; y < this.Y; y++)
		{
			var control_x = Points.x[this.array_of_ids[x][y]].x;
			var control_y = Points.x[this.array_of_ids[x][y]].y;
			var control_z = Points.x[this.array_of_ids[x][y]].z;

			var product = this.basis(t, x, this.X - 1) * this.basis(u, y, this.Y - 1);

			sum_x += product*control_x;
			sum_y += product*control_y;
			sum_z += product*control_z;
		}
	}

	var p = Points.x[this.array_of_draw_ids[x_i][y_i]];

	p.x = sum_x;
	p.y = sum_y;
	p.z = sum_z;

}

Surface.prototype.basis = function(t, i, n)
{
	return binom(n, i)*Math.pow(t, i)*Math.pow(1-t,n-i);
}

Surface.prototype.binom = function(n, k)
{
	var prod = 1;
	for (i = 1; i <= k; i++)
	{
		prod *= (n + 1 - i)/i;
	}

	return prod;
}











function _Points()
{
	this.x = new Array();
}

var Points = new _Points()

_Points.prototype.createPoint = function(x, y, z, color = "black", size = 1)
{
	var id = this.x.length;
	this.x.push(new Point(x, y, z, color, size, id));

	return id;
};

_Points.prototype.closest = function(obj)
{
	var dist = 0;
	var mindist = 99999;
	var min_index = -1;

	for (var i = 0; i < this.x.length; i++)
	{
		if (this.x[i] != null)
		{
			dist = this.x[i].dist2d(obj);

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

function Point(x, y, z, color = "black", size = 1, id)
{
	this.x = x;
	this.y = y;
	this.z = z;
	this.color = color;
	this.size = size;

	this.id = id;
}

Point.prototype.draw = function(actually_draw = true)
{
	var x3d = this.x;
	var y3d = this.y; 
	var z3d = this.z; 
	this.scale = fov/(fov+z3d); 
	this.x2d = (x3d * this.scale) + cvs.width/2;	
	this.y2d = (y3d * this.scale)  + cvs.height/2;

    if (this.scale > 0 && actually_draw)
    {
	    ctx.beginPath();
	    ctx.fillStyle = this.color;
	    ctx.arc(this.x2d, this.y2d, this.scale*this.size, 0, Math.PI*2, true);
	    ctx.fill();
    }
};

Point.prototype.dist2d = function(obj)
{
	return Math.sqrt( Math.pow(this.x2d - obj.x, 2) + Math.pow(this.y2d - obj.y, 2) );
};

Point.prototype.planeDist = function(A, B, C, D)
{
	return Math.abs(A*this.x + B*this.y + C*this.z + D)/Math.sqrt(A*A + B*B + C*C);
};

Point.prototype.moveTo = function(obj)
{
    this.x = obj.x;
    this.y = obj.y;
    this.z = obj.z;
};

Point.prototype.scaleFactor = function(factor)
{
	var p = new Point(this.x, this.y, this.z, this.color);

	p.x *= factor;
	p.y *= factor;
	p.z *= factor;

	return p;
};

Point.prototype.rotateX = function(angle)
{
	var p = new Point(this.x, this.y, this.z, this.color);

	y = this.y;
	z = this.z;

	var cosRX = Math.cos(angle);
	var sinRX = Math.sin(angle);

	tempy = y;
	tempz = z;

	y = (tempy * cosRX) + (tempz * -sinRX);
	z = (tempy * sinRX) + (tempz * cosRX);

	p.y = y;
	p.z = z;

	return p;
};

Point.prototype.rotateY = function(angle)
{
	var p = new Point(this.x, this.y, this.z, this.color);

	x = this.x;
	z = this.z;

	var cosRY = Math.cos(angle);
	var sinRY = Math.sin(angle);

	tempx = x;
	tempz = z;

	x = (tempx * cosRY) + (tempz * sinRY);
	z = (tempx * -sinRY) + (tempz * cosRY);

	p.x = x;
	p.z = z;

	return p;
};
















function worldTransformation()
{
	BSurface.scaleFactor(zoom, true);

	BSurface.rotateX(pitch);

	var unpitch = false;
	if (pitch != 0)
	{

		BSurface.rotateX(-pitch);
		unpitch = true;
	}

	BSurface.rotateY(yaw);

	if (unpitch)
	{
		BSurface.rotateX(pitch);
	}
}




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
	var old_x = Mouse.x;
	var old_y = Mouse.y;
	Mouse.updatePos(evt)
	var new_x = Mouse.x;
	var new_y = Mouse.y;

	var changed = (old_x != new_x) || (old_y != new_y);

	if (Mouse.holding)
	{
		if (changed)
		{
			delta_pitch = (new_y - old_y)*.006;
			if (pitch + delta_pitch <= 90/180*3.1415 && pitch + delta_pitch >= -90/180*3.1415)
			{
				pitch += delta_pitch;
			}

			delta_yaw = (old_x - new_x)*.006;
			yaw += delta_yaw;

			worldTransformation();
		}
	}

}, false);

cvs.addEventListener('mousedown', function(evt)
{
	Mouse.down = true;

	// Check if the mouse is over any toggle or slider elements
	var hovering = false;


	if (hovering == false)
	{
		Mouse.holding = true; // Used for rotation
	}
   	
}, false);

cvs.addEventListener('mouseleave', function(evt)
{
	Mouse.holding = false;
	Mouse.objHeld = null;

	Mouse.down = false;
}, false);

cvs.addEventListener('mouseup', function(evt)
{
	Mouse.holding = false;
	Mouse.objHeld = null;

	Mouse.down = false;
}, false);

cvs.addEventListener('dblclick', function(evt)
{

}, false);

cvs.addEventListener('mousewheel',function(evt)
{
	var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
	evt.preventDefault();
    return false; 
}, false);

cvs.addEventListener("DOMMouseScroll",function(evt)
{
	var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));

	zoom *= (1 + delta*.1)

	BSurface.scaleFactor(1 + delta*.1, false);

	evt.preventDefault();
	return false;
}, false);


init();