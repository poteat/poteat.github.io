

var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);

var _Select;

function init()
{
	Points.createPoint(200, 100, 'm');



	var button_labels = new Array();

	button_labels.push("Mass Node");
	button_labels.push("Stage Node");
	button_labels.push("Fuel Node");
	button_labels.push("Engine Node");
	button_labels.push("Structure Edge");
	button_labels.push("Fuel Edge");

	var box_width = 80;
	var box_height = 15;
	var menu_label_height = 15;

	var inset_width = 5;
	var inset_height = 5;

	_Select = new SelectMenu(20, 50, "Placement Menu", box_width, box_height, inset_width, inset_height, menu_label_height, button_labels, 0)

}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	Points.draw();
	_Select.draw();
}



























function _Points()
{
	this.x = new Array();
}

var Points = new _Points()

_Points.prototype.createPoint = function(x, y, type)
{
	var id = this.x.length;
	this.x.push(new Point(x, y, type, id));

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



function Point(x, y, type, id)
{
	this.x = x;
	this.y = y;

	this.radius = 10;
	this.type = type;

	this.parent = null;
	this.children = new Array();
	this.id = id;
}

Point.prototype.draw = function()
{
	// Draw circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, true);
    ctx.stroke();

    // Draw type
    ctx.fillStyle = 'black';
    ctx.fillText(this.type, this.x - 4, this.y + 3);

    // Draw child arrows
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




































function _SelectButtons()
{
	this.x = new Array();
}

var SelectButtons = new _SelectButtons();

_SelectButtons.prototype.createSelectButton = function(x, y, width, height, label, active)
{
	var id = this.x.length;
	this.x.push(new SelectButton(x, y, width, height, label, active, id));

	return id;
};

_SelectButtons.prototype.draw = function()
{
	for (var i = 0; i < this.x.length; i++)
	{
		if (this.x[i] != null)
		{
			this.x[i].draw();
		}
	}
}



function SelectButton(x, y, width, height, label, active, id)
{
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.label = label;

	this.down = false;
	this.active = active;
	this.id = id;
}

SelectButton.prototype.hasWithin = function(obj)
{
	return obj.x > this.x && obj.x < this.x + this.width && obj.y > this.y && obj.y < this.y + this.height;
};

SelectButton.prototype.draw = function(actually_draw = true)
{
	var background = '#D3D3D3';
	var active_background = '#A796EB';

	if (this.hasWithin(Mouse))
	{
		background = '#BABABA';
		active_background = '#9384D1';

		if (Mouse.down)
		{
			background = '#8F8F8F';
			active_background = '#8072B5';
			this.down = true;
		}

		if (this.down && !Mouse.down)
		{
			this.active = !this.active;
		}
	}

	if (!Mouse.down)
	{
		this.down = false;
	}

	if (this.active)
	{
		background = active_background;
	}

	// If actually_draw is set to false, then it only updates the mouse checks
	if (actually_draw)
	{
		// Draw background
		ctx.fillStyle = background;
		ctx.beginPath();
		ctx.rect(this.x, this.y, this.width, this.height);
		ctx.fill();

		// Draw border
		ctx.strokeStyle = 'black';
		ctx.beginPath();
		ctx.rect(this.x, this.y, this.width, this.height);
		ctx.stroke();

		// Draw text

		var fontsize = 7;


		ctx.fillStyle = 'black';
		ctx.fillText(this.label, this.x + 4, this.y + this.height/2 + fontsize/2);
	}
};

SelectButton.prototype.moveOffset = function(x, y)
{
    this.x += x;
    this.y += y;
};






















function SelectMenu(x, y, menu_label, box_width, box_height, inset_width, inset_height, menu_label_height, label_array, default_selection, id)
{
	this.button_ids = new Array();

	this.x = x;
	this.y = y;

	this.box_width = box_width;
	this.box_height = box_height;
	this.inset_width = inset_width;
	this.inset_height = inset_height;

	this.menu_label_height = menu_label_height;

	this.menu_label = menu_label;

	this.width = inset_width*2 + box_width;
	this.height = menu_label_height + inset_height*2 + label_array.length*box_height;

	this.selected = default_selection;

	var y_offset = box_height;

	x += inset_width;
	y += menu_label_height + inset_height;

	for (var i = 0; i < label_array.length; i++)
	{
		this.button_ids.push(SelectButtons.createSelectButton(x, y, box_width, box_height, label_array[i], i == default_selection));
		y += y_offset;
	}

	this.down == false;
	this.heldX = 0;
	this.heldY = 0;

	this.id = id;
}

SelectMenu.prototype.draw = function()
{
	var button_hovers = false;

	var button_active = false;

	for (var i = 0; i < this.button_ids.length; i++)
	{
		var button = SelectButtons.x[this.button_ids[i]];

		button.draw(false); // Only check for mouse info

		if (button.active)
		{
			button_active = true;
		}

		if (button.active && i != this.selected)
		{
			this.selected = i;

			// Turn all other buttons off
			for (var j = 0; j < this.button_ids.length; j++)
			{
				if (j != this.selected)
				{
					SelectButtons.x[this.button_ids[j]].active = false;
				}
			}
		}

		if (button.hasWithin(Mouse) || button.down)
		{
			button_hovers = true;
		}
	}

	if (!button_active)
	{
		SelectButtons.x[this.selected].active = true;
	}

	if (!button_hovers && this.hasWithin(Mouse))
	{
		if (Mouse.down && !this.down)
		{
			this.down = true;
			this.heldX = Mouse.x;
			this.heldY = Mouse.y;
		}
	}

	if (!Mouse.down)
	{
		this.down = false;
	}

	if (this.down)
	{
		var alt_x = Mouse.x - this.heldX;
		var alt_y = Mouse.y - this.heldY;

		if (alt_x != 0 || alt_y != 0)
		{
			this.moveOffset(alt_x, alt_y);
			this.heldX = Mouse.x;
			this.heldY = Mouse.y;
		}
	}

	for (var i = 0; i < this.button_ids.length; i++)
	{
		var button = SelectButtons.x[this.button_ids[i]];
		button.draw();
	}

	ctx.beginPath();
	ctx.rect(this.x, this.y, this.width, this.height);
	ctx.stroke();

	ctx.fillText(this.menu_label, this.x + 3, this.y + this.menu_label_height/2 + 4);
}

SelectMenu.prototype.hasWithin = function(obj)
{
	return obj.x > this.x && obj.x < this.x + this.width && obj.y > this.y && obj.y < this.y + this.height;
};

SelectMenu.prototype.moveOffset = function(x, y)
{
    this.x += x;
    this.y += y;

    for (var i = 0; i < this.button_ids.length; i++)
    {
    	SelectButtons.x[this.button_ids[i]].moveOffset(x, y);
    }
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
		    if (Points.x[Mouse.objHeld].dist(Points.x[cID]) < 80)
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
	var new_id = -1;

	if (cID >= 0)
	{
		if (Points.x[cID].dist(Mouse) < 20)
		{
			Points.x[cID].removeDescendentNodes();
		}
		else
		{
			new_id = Points.createPoint(Mouse.x, Mouse.y, 'm');
		}
	}
	else
	{
		new_id = Points.createPoint(Mouse.x, Mouse.y, 'm');
	}

	if (new_id >= 0)
	{
		var closest = Points.closestToID(new_id);
		if (Points.x[new_id].dist(Points.x[closest]) < 80)
		{
			Points.x[new_id].setParent(closest);
		}
	}
}, false);

init();