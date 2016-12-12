



// Global screen elements

var cvs = document.getElementById('canvas');
var cvs_1 = document.getElementById('subcanvas_1');
var cvs_2 = document.getElementById('subcanvas_2');
var earth_img = document.getElementById("earth");

var ctx = cvs.getContext('2d');
var ctx_1 = cvs_1.getContext('2d');
var ctx_2 = cvs_2.getContext('2d');

var screen_width;
var screen_height;

var fps = 60;


// User interaction singletons

var Mouse = new Mouse();
var Camera;


function main()
{
	checkForResize();
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	main_planet.draw();
}

function hypot(x, y)
{
	Math.sqrt(x*x + y*y);
}

function resize()
{
	screen_width = window.innerWidth;
	screen_height = window.innerHeight;

	var canvas_width = Math.round(screen_width*(2/3 * 0.8));
	var canvas_height = Math.round(screen_height*(8/10));

	var square_size;

	if (canvas_width < canvas_height)
	{
		square_size = canvas_width;
	}
	else
	{
		square_size = canvas_height;
	}

	cvs.width = square_size;
	cvs.height = square_size;

	cvs_1.width = square_size/2;
	cvs_1.height = square_size/2;
	cvs_1.style.left = (square_size+1).toString() + "px";
	cvs_1.style.top = "0px";

	cvs_2.width = square_size/2;
	cvs_2.height = square_size/2;
	cvs_2.style.left = (square_size+1).toString() + "px";
	cvs_2.style.top = (square_size/2+1).toString() + "px";
}

function checkForResize()
{
	if ((window.innerWidth != screen_width) || (window.innerHeight != screen_height))
	{
		resize();
	}
}

function init()
{
	resize();
	main_planet = new Planet();

	Camera = new Camera();
	Camera.centerOn(main_planet);

	mainloop = setInterval("main();",1000/fps);
}



function Trajectory()
{
	this.initial_turn_height = 13000; // All distances in meters
	this.final_turn_height = 45000;
	this.turn_shape = .3; 	// How sharp of a turn to make
							// low is gradual, high is sharp

	this.final_angle = 0; // Final target angle to go towards
	this.height_target = 70000; // Target apoapsis height
}


/** 
 * Trajectory.getAngle() description
 *
 * angle goes from 90 deg to 0 deg as height 
 *  goes from initial_turn_height to final_turn_height
 *  if final_angle is not zero, goes to that instead
 *
 * returns current angle as a function of height,
 *  normalized with respect to the inertial reference frame
 *
 *  (i.e. add the rocket-earth relative angle afterwards)
 */
Trajectory.prototype.getThrustAngle = function(height, distance)
{
	if (height < this.initial_turn_height)
	{
		return 0;
	}
	else if (height < this.final_turn_height)
	{
		return (Math.PI/2 - Math.pow((distance - this.initial_turn_height)/(this.final_turn_height \
				- this.initial_turn_height), this.turn_shape)) * (Math.PI - this.turn_shape) - 	   \ 
				Math.pow(Math.PI, 2)/4;
	}
	else
	{
		return final_angle - Math.PI/2;
	}
}



function Rocket()
{
	this.initial_mass = 17.071; // All masses in metric tons
	this.final_mass = 3.6520; // 'dry' mass: when no fuel is left

	this.thrust = 200; // All forces are in kilo-Newtons

								/**/
	this.atmosphere_isp = 320; 	// isp: specific impulse
	this.vacuum_isp = 370;     	// defines how efficient the engine is
								/**/

	this.g = 9.81; // Used for isp unit conversion (not gravity)

	/**
	 * The rocket state is a 5-vector:
	 *	1. x position	(x)
	 *  2. y position	(y)
	 *  3. x velocity	(vx)
	 *  4. y velocity	(vy)
	 *  5. mass 		(m)
	 */

	this.state = [0, main_planet.radius, RS, 0, this.initial_mass];

	// The initial state is defined as follows:

	/**
	 *      90 deg
	 *
	 *      (0,R)
	 *       _O_  ----> v: (RS, 0)
	 *     .` | `.
	 *    :   .   :  0 deg 
	 *    `.     .`
	 *      '---'
	 *
	 *============================
	 *
	 *       +y
	 *        ^
	 *        : 
	 * -x <-------> +x
	 *        :
	 *        v
	 *       -y
	 */
}

Rocket.prototype.getThrustVector = function(height, distance, mass)
{
	if (height < Trajectory.final_turn_height && mass > this.final_mass)
	{
		var thrust_angle = Trajectory.getThrustAngle(height, distance);
		var thrust = T/mass;

		var thrust_x = thrust * Math.cos(thrust_angle);
		var thrust_y = thrust * Math.sin(thrust_angle);

		return [thrust_x, thrust_y];
	}
	else
	{
		return [0, 0];
	}
}

Rocket.prototype.getGravityVector = function(distance, x, y)
{
	var grav = -Planet.standard_gravitational_parameter/Math.pow(distance,3);
	var grav_x = grav * x;
	var grav_y = grav * y;

	return [grav_x, grav_y];
}

Rocket.prototype.getDragVector = function(pressure, vx, vy)
{
	drag_angle = 
}









function Planet()
{
	this.x = 0;
	this.y = 0;

	// gravitational and mass constants
	this.radius = 600000;
	this.standard_gravitational_parameter = 3.5316E12;
	this.equatorial_rotation_speed = 174.53; // meters per second

	// atmospheric constants
	this.drag_constant = 9.784758844E-4;
	this.atmospheric_height = 70000;
	this.scale_height = 5000;
}

Planet.prototype.draw = function()
{
	var draw_coords = Camera.transformCoordinates(this.x, this.y);
	var draw_radius = this.radius * Camera.zoom;

	var draw_x = draw_coords[0];
	var draw_y = draw_coords[1];

	this.drawAtmosphere(false);

	// Draw planet texture
	ctx.drawImage(earth_img, 0, 0, earth_img.width, earth_img.height, draw_x - draw_radius, draw_y - draw_radius, draw_radius*2, draw_radius*2);


	// Draw planet outline
	ctx.beginPath();
	ctx.arc(draw_x, draw_y, draw_radius, 0, 2*Math.PI);
	ctx.strokeStyle = 'black';
	ctx.lineWidth = Camera.zoom * this.radius / (1.5*62.5);
	//ctx.lineWidth = 2;
	ctx.stroke();
}


// For true exponential color drop-off, set true_exponential to true.
Planet.prototype.drawAtmosphere = function(true_exponential)
{
	var draw_coords = Camera.transformCoordinates(this.x, this.y);
	var draw_radius = this.radius * Camera.zoom;

	var draw_x = draw_coords[0];
	var draw_y = draw_coords[1];
	
	var atmospheric_radius = this.radius + this.atmospheric_height;
	ctx.beginPath();
	ctx.rect(0, 0, cvs.width, cvs.height);
    var gradient = ctx.createRadialGradient(draw_x, draw_y, this.radius*Camera.zoom, draw_x, draw_y, atmospheric_radius*Camera.zoom);

    var N = 10 * true_exponential;
    for (var i = 0; i < N; i++)
    {
    	var t = i/(N - 1); // t linearly between 0 and 1 at N intervals
    	var height = t*this.atmospheric_height; // height between 0 and top of atmosphere

    	var pressure = Math.exp(-height/this.scale_height); // Exponentially goes from 1 to 0

    	var r = 0;
    	var b = Math.round(255*pressure);
    	var g = 0;

    	color_string = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

    	gradient.addColorStop(t, color_string);
    }

    gradient.addColorStop(0, 'blue');
    gradient.addColorStop(1, 'black');
    ctx.fillStyle = gradient;
    ctx.fill();
}








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
}

Point.prototype.dist = function(x, y)
{
	return Math.sqrt( Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2) );
}

Point.prototype.moveTo = function(x, y)
{
    this.x = x;
    this.y = y;
}













// Camera singleton object, initially centered on 0, 0 world coordinates
// and displaying 1:1 scale zoom
function Camera()
{
	this.x = 0;
	this.y = 0;
	this.zoom = 1;
}

// Takes in object with radius, and moves the camera such that the camera
// is centered on the object, and the object takes 1/10 of the screen space.
Camera.prototype.centerOn = function(obj)
{
	this.x = obj.x;
	this.y = obj.y;

	var screen_size = (cvs.width + cvs.height) / 2;
	var percentage = 1/10;

	this.zoom = (screen_size * percentage) / obj.radius;
}

Camera.prototype.transformCoordinates = function(x, y)
{
	var draw_x = (x + this.x) * this.zoom + cvs.width/2;
	var draw_y = -(y + this.y) * this.zoom + cvs.height/2;

	return [draw_x, draw_y];
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

	this.world_x = (this.x - cvs.width/2) / Camera.zoom;
	this.world_y = (this.y - cvs.height/2) / Camera.zoom;
};

cvs.addEventListener('mousemove', function(evt)
{
	Mouse.updatePos(evt)
	if (Mouse.down)
	{
		var delta_x = Mouse.x - Mouse.press_x;
		var delta_y = Mouse.y - Mouse.press_y;

		var world_delta_x = (delta_x)/Camera.zoom;
		var world_delta_y = -(delta_y)/Camera.zoom;

		Camera.x = Mouse.press_cam_x + world_delta_x;
		Camera.y = Mouse.press_cam_y + world_delta_y;
	}
}, false);

cvs.addEventListener('mousedown', function(evt)
{
	Mouse.press_x = Mouse.x; // Location at which the mouse was originally pressed to the screen
	Mouse.press_y = Mouse.y; // For dragging the camera around the visualization scene.
	Mouse.press_cam_x = Camera.x;
	Mouse.press_cam_y = Camera.y;

    Mouse.down = true;

    evt.preventDefault();
}, false);

cvs.addEventListener('mouseleave', function(evt)
{
	Mouse.down = false;
}, false);

cvs.addEventListener('mouseup', function(evt)
{
	Mouse.down = false;
}, false);

cvs.addEventListener('mousewheel',function(evt)
{
	var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));

	Camera.zoom *= (1 + delta*.1)

	evt.preventDefault();
    return false; 
}, false);

cvs.addEventListener("DOMMouseScroll",function(evt)
{
	var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));

	Camera.zoom *= (1 + delta*.1)

	evt.preventDefault();
	return false;
}, false);












init();