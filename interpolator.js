

var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

var QBCurve;


function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	for (var i = 0; i < ToggleButtons.length; i++)
	{
		ToggleButtons[i].draw();
	}

	for (var i = 0; i < Sliders.length; i++)
	{
		Sliders[i].draw();
	}

	QBCurve.draw();
}


function init()
{
	optimize_button = Create_ToggleButton(20, 50, 70, 25, "Optimize");
	smooth_slider = Create_Slider(20, 80, 70, 20, "Smoothness", 10, 0.01, .99, .5);

	QBCurve = new QuadraticBezier(100, 300, 250, 100, 400, 300, smooth_slider, optimize_button);

	mainloop = setInterval("main();",1000/fps);
}


function QuadraticBezier(x1, y1, x2, y2, x3, y3, smooth_slider_id, optimize_button_id)
{
	this.smooth_slider_id = smooth_slider_id;
	this.optimize_button_id = optimize_button_id;

	this.knot = [];

	this.knot[0] = new Point(x1, y1);
	this.knot[1] = new Point(x2, y2);
	this.knot[2] = new Point(x3, y3);

	this.controlPoint = new Array(this.knot.length);

	for (var i = 0; i < this.controlPoint.length; i++)
	{
		this.controlPoint[i] = new Point(0, 0);
	}

	this.samples = 100;

	this.t = .5;
}

QuadraticBezier.prototype.draw = function()
{
	for (var i = 0; i < this.knot.length; i++)
	{
		this.knot[i].draw();
	}

	this.controlPoint[1].draw();

	if (ToggleButtons[this.optimize_button_id].activated)
	{
		for (var i = 0; i < 20; i++)
		{
			this.findOptimalT();
		}

		this.updateT();
	}
	else
	{
		this.updateControl();
	}

	this.updateT();

	ctx.beginPath();
	ctx.moveTo(this.knot[0].x, this.knot[0].y);

	var p = new Point(this.knot[0].x, this.knot[0].y);
	var p_old = new Point(0, 0);

	for (var i = 1; i <= this.samples; i++)
	{
		p_old.x = p.x;
		p_old.y = p.y;

		this.calc(i/this.samples, p);

		ctx.lineTo(p.x, p.y);
	}

	ctx.stroke();




	ctx.stroke();

	var arclength = this.arcLength();

	ctx.fillText("Arc Length: " + arclength, 20, 20);



	var subchord_arclength = this.arcLength(0, .5);
	t_estimate = subchord_arclength/arclength;

	//Sliders[this.smooth_slider_id].setValue(this.t);


	ctx.fillText("Arc Estimate: " + t_estimate, 20, 30);
};

QuadraticBezier.prototype.updateControl = function()
{
	var length = this.controlPoint.length;

	this.controlPoint[0] = this.knot[0];
	this.controlPoint[2] = this.knot[2];

	this.t = Sliders[this.smooth_slider_id].value;

	var t = this.t;

	var x = (this.knot[1].x - Math.pow(t,2)*this.knot[2].x - Math.pow(1-t,2)*this.knot[0].x)/(2*(1-t)*t);
	var y = (this.knot[1].y - Math.pow(t,2)*this.knot[2].y - Math.pow(1-t,2)*this.knot[0].y)/(2*(1-t)*t);

	this.controlPoint[1].x = x;
	this.controlPoint[1].y = y;
};

QuadraticBezier.prototype.arcLength = function(min = 0, max = 1)
{
	var samples = 10;
	var totalLength = 0;

	var p = new Point(0, 0);
	var p_old = new Point(0, 0);

	this.calc(min, p);

	for (var i = 1; i <= samples; i++)
	{
		p_old.x = p.x;
		p_old.y = p.y;

		var t = min + i*(max - min)/samples;

		this.calc(t, p);

		totalLength += p.dist(p_old.x, p_old.y);
	}

	return totalLength;
};

QuadraticBezier.prototype.updateT = function()
{
	this.controlPoint[0] = this.knot[0];
	this.controlPoint[2] = this.knot[2];

	var t = this.t;

	this.controlPoint[1].x = (this.knot[1].x - Math.pow(t,2)*this.knot[2].x - Math.pow(1-t,2)*this.knot[0].x)/(2*(1-t)*t);
	this.controlPoint[1].y = (this.knot[1].y - Math.pow(t,2)*this.knot[2].y - Math.pow(1-t,2)*this.knot[0].y)/(2*(1-t)*t);

	Sliders[this.smooth_slider_id].setValue(t);
}

QuadraticBezier.prototype.findOptimalT = function()
{
	var score = this.arcLength();

	var t = this.t;
	var delta = .001;
	var threshold = 0;

	t += delta;
	this.controlPoint[1].x = (this.knot[1].x - Math.pow(t,2)*this.knot[2].x - Math.pow(1-t,2)*this.knot[0].x)/(2*(1-t)*t);
	this.controlPoint[1].y = (this.knot[1].y - Math.pow(t,2)*this.knot[2].y - Math.pow(1-t,2)*this.knot[0].y)/(2*(1-t)*t);
	var inc_score = this.arcLength();

	t -= 2*delta;
	this.controlPoint[1].x = (this.knot[1].x - Math.pow(t,2)*this.knot[2].x - Math.pow(1-t,2)*this.knot[0].x)/(2*(1-t)*t);
	this.controlPoint[1].y = (this.knot[1].y - Math.pow(t,2)*this.knot[2].y - Math.pow(1-t,2)*this.knot[0].y)/(2*(1-t)*t);
	var dec_score = this.arcLength();

	t += delta;

	if (inc_score < dec_score)
	{
		if (score - inc_score > threshold)
		{
			t += delta;
			this.t = t;

			this.controlPoint[1].x = (this.knot[1].x - Math.pow(t,2)*this.knot[2].x - Math.pow(1-t,2)*this.knot[0].x)/(2*(1-t)*t);
			this.controlPoint[1].y = (this.knot[1].y - Math.pow(t,2)*this.knot[2].y - Math.pow(1-t,2)*this.knot[0].y)/(2*(1-t)*t);

			return inc_score;
		}
	}
	else if (dec_score < inc_score)
	{
		if (score - dec_score > threshold)
		{
			t -= delta;
			this.t = t;

			this.controlPoint[1].x = (this.knot[1].x - Math.pow(t,2)*this.knot[2].x - Math.pow(1-t,2)*this.knot[0].x)/(2*(1-t)*t);
			this.controlPoint[1].y = (this.knot[1].y - Math.pow(t,2)*this.knot[2].y - Math.pow(1-t,2)*this.knot[0].y)/(2*(1-t)*t);

			return dec_score;
		}
	}

	return score;
};

QuadraticBezier.prototype.calc = function(t, p)
{
	p.x = Math.pow(1-t, 2) * this.controlPoint[0].x + 2*t*(1-t) * this.controlPoint[1].x + Math.pow(t, 2) * this.controlPoint[2].x;
	p.y = Math.pow(1-t, 2) * this.controlPoint[0].y + 2*t*(1-t) * this.controlPoint[1].y + Math.pow(t, 2) * this.controlPoint[2].y;
};

QuadraticBezier.prototype.closest = function(x, y)
{
	var closestID = 0;
	closestDistance = 99999;

	currentDistance = 0;

	for (var i = 0; i < this.knot.length; i++)
	{
		currentDistance = this.knot[i].dist(x, y);
		if (currentDistance < closestDistance)
		{
			closestID = i;
			closestDistance = currentDistance;
		}
	}

	return closestID;
};






function Point(x, y)
{
	this.x = x;
	this.y = y;
}

Point.prototype.draw = function()
{
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI*2, true);
    ctx.fill();
};

Point.prototype.dist = function(x, y)
{
	return Math.sqrt( Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2) );
};

Point.prototype.moveTo = function(x, y)
{
    this.x = x;
    this.y = y;
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
	if (Mouse.holding) {
		QBCurve.knot[Mouse.objHeld].moveTo(Mouse.x, Mouse.y);
    }
}, false);

cvs.addEventListener('mousedown', function(evt)
{
    var cID = QBCurve.closest(Mouse.x, Mouse.y);

    if (QBCurve.knot[cID].dist(Mouse.x, Mouse.y) < 20)
    {
        Mouse.holding = true;
        Mouse.objHeld = cID;
    }

    if (Mouse.holding)
    {
    	QBCurve.knot[cID].moveTo(Mouse.x, Mouse.y);
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













// Global variable of all toggle button objects, so that the mouse can check for hovering, and handle it.
var ToggleButtons = new Array();

// Used by anything to create a new toggle button object,
//  returns id, which the calling function can use to access the object through ToggleButtons array.
function Create_ToggleButton(x, y, width, height, text)
{
	var id = ToggleButtons.length;
	ToggleButtons.push(new ToggleButton(x, y, width, height, text, id));

	return id;
}

// Used by anything to destroy a toggle button with a given id.  Silently fails if the id is not valid.
function Destroy_ToggleButton(id)
{
	if (id >= 0 && id < ToggleButtons.length)
	{
		ToggleButtons.splice(id, 1);
	}
}

// Constructor of ToggleButton object, used to create new toggle buttons.
function ToggleButton(x, y, width, height, text, id)
{
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.text = text;

	this.activated = false;
	this.hover = false; // Used for drawing
	this.pressed = false;

	this.id = id; // This button's index inside the global ToggleButtons array.
	// Should be set correctly by NewToggleButton();
}

// Draws this particular button, called by main in a loop of all toggle buttons, to draw all of them.
//  Drawing state depends on whether the button is activated or not.
ToggleButton.prototype.draw = function()
{
	if (Mouse.x > this.x && Mouse.x < this.x + this.width && Mouse.y > this.y && Mouse.y < this.y + this.height)
	{
		this.hover = true;
		if (Mouse.down == true)
		{
			this.pressed = true;
		}
		else if (Mouse.down == false)
		{
			if (this.pressed == true)
			{
				// Mouse was pressed, now it's still hovering, but it's not pressing.  Ergo, a click!
				this.toggle();
			}


			this.pressed = false;
		}
	}
	else
	{
		this.hover = false;
		this.pressed = false;
	}

	if (this.hover == false)
	{
		ctx.fillStyle = 'lightgrey';
	}
	else if (this.hover == true)
	{
		if (this.pressed == false)
		{
			ctx.fillStyle = 'silver';
		}
		else if (this.pressed == true)
		{
			ctx.fillStyle = 'grey';
		}
	}

	if (this.activated)
	{
		ctx.fillStyle = "lightgreen";
	}

	ctx.beginPath();
	ctx.rect(this.x, this.y, this.width, this.height);
	ctx.fill();
	ctx.lineWidth = 1;
	ctx.strokeStyle = 'black';
	ctx.stroke();

	ctx.font = "10px Verdana";
	ctx.fillStyle = "black";
	ctx.fillText(this.text, this.x + 10, this.y + this.height/1.6);
};

// Called by anything to see if the button is active or not.
ToggleButton.prototype.isActivated = function()
{
	return this.activated;
};

// Called by the Mouse singleton to "toggle" the activation state.
ToggleButton.prototype.toggle = function()
{
	if (this.activated == false)
	{
		this.activated = true;
	}
	else if (this.activated == true)
	{
		this.activated = false;
	}
};

init();