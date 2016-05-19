

var fps = 10;
var fov = 250;

var yaw = 0;
var pitch = 0;
var zoom = 1;

var density_threshold = 0.65;

var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var Mouse = new Mouse();

var DMap;
var dataView;

var Polynomial_Fit;

var mainloop;
clearInterval(mainloop);


function init()
{
	loadServerMRC("density_map.mrc");

	var optimize_button_id = Create_ToggleButton(450, 20, 120, 25, "Optimize Plane");
	var optimize_button_id_2 = Create_ToggleButton(450, 50, 120, 25, "Optimize Curvature");


	var A_x_id = Create_Slider(20, 20, 70, 20, "A_x", 10, -5, 5, 3);
	var B_x_id = Create_Slider(100, 20, 70, 20, "B_x", 10, -5, 5, 3);
	var C_x_id = Create_Slider(180, 20, 70, 20, "C_x", 10, -5, 5, 1);
	var D_x_id = Create_Slider(260, 20, 70, 20, "D_x", 10, -.2, .2, 0);
	var E_x_id = Create_Slider(340, 20, 70, 20, "E_x", 10, -.2, .2, 0);

	var A_y_id = Create_Slider(20, 50, 70, 20, "A_y", 10, -5, 5, -3);
	var B_y_id = Create_Slider(100, 50, 70, 20, "B_y", 10, -5, 5, 3);
	var C_y_id = Create_Slider(180, 50, 70, 20, "C_y", 10, -5, 5, 1);
	var D_y_id = Create_Slider(260, 50, 70, 20, "D_y", 10, -.2, .2, 0);
	var E_y_id = Create_Slider(340, 50, 70, 20, "E_y", 10, -.2, .2, 0);

	var A_z_id = Create_Slider(20, 80, 70, 20, "A_z", 10, -5, 5, 3);
	var B_z_id = Create_Slider(100, 80, 70, 20, "B_z", 10, -5, 5, 3);
	var C_z_id = Create_Slider(180, 80, 70, 20, "C_z", 10, -5, 5, 3);
	var D_z_id = Create_Slider(260, 80, 70, 20, "D_z", 10, -.2, .2, 0);
	var E_z_id = Create_Slider(340, 80, 70, 20, "E_z", 10, -.2, .2, 0);

	var array_of_sliders = [A_x_id, B_x_id, C_x_id, D_x_id, E_x_id, A_y_id, B_y_id, C_y_id, D_y_id, E_y_id, A_z_id, B_z_id, C_z_id, D_z_id, E_z_id];

	Polynomial_Fit = new Polynomial("blue", optimize_button_id, optimize_button_id_2, array_of_sliders);
	Polynomial_Fit.generatePoints();
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	// Print metadata
	ctx.fillStyle = "black";/*
	Object.keys(DMap).forEach(function(key, i)
	{
		ctx.fillText(key + ": " + eval("DMap."+key), 15, 15 + i*15);
	    // key: the name of the object key
	    // index: the ordinal position of the key within the object 
	});
*/
	DMap.draw();

	Polynomial_Fit.draw();

	for (var i = 0; i < ToggleButtons.length; i++)
	{
		ToggleButtons[i].draw();
	}

	for (var i = 0; i < Sliders.length; i++)
	{
		Sliders[i].draw();
	}

	var score = Polynomial_Fit.score();

	ctx.fillStyle = "black";
	ctx.fillText("Score: " + score, 400, 10);

	ctx.fillText("Structure points: " + DMap.structure.length, 20, 120);
	ctx.fillText("Polynomial points: " + Polynomial_Fit.structure.length, 20, 140);
	ctx.fillText("Distance comparisons per step: " + DMap.structure.length*Polynomial_Fit.structure.length, 20, 160);

}

// Loads a MRC file (or any binary file) located on the web server.
// It then populates a Density Map object with the corresponding data.
function loadServerMRC(file)
{
	var oReq = new XMLHttpRequest();
	oReq.open("GET", "/" + file, true);
	oReq.responseType = "arraybuffer";

	oReq.onload = function (oEvent)
	{
		var arrayBuffer = oReq.response; // Note: not oReq.responseText
		if (arrayBuffer)
		{
			var byteArray = new Uint8Array(arrayBuffer);

			dataView = new DataView(arrayBuffer);

			DMap = new DensityMap();

			mainloop = setInterval("main();",1000/fps);

//			window.alert(DMap.gamma);

//			for (var i = 0; i < byteArray.byteLength; i++)
//			{
//				window.alert(byteArray[i]);
//	    	}
		}
	};

	oReq.send(null);
}







































document.getElementById('density_threshold').addEventListener('change', changeDensity, false);

function changeDensity(evt)
{
	density_threshold = evt.target.value;

	DMap = new DensityMap();
}

document.getElementById('mrc_file').addEventListener('change', loadLocalMRC, false);

function loadLocalMRC(evt)
{
	var file = evt.target.files[0];

	var fileReader = new FileReader();

	fileReader.readAsArrayBuffer(file);

	fileReader.onload = function (oEvent)
	{
		var arrayBuffer = oEvent.target.result;
		if (arrayBuffer)
		{
			var byteArray = new Uint8Array(arrayBuffer);

			dataView = new DataView(arrayBuffer);

			DMap = new DensityMap();

//			mainloop = setInterval("main();",1000/fps);

//			window.alert(DMap.gamma);

//			for (var i = 0; i < byteArray.byteLength; i++)
//			{
//				window.alert(byteArray[i]);
//	    	}
		}
	};
}


function readInt(i)
{
	i *= 4;
	return dataView.getInt32(i, true);
}

function readFloat(i)
{
	i *= 4;
	return dataView.getFloat32(i, true);
}


function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}


function DensityMap()
{
	this.nx = readInt(0);
	this.ny = readInt(1);
	this.nz = readInt(2);
	this.mode = readInt(3);

	this.nxstart = readInt(4);
	this.nystart = readInt(5);
	this.nzstart = readInt(6);

	this.mx = readInt(7);
	this.my = readInt(8);
	this.mz = readInt(9);

	this.xlength = readFloat(10);
	this.ylength = readFloat(11);
	this.zlength = readFloat(12);

	this.alpha = readFloat(13);
	this.beta = readFloat(14);
	this.gamma = readFloat(15);

	this.mapc = readInt(16);
	this.mapr = readInt(17);
	this.maps = readInt(18);

	this.amin = readFloat(19);
	this.amax = readFloat(20);
	this.amean = readFloat(21);

	this.ispg = readInt(22);
	this.nsymbt = readInt(23);

	// Extra 29 ints of storage space

	this.xorigin = readFloat(23+29+1);
	this.yorigin = readFloat(23+29+2);

	this.nlabl = readInt(23+29+3);

	voxel = createArray(this.nx, this.ny, this.nz);

	var x_avg = 0;
	var y_avg = 0;
	var z_avg = 0;

	var num = 0;

	for (var z = 0; z < this.nz; z++)
	{
		for (var y = 0; y < this.ny; y++)
		{
			for (var x = 0; x < this.nx; x++)
			{
				var density = readFloat(256 + (z*this.nx*this.ny + y*this.nx + x));
				if (density > density_threshold)
				{
					num++;

					x_avg += x;
					y_avg += y;
					z_avg += z;
				}
			}
		}
	}

	x_avg /= num;
	y_avg /= num;
	z_avg /= num;

	this.structure = new Array(); // Immutable data points
	this.points = new Array(); // Points in camera space

	for (var z = 0; z < this.nz; z++)
	{
		for (var y = 0; y < this.ny; y++)
		{
			for (var x = 0; x < this.nx; x++)
			{
				var density = readFloat(256 + (z*this.nx*this.ny + y*this.nx + x));
				if (density > density_threshold)
				{
					var scale = 5;
					var p = new Point((x - x_avg)*scale, (y - y_avg)*scale, (z - z_avg)*scale);
					this.structure.push(p);
					this.points.push(p);
				}
			}
		}
	}

}

DensityMap.prototype.draw = function()
{


	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i].draw();
	}


};















function Polynomial(color = "blue", optimize_button_id, optimize_button_id_2, array_of_sliders)
{
	this.controlValues = [];

	this.dimensions = 0;

	for (var i = 0; i < array_of_sliders.length; i++)
	{
		this.controlValues[i] = Sliders[array_of_sliders[i]].getValue();
	}

	this.color = color;

	this.structure = new Array(); // Array of immutable points

	this.points = new Array(); // Array of points in camera space

	this.optimize_button_id = optimize_button_id; // This controls whether we do an automatic fit.

	this.optimize_button_id_2 = optimize_button_id_2;

	// These sliders control the current shape of the Polynomial.
	this.sliders_array = array_of_sliders;
}

Polynomial.prototype.generatePoints = function()
{
	var size = 10;
	var step = 1;

	var x_offset = 0;
	var y_offset = 5;
	var z_offset = 10;

	var x;
	var y;
	var z;

	var p_i = 0;

	var t_i = 0;

	for (var t = -size; t <= size; t += step)
	{
		for (var u = -size; u <= size; u += step)
		{
			x = this.controlValues[x_offset + 0]*t + this.controlValues[x_offset + 1]*u + this.controlValues[x_offset + 2] + this.controlValues[x_offset + 3]*Math.pow(t,2) + + this.controlValues[x_offset + 4]*Math.pow(u,2);
			y = this.controlValues[y_offset + 0]*t + this.controlValues[y_offset + 1]*u + this.controlValues[y_offset + 2] + this.controlValues[y_offset + 3]*Math.pow(t,2) + + this.controlValues[y_offset + 4]*Math.pow(u,2);
			z = this.controlValues[z_offset + 0]*t + this.controlValues[z_offset + 1]*u + this.controlValues[z_offset + 2] + this.controlValues[z_offset + 3]*Math.pow(t,2) + + this.controlValues[z_offset + 4]*Math.pow(u,2);
			var p = new Point(x, y, z, this.color);
			this.structure[p_i] = p;
			this.points[p_i] = p;

			p_i++;
		}

		t_i++;
	}

	this.dimensions = t_i;

};

Polynomial.prototype.draw = function()
{
	var active = ToggleButtons[this.optimize_button_id].isActivated();

	var active_2 = ToggleButtons[this.optimize_button_id_2].isActivated();

	for (var j = 0; j < this.sliders_array.length; j++)
	{
		Sliders[this.sliders_array[j]].setActive(active);
	}

	if (active)
	{
		this.optimize();
	}
	else if (active_2)
	{
		this.optimize_curve();
		active = true;
	}

	var changed = false;

	for (var i = 0; i < this.controlValues.length; i++)
	{
		if (this.controlValues[i] != Sliders[this.sliders_array[i]].getValue())
		{
			changed = true;
			break;
		}
	}

	if (changed)
	{
		if (!active) // If optimization is off, take the values from the sliders.
		{
			for (var i = 0; i < this.controlValues.length; i++)
			{
				this.controlValues[i] = Sliders[this.sliders_array[i]].getValue();
			}
		}
		else // If optimization is on, set the sliders to the new values.
		{
			for (var i = 0; i < this.controlValues.length; i++)
			{
				Sliders[this.sliders_array[i]].setValue(this.controlValues[i]);
			}
		}

		this.generatePoints();

		// Rotate newly generated points into camera space.
		for (var i = 0; i < this.points.length; i++)
		{
			this.points[i] = this.points[i].rotateY(yaw);
		}

		for (var i = 0; i < this.points.length; i++)
		{
			this.points[i] = this.points[i].rotateX(pitch);
		}

		for (var i = 0; i < Polynomial_Fit.points.length; i++)
		{
			Polynomial_Fit.points[i] = Polynomial_Fit.points[i].scaleFactor(zoom);
		}

	}
	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i].draw();
	}

	ctx.strokeStyle = "blue";

	ctx.beginPath();

	for (var j = 0; j < this.dimensions; j++)
	{
		ctx.moveTo(this.points[this.dimensions*j].x2d, this.points[this.dimensions*j].y2d);

		for (var i = this.dimensions*j + 1; i < this.dimensions*(j+1); i++)
		{
			ctx.lineTo(this.points[i].x2d, this.points[i].y2d);
		}
	}

	for (var j = 0; j < this.dimensions; j++)
	{
		ctx.moveTo(this.points[j].x2d, this.points[j].y2d);

		for (var i = j; i < this.dimensions*this.dimensions; i += this.dimensions)
		{
			ctx.lineTo(this.points[i].x2d, this.points[i].y2d);
		}
	}


	ctx.stroke();
};

Polynomial.prototype.distance = function(p)
{
	var cur_dist = 0;
	var min_dist = 9999999;
	for (var i = 0; i < this.structure.length; i++)
	{
		cur_dist = p.dist(this.structure[i]);

		if (cur_dist < min_dist)
		{
			min_dist = cur_dist;
		}
	}

	return min_dist;
};

Polynomial.prototype.score = function()
{
	var score = 0;

	for (var i = 0; i < DMap.structure.length; i++)
	{
		score += Math.pow(this.distance(DMap.structure[i]), 2);
	}

	return score;
};

Polynomial.prototype.optimize = function()
{
	var base_score = this.score();
	var cut_off = 50;
	var delta = .025;

	var x_offset = 0;
	var y_offset = 5;
	var z_offset = 10;

	for (var i = x_offset; i < x_offset + 3; i++)
	{
		this.optimizeParameter(i, base_score, cut_off, delta);
	}

	for (var i = y_offset; i < y_offset + 3; i++)
	{
		this.optimizeParameter(i, base_score, cut_off, delta);
	}

	for (var i = z_offset; i < z_offset + 3; i++)
	{
		this.optimizeParameter(i, base_score, cut_off, delta);
	}

};

Polynomial.prototype.optimize_curve = function()
{
	var base_score = this.score();
	var cut_off = 50;
	var delta = .01;

	var x_offset = 0;
	var y_offset = 5;
	var z_offset = 10;

	for (var i = x_offset + 3; i < x_offset + 5; i++)
	{
		this.optimizeParameter(i, base_score, cut_off, delta);
	}

	for (var i = y_offset + 3; i < y_offset + 5; i++)
	{
		this.optimizeParameter(i, base_score, cut_off, delta);
	}

	for (var i = z_offset + 3; i < z_offset + 5; i++)
	{
		this.optimizeParameter(i, base_score, cut_off, delta);
	}

};

Polynomial.prototype.optimizeParameter = function(vector_index, base_score, cut_off, delta)
{
	this.controlValues[vector_index] += delta;

	this.generatePoints();

	var inc_score = this.score();

	this.controlValues[vector_index] -= 2*delta;

	this.generatePoints();

	var dec_score = this.score();

	this.controlValues[vector_index] += delta;

	if (inc_score <= dec_score)
	{
		if (base_score - inc_score > cut_off)
		{
			this.controlValues[vector_index] += delta;
		}
	}
	else if (dec_score < inc_score)
	{
		if (base_score - dec_score > cut_off)
		{
			this.controlValues[vector_index] -= delta;
		}
	}
};











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

Point.prototype.dist = function(p)
{
	return Math.sqrt( Math.pow(this.x - p.x, 2) + Math.pow(this.y - p.y, 2) + Math.pow(this.z - p.z, 2) );
};

Point.prototype.PolynomialDist = function(A, B, C, D)
{
	return Math.abs(A*this.x + B*this.y + C*this.z + D)/Math.sqrt(A*A + B*B + C*C);
};

Point.prototype.moveTo = function(x, y)
{
    this.x = x;
    this.y = y;
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
}

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
}





















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

Slider.prototype.setValue = function(value)
{
	this.value = value;
	this.setting = (this.value - this.min_val)/(this.max_val - this.min_val);
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
		if (changed)
		{
			for (var i = 0; i < DMap.points.length; i++)
			{
				DMap.points[i] = DMap.structure[i].scaleFactor(zoom);
			}

			for (var i = 0; i < Polynomial_Fit.points.length; i++)
			{
				Polynomial_Fit.points[i] = Polynomial_Fit.structure[i].scaleFactor(zoom);
			}
		}


		if (changed)
		{
			delta_pitch = (new_y - old_y)*.006;
			if (pitch + delta_pitch <= 90/180*3.1415 && pitch + delta_pitch >= -90/180*3.1415)
			{
				pitch += delta_pitch;
			}

			for (var i = 0; i < DMap.points.length; i++)
			{
				DMap.points[i] = DMap.points[i].rotateX(pitch);
			}
			for (var i = 0; i < Polynomial_Fit.points.length; i++)
			{
				Polynomial_Fit.points[i] = Polynomial_Fit.points[i].rotateX(pitch);
			}
		}

		if (changed)
		{
			var unpitch = false;
			if (pitch != 0)
			{
				for (var i = 0; i < DMap.points.length; i++)
				{
					DMap.points[i] = DMap.points[i].rotateX(-pitch);
					unpitch = true;
				}
				for (var i = 0; i < Polynomial_Fit.points.length; i++)
				{
					Polynomial_Fit.points[i] = Polynomial_Fit.points[i].rotateX(-pitch);
					unpitch = true;
				}
			}

			delta_yaw = (old_x - new_x)*.006;
			yaw += delta_yaw;
			for (var i = 0; i < DMap.points.length; i++)
			{
				DMap.points[i] = DMap.points[i].rotateY(yaw);
			}

			for (var i = 0; i < Polynomial_Fit.points.length; i++)
			{
				Polynomial_Fit.points[i] = Polynomial_Fit.points[i].rotateY(yaw);
			}

			if (unpitch)
			{
				for (var i = 0; i < DMap.points.length; i++)
				{
					DMap.points[i] = DMap.points[i].rotateX(pitch);
				}

				for (var i = 0; i < Polynomial_Fit.points.length; i++)
				{
					Polynomial_Fit.points[i] = Polynomial_Fit.points[i].rotateX(pitch);
				}
			}
		}

	}

}, false);

cvs.addEventListener('mousedown', function(evt)
{
	Mouse.down = true;

	// Check if the mouse is over any toggle or slider elements
	var hovering = false;

	for (var i = 0; i < ToggleButtons.length; i++)
	{
		if (ToggleButtons[i].hover)
		{
			hovering = true;
			break;
		}
	}

	if (hovering == false)
	{
		for (var i = 0; i < Sliders.length; i++)
		{
			if (Sliders[i].hover)
			{
				hovering = true;
				break;
			}
		}
	}

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

	for (var i = 0; i < DMap.points.length; i++)
	{
		DMap.points[i] = DMap.points[i].scaleFactor(1 + delta*.1);
	}

	for (var i = 0; i < Polynomial_Fit.points.length; i++)
	{
		Polynomial_Fit.points[i] = Polynomial_Fit.points[i].scaleFactor(1 + delta*.1);
	}

	evt.preventDefault();
	return false;
}, false);


init();