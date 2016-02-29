

var fps = 60;
var fov = 250;

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
		p = new Point( (Math.random()*200)-100, (Math.random()*200)-100 , (Math.random()*200)-100 ); // -200 <= x <= 200
		points.push(p); 
	}
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	for (var i = 0; i < points.length; i++)
	{
		points[i].rotateY(.04);
		points[i].draw();
	}
//	ctx.fillText("10 choose 5 = " + binom(10, 5), 20, 20);


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

    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.arc(this.x2d, this.y2d, this.scale, 0, Math.PI*2, true);
    ctx.fill();
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

Point.prototype.rotateY = function(angle)
{
	x = this.x;
	z = this.z;

	var cosRY = Math.cos(angle);
	var sinRY = Math.sin(angle);

	tempx = x;
	tempz = z;

	x = (tempx * cosRY) + (tempz*sinRY);
	z = (tempx * -sinRY) + (tempz*cosRY);

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
	Mouse.updatePos(evt)
	if (Mouse.holding) {
		points[Mouse.objHeld].moveTo(Mouse.x, Mouse.y);
    }
}, false);

cvs.addEventListener('mousedown', function(evt)
{
    var cID = closestPoint(Mouse.x, Mouse.y);

    if (points[cID].dist(Mouse.x, Mouse.y) < 20)
    {
        Mouse.holding = true;
        Mouse.objHeld = cID;
    }

    if (Mouse.holding)
    {
    	points[cID].moveTo(Mouse.x, Mouse.y);
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

	var cID = LReg.closest(mx, my);

	if (points[cID].dist(mx, my) < 20)
	{
		points.splice(cID, 1);
	}
	else
	{
		var p = new Point(mx, my);
		points.push(p);
	}
}, false);