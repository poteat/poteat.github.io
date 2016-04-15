

var fps = 60;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();
var BSpline;

clearInterval(mainloop);
var mainloop = setInterval("main();",1000/fps);

function init()
{
	degree_slider_id = Create_Slider(330, 20, 150, 20, "Degree k", 1, 1, 3, 0);
	knot_slider_id = Create_Slider(20, 460, 460, 20, "Knot Vector", 7, 0, 1, 2);
	
	BSpline = new BSpline(degree_slider_id, knot_slider_id);
	BSpline.appendPoint(100, 400);
	BSpline.appendPoint(150, 100);
	BSpline.appendPoint(200, 400);
	BSpline.appendPoint(250, 90);
	BSpline.appendPoint(300, 410);
	BSpline.appendPoint(350, 80);
	BSpline.appendPoint(400, 420);

	Sliders[degree_slider_id].value[0] = 1.75;
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	BSpline.draw();

	for (var i = 0; i < Sliders.length; i++)
	{
		Sliders[i].draw();
	}
}













function BSpline(degree_slider_id, knot_slider_id)
{
	this.degree_slider_id = degree_slider_id;
	this.knot_slider_id = knot_slider_id;

	this.degree = Math.round(Sliders[this.degree_slider_id].value[0]);

	this.controlPoint = new Array();
	this.drawPoint = new Array();
}

BSpline.prototype.draw = function()
{
	// Draw each control point.
	for (var i = 0; i < this.controlPoint.length; i++)
	{
		this.controlPoint[i].draw();
	}

	// If we detect a change in degree, update the knot vector.
	var new_degree = Math.round(Sliders[this.degree_slider_id].value[0]);
	if (new_degree != this.degree)
	{
		this.degree = new_degree;
		this.resetKnots();
	}

	this.getKnots();

	ctx.beginPath();

	var p = new Point(0, 0);

	var clip = this.degree;

	this.calc(this.knot[clip], p);

	ctx.moveTo(p.x, p.y);

	var samples = 500;

	for (var i = 0; i < samples; i++)
	{
		var t = this.knot[clip] + i*(this.knot[this.controlPoint.length + this.degree - clip] - this.knot[clip])/samples;
		this.calc(t, p);
		ctx.lineTo(p.x, p.y);
	}

	ctx.stroke();

};

BSpline.prototype.calc = function(t, p)
{
	var sumx = 0;
	var sumy = 0;

	for (var i = 0; i < this.controlPoint.length; i++)
	{
		var mul = this.N(i, this.degree, t);
		sumx += this.controlPoint[i].x * mul;
		sumy += this.controlPoint[i].y * mul;
	}

	p.x = sumx;
	p.y = sumy;
};

BSpline.prototype.N = function(i, j, t)
{
	if (j == 0)
	{
		if (this.knot[i] <= t && t < this.knot[i+1])
		{
			return 1;
		}
		else
		{
			return 0;
		}
	}

	var frac1 = (t - this.knot[i])/(this.knot[i+j] - this.knot[i] + .00000000000001);
	var frac2 = (this.knot[i+j+1] - t)/(this.knot[i+j+1] - this.knot[i+1] + .00000000000001);

	var result = frac1*this.N(i, j-1, t) + frac2*this.N(i+1, j-1, t);

	return result;
};

BSpline.prototype.appendPoint = function(x, y)
{
	var p = new Point(x, y);
	this.controlPoint[this.controlPoint.length] = p;

	this.resetKnots();
};

BSpline.prototype.removePoint = function(cID)
{
	this.controlPoint.splice(cID, 1);

	this.resetKnots();
};

BSpline.prototype.getKnots = function()
{
	var length = this.controlPoint.length + this.degree + 1;
	this.knot = new Array(length);

	this.knot[0] = 0;

	for (var i = 1; i < length - 1; i++)
	{
		this.knot[i] = Sliders[this.knot_slider_id].value[i - 1];
	}

	this.knot[length - 1] = 1;

	// Sort the knots, to prevent error from unordered knot vector
	this.knot.sort(function(a,b){return a - b});
};

BSpline.prototype.resetKnots = function()
{
	Sliders[this.degree_slider_id].setMax(this.controlPoint.length - 1);

	this.degree = Math.round(Sliders[this.degree_slider_id].value[0]);

	var num_of_bars = this.controlPoint.length + this.degree - 1;

	Sliders[knot_slider_id].normalize(num_of_bars);
};

BSpline.prototype.closest = function(obj)
{
	var closestID = -1;
	closestDistance = 999999;
	currentDistance = 0;

	for (var i = 0; i < this.controlPoint.length; i++)
	{
		currentDistance = this.controlPoint[i].dist(obj);
		if (currentDistance < closestDistance)
		{
			closestID = i;
			closestDistance = currentDistance;
		}
	}

	return closestID;
};















var Sliders = new Array();

function Create_Slider(x, y, width, height, text, num_of_bars, min_val, max_val, precision)
{
	var id = Sliders.length;
	Sliders.push(new Slider(x, y, width, height, text, num_of_bars, min_val, max_val, precision, id));

	return id;
}

function Slider(x, y, width, height, text, num_of_bars, min_val, max_val, precision, id)
{
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.text = text;
	this.min_val = min_val;
	this.max_val = max_val;

	this.activated = false;

	this.normalize(num_of_bars);
	this.held = new Array(num_of_bars);

	this.holding = false;

	

	this.bar_width = 10;

	this.precision = precision;

	this.id = id;
}

Slider.prototype.draw = function()
{
	// Draw entire box
	ctx.beginPath();
	ctx.rect(this.x, this.y, this.width, this.height);
	ctx.fillStyle = "silver";
	ctx.fill();
	ctx.lineWidth = 1;
	ctx.strokeStyle = 'black';
	ctx.stroke();

	// Draw integer backgrounds, if is an integer slider
	if (this.precision == 0)
	{
		ctx.beginPath();
		for (var i = 1; i < this.max_val; i++)
		{
			var x = this.x + (i)/(this.max_val) * this.width;
			ctx.moveTo(x, this.y);
			ctx.lineTo(x, this.y + this.height);
		}
		ctx.stroke();
	}

	for (var i = 0; i < this.setting.length; i++)
	{
		var box_xpos = this.x + this.setting[i]*(this.width - this.bar_width);
		var box_ypos = this.y;

		var box_width = this.bar_width;
		var box_height = this.height;

		var box_right = box_xpos + box_width;
		var box_bottom = box_ypos + box_height;

		this.value[i] = this.min_val + this.setting[i]*(this.max_val - this.min_val);

		if (this.held[i])
		{
			var setting = (Mouse.x - this.x - box_width/2) / (this.width - box_width);
			if (setting >= 0 && setting <= 1)
			{
				this.setting[i] = setting;
			}
			else if (setting < 0)
			{
				this.setting[i] = 0;
			}
			else if (setting > 1)
			{
				this.setting[i] = 1;
			}
		}

		if (Mouse.x > box_xpos && Mouse.x < box_right && Mouse.y > box_ypos && Mouse.y < box_bottom)
		{
			var hover = true;

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
				if (this.holding == false)
				{
					this.held[i] = true;
					this.holding = true;
				}
			}
			else if (Mouse.down != true)
			{
				this.held[i] = false;
				this.holding = false;
			}
		}
		else
		{
			var hover = false

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
				this.held[i] = false;
				this.holding = false;
			}
		}

		ctx.beginPath();
		ctx.rect(box_xpos, box_ypos, box_width, box_height);
		ctx.fill();
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'black';
		ctx.stroke();

		ctx.fillStyle = "black";

		var x_offset = 2 - 4*this.precision;

		ctx.fillText("" + (this.value[i]).toFixed(this.precision), box_xpos + x_offset, this.y - 3);
	}

	ctx.fillStyle = "black";
	ctx.fillText(this.text, this.x, this.y + 10 + this.height);
};

Slider.prototype.setActive = function(activated)
{
	this.activated = activated;
};

Slider.prototype.setMax = function(max_val)
{
	if (max_val <= 1)
	{
		max_val = 1.0001;
	}

	this.max_val = max_val;

	for (var i = 0; i < this.setting.length; i++)
	{
		if (this.value[i] > this.max_val)
		{
			this.value[i] = this.max_val;
		}
		else if (this.value[i] < this.min_val)
		{
			this.value[i] = this.min_val;
		}

		this.setting[i] = (this.value[i] - this.min_val)/(this.max_val - this.min_val);
	}
};

Slider.prototype.normalize = function(num_of_bars)
{
	if (num_of_bars < 0)
	{
		num_of_bars = 0;
	}

	this.setting = new Array(num_of_bars);
	this.value = new Array(num_of_bars);

	for (i = 0; i < this.value.length; i++)
	{
		this.setting[i] = (i+1)/(this.value.length+1);
		this.value[i] = this.setting[i]*(this.max_val - this.min_val);
	}
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

Point.prototype.dist = function(obj)
{
	return Math.sqrt( Math.pow(this.x - obj.x, 2) + Math.pow(this.y - obj.y, 2) );
};

Point.prototype.moveTo = function(obj)
{
    this.x = obj.x;
    this.y = obj.y;
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
		BSpline.controlPoint[Mouse.objHeld].moveTo(Mouse);
    }
}, false);

cvs.addEventListener('mousedown', function(evt)
{
    var cID = BSpline.closest(Mouse);

    if (cID >= 0)
    {
    	if (BSpline.controlPoint[cID].dist(Mouse) < 20)
	    {
	        Mouse.holding = true;
	        Mouse.objHeld = cID;
	    }

	    if (Mouse.holding)
	    {
	    	BSpline.controlPoint[cID].moveTo(Mouse);
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
	var cID = BSpline.closest(Mouse);

	if (cID >= 0)
	{
		if (BSpline.controlPoint[cID].dist(Mouse) < 20)
		{
			BSpline.removePoint(cID);
		}
		else
		{
			BSpline.appendPoint(Mouse.x, Mouse.y);
		}
	}
	else
	{
		BSpline.appendPoint(Mouse.x, Mouse.y);
	}
}, false);

init();