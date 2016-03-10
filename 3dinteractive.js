

var fps = 60;
var fov = 250;

var yaw = 0;
var pitch = 0;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

var points = new Array();

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);

init();


function init()
{
	var numPoints = 3000;

	for (var i = 0; i < numPoints; i++)
	{
		p = new Point( (Math.random()*200)-100, (Math.random()*200)-100 , (Math.random()*200)-100 ); // -100 <= x <= 100
		points.push(p); 
	}
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);


	for (var i = 0; i < points.length; i++)
	{
//		points[i].rotateY(.04);
		points[i].draw();
	}

	ctx.fillText("Yaw: " + yaw*180/3.1415, 20, 20);
	ctx.fillText("Pitch: " + pitch*180/3.1415, 20, 30);


}







function Point(x, y, z, color = "black")
{
	this.x = x;
	this.y = y;
	this.z = z;
	this.color = color;
}

Point.prototype.draw = function()
{
	var x3d = this.x;
	var y3d = this.y; 
	var z3d = this.z; 
	this.scale = fov/(fov+z3d); 
	this.x2d = (x3d * this.scale) + cvs.width/2;	
	this.y2d = (y3d * this.scale)  + cvs.height/2;

    if (this.scale > 0)
    {
	    ctx.beginPath();
	    ctx.fillStyle = this.color;
	    ctx.arc(this.x2d, this.y2d, this.scale, 0, Math.PI*2, true);
	    ctx.fill();
    }
};

Point.prototype.dist = function(x, y)
{
	return Math.sqrt( Math.pow(this.x2d - x, 2) + Math.pow(this.y2d - y, 2) );
};

Point.prototype.moveTo = function(x, y)
{
    this.x = x;
    this.y = y;
};

Point.prototype.scaleFactor = function(factor)
{
	this.x *= factor;
	this.y *= factor;
	this.z *= factor;
};

Point.prototype.rotateX = function(angle)
{
	y = this.y;
	z = this.z;

	var cosRX = Math.cos(angle);
	var sinRX = Math.sin(angle);

	tempy = y;
	tempz = z;

	y = (tempy * cosRX) + (tempz * -sinRX);
	z = (tempy * sinRX) + (tempz * cosRX);

	this.y = y;
	this.z = z;
}

Point.prototype.rotateY = function(angle)
{
	x = this.x;
	z = this.z;

	var cosRY = Math.cos(angle);
	var sinRY = Math.sin(angle);

	tempx = x;
	tempz = z;

	x = (tempx * cosRY) + (tempz * sinRY);
	z = (tempx * -sinRY) + (tempz * cosRY);

	this.x = x;
	this.z = z;
}

function closestPoint(x, y)
{
	var closestID = 0;
	closestDistance = 99999;

	currentDistance = 0;

	for (var i = 0; i < points.length; i++)
	{
		currentDistance = points[i].dist(x, y);
		if (currentDistance < closestDistance)
		{
			closestID = i;
			closestDistance = currentDistance;
		}
	}

	return closestID;
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
	this.x = (evt.clientX - rect.left - 1);
	this.y = (evt.clientY - rect.top - 1);
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
		if (old_y != new_y)
		{
			delta_pitch = (new_y - old_y)*.006;
			if (pitch + delta_pitch <= 90/180*3.1415 && pitch + delta_pitch >= -90/180*3.1415)
			{
				pitch += delta_pitch;
				for (var i = 0; i < points.length; i++)
				{
					points[i].rotateX(delta_pitch);
				}
			}
		}

		if (old_x != new_x)
		{
			var unpitch = false;
			if (pitch != 0)
			{
				for (var i = 0; i < points.length; i++)
				{
					points[i].rotateX(-pitch);
					unpitch = true;
				}
			}

			delta_yaw = (old_x - new_x)*.006;
			yaw += delta_yaw;
			for (var i = 0; i < points.length; i++)
			{
				points[i].rotateY(delta_yaw);
			}

			if (unpitch)
			{
				for (var i = 0; i < points.length; i++)
				{
					points[i].rotateX(pitch);
				}
			}
		}

	}

}, false);

cvs.addEventListener('mousedown', function(evt)
{
    Mouse.holding = true;
}, false);

cvs.addEventListener('mouseleave', function(evt)
{
	Mouse.holding = false;
}, false);

cvs.addEventListener('mouseup', function(evt)
{
	Mouse.holding = false;
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

	for (var i = 0; i < points.length; i++)
	{
		points[i].scaleFactor(1+delta*.1);
	}

	evt.preventDefault();
	return false;
}, false);