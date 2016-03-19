

var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

var HCurve;

var dataPoint = new Array();

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);



// Initializes the bezier curve with 4 points, and a sampling rate
// of 100 lines per draw.
function init()
{
	var samplingRate = 100;

	var C1 = new Point(100, 300);
	var C2 = new Point(250, 100);
	var C3 = new Point(400, 300);

	var D1 = new Point(100, 300, "red", 50);
	var D2 = new Point(250, 100, "red", 50);
	var D3 = new Point(400, 300, "red", 50);

	var optimize_button = Create_ToggleButton(20, 50, 70, 25, "Optimize");
	var smooth_slider = Create_Slider(20, 80, 70, 20, "Smoothness", 10, 0.01, 1, 1);

	BCurve = new Bezier([C1, C2, C3], samplingRate, optimize_button, smooth_slider);


	dataPoint = [D1, D2, D3];
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	BCurve.draw();

	for (var i = 0; i < dataPoint.length; i++)
	{
		dataPoint[i].draw();
	}
//	ctx.fillText("10 choose 5 = " + binom(10, 5), 20, 20);

	for (var i = 0; i < ToggleButtons.length; i++)
	{
		ToggleButtons[i].draw();
	}

	for (var i = 0; i < Sliders.length; i++)
	{
		Sliders[i].draw();
	}

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



















// The Bezier curve as it is implemented has a dynamic number of control points,
// a sampling rate, (for purposes of drawing and arc length), and an internal array
// that maps the parameter t onto arc length.
function Bezier(points, samples, optimize_button_id, smooth_slider_id)
{
	this.controlPoint = points; // 'controlPoint' is an array
	this.samples = samples;
	this.arcLength = new Array(this.samples);
	this.samplesX = new Array(this.samples);
	this.samplesY = new Array(this.samples);

	this.smoothness = 1;

	// This is a button which turns the optimization feature on/off
	this.optimize_button_id = optimize_button_id;

	// This is a slider which has the "smoothness" parameter
	this.smooth_slider_id = smooth_slider_id;
}

Bezier.prototype.draw = function()
{

	this.smoothness = Sliders[this.smooth_slider_id].getValue();

	var active = ToggleButtons[this.optimize_button_id].isActivated();

	Sliders[this.smooth_slider_id].setActive(active);

	if (active)
	{
		this.optimize();
	}


	// Draw each control point
	for (var i = 0; i < this.controlPoint.length; i++)
	{
		this.controlPoint[i].draw();
	}

	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.moveTo(this.controlPoint[0].x, this.controlPoint[0].y);

	var p = new Point(this.controlPoint[0].x, this.controlPoint[0].y);
	var p_old = new Point(0, 0);
	var totalLength = 0;

	this.samplesX[0] = this.controlPoint[0].x;
	this.samplesY[0] = this.controlPoint[0].y;

	// Draw lines between each sample
	for (var i = 1; i <= this.samples; i++)
	{
		p_old.x = p.x;
		p_old.y = p.y;

		this.calc(i/this.samples, p);

		this.samplesX[i] = p.x;
		this.samplesY[i] = p.y;

		totalLength += p.dist(p_old.x, p_old.y);
		this.arcLength[i] = totalLength;

		ctx.lineTo(p.x, p.y);
	}

	ctx.stroke();

	// Draw points at each sampling point.
	var p = new Point(0, 0, "purple", 0, 1);
	this.calc(0, p);

	p.draw();

	for (var i = 0; i <= this.samples; i++)
	{
		p.x = this.samplesX[i];
		p.y = this.samplesY[i];

		p.draw();
	}

	// Draw lines between data points and sample points
	for (var i = 0; i < this.controlPoint.length; i++)
	{
		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(this.controlPoint[i].x, this.controlPoint[i].y);
		ctx.lineTo(dataPoint[i].x, dataPoint[i].y);
		ctx.stroke();
	}

	// Draw minimal lines between each data point, and the curve.
	var min_index = 0;
	var min_point = new Point(0, 0, "blue", 5, 0);

	for (var i = 0; i < this.controlPoint.length; i++)
	{
		min_index = this.mindist(dataPoint[i]);

		min_point.x = this.samplesX[min_index];
		min_point.y = this.samplesY[min_index];

		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(dataPoint[i].x, dataPoint[i].y);
		ctx.lineTo(min_point.x, min_point.y);
		ctx.stroke();

		min_point.draw();
	}


/* TODO: Fix drawTick code for generalized curves
	var n = 7; // # of t parameter ticks

	for (var i = 1; i <= n; i++)
	{
		this.drawTick(i/(n+1), 5, p);
	}
*/

//	ctx.fillText("Arc Length: " + Math.round(totalLength) + "px", 20, 20);

	ctx.fillStyle = "black";

	var ydraw = 20;

	ctx.fillText("Score: " + (this.score()).toFixed(2), 20, ydraw);


/*
	ctx.fillStyle = "black";
	ctx.fillText("Coefficient Points:", 20, 20);

	var ydraw = 20+15;

	var x = 0;
	var y = 0;

	for (var i = 0; i < BCurve.controlPoint.length; i++)
	{
		x = this.controlPoint[i].x;
		y = this.controlPoint[i].y;

		ctx.fillText("" + i + ": (" + x + ", " + y + ")", 20, ydraw);
		ydraw += 15;
	}

	ydraw += 15;

	ctx.fillText("Data Points:", 20, ydraw);

	ydraw += 15;

	for (var i = 0; i < BCurve.controlPoint.length; i++)
	{
		x = dataPoint[i].x;
		y = dataPoint[i].y;

		ctx.fillText("" + i + ": (" + x + ", " + y + ")", 20, ydraw);
		ydraw += 15;
	}

	ydraw += 15;

	*/

/*

	ctx.fillText("Curve points:", 20, ydraw);

	ydraw += 15;

	var t = 0;
	var P = new Point(0, 0, "purple");

	for (var i = 0; i <= 10; i++)
	{
		BCurve.calc(t, P);
		x = P.x;
		y = P.y;

		ctx.fillStyle = "black";
		ctx.fillText("t=" + t + ": (" + x + ", " + y + ")", 20, ydraw);
		ydraw += 15;

//		P.draw();
		t += 10;
	}*/

};

Bezier.prototype.score = function()
{
	var score = 0;
	var min_index = 0;
	var min_dist = 0;

	var s = this.smoothness;

	var control_dist = 0;

	var p = new Point();

	// Update the sampled curve
	for (var i = 0; i <= this.samples; i++)
	{
		this.calc(i/this.samples, p);

		this.samplesX[i] = p.x;
		this.samplesY[i] = p.y;
	}

	for (var i = 0; i < dataPoint.length; i++)
	{
		min_index = this.mindist(dataPoint[i]);
		min_dist = dataPoint[i].dist(this.samplesX[min_index], this.samplesY[min_index]);

		control_dist = dataPoint[i].dist(this.controlPoint[i].x, this.controlPoint[i].y);

		score += s*Math.pow(control_dist, 2) + Math.pow(min_dist, 2);
	}

	return score;
};

Bezier.prototype.optimize = function()
{
	for (var i = 0; i < this.controlPoint.length; i++)
	{
		this.controlPoint[i].x += this.optimizePoint(i, 0);
		this.controlPoint[i].y += this.optimizePoint(i, 1);
	}
};

// Specify a point and a component, and this function returns
//  whether it should be moved -1, or 1, in the component given
Bezier.prototype.optimizePoint = function(i, component)
{
	var score_change_needed = -1;
	// When it reaches this close to the minimum, it stops moving.

	var p = this.controlPoint[i];

	var original_val = 0;
	var original_score = this.score();

	var right_score = 0;
	var left_score = 0;

	var right_score_change = 0;
	var left_score_change = 0;

	if (component == 0)
	{
		original_val = p.x;

		p.x = original_val + 1;
		right_score = this.score();

		p.x = original_val - 1;
		left_score = this.score();

		right_score_change = right_score - original_score;
		left_score_change = left_score - original_score;

		if (right_score_change < left_score_change)
		{
			if (right_score_change < score_change_needed)
			{
				return 1;
			}
			else
			{
				return 0;
			}
		}
		else
		{
			if (left_score_change < score_change_needed)
			{
				return -1;
			}
			else
			{
				return 0;
			}
		}
	}
	else if (component == 1)
	{
		original_val = p.y;

		p.y = original_val + 1;
		right_score = this.score();

		p.y = original_val - 1;
		left_score = this.score();

		right_score_change = right_score - original_score;
		left_score_change = left_score - original_score;

		if (right_score_change < left_score_change)
		{
			if (right_score_change < score_change_needed)
			{
				return 1;
			}
			else
			{
				return 0;
			}
		}
		else
		{
			if (left_score_change < score_change_needed)
			{
				return -1;
			}
			else
			{
				return 0;
			}
		}
	}
};

Bezier.prototype.mindist = function(input_p)
{
	var p = new Point();
	var init = false;
	var mindist = 0;
	var dist = 0;
	var minindex = 0;

	for (var i = 0; i <= this.samples; i++)
	{
		p.x = this.samplesX[i];
		p.y = this.samplesY[i];

		if (i == 0)
		{
			mindist = p.dist(input_p.x, input_p.y);
		}
		else
		{
			dist = p.dist(input_p.x, input_p.y);
			if (dist < mindist)
			{
				mindist = dist;
				minindex = i;
			}
		}
	}

	return minindex;
};

// Input a time, and a drawing point, and this function
//  sets that 'drawing point' to the correct position.
Bezier.prototype.calc = function(t, p)
{
	/* Hardy's method (does not work)
	var sumx = 0;
	var sumy = 0;

	var b = 50;

	var control_x = 0;
	var control_y = 0;

	// Loop through all of the data and control points.
	for (var i = 0; i < this.controlPoint.length; i++)
	{

		// This 'normalizes' the control points into a smaller range.
		control_x = (this.controlPoint[i].x - dataPoint[i].x)/50;
		control_y = (this.controlPoint[i].y - dataPoint[i].y)/50;

		sumx += control_x * Math.sqrt(Math.pow(t-dataPoint[i].x, 2) + b);
		sumy += control_y * Math.sqrt(Math.pow(t-dataPoint[i].y, 2) + b);
	}

	p.x = sumx;
	p.y = sumy;
	*/

	var n = this.controlPoint.length - 1; // 1
	var delta = 0;
	var x = 0;
	var y = 0;
	for (var i = 0; i <= n; i++)
	{
		delta = binom(n, i)*Math.pow(1-t, n-i)*Math.pow(t, i);
		x += delta * this.controlPoint[i].x;
		y += delta * this.controlPoint[i].y;
	}

	p.x = x;
	p.y = y;
};




/*
QuadraticBezier.prototype.drawTick = function(t, l, p)
{
	this.calc(t, p);

	var A = this.controlPoint[0].x;
	var B = this.controlPoint[0].y;
	var C = this.controlPoint[1].x;
	var D = this.controlPoint[1].y;
	var E = this.controlPoint[2].x;
	var F = this.controlPoint[2].y;
	var S = t;

	var x = p.x - (-l) / (2*Math.sqrt(Math.pow(-A+C+t*(A-2*C+E), 2)+Math.pow(-B+D+t*(B-2*D+F), 2))) * (t*(2*B-4*D+2*F) + (2*D-2*B));
	var y = p.y + (-l) / (2*Math.sqrt(Math.pow(-A+C+t*(A-2*C+E), 2)+Math.pow(-B+D+t*(B-2*D+F), 2))) * (t*(2*A-4*C+2*E) + (2*C-2*A));

	var x2 = p.x - (l) / (2*Math.sqrt(Math.pow(-A+C+t*(A-2*C+E), 2)+Math.pow(-B+D+t*(B-2*D+F), 2))) * (t*(2*B-4*D+2*F) + (2*D-2*B));
	var y2 = p.y + (l) / (2*Math.sqrt(Math.pow(-A+C+t*(A-2*C+E), 2)+Math.pow(-B+D+t*(B-2*D+F), 2))) * (t*(2*A-4*C+2*E) + (2*C-2*A));

	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x2, y2);
	ctx.stroke();
};
*/

// Used by the mouse interactivity code to find the closest
// control point from any coordinates (mouse coordinates)
Bezier.prototype.closest = function(x, y)
{
	var closestID = 0;
	closestDistance = 99999;

	currentDistance = 0;

	for (var i = 0; i < this.controlPoint.length; i++)
	{
		currentDistance = this.controlPoint[i].dist(x, y);
		if (currentDistance < closestDistance)
		{
			closestID = i;
			closestDistance = currentDistance;
		}
	}

	for (var i = 0; i < dataPoint.length; i++)
	{
		currentDistance = dataPoint[i].dist(x, y);
		if (currentDistance < closestDistance)
		{
			closestID = -(i+1);
			closestDistance = currentDistance;
		}
	}

	return closestID;
};


// Takes a point index as a parameter, and splices that
// point away (It reindexes the point array).
Bezier.prototype.removePoint = function(pID)
{
	this.controlPoint.splice(pID, 1);
};

// Takes a point as a parameter, and adds that to the
// end of the controlPoint array.
Bezier.prototype.appendPoint = function(p)
{
	this.controlPoint.push(p);
};
















function Point(x, y, color = "black", circle = 0, radius = 5)
{
	this.x = x;
	this.y = y;
	this.color = color;
	this.circle = circle;
	this.radius = radius;
}

Point.prototype.draw = function()
{
	ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, true);
    ctx.fill();

    if (this.circle > 0)
    {
    	ctx.strokeStyle = this.color;
    	ctx.beginPath();
    	ctx.arc(this.x, this.y, this.circle, 0, Math.PI*2);
    	ctx.stroke();
    }
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

Slider.prototype.setActive = function(activated)
{
	this.activated = activated;
};

Slider.prototype.getValue = function()
{
	return this.value;
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
    var closest_p;
    var cID = Mouse.objHeld;

    if (cID >= 0)
    {
    	closest_p = BCurve.controlPoint[cID];
    }
    else if (cID < 0)
    {
    	closest_p = dataPoint[-(cID+1)];
    }

	Mouse.updatePos(evt)
	if (Mouse.holding) {
		closest_p.moveTo(Mouse.x, Mouse.y);
    }
}, false);

cvs.addEventListener('mousedown', function(evt)
{
    var cID = BCurve.closest(Mouse.x, Mouse.y);

    var closest_p;

    if (cID >= 0)
    {
    	closest_p = BCurve.controlPoint[cID];
    }
    else if (cID < 0)
    {
    	closest_p = dataPoint[-(cID+1)];
    }

    if (closest_p.dist(Mouse.x, Mouse.y) < 20)
    {
        Mouse.holding = true;
        Mouse.objHeld = cID;
    }

    if (Mouse.holding)
    {
    	closest_p.moveTo(Mouse.x, Mouse.y);
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
	var mx = Mouse.x;
	var my = Mouse.y;

	var cID = BCurve.closest(mx, my);
	var closest_p;

	if (cID < 0)
	{
		cID = -(cID+1);
		closest_p = dataPoint[cID];
	}
	else
	{
		closest_p = BCurve.controlPoint[cID];
	}



	if (closest_p.dist(mx, my) < 20)
	{
		BCurve.removePoint(cID);
		dataPoint.splice(cID, 1);
	}
	else
	{
		var p = new Point(mx, my);
		BCurve.appendPoint(p);

		var p2 = new Point(mx, my, "red", 50);
		dataPoint.push(p2);
	}
}, false);






init();