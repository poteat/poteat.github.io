

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

var Plane_Fit;

var mainloop;
clearInterval(mainloop);


function init()
{
	loadServerMRC("density_map.mrc");

	var optimize_button_id = Create_ToggleButton(400, 50, 70, 25, "Optimize");
	var slider_alpha_id = Create_Slider(400, 80, 70, 20, "Alpha", 10, -Math.PI, Math.PI, 1);
	var slider_beta_id = Create_Slider(400, 105, 70, 20, "Beta", 10, -Math.PI, Math.PI, -3);
	var slider_delta_id = Create_Slider(400, 130, 70, 20, "Delta", 10, -50, 50, 6);

	Plane_Fit = new Plane(1, -3, 1, 2, "blue", optimize_button_id, slider_alpha_id, slider_beta_id, slider_delta_id);
	Plane_Fit.generatePoints();
}

function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	// Print metadata
	ctx.fillStyle = "black";
	Object.keys(DMap).forEach(function(key, i)
	{
		ctx.fillText(key + ": " + eval("DMap."+key), 15, 15 + i*15);
	    // key: the name of the object key
	    // index: the ordinal position of the key within the object 
	});

	DMap.draw();

	Plane_Fit.draw();

	for (var i = 0; i < ToggleButtons.length; i++)
	{
		ToggleButtons[i].draw();
	}

	for (var i = 0; i < Sliders.length; i++)
	{
		Sliders[i].draw();
	}

	var score = Plane_Fit.score();

	ctx.fillStyle = "black";
	ctx.fillText("Score: " + score, 400, 10);

	// Draw average point (zero)
	/*

	var sum_x = 0;
	var sum_y = 0;
	var sum_z = 0;

	for (var i = 0; i < points.length; i++)
	{
		sum_x += points[i].x;
		sum_y += points[i].y;
		sum_z += points[i].z;
	}

	sum_x /= points.length;
	sum_y /= points.length;
	sum_z /= points.length;

	var p = new Point(sum_x, sum_y, sum_z, "red");
	p.draw();

	*/

/*

	ctx.fillStyle = "black";
	ctx.fillText("A: " + A, 15, 430);

	// Optimization for A


	var epsilon = 0.1;
	var score_epsilon = .1;

	var score_original = 0;
	for (var i = 0; i < points.length; i++)
	{
		score_original += Math.pow(points[i].planeDist(A, B, C, D) ,2);
	}

	var score_plus = 0;
	for (var i = 0; i < points.length; i++)
	{
		score_plus += Math.pow(points[i].planeDist(A + epsilon, B, C, D) ,2);
	}

	var score_minus = 0;
	for (var i = 0; i < points.length; i++)
	{
		score_minus += Math.pow(points[i].planeDist(A - epsilon, B, C, D) ,2);
	}

	if (score_original - score_plus >= score_epsilon)
	{
		A += epsilon;
	}
	else if (score_original - score_minus >= score_epsilon)
	{
		A -= epsilon;
	}

*/

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















function Plane(A, B, C, D, color = "blue", optimize_button_id, slider_alpha_id, slider_beta_id, slider_delta_id)
{
	this.A = A;
	this.B = B;
	this.C = C;
	this.D = D;
	this.color = color;

	this.structure = new Array(); // Array of immutable points

	this.points = new Array(); // Array of points in camera space

	this.optimize_button_id = optimize_button_id; // This controls whether we do an automatic fit.

	// These sliders control the current shape of the plane.
	this.slider_alpha_id = slider_alpha_id;
	this.slider_beta_id = slider_beta_id;
	this.slider_delta_id = slider_delta_id;
}

Plane.prototype.generatePoints = function()
{
	this.structure = this.structure.splice(0, 0);
	this.points = this.points.splice(0, 0);

	this.A = Math.sin(this.alpha)*Math.cos(this.beta);
	this.B = Math.sin(this.alpha)*Math.sin(this.beta);
	this.C = Math.cos(this.alpha);
	this.D = this.delta;

	var max_array = [this.A, this.B, this.C];
	var max_i = 0;
	var max_val = 0;
	for (var i = 0; i < max_array.length; i++)
	{
		if (Math.abs(max_array[i]) > max_val)
		{
			max_val = Math.abs(max_array[i]);
			max_i = i;
		}
	}

	if (max_i == 0)
	{
		var size = 100;
		for (var y = -size; y <= size; y += 10)
		{
			for (var z = -size; z <= size; z += 10)
			{
				var x = (-this.D - this.B*y - this.C*z)/this.A;
				var p = new Point(x, y, z, this.color);
				this.structure.push(p);
				this.points.push(p);
			}
		}
	}	
	else if (max_i == 1) // If 'B' is the highest term, generate y-vals
	{
		var size = 100;
		for (var x = -size; x <= size; x += 10)
		{
			for (var z = -size; z <= size; z += 10)
			{
				var y = (-this.D - this.A*x - this.C*z)/this.B;
				var p = new Point(x, y, z, this.color);
				this.structure.push(p);
				this.points.push(p);
			}
		}
	}
	else if (max_i == 2) // If 'C' is the highest term, generate z-vals
	{
		var size = 100;
		for (var x = -size; x <= size; x += 10)
		{
			for (var y = -size; y <= size; y += 10)
			{
				var z = (-this.D - this.A*x - this.B*y)/this.C;
				var p = new Point(x, y, z, this.color);
				this.structure.push(p);
				this.points.push(p);
			}
		}
	}

};

Plane.prototype.draw = function()
{
	var active = ToggleButtons[this.optimize_button_id].isActivated();

	Sliders[this.slider_alpha_id].setActive(active);
	Sliders[this.slider_beta_id].setActive(active);
	Sliders[this.slider_delta_id].setActive(active);

	if (active)
	{
		this.optimize();


	}


	if (this.alpha != Sliders[this.slider_alpha_id].getValue() ||
		this.beta != Sliders[this.slider_beta_id].getValue() ||
		this.delta != Sliders[this.slider_delta_id].getValue())
	{
		if (!active) // If optimization is off, take the values from the sliders.
		{
			this.alpha = Sliders[this.slider_alpha_id].getValue();
			this.beta = Sliders[this.slider_beta_id].getValue();
			this.delta = Sliders[this.slider_delta_id].getValue();
		}
		else // If optimization is on, set the sliders to the new values.
		{
			Sliders[this.slider_alpha_id].setValue(this.alpha);
			Sliders[this.slider_beta_id].setValue(this.beta);
			Sliders[this.slider_delta_id].setValue(this.delta);
		}

		this.generatePoints();

		// Rotate newly generated points into camera space.
		for (var i = 0; i < Plane_Fit.points.length; i++)
		{
			Plane_Fit.points[i] = Plane_Fit.points[i].rotateY(yaw);
		}

		for (var i = 0; i < Plane_Fit.points.length; i++)
		{
			Plane_Fit.points[i] = Plane_Fit.points[i].rotateX(pitch);
		}

	}
	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i].draw();
	}
};

Plane.prototype.distance = function(p)
{
	return this.A*p.x + this.B*p.y + this.C*p.z + this.D;
};

Plane.prototype.score = function()
{
	this.A = Math.sin(this.alpha)*Math.cos(this.beta);
	this.B = Math.sin(this.alpha)*Math.sin(this.beta);
	this.C = Math.cos(this.alpha);
	this.D = this.delta;

	var score = 0;

	for (var i = 0; i < DMap.structure.length; i++)
	{
		score += Math.pow(this.distance(DMap.structure[i]), 2);
	}

	return score;
};

Plane.prototype.optimize = function()
{
	var base_score = this.score();
	var cut_off = 50;
	var delta = .025;




	var new_alpha = this.alpha;

	this.alpha += delta;
	var inc_score = base_score - this.score();
	this.alpha -= delta;

	this.alpha -= delta;
	var dec_score = base_score - this.score();
	this.alpha += delta;

	if (inc_score > dec_score)
	{
		if (inc_score > cut_off)
		{
			new_alpha += delta;
		}
	}
	else if (dec_score > inc_score)
	{
		if (dec_score > cut_off)
		{
			new_alpha -= delta;
		}
	}



	var new_beta = this.beta;

	this.beta += delta;
	var inc_score = base_score - this.score();
	this.beta -= delta;

	this.beta -= delta;
	var dec_score = base_score - this.score();
	this.beta += delta;

	if (inc_score > dec_score)
	{
		if (inc_score > cut_off)
		{
			new_beta += delta;
		}
	}
	else if (dec_score > inc_score)
	{
		if (dec_score > cut_off)
		{
			new_beta -= delta;
		}
	}


	var delta = .5;

	var new_delta = this.delta;

	this.delta += delta;
	var inc_score = base_score - this.score();
	this.delta -= delta;

	this.delta -= delta;
	var dec_score = base_score - this.score();
	this.delta += delta;

	if (inc_score > dec_score)
	{
		if (inc_score > cut_off)
		{
			new_delta += delta;
		}
	}
	else if (dec_score > inc_score)
	{
		if (dec_score > cut_off)
		{
			new_delta -= delta;
		}
	}




	if (new_alpha > Math.PI)
	{
		new_alpha -= 2*Math.PI;
	}
	else if (new_alpha < -Math.PI)
	{
		new_alpha += 2*Math.PI;
	}


	if (new_beta > Math.PI)
	{
		new_beta -= 2*Math.PI;
	}
	else if (new_beta < -Math.PI)
	{
		new_beta += 2*Math.PI;
	}


	this.alpha = new_alpha;
	this.beta = new_beta;
	this.delta = new_delta;
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

Point.prototype.dist = function(x, y)
{
	return Math.sqrt( Math.pow(this.x2d - x, 2) + Math.pow(this.y2d - y, 2) );
};

Point.prototype.planeDist = function(A, B, C, D)
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

			for (var i = 0; i < Plane_Fit.points.length; i++)
			{
				Plane_Fit.points[i] = Plane_Fit.structure[i].scaleFactor(zoom);
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
			for (var i = 0; i < Plane_Fit.points.length; i++)
			{
				Plane_Fit.points[i] = Plane_Fit.points[i].rotateX(pitch);
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
				for (var i = 0; i < Plane_Fit.points.length; i++)
				{
					Plane_Fit.points[i] = Plane_Fit.points[i].rotateX(-pitch);
					unpitch = true;
				}
			}

			delta_yaw = (old_x - new_x)*.006;
			yaw += delta_yaw;
			for (var i = 0; i < DMap.points.length; i++)
			{
				DMap.points[i] = DMap.points[i].rotateY(yaw);
			}

			for (var i = 0; i < Plane_Fit.points.length; i++)
			{
				Plane_Fit.points[i] = Plane_Fit.points[i].rotateY(yaw);
			}

			if (unpitch)
			{
				for (var i = 0; i < DMap.points.length; i++)
				{
					DMap.points[i] = DMap.points[i].rotateX(pitch);
				}

				for (var i = 0; i < Plane_Fit.points.length; i++)
				{
					Plane_Fit.points[i] = Plane_Fit.points[i].rotateX(pitch);
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

	for (var i = 0; i < Plane_Fit.points.length; i++)
	{
		Plane_Fit.points[i] = Plane_Fit.points[i].scaleFactor(1 + delta*.1);
	}

	evt.preventDefault();
	return false;
}, false);


init();