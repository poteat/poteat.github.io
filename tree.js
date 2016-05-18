

var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);

function init()
{
	Points.appendPoint(100, 100, "black");
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	Points.draw();

	ctx.fillText("Children: " + Points.x[0].children.length, 10, 10);
}



























function _Points()
{
	this.x = new Array();
}

var Points = new _Points()

_Points.prototype.appendPoint = function(x, y, color = "black")
{
	var id = this.x.length;
	this.x.push(new Point(x, y, color, id));

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
			dist = this.x[i].dist(obj);

			if (dist < mindist)
			{
				min_index = i;
				mindist = dist;
			}
		}
	}

	return min_index;
};

_Points.prototype.closestToID = function(id)
{
	var dist = 0;
	var mindist = 99999;
	var min_index = -1;

	for (var i = 0; i < this.x.length; i++)
	{
		if (i != id && Points.x[id].isDescendentNode(i) == false)
		{
			if (this.x[i] != null)
			{
				dist = this.x[i].dist(Points.x[id]);

				if (dist < mindist)
				{
					min_index = i;
					mindist = dist;
				}
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








function Point(x, y, color, id)
{
	this.x = x;
	this.y = y;

	this.radius = 10;

	this.parent = null;
	this.children = new Array();
	this.color = color;
	this.id = id;
}

Point.prototype.draw = function()
{
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, true);
    ctx.stroke();

    for (var i = 0; i < this.children.length; i++)
    {
    	this.drawArrowTo(Points.x[this.children[i]]);
/*    	ctx.beginPath();
    	ctx.moveTo(this.x, this.y);
    	ctx.lineTo(Points.x[this.children[i]].x, Points.x[this.children[i]].y);
    	ctx.stroke();*/
    }
};

Point.prototype.drawArrowTo = function(obj)
{
	var ang = Math.atan2(obj.y - this.y, obj.x - this.x);
	var x_from = this.x + Math.cos(ang)*this.radius;
	var y_from = this.y + Math.sin(ang)*this.radius;

	var x_to = obj.x - Math.cos(ang)*obj.radius;
	var y_to = obj.y - Math.sin(ang)*obj.radius;

	// Draw main shaft
	ctx.beginPath();
	ctx.moveTo(x_from, y_from);
	ctx.lineTo(x_to, y_to);
	ctx.stroke();

	var ang_offset = 30 / 180 * Math.PI;
	var arrow_length = 10;

	var arrow_x_1 = x_to - Math.cos(ang + ang_offset)*arrow_length;
	var arrow_y_1 = y_to - Math.sin(ang + ang_offset)*arrow_length;

	var arrow_x_2 = x_to - Math.cos(ang - ang_offset)*arrow_length;
	var arrow_y_2 = y_to - Math.sin(ang - ang_offset)*arrow_length;

	ctx.beginPath();
	ctx.moveTo(x_to, y_to);
	ctx.lineTo(arrow_x_1, arrow_y_1);
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(x_to, y_to);
	ctx.lineTo(arrow_x_2, arrow_y_2);
	ctx.stroke();
}

Point.prototype.dist = function(obj)
{
	return Math.sqrt( Math.pow(this.x - obj.x, 2) + Math.pow(this.y - obj.y, 2) );
};

Point.prototype.moveTo = function(obj)
{
    this.x = obj.x;
    this.y = obj.y;
};

Point.prototype.appendChild = function(id)
{
	var duplicate = false;

	for (var i = 0; i < this.children.length; i++)
	{
		if (id == this.children[i])
		{
			duplicate = true;
			break;
		}
	}

	if (!duplicate)
	{
		this.children.push(id);
	}
}

Point.prototype.removeChild = function(id)
{
	for (var i = 0; i < this.children.length; i++)
	{
		if (id == this.children[i])
		{
			this.children.splice(i, 1);
		}
	}
}

Point.prototype.setParent = function(parent)
{
	if (this.isDescendentNode(parent))
	{
		return;
	}

	if (parent == null)
	{
		if (this.parent == null)
		{
			// Do nothing, both null
		}
		else
		{
			if (Points.x[this.parent] != null)
			{
				Points.x[this.parent].removeChild(this.id);
			}
		}
	}
	else
	{
		if (this.parent == null)
		{
			Points.x[parent].appendChild(this.id);
		}
		else
		{
			// Neither are null, check if the same
			if (this.parent == parent)
			{
				// Do nothing, already set
			}
			else
			{
				Points.x[this.parent].removeChild(this.id);
				Points.x[parent].appendChild(this.id);
			}
		}
	}

	this.parent = parent;
};

Point.prototype.isDescendentNode = function(id)
{
	for (var i = 0; i < this.children.length; i++)
	{
		if (Points.x[this.children[i]].isDescendentNode(id))
		{
			return true;
		}
	}

	if (this.id == id)
	{
		return true;
	}

	return false;
}

Point.prototype.offsetDescendentNodes = function(x_offset, y_offset)
{
	for (var i = 0; i < this.children.length; i++)
	{
		Points.x[this.children[i]].offsetDescendentNodes(x_offset, y_offset);
	}

	this.x += x_offset;
	this.y += y_offset;
}

Point.prototype.removeDescendentNodes = function()
{
	this.setParent(null);

	var l = this.children.length;

	for (var i = 0; i < l; i++)
	{
		Points.x[this.children[0]].removeDescendentNodes();
	}

	delete Points.x[this.id];
}

Point.prototype.hasParent = function()
{
	return this.parent != null;
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
		var p = Points.x[Mouse.objHeld];
		p.offsetDescendentNodes(Mouse.x - p.x, Mouse.y - p.y);

	    var cID = Points.closestToID(Mouse.objHeld);

	    if (cID >= 0)
	    {
		    if (Points.x[Mouse.objHeld].dist(Points.x[cID]) < 100)
		    {
		    	Points.x[Mouse.objHeld].setParent(cID);
		    }
		    
		    if (Points.x[Mouse.objHeld].hasParent())
		    {
			    if (Points.x[Mouse.objHeld].dist(Points.x[Points.x[Mouse.objHeld].parent]) > 80)
			    {
			    	Points.x[Mouse.objHeld].setParent(null);
			    }
		    }
	    }
	}
}, false);

cvs.addEventListener('mousedown', function(evt)
{
    var cID = Points.closest(Mouse);

    if (cID >= 0)
    {
		var p = Points.x[cID];

    	if (p.dist(Mouse) < 20)
	    {
	        Mouse.holding = true;
	        Mouse.objHeld = cID;
	    }

	    if (Mouse.holding)
	    {
	    	p.offsetDescendentNodes(Mouse.x - p.x, Mouse.y - p.y);
	    }
    }

    Mouse.down = true;
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
	var cID = Points.closest(Mouse);

	if (cID >= 0)
	{
		if (Points.x[cID].dist(Mouse) < 20)
		{
			Points.x[cID].removeDescendentNodes();
		}
		else
		{
			Points.appendPoint(Mouse.x, Mouse.y);
		}
	}
	else
	{
		Points.appendPoint(Mouse.x, Mouse.y);
	}
}, false);

init();