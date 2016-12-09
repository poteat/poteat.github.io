





// GLOBAL SCOPE DECLARATIVE HEADER
//
	// Camera and animation parameters
	var fps = 30;
	var fov = 250;
	var yaw = 10;
	var pitch = 0.7;
	var zoom = 4;

	// Canvas and drawing DOM objects
	var cvs = document.getElementById('canvas');
	var ctx = cvs.getContext('2d');

	var dl = document.getElementById('surface_download_link');
	var fit_dl = document.getElementById('fit_download_link');

	// Global object declarations
	var Mouse = new Mouse();
	var BSurface;
	var DemingRegressor;
	var BProj;

	// Program entry and loop definition
	clearInterval(mainloop);
	var mainloop = setInterval("main();",1000/fps);
//


	var first_execution = true;
	var BPerimeter;

	var BStrand;



// Program entry point, runs once at initialization of application.
function init()
{
	loadServerMRC("density_map.mrc");

	BSurface = new Surface(4, 4, 30, 30);

	BPlane = new Plane(1, -3, 1, 2);

	BProj = new Projection();

//	BProj.appendPoint(0, 50, 0);

	updateTransformedPoints();
}


var desired_control_points = 4;

var updated_pdb = false;

// Main program control loop, responsible for draw calls.
function main()
{
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	// Draw all toggle button and slider objects.
	for (var i = 0; i < ToggleButtons.length; i++)
	{
		ToggleButtons[i].draw();
	}

	for (var i = 0; i < Sliders.length; i++)
	{
		Sliders[i].draw();
	}

	BSurface.draw();
	if (DMap != undefined && BSurface.finished == false)
	{
		DMap.draw();
	}

	if (DMap != undefined)
	{
		var score = DMap.score();

		ctx.fillStyle = "black";

		ctx.fillText("Score: " + score, 10, 20);
		ctx.fillText("Number of points: " + DMap.points.length, 10, 40);

		if (BSurface.finished)
		{
			if (BSurface.X < desired_control_points)
			{
				BSurface.incrementControlPoints();
				BSurface.finished = false;
				updated_pdb = false;
			}
			else
			{
				ctx.fillText("Surface-Fitting Completed", 10, 60);
				dl.innerHTML = "Download Surface PDB";

				if (updated_pdb == false)
				{
					var sample_points = DMap.generateCroppedSurface(200, 200);

					// Undo plane and centering transformations
					for (var i = 0; i < sample_points.length; i++)
					{
						sample_points[i].rotateAxis(-DMap.rot_theta, DMap.rot_ux, DMap.rot_uy, DMap.rot_uz)

						sample_points[i].x += DMap.x_avg
						sample_points[i].y += DMap.y_avg
						sample_points[i].z += DMap.z_avg
					}

					var string = generatePDBString(sample_points);

					var file = generateTextFile(string);

					dl.href = file;


					var fit_string = generateFitString();
					var fit_file = generateTextFile(fit_string);

					fit_dl.href = fit_file;


					// Build filename by appending "_SplineFit" to the end of the input file

					var filename = DMap.filename;
					var exploded_filename = filename.split(".");

					var output_filename = "";

					for (var i = 0; i < exploded_filename.length - 2; i++)
					{
						output_filename += (exploded_filename[i] + ".");
					}
					output_filename += (exploded_filename[i]);

					fit_filename = output_filename + "_SplineFit.fit";

					output_filename += "_SplineFit.pdb";

					dl.download = output_filename;

					fit_dl.download = fit_filename;

					updated_pdb = true;
				}

				// Now that the surface is finished optimizing itself, we can calculate the projected concave hull!

				if (first_execution)
				{
					DMap.updateProjection(true);
					BSurface.updatePoints();

					// Clear up HUD
					BSurface.drawSurface = false;
					BSurface.drawControlPoints = false;

					var Vertices = new Array();

					for (var i = 0; i < DMap.points.length; i++)
					{
						var p = DMap.points[i];

						var t = p.t;
						var u = p.u;

						Vertices.push([t, u]);
					}

					ConcaveVertices = concaveHull(Vertices, .115);

					var ConcaveHull = new Array()

					for (var i = 0; i < ConcaveVertices.length; i++)
					{
						var V_i = ConcaveVertices[i];
						var V = Vertices[V_i];

						ConcaveHull.push(V);
					}

					BPerimeter = new Perimeter(ConcaveHull);

					first_execution = false;

					initializeStrandFit();
				}


				// This area is devoted to post-processing after surface fit.

				Mouse.draw();

				BStrand.draw();

				BPerimeter.draw();




				// End post-process handling area.
			}
		}
		else
		{
			dl.innerHTML = "Waiting...";
			dl.href = "";
			updated_pdb = false;
		}

	}

	if (DMap != undefined)
	{
		if (BPlane.finished == false)
		{
			var change = BPlane.optimize();
			var score = BPlane.score();

			BPlane.last_score = score;

			ctx.fillText("Plane Score: " + score, 10, 60);
			ctx.fillText("Change: " + change, 10, 70);

			if (change < .000001)
			{
				// Rotate DMap
				BPlane.finished = true;

				var mag = Math.sqrt(Math.pow(BPlane.A,2) + Math.pow(BPlane.C,2));

				DMap.rot_ux = BPlane.C / mag;
				DMap.rot_uy = 0;
				DMap.rot_uz = -BPlane.A / mag;

				DMap.rot_theta = Math.acos(BPlane.B);

				DMap.rotateAxis(DMap.rot_theta, DMap.rot_ux, DMap.rot_uy, DMap.rot_uz);

				DMap.updateTransformedPoints();

				// Calculate bounding box
				DMap.calculateBoundingBox();
			}

			BPlane.draw();
		}
	}
}



function initializeStrandFit()
{
	BStrand = new Strand();
}



// updateTransformedPoints()
// ----------------------------------------------------------------------
// This function updates the "camera-transformed" set of points belonging to each object.
// The transformation consists of two rotations around the Y and X axes, by the yaw and
// pitch camera angles respectively.  There is also a scaling transformation for zoom.

function updateTransformedPoints()
{
	BSurface.updateTransformedPoints();
	if (DMap != undefined)
	{
		DMap.updateTransformedPoints();
	}

	BProj.updateTransformedPoints();

	if (BPerimeter != null)
	{
		BPerimeter.updateTransformedPoints();
	}

	if (BStrand != null)
	{
		BStrand.updateTransformedPoints();
	}
}


function generatePDBString(points)
{
	var string = "";

	for (var i = 0; i < points.length; i++)
	{
		if (i+1 < 10)
		{
			var space = "     ";
		}
		else if (i+1 < 100)
		{
			var space = "    ";
		}
		else if (i+1 < 1000)
		{
			var space = "   ";
		}
		else if (i+1 < 10000)
		{
			var space = "  ";
		}
		else
		{
			var space = " ";
		}

		var x = points[i].x;
		var y = points[i].y;
		var z = points[i].z;

		var precision = 5;

		if (x > -1 && x < 1)
		{
			var x = points[i].x.toPrecision(precision-1);

			if (x > -.1 && x < .1)
			{
				var x = points[i].x.toPrecision(precision-2);
			}
		}
		else
		{
			var x = points[i].x.toPrecision(precision);
		}

		if (x < 0)
		{
			var x_space = "";
		}
		else
		{
			var x_space = " ";
		}

		if (y > -1 && y < 1)
		{
			var y = points[i].y.toPrecision(precision-1);

			if (y > -.1 && y < .1)
			{
				var y = points[i].y.toPrecision(precision-2);
			}
		}
		else
		{
			var y = points[i].y.toPrecision(precision);
		}

		if (y < 0)
		{
			var y_space = "";
		}
		else
		{
			var y_space = " ";
		}

		if (z > -1 && z < 1)
		{
			var z = points[i].z.toPrecision(precision-1);

			if (z > -.1 && z < .1)
			{
				var z = points[i].z.toPrecision(precision-2);
			}
		}
		else
		{
			var z = points[i].z.toPrecision(precision);
		}

		if (z < 0)
		{
			var z_space = "";
		}
		else
		{
			var z_space = " ";
		}

		string += "ATOM " + space + (i+1) + "  C   HOH A   1     " + x_space + x + " " + y_space + y + " " + z_space + z + "                          \n";
	}

	return string;
}


function generateFitString()
{
	var string = "" + density_threshold + "\n";

	string += DMap.x_avg + " " + DMap.y_avg + " " + DMap.z_avg + "\n";

	string += DMap.rot_theta + " " + DMap.rot_ux + " " + DMap.rot_uy + " " + DMap.rot_uz + "\n";

	string += DMap.min_t + " " + DMap.max_t + "\n";

	string += DMap.min_u + " " + DMap.max_u + "\n";

	string += BSurface.X + " " + BSurface.Y + "\n";

	for (var i = 0; i < BSurface.X; i++)
	{
		for (var j = 0; j < BSurface.Y; j++)
		{
			var p = BSurface.controlPoints[i][j];
			string += p.x + " " + p.y + " " + p.z + "\n";
		}
	}

	return string;
}


function generateTextFile(string)
{
    var data = new Blob([string], {type: 'text/plain'});

    file = window.URL.createObjectURL(data);

    return file;
}





// ----------------------------------------------------------------------
// Global mathematical functions.
// ----------------------------------------------------------------------

// sign(x) returns -1 if x is negative, 1 if x is positive, and 0 if x is zero.
function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

// binomial(n,k) returns the binomial coefficient of n, k.  i.e. N select K.  Used primarily
// for generating surface points.
function binomial(n, k)
{
	var prod = 1;
	for (i = 1; i <= k; i++)
	{
		prod *= (n + 1 - i)/i;
	}

	return prod;
}

function clamp(num, min, max)
{
	return num < min ? min : num > max ? max : num;
}



















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

			DMap.filename = "sample.pdb";
	
			updateTransformedPoints();

			mainloop = setInterval("main();",1000/fps);
		}
	};

	oReq.send(null);
}

var DMap;
var dataView;
var density_threshold = 0.65;

document.getElementById('density_threshold').addEventListener('change', changeDensity, false);

function changeDensity(evt)
{
	density_threshold = evt.target.value;

	BPlane = new Plane(1, -3, 1, 2);

	DMap_new = new DensityMap();

	DMap_new.filename = DMap.filename;
	DMap_new.extension = DMap.extension;

	delete DMap;

	DMap = DMap_new;

	first_execution = true;
	BSurface.drawSurface = true;
}

document.getElementById('mrc_file').addEventListener('change', loadLocalMRC, false);

function loadLocalMRC(evt)
{
	var file = evt.target.files[0];

	var exploded_filename = (file.name).split(".");
	var extension = exploded_filename[exploded_filename.length - 1];

	var fileReader = new FileReader();

	if (extension == 'mrc')
	{
		fileReader.readAsArrayBuffer(file);

		fileReader.onload = function (oEvent)
		{
			var arrayBuffer = oEvent.target.result;
			if (arrayBuffer)
			{
				var byteArray = new Uint8Array(arrayBuffer);

				dataView = new DataView(arrayBuffer);

				DMap = new DensityMap();

				DMap.filename = file.name;
				DMap.extension = extension;

				updateTransformedPoints();

				if (BPlane != undefined)
				{
					BPlane = new Plane(1, -3, 1, 2);
					BSurface.finished = false;
					// Refit the new image
				}
			}
		};
	}
	else if (extension == 'pdb')
	{
		fileReader.readAsText(file);

		fileReader.onload = function (oEvent)
		{
			var pdb_string = oEvent.target.result;

			DMap = new DensityMap(pdb_string);

			DMap.filename = file.name;
			DMap.extension = extension;

			updateTransformedPoints();

			if (BPlane != undefined)
			{
				BPlane = new Plane(1, -3, 1, 2);
				BSurface.finished = false;
				// Refit the new image
			}
		};
	}

	first_execution = true;
	BSurface.drawSurface = true;

}

document.getElementById('fit_file').addEventListener('change', loadFittingFile, false);

function loadFittingFile(evt)
{
	var file = evt.target.files[0];
	var fileReader = new FileReader();
	fileReader.readAsText(file);

	fileReader.onload = function (oEvent)
	{
		var fit_string = oEvent.target.result;

		var lines = fit_string.split("\n");

		density_threshold = Number(lines[0]);

		var val = lines[1].split(" ");

		var avgx = Number(val[0]);
		var avgy = Number(val[1]);
		var avgz = Number(val[2]);

		var val = lines[2].split(" ");

		var rot_theta = Number(val[0]);
		var rot_ux = Number(val[1]);
		var rot_uy = Number(val[2]);
		var rot_uz = Number(val[3]);

		var val = lines[3].split(" ");

		var min_t = Number(val[0]);
		var max_t = Number(val[1]);

		var val = lines[4].split(" ");

		var min_u = Number(val[0]);
		var max_u = Number(val[1]);

		var val = lines[5].split(" ");

		var X = Number(val[0]);
		var Y = Number(val[1]);

		var array_of_points = new Array(X);

		// Declare 2d array
		for (var i = 0; i < X; i++)
		{
			array_of_points[i] = new Array(Y);
		}

		var i = 6;
		for (var x_i = 0; x_i < X; x_i++)
		{
			for (var y_i = 0; y_i < Y; y_i++)
			{
				var val = lines[i].split(" ");
				var x = val[0];
				var y = val[1];
				var z = val[2];

				var p = new Point(x, y, z);

				array_of_points[x_i][y_i] = p;
				i++;
			}
		}

		// Finished reading all data.
		// Initialize new DMap and BSurface

		DMap.createFromFit(avgx, avgy, avgz, rot_theta, rot_ux, rot_uy, rot_uz, min_t, max_t, min_u, max_u);

		BSurface.setControlPoints(array_of_points);
		BSurface.finished = true;
		BPlane.finished = true;

		DMap.updateProjection();

		updateTransformedPoints();
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


function DensityMap(pdb_string)
{
	if (pdb_string == undefined)
	{
		this.createFromMRC();
	}
	else
	{
		lines = pdb_string.split("\n");

		this.points = new Array();
		this.points_T = new Array();

		for (var i = 0; i < lines.length; i++)
		{
			var current_line = lines[i];

			// Replace multiple space segments in line with one space each:
			current_line_min = current_line.replace(/  +/g, ' ');

			var datum = current_line_min.split(" ");
			var type = datum[0];
			if (type == "ATOM")
			{
				var coord_substring = current_line.substring(30, 55);
				coord_substring = coord_substring.replace(/  +/g, ' ');
				var coord_datum = coord_substring.split(" ");

				var x = Number(coord_datum[1]);
				var y = Number(coord_datum[2]);
				var z = Number(coord_datum[3]);

				var p = new Point(x, y, z);
				var p_t = new Point(0, 0, 0);

				this.points.push(p);
				this.points_T.push(p_t);
			}
		}

		// Calculate average position

		var avgx = 0;
		var avgy = 0;
		var avgz = 0;

		for (var i = 0; i < this.points.length; i++)
		{
			var p = this.points[i];

			avgx += p.x;
			avgy += p.y;
			avgz += p.z;
		}

		avgx /= this.points.length;
		avgy /= this.points.length;
		avgz /= this.points.length;

		this.x_avg = avgx;
		this.y_avg = avgy;
		this.z_avg = avgz;


		// Renormalize points WRT avg position

		for (var i = 0; i < this.points.length; i++)
		{
			var p = this.points[i];

			p.x -= avgx;
			p.y -= avgy;
			p.z -= avgz;
		}



		this.scale = 1;


	}

	// Min and max parameter projections of voxel data points
	//  Used to decide how much of surface to draw.
	this.min_t = 0;
	this.max_t = 1;
	this.min_u = 0;
	this.max_u = 1;
}

DensityMap.prototype.createFromFit = function(x_avg, y_avg, z_avg, rot_theta, rot_ux, rot_uy, rot_uz, min_t, max_t, min_u, max_u)
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

		// Extra 25 ints of storage space

		this.xorigin = readFloat(23+26);
		this.yorigin = readFloat(23+27);
		this.zorigin = readFloat(23+28);

		this.scale = this.xlength/this.mx; // The size of each voxel in Angstroms

		if (this.scale != 1)
		{
			alert("PDB export of non-1 voxel size MRC's is unsupported");
		}

		//this.nlabl = readInt(23+29+3);

		voxel = createArray(this.nx, this.ny, this.nz);

		this.x_avg = x_avg;
		this.y_avg = y_avg;
		this.z_avg = z_avg;

		this.points = new Array(); // Immutable data points
		this.points_T = new Array(); // Points in camera space

		for (var z = 0; z < this.nz; z++)
		{
			for (var y = 0; y < this.ny; y++)
			{
				for (var x = 0; x < this.nx; x++)
				{
					var density = readFloat(256 + (z*this.nx*this.ny + y*this.nx + x));
					if (density > density_threshold)
					{
						var scale = this.scale;
						var p = new Point(((x+this.xorigin) - x_avg)*scale, ((y+this.yorigin) - y_avg)*scale, ((z+this.zorigin) - z_avg)*scale);
						var p2 = new Point(0, 0, 0);
						this.points.push(p);
						this.points_T.push(p2);
					}
				}
			}
		}

		this.rot_theta = rot_theta;
		this.rot_ux = rot_ux;
		this.rot_uy = rot_uy;
		this.rot_uz = rot_uz;

		DMap.rotateAxis(DMap.rot_theta, DMap.rot_ux, DMap.rot_uy, DMap.rot_uz);

		this.min_t = min_t;
		this.max_t = max_t;
		this.min_u = min_u;
		this.max_u = max_u;
}

DensityMap.prototype.createFromMRC = function()
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

		// Extra 25 ints of storage space

		this.xorigin = readFloat(23+26);
		this.yorigin = readFloat(23+27);
		this.zorigin = readFloat(23+28);

		this.scale = this.xlength/this.mx; // The size of each voxel in Angstroms

		if (this.scale != 1)
		{
			alert("PDB export of non-1 voxel size MRC's is unsupported");
		}

		//this.nlabl = readInt(23+29+3);

		voxel = createArray(this.nx, this.ny, this.nz);

		var x_avg = 0;
		var y_avg = 0;
		var z_avg = 0;

		var num = 0;

		// Find center of data points (above threshold)
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

						x_avg += (x + this.xorigin);
						y_avg += (y + this.yorigin);
						z_avg += (z + this.zorigin);
					}
				}
			}
		}

		x_avg /= num;
		y_avg /= num;
		z_avg /= num;

		this.x_avg = x_avg;
		this.y_avg = y_avg;
		this.z_avg = z_avg;

		this.points = new Array(); // Immutable data points
		this.points_T = new Array(); // Points in camera space

		for (var z = 0; z < this.nz; z++)
		{
			for (var y = 0; y < this.ny; y++)
			{
				for (var x = 0; x < this.nx; x++)
				{
					var density = readFloat(256 + (z*this.nx*this.ny + y*this.nx + x));
					if (density > density_threshold)
					{
						var scale = this.scale;
						var p = new Point(((x+this.xorigin) - x_avg)*scale, ((y+this.yorigin) - y_avg)*scale, ((z+this.zorigin) - z_avg)*scale);
						var p2 = new Point(0, 0, 0);
						this.points.push(p);
						this.points_T.push(p2);
					}
				}
			}
		}

};

DensityMap.prototype.updateTransformedPoints = function()
{
	for (var i = 0; i < this.points.length; i++)
	{
		this.points_T[i].moveTo(this.points[i]);
		this.points_T[i].scaleFactor(zoom);
		this.points_T[i].rotateY(yaw);
		this.points_T[i].rotateX(pitch);
	}
};

var t = 0;
var lim = 20;

DensityMap.prototype.draw = function()
{
	for (var i = 0; i < this.points.length; i++)
	{
		this.points_T[i].draw();

		if (this.extension == 'pdb')
		{
			// alert(this.points_T[i].x + " " + this.points_T[i].y + " " + this.points_T[i].z);
		}
	}

	if (t == lim)
	{
		if (BSurface.finished != true)
		{
			this.updateProjection();
		}
	}
	else
	{
		t++;
	}

	for (var i = 0; i < this.points.length; i++)
	{
			var p = this.points[i];
			var p_draw = this.points_T[i]
			//coords = BSurface.calc(p.t, p.u);

			/*
			var proj = new Point(coords[0], coords[1], coords[2]);
			proj.scaleFactor(zoom);
			proj.rotateY(yaw);
			proj.rotateX(pitch);
			proj.draw(false);

			ctx.beginPath();
			ctx.moveTo(p_draw.x2d, p_draw.y2d);
			ctx.lineTo(proj.x2d, proj.y2d);
			ctx.stroke();*/
	}
};

DensityMap.prototype.updateProjection = function(permissive)
{
	var min_t = 1;
	var max_t = 0;
	var min_u = 1;
	var max_u = 0;

	for (var i = 0; i < this.points.length; i++)
	{
		var p = this.points[i];
		p.findClosestResPoint();
		p.refineProjection(permissive);

		if (p.t < min_t)
		{
			min_t = p.t;
		}

		if (p.t > max_t)
		{
			max_t = p.t;
		}

		if (p.u < min_u)
		{
			min_u = p.u;
		}

		if (p.u > max_u)
		{
			max_u = p.u;
		}

		this.min_t = min_t;
		this.max_t = max_t;
		this.min_u = min_u;
		this.max_u = max_u;
	}
	t = 0;
}

DensityMap.prototype.rotateAxis = function(ang, ux, uy, uz)
{
	for (var i = 0; i < this.points.length; i++)
	{
		this.points[i].rotateAxis(ang, ux, uy, uz);
	}
};

DensityMap.prototype.score = function()
{
	var sum_dist = 0;

	for (var i = 0; i < this.points.length; i++)
	{
		var p = this.points[i];
		var coords = BSurface.calc(p.t, p.u);
		var proj = new Point(coords[0], coords[1], coords[2]);
		sum_dist += Math.pow(p.dist(proj),2);
	}

	return Math.sqrt(sum_dist/this.points.length)
};

DensityMap.prototype.generateCroppedSurface = function(num_X, num_Y)
{
	this.updateProjection();

	var size_t = this.max_t - this.min_t;
	var delta_t = size_t/(num_X-1);

	var size_u = this.max_u - this.min_u;
	var delta_u = size_u/(num_Y-1);

	// Instantiate a bit array of dimensions [num_x, num_y] to false.
	var bit_array = new Array(num_X);
	for (var i = 0; i < num_X; i++)
	{
		bit_array[i] = new Array(num_Y);

		for (var j = 0; j < num_Y; j++)
		{
			bit_array[i][j] = false;
		}
	}

	for (var i = 0; i < this.points.length; i++)
	{
		var p = this.points[i];
		var t = p.t;
		var u = p.u;

		// Convert value to array coordinate
		t = clamp(Math.round((t-this.min_t)/delta_t), 0, num_X-1);

		u = clamp(Math.round((u-this.min_u)/delta_u), 0, num_Y-1);

		bit_array[t][u] = true;
	}

	var points = new Array();

	for (var i = 0; i < num_X; i++)
	{
		for (var j = 0; j < num_Y; j++)
		{
			if (bit_array[i][j] == true)
			{
				var t = i*delta_t + this.min_t;
				var u = j*delta_u + this.min_u;

				var coords = BSurface.calc(t, u);
				var p = new Point(coords[0], coords[1], coords[2]);

				points.push(p);
			}
		}
	}

	return points;
}

DensityMap.prototype.calculateBoundingBox = function()
{
	var avgx = 0;
	var avgz = 0;
	for (var i = 0; i < this.points.length; i++)
	{
		avgx += this.points[i].x;
		avgz += this.points[i].z;
	}

	avgx /= this.points.length;
	avgz /= this.points.length;

	var vr_x = 0; // Variance of x
	var vr_z = 0; // Variance of z
	var covr = 0; // Covariance of x and z
	for (var i = 0; i < this.points.length; i++)
	{
		var delta_x = this.points[i].x - avgx;
		var delta_z = this.points[i].z - avgz;

		vr_x += Math.pow(delta_x, 2);
		vr_z += Math.pow(delta_z, 2);
		covr = delta_x * delta_z;
	}
	vr_x /= (this.points.length - 1);
	vr_z /= (this.points.length - 1);
	covr /= (this.points.length - 1);

	slope = (vr_z - vr_x + Math.sqrt(Math.pow(vr_z-vr_x, 2) + 4*Math.pow(covr, 2)))/(2*covr);
	intersect = avgz - slope*avgx;

	var min_dist = 1;
	var max_dist = -1;
	var min_dist_id = -1;
	var max_dist_id = -1;
	var min_proj_dist = 1;
	var max_proj_dist = -1;
	var min_proj_dist_id = -1;
	var max_proj_dist_id = -1;

	var m = slope;
	var b = intersect;

	for (var i = 0; i < this.points.length; i++)
	{
		var dist = this.points[i].distFromLine(m, b);

		if (dist < min_dist)
		{
			min_dist = dist;
			min_dist_id = i;
		}

		if (dist > max_dist)
		{
			max_dist = dist;
			max_dist_id = i;
		}

		var x = this.points[i].x;
		var z = this.points[i].z;

		var projection_x = (x + m*(z - b))/(Math.pow(m, 2) + 1);
		var projection_z = (m*(x + m*z) + b)/(Math.pow(m, 2) + 1);

		var direction = sign(projection_x - avgx);

		var proj_dist = direction*Math.sqrt(Math.pow(projection_x - avgx,2) + Math.pow(projection_z - avgz, 2));

		if (proj_dist < min_proj_dist)
		{
			min_proj_dist = proj_dist;
			min_proj_dist_id = i;
		}

		if (proj_dist > max_proj_dist)
		{
			max_proj_dist = proj_dist;
			max_proj_dist_id = i;
		}

		this.points[i].color = "black";
	}

	
	var p1 = this.points[min_dist_id];
	var p2 = this.points[min_proj_dist_id];
	var p3 = this.points[max_dist_id];
	var p4 = this.points[max_proj_dist_id];

	var p1_T = this.points_T[min_dist_id];
	var p2_T = this.points_T[min_proj_dist_id];
	var p3_T = this.points_T[max_dist_id];
	var p4_T = this.points_T[max_proj_dist_id];

	p1_T.color = "green";
	p3_T.color = "green";
	p2_T.color = "black";
	p4_T.color = "black";
	p1_T.size = 5;
	p2_T.size = 5;
	p3_T.size = 5;
	p4_T.size = 5;

	var array = [[p1,p2], [p4,p3]];

	BSurface.setControlPoints(array);
};







function Perimeter(ConcaveHull)
{

	// Old feature of displaying colored perimeter, based on local error of fit estimation
	// To enable, set to 'true' - although local error of fit never ended up being useful.

	this.colored_perimeter = false;


	this.vertices = ConcaveHull;

	this.points = new Array();
	this.points_T = new Array();

	for (var i = 0; i < ConcaveHull.length; i++)
	{
		var V = ConcaveHull[i];

		var t = V[0];
		var u = V[1];

		var calc = BSurface.calc(t, u);

		var p = new Point(calc[0], calc[1], calc[2]);

		var p_T = new Point(0, 0, 0, "black", 3);

		this.points.push(p);
		this.points_T.push(p_T);
	}

	this.R = 30;
	var R = this.R;
	var buffer = .03;

	this.surfacePointsX = new Array(R);
	this.surfacePointsX_T = new Array(R);

	for (var i = 0; i < R; i++)
	{
		this.surfacePointsX[i] = new Array(R);
		this.surfacePointsX_T[i] = new Array(R);

	}

	for (var i = 0; i < R; i++)
	{
		var t = DMap.min_t + buffer + (DMap.max_t - DMap.min_t - buffer*2) * i/(R-1);

		var IntersectionVertices = getIntersectionPoints(t, 0, 0, ConcaveHull, true);

		if (IntersectionVertices != false)
		{
			var V1 = IntersectionVertices[0];
			var V2 = IntersectionVertices[1];

			var u1 = V1[1];
			var u2 = V2[1];

			for (var j = 0; j < R; j++)
			{
				var u = u1 + (u2 - u1) * j/(R-1);

				var coords = BSurface.calc(t, u);

				var p = new Point(coords[0], coords[1], coords[2]);
				var p_T = new Point(0, 0, 0, "black", 3);

				this.surfacePointsX[i][j] = p;
				this.surfacePointsX_T[i][j] = p_T;
			}
		}
	}




	this.surfacePointsY = new Array(R);
	this.surfacePointsY_T = new Array(R);

	for (var i = 0; i < R; i++)
	{
		this.surfacePointsY[i] = new Array(R);
		this.surfacePointsY_T[i] = new Array(R);

	}

	for (var i = 0; i < R; i++)
	{
		var u = DMap.min_u + buffer + (DMap.max_u - DMap.min_u - buffer*2) * i/(R-1);

		var IntersectionVertices = getIntersectionPoints(0, u, Math.PI/2, ConcaveHull, true);

		if (IntersectionVertices != false)
		{
			var V1 = IntersectionVertices[0];
			var V2 = IntersectionVertices[1];

			var t1 = V1[0];
			var t2 = V2[0];

			for (var j = 0; j < R; j++)
			{
				var t = t1 + (t2 - t1) * j/(R-1);

				var coords = BSurface.calc(t, u);

				var p = new Point(coords[0], coords[1], coords[2]);
				var p_T = new Point(0, 0, 0, "blue", 3);

				this.surfacePointsY[i][j] = p;
				this.surfacePointsY_T[i][j] = p_T;
			}
		}
	}

	this.updateTransformedPoints();

	if (this.colored_perimeter)
	{
		this.updateColorError();
	}
}

Perimeter.prototype.updateColorError = function()
{
	var L = this.points.length;
	var P_prev;
	var P_next;

	for (var i = 0; i < L; i++)
	{
		var P = this.points[i];
		if (i == 0) // If first
		{
			P_prev = this.points[L - 1];
			P_next = this.points[1];
		}
		else if (i == L - 1) // If last
		{
			P_prev = this.points[L - 2];
			P_next = this.points[0];
		}
		else
		{
			P_prev = this.points[i - 1];
			P_next = this.points[i + 1];
		}

		// Calculate 3D (true) distance between P and P_prev/P_next.
		// Then find their average.

		var threshold = (P.dist(P_prev) + P.dist(P_next))/2;

		var threshold = 5;


		/*
		// *************************
		// Loop through voxels.  Find maximum proj dist in set of dist less than threshold.

		

		var max_proj_dist = 0;

		for (var j = 0; j < DMap.points.length; j++)
		{
			var voxel = DMap.points[j];

			var dist = voxel.dist(P);

			if (dist < threshold)
			{
				var t = voxel.t;
				var u = voxel.u;

				var surface_p = BSurface.calc(t, u);
				var x = surface_p[0];
				var y = surface_p[1];
				var z = surface_p[2];
				var surface_p = new Point(x, y, z);

				var proj_dist = voxel.dist(surface_p);

				if (proj_dist > max_proj_dist)
				{
					max_proj_dist = proj_dist;
				}
			}
		}

		P.error = max_proj_dist;
		*/
		

		// *************************



		
		// *************************

		// Loop through all true voxels.  If their distance to P is less than threshold,
		// Add their projection distance to a sum.

		var proj_dist_avg = 0;
		var num = 0;

		for (var j = 0; j < DMap.points.length; j++)
		{
			var voxel = DMap.points[j];

			var dist = voxel.dist(P);

			if (dist < threshold)
			{
				var t = voxel.t;
				var u = voxel.u;

				var surface_p = BSurface.calc(t, u);
				var x = surface_p[0];
				var y = surface_p[1];
				var z = surface_p[2];
				var surface_p = new Point(x, y, z);

				var proj_dist = voxel.dist(surface_p);

				proj_dist_avg += proj_dist;
				num++;
			}
		}

		proj_dist_avg /= num;

		P.error = proj_dist_avg;
		// *************************
		
		
	}

	// Now all perimeter errors are calculated.  We now calculate each normalized error from 0 to 1.

	// Find the minimum and maximum errors.

	var min_error = this.points[0].error;
	var max_error = this.points[0].error;
	var min_error_i = 0;
	var max_error_i = 0;

	for (var i = 1; i < this.points.length; i++)
	{
		var P = this.points[i];

		if (P.error < min_error)
		{
			min_error = P.error;
			min_error_i = i;
		}

		if (P.error > max_error)
		{
			max_error = P.error;
			max_error_i = i;
		}
	}

	// Loop through all points and set their normalized error.

	var range = max_error - min_error;

	if (range == 0)
	{
		range = 1;
	}

	for (var i = 0; i < this.points.length; i++)
	{
		var P = this.points[i];

		var error = P.error;

		var normalized_error = (error - min_error)/range;

		P.normalized_error = normalized_error;
	}

	// Loop through all points, calculate the color by linear interpolation.

	var low_color = [0, 0, 255]; // Blue
	var high_color = [255, 0, 0]; // Red

	for (var i = 0; i < this.points.length; i++)
	{
		var P = this.points[i];
		var percent = P.normalized_error;

		var interpolated_color = [0, 0, 0];

		for (var j = 0; j < interpolated_color.length; j++)
		{
			var high = high_color[j];
			var low = low_color[j];
			var range = high-low;

			var color_value = Math.round(percent*range + low);

			interpolated_color[j] = color_value;
		}

		var P_T = this.points_T[i];

		// Convert interpolated color to string.
		// Convert [0, 0, 255] to "#0000FF"

		var r = interpolated_color[0];
		var g = interpolated_color[1];
		var b = interpolated_color[2];

		color_string = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

		P_T.color = color_string;
	}


}

Perimeter.prototype.updateTransformedPoints = function()
{
	for (var i = 0; i < this.points_T.length; i++)
	{
		this.points_T[i].moveTo(this.points[i]);
		this.points_T[i].scaleFactor(zoom);
		this.points_T[i].rotateY(yaw);
		this.points_T[i].rotateX(pitch);
	}

	for (var i = 0; i < this.R; i++)
	{
		if (this.surfacePointsX_T[i][0] != undefined)
		{
			for (var j = 0; j < this.R; j++)
			{
				this.surfacePointsX_T[i][j].moveTo(this.surfacePointsX[i][j]);
				this.surfacePointsX_T[i][j].scaleFactor(zoom);
				this.surfacePointsX_T[i][j].rotateY(yaw);
				this.surfacePointsX_T[i][j].rotateX(pitch);
			}
		}
	}

	for (var i = 0; i < this.R; i++)
	{
		if (this.surfacePointsY_T[i][0] != undefined)
		{
			for (var j = 0; j < this.R; j++)
			{
				this.surfacePointsY_T[i][j].moveTo(this.surfacePointsY[i][j]);
				this.surfacePointsY_T[i][j].scaleFactor(zoom);
				this.surfacePointsY_T[i][j].rotateY(yaw);
				this.surfacePointsY_T[i][j].rotateX(pitch);
			}
		}
	}
}



Perimeter.prototype.draw = function()
{

	var actually_draw = this.colored_perimeter;

	for (var i = 0; i < this.points_T.length; i++)
	{
		var p = this.points_T[i];

		p.draw(actually_draw);
	}	

	for (var i = 0; i < this.R; i++)
	{
		for (var j = 0; j < this.R; j++)
		{
			var p = this.surfacePointsX_T[i][j];
			p.draw(false);
		}
	}

	for (var i = 0; i < this.R; i++)
	{
		for (var j = 0; j < this.R; j++)
		{
			var p = this.surfacePointsY_T[i][j];
			p.draw(false);
		}
	}

	// Draw surface wireframe
	ctx.strokeStyle = "grey";

	ctx.beginPath();

	var needToMove = false;

	for (var i = 0; i < this.R; i++)
	{
		var j = 0;

		var p = this.surfacePointsX_T[i][j];

		if (p.scale > 0)
		{
			ctx.moveTo(p.x2d, p.y2d);
		}
		else
		{
			needToMove = true;
		}
		
		for (var j = 0; j < this.R; j++)
		{
			var p = this.surfacePointsX_T[i][j];

			if (p.scale > 0)
			{
				if (!needToMove)
				{
					ctx.lineTo(p.x2d, p.y2d);
				}
				else
				{
					ctx.moveTo(p.x2d, p.y2d);
					needToMove = false;
				}
			}
		}
	}

	ctx.stroke();

	ctx.beginPath();

	var needToMove = false;

	for (var i = 0; i < this.R; i++)
	{
		var j = 0;

		var p = this.surfacePointsY_T[i][j];

		if (p.scale > 0)
		{
			ctx.moveTo(p.x2d, p.y2d);
		}
		else
		{
			needToMove = true;
		}
		
		for (var j = 0; j < this.R; j++)
		{
			var p = this.surfacePointsY_T[i][j];

			if (p.scale > 0)
			{
				if (!needToMove)
				{
					ctx.lineTo(p.x2d, p.y2d);
				}
				else
				{
					ctx.moveTo(p.x2d, p.y2d);
					needToMove = false;
				}
			}
		}
	}

	ctx.stroke();




	// Draw a linearly interpolated colored line between each perimeter point.

	ctx.strokeStyle = "black";
	ctx.lineWidth = 1;

	var L = this.points_T.length;

	for (var i = 0; i < L; i++)
	{
		var P = this.points_T[i];

		if (i == L - 1) // If last
		{
			var P_next = this.points_T[0];
		}
		else
		{
			var P_next = this.points_T[i + 1];
		}

		if (this.colored_perimeter)
		{
			var gradient = ctx.createLinearGradient(P.x2d, P.y2d, P_next.x2d, P_next.y2d);
			gradient.addColorStop(0, P.color);
			gradient.addColorStop(1, P_next.color);

			ctx.strokeStyle = gradient;
		}
		else
		{
			ctx.strokeStyle = 'black';
		}

		ctx.beginPath();

		ctx.moveTo(P.x2d, P.y2d);
		ctx.lineTo(P_next.x2d, P_next.y2d);

		ctx.stroke();
	}




	/*
	// This does the same thing as the above code, only it calculates using the maximum instead.
	ctx.strokeStyle = "black";
	ctx.lineWidth = 2;

	ctx.beginPath();

	for (var i = 0; i < this.points_T.length; i++)
	{
		var p = this.points_T[i];

		var x = p.x2d;
		var y = p.y2d;

		var prev_color = p.color;

		if (i == 0) // If first
		{
			ctx.moveTo(x, y);
		}
		else
		{
			ctx.lineTo(x, y);
		}

		if (i == this.points_T.length - 1) // If last
		{
			var p = this.points_T[0];

			var x = p.x2d;
			var y = p.y2d;

			ctx.lineTo(x, y);
		}

		var P_prev = p;

	}

	ctx.stroke();


	*/

	ctx.lineWidth = 1;

	ctx.strokeStyle = "black";
}


























function Strand()
{
	this.originPoint = new Point(0, 0, 0);
	this.originPoint_T = new Point(0, 0, 0, 'blue', 7);

	optimize_button = Create_ToggleButton(550, 30, 70, 25, "Optimize");
	angle_slider = Create_Slider(550, 60, 150, 20, "Angle", 10, 0, 179.99, 45);
	offset_slider = Create_Slider(550, 90, 150, 20, "Offset", 10, -1.99, 2, 0);

	this.optimize_button = ToggleButtons[optimize_button];
	this.angle_slider = Sliders[angle_slider];
	this.offset_slider = Sliders[offset_slider];



	// Calculate center surface position of all hull points.

	Hull = BPerimeter.vertices;

	var avgt = 1;
	var avgu = 1;

	for (var i = 0; i < Hull.length; i++)
	{
		var V = Hull[i];

		avgt += Math.pow(V[0],2);
		avgu += Math.pow(V[1],2);
	}

	avgt /= Hull.length;
	avgu /= Hull.length;

	avgt = Math.sqrt(avgt);
	avgu = Math.sqrt(avgu);

	avgt = 0;
	avgu = 0;

	for (var i = 0; i < DMap.points.length; i++)
	{
		var p = DMap.points[i];
		avgt += p.t;
		avgu += p.u;
	}

	avgt /= DMap.points.length;
	avgu /= DMap.points.length;


	var coords = BSurface.calc(avgt, avgu);

	this.originPoint.x = coords[0];
	this.originPoint.y = coords[1];
	this.originPoint.z = coords[2];

	this.originPoint.t = avgt;
	this.originPoint.u = avgu;

	this.angle = 45;
	this.offset = 0;

	this.setAngle(45, 0);
}

Strand.prototype.setOrigin = function(t, u)
{
	var coords = BSurface.calc(t, u);

	this.originPoint.x = coords[0];
	this.originPoint.y = coords[1];
	this.originPoint.z = coords[2];

	this.originPoint.t = t;
	this.originPoint.u = u;

	this.setAngle(this.angle, 0);
}

Strand.prototype.setAngle = function(angle_degrees, offset)
{
	var width_of_gap = 4;

	var angle = angle_degrees * Math.PI/180;

	var perpendicular_angle = (angle_degrees + 90) * Math.PI/180;

	// Search for parameters in surface space that give a real space distance of 2 angstrom offset.

	var target = offset;

	var starting_p = this.originPoint;

	var t1 = starting_p.t;
	var u1 = starting_p.u;

	var sumdist = 0;
	var i = 0;
	var prev_coords = null;

	var delta = 0.001;

	var t = t1;
	var u = u1;

	var i = 0;

	var dir = sign(target);

	var delta_t = -dir*delta*Math.sin(perpendicular_angle);
	var delta_u = dir*delta*Math.cos(perpendicular_angle);

	var dx = 0;
	var dy = 0;

	while (i < 5/delta) // Search for a max 5 Angstroms surface-space)
	{
		t += delta_t;
		u += delta_u;

		var coords = BSurface.calc(t, u);

		if (i == 0)
		{
			sumdist += this.distBetweenSamples(coords[0], coords[1], coords[2], starting_p.x, starting_p.y, starting_p.z);
		}
		else
		{
			sumdist += this.distBetweenSamples(coords[0], coords[1], coords[2], prev_coords[0], prev_coords[1], prev_coords[2]);
		}

		prev_coords = coords;

		if (sumdist > Math.abs(target))
		{
			dx = t - t1;
			dy = u - u1;

			break;
		}

		i++;
	}



	Hull = BPerimeter.vertices;

	intersects = getIntersectionPoints(this.originPoint.t + dx, this.originPoint.u + dy, angle, Hull, true);

	coords1 = BSurface.calc(intersects[0][0], intersects[0][1]);
	coords2 = BSurface.calc(intersects[1][0], intersects[1][1]);

	// Linearly interpolate between two intersections points on surface space.

	var t1 = intersects[0][0];
	var u1 = intersects[0][1];

	var t2 = intersects[1][0];
	var u2 = intersects[1][1];

	var N = 100;

	this.points = new Array();
	this.points_T = new Array();

	for (var i = 0; i < N; i++)
	{
		var P = i/(N-1);

		var t = t1 + P*(t2-t1);
		var u = u1 + P*(u2-u1);

		var coords = BSurface.calc(t, u);

		var sample = new Point(coords[0], coords[1], coords[2]);

		sample.t = t;
		sample.u = u;

		var sample_T = new Point(0, 0, 0, 'black',3)

		this.points.push(sample);
		this.points_T.push(sample_T);
	}



	// Estimate arclength of entire arc.

	var sumdist = 0;

	this.points[0].sumdist = 0;

	for (var i = 1; i < this.points.length; i++)
	{
		var p = this.points[i-1];
		var p2 = this.points[i];

		var dist = p.dist(p2);

		sumdist += dist;

		//console.log(sumdist);

		p2.sumdist = sumdist;
	}


	// Given arclength estimation, find points closest to the 1/5 2/5 3/5 4/5 definition
	// to populate the midPoints array.

	var i = 0;

	this.midPoints = new Array();
	this.midPoints_T = new Array();

	for (var j = 1; j < 5; j++)
	{
		var target = sumdist*(j/5);

		while(i < this.points.length)
		{
			var p = this.points[i];
			var p_T = this.points_T[i];

			if (p.sumdist > target)
			{
				this.midPoints.push(p);
				this.midPoints_T.push(p_T);

				//console.log(p.sumdist);
				break;
			}

			i++;
		}
	}





	var target = width_of_gap;
	var delta = .005; // 0.1 Angstrom delta for search


	this.midPointsLeft = new Array();
	this.midPointsLeft_T = new Array();

	var perpendicular_angle = (angle_degrees + 90) * Math.PI/180;

	for (var j = 0; j < this.midPoints.length; j++)
	{
		var starting_p = this.midPoints[j];

		var t1 = starting_p.t;
		var u1 = starting_p.u;

		var sumdist = 0;
		var i = 0;
		var prev_coords = null;

		var t = t1;
		var u = u1;

		var i = 0;

		var delta_t = -delta*Math.sin(perpendicular_angle);
		var delta_u = delta*Math.cos(perpendicular_angle);

		while (i < 10/delta) // Search for a max 10 Angstroms surface-space)
		{
			t += delta_t;
			u += delta_u;

			var coords = BSurface.calc(t, u);

			if (i == 0)
			{
				sumdist += this.distBetweenSamples(coords[0], coords[1], coords[2], starting_p.x, starting_p.y, starting_p.z);
			}
			else
			{
				sumdist += this.distBetweenSamples(coords[0], coords[1], coords[2], prev_coords[0], prev_coords[1], prev_coords[2]);
			}

			prev_coords = coords;

			if (sumdist > target)
			{
				var p = new Point(coords[0], coords[1], coords[2]);
				var p_T = new Point(coords[0], coords[1], coords[2], "black", 3);


				this.midPointsLeft.push(p);
				this.midPointsLeft_T.push(p_T);

				break;
			}

			i++;
		}
	}







	this.midPointsRight = new Array();
	this.midPointsRight_T = new Array();

	var perpendicular_angle = (angle_degrees - 90) * Math.PI/180;

	for (var j = 0; j < this.midPoints.length; j++)
	{
		var starting_p = this.midPoints[j];

		var t1 = starting_p.t;
		var u1 = starting_p.u;

		var sumdist = 0;
		var i = 0;
		var prev_coords = null;

		var t = t1;
		var u = u1;

		var i = 0;

		var delta_t = -delta*Math.sin(perpendicular_angle);
		var delta_u = delta*Math.cos(perpendicular_angle);

		while (i < 10/delta) // Search for a max 10 Angstroms surface-space)
		{
			t += delta_t;
			u += delta_u;

			var coords = BSurface.calc(t, u);

			if (i == 0)
			{
				sumdist += this.distBetweenSamples(coords[0], coords[1], coords[2], starting_p.x, starting_p.y, starting_p.z);
			}
			else
			{
				sumdist += this.distBetweenSamples(coords[0], coords[1], coords[2], prev_coords[0], prev_coords[1], prev_coords[2]);
			}

			prev_coords = coords;

			if (sumdist > target)
			{
				var p = new Point(coords[0], coords[1], coords[2]);
				var p_T = new Point(coords[0], coords[1], coords[2], "black", 3);


				this.midPointsRight.push(p);
				this.midPointsRight_T.push(p_T);

				break;
			}

			i++;
		}
	}


	this.updateScore();

	this.updateTransformedPoints();
}

Strand.prototype.updateScore = function()
{
	this.angles = new Array();

	// Calculate angle between mid and left arrays.

	for (var i = 1; i < this.midPointsLeft.length; i++)
	{
		var p1 = this.midPoints[i-1];
		var p2 = this.midPoints[i];

		var p3 = this.midPointsLeft[i-1];
		var p4 = this.midPointsLeft[i];

		var angle = this.angleBetweenTwoVectors(p2.x-p1.x, p2.y-p1.y, p2.z-p1.z,p4.x-p3.x, p4.y-p3.y, p4.z-p3.z, p1, p3);
		angle *= 180/Math.PI;

		this.angles.push(angle);
	}

	// Calculate angle between mid and right arrays.

	for (var i = 1; i < this.midPointsRight.length; i++)
	{
		var p1 = this.midPoints[i-1];
		var p2 = this.midPoints[i];

		var p3 = this.midPointsRight[i-1];
		var p4 = this.midPointsRight[i];

		var angle = this.angleBetweenTwoVectors(p2.x-p1.x, p2.y-p1.y, p2.z-p1.z,p4.x-p3.x, p4.y-p3.y, p4.z-p3.z, p1, p3);
		angle *= 180/Math.PI;

		this.angles.push(angle);
	}


	var max_ang = 0;
	var max_i = -1;

	for (var i = 0; i < this.angles.length; i++)
	{
		var ang = this.angles[i];

		if (Math.abs(ang) > max_ang)
		{
			max_ang = ang;
			max_i = i;
		}
	}

	this.max_ang = max_ang;



	// Calculate average twist angle

	var avg_ang = 0;

	for (var i = 0; i < this.angles.length; i++)
	{
		var ang = this.angles[i];
		avg_ang += ang;
	}

	this.avg_ang = avg_ang/this.angles.length;


	this.maxAnglePoints = new Array();

	if (max_i != -1)
	{
		if (max_i < 3) // left
		{
			var p1 = this.midPointsLeft_T[max_i];
			var p2 = this.midPointsLeft_T[max_i+1]


			p1.color = "black";



			p2.color = "black";

			
		}
		else // right
		{
			max_i -= 3;

			var p1 = this.midPointsRight_T[max_i];
			var p2 = this.midPointsRight_T[max_i+1]

			p1.color = "black";
			p2.color = "black";
		}

		this.maxAnglePoints.push(p1);
		this.maxAnglePoints.push(p2);
	}
}

Strand.prototype.angleBetweenTwoVectors = function(x1, y1, z1, x2, y2, z2, p1, p3)
{
	var l1 = Math.sqrt(Math.pow(x1,2)+Math.pow(y1,2)+Math.pow(z1,2));
	var l2 = Math.sqrt(Math.pow(x2,2)+Math.pow(y2,2)+Math.pow(z2,2));

	var dot = x1*x2 + y1*y2 + z1*z2;

	var ang = Math.acos(dot/l1/l2);

	// Twist direction calculation

	var cross_x = y1*z2 - z1*y2;
	var cross_y = z1*x2 - x1*z2;
	var cross_z = x1*y2 - y1*x2;

	var delta_x = p1.x - p3.x;
	var delta_y = p1.y - p3.y;
	var delta_z = p1.z - p3.z;

	var dot_dir = cross_x*delta_x + cross_y*delta_y + cross_z*delta_z;

	var dir = sign(dot_dir);

	return dir*ang;
}

Strand.prototype.distBetweenSamples = function(x1, y1, z1, x2, y2, z2)
{
	return Math.sqrt(Math.pow(x1-x2,2)+Math.pow(y1-y2,2)+Math.pow(z1-z2,2));
}

Strand.prototype.optimizeAngle = function()
{
	// Do 10 linear interpolants to find rough max angle.
	var min_ang = 0;
	var max_ang = 179.99;
	var N = 10;

	var delta = (max_ang-min_ang)/(N-1);

	var angles = new Array(N);
	var scores = new Array(N);

	for (var i = 0; i < N; i++)
	{
		var ang = min_ang + (max_ang-min_ang)*i/(N-1);
		this.setAngle(ang);
		scores[i] = this.avg_ang;
		angles[i] = ang;
	}

	// Calculate angle with largest score

	var max_score = -9999;
	var max_i = -1;
	for (var i = 0; i < scores.length; i++)
	{
		var score = scores[i];
		if (score > max_score)
		{
			max_score = score;
			var max_i = i;
		}
	}

	if (max_i < 0)
	{
		// Error, maximum score not found.
	}

	// Rough max angle found, begin iterative improvement process, starting with rough delta/2

	delta = delta/2;

	console.log("Initial change delta: " + delta);

	var current_score = scores[max_i];
	var current_angle = angles[max_i]; // Rough optimal angle





	while (delta > .05)
	{
		this.setAngle(current_angle + delta);
		var current_score_plus = this.avg_ang;
		var current_angle_plus = current_angle + delta;
		var score_change_plus = current_score_plus - current_score;


		this.setAngle(current_angle - delta);
		var current_score_minus = this.avg_ang;
		var current_angle_minus = current_angle - delta;
		var score_change_minus = current_score_minus - current_score;


		// Two delta-scores found, choose larger one

		if (score_change_plus >= score_change_minus && score_change_plus > 0)
		{
			// Plus results in score increase, take it.
			current_score = current_score_plus;
			current_angle = current_angle_plus;
			delta = delta/2;
		}
		else if (score_change_minus > score_change_plus && score_change_minus > 0)
		{
			// Minus results in score increase, take it.
			current_score = current_score_minus;
			current_angle = current_angle_minus;
			delta = delta/2;
		}
		else
		{
			// Both results in score decrease, half the search delta and try again.
			delta = delta/2;
		}

		console.log(delta + ":  Score: " + current_score);
	}


	// We now have the best angle for this particular origin point.
	this.angle_slider.setValue(current_angle);
	this.angle = current_angle;

	console.log("Best angle: " + current_angle);

	this.optimized = true;


}

Strand.prototype.generateSurfaceField = function()
{

}

Strand.prototype.draw = function()
{

	if (!this.optimized)
	{
		if ((this.angle_slider.value != this.angle) || (this.offset_slider.value != this.offset))
		{
			this.angle = this.angle_slider.value;

			this.offset = this.offset_slider.value;

			this.setAngle(this.angle, this.offset);
		}		
	}


	if (this.optimize_button.activated)
	{
		this.optimizeAngle();
		this.optimize_button.activated = false;
	}


	// Draw middle strand line

	var needToMove = true;

	ctx.strokeStyle = "darkgrey";
	ctx.lineWidth = 10;

	ctx.beginPath();

	for (var i = 0; i < this.points_T.length; i++)
	{
		var p = this.points_T[i];

		p.draw(false) // Calculate scale.

		if (p.scale > 0) // Inside window
		{
			if (needToMove)
			{
				ctx.moveTo(p.x2d, p.y2d);
				needToMove = false;
			}
			else
			{
				ctx.lineTo(p.x2d, p.y2d);
			}
		}
		else
		{
			needToMove = true;
		}
	}

	ctx.stroke();

	ctx.lineWidth = 1; // Reset line width.



	this.originPoint_T.draw();

	// Draw midpoint lines

	var needToMove = true;

	ctx.strokeStyle = "black";
	ctx.lineWidth = 2;

	ctx.beginPath();

	for (var i = 0; i < this.midPoints_T.length; i++)
	{
		var p = this.midPoints_T[i];

		p.draw(false) // Calculate scale.

		if (p.scale > 0) // Inside window
		{
			if (needToMove)
			{
				ctx.moveTo(p.x2d, p.y2d);
				needToMove = false;
			}
			else
			{
				ctx.lineTo(p.x2d, p.y2d);
			}
		}
		else
		{
			needToMove = true;
		}
	}

	ctx.stroke();

	ctx.lineWidth = 1; // Reset line width.






	// Draw left midpoint lines

	var needToMove = true;

	ctx.strokeStyle = "black";
	ctx.lineWidth = 2;

	ctx.beginPath();

	for (var i = 0; i < this.midPointsLeft_T.length; i++)
	{
		var p = this.midPointsLeft_T[i];

		p.draw(false) // Calculate scale.

		if (p.scale > 0) // Inside window
		{
			if (needToMove)
			{
				ctx.moveTo(p.x2d, p.y2d);
				needToMove = false;
			}
			else
			{
				ctx.lineTo(p.x2d, p.y2d);
			}
		}
		else
		{
			needToMove = true;
		}
	}

	ctx.stroke();

	ctx.lineWidth = 1; // Reset line width.




	// Draw left midpoint lines

	var needToMove = true;

	ctx.strokeStyle = "black";
	ctx.lineWidth = 2;

	ctx.beginPath();

	for (var i = 0; i < this.midPointsRight_T.length; i++)
	{
		var p = this.midPointsRight_T[i];

		p.draw(false) // Calculate scale.

		if (p.scale > 0) // Inside window
		{
			if (needToMove)
			{
				ctx.moveTo(p.x2d, p.y2d);
				needToMove = false;
			}
			else
			{
				ctx.lineTo(p.x2d, p.y2d);
			}
		}
		else
		{
			needToMove = true;
		}
	}

	ctx.stroke();

	ctx.lineWidth = 1; // Reset line width.




	// Draw maximum angle line

	ctx.beginPath();
	ctx.strokeStyle = "black";
	ctx.lineWidth = 2;

	for (var i = 0; i < this.maxAnglePoints.length; i++)
	{
		var p = this.maxAnglePoints[i];
		if (p != undefined)
		{
			p.draw(false);

			if (i == 0)
			{
				if (p.scale > 0)
				{
					ctx.moveTo(p.x2d, p.y2d);
				}
				else
				{
					break;
				}
			}
			else
			{
				if (p.scale > 0)
				{
					ctx.lineTo(p.x2d, p.y2d)
				}
				else
				{
					break;
				}
			}
		}
	}

	ctx.stroke();




	ctx.lineWidth = 1;




	// Draw midpoints

	for (var i = 0; i < this.midPoints_T.length; i++)
	{
		var p = this.midPoints_T[i];
		p.draw();
	}


	// Draw left midpoints

	for (var i = 0; i < this.midPointsLeft_T.length; i++)
	{
		var p = this.midPointsLeft_T[i];
		p.draw();
	}

	// Draw right midpoints

	for (var i = 0; i < this.midPointsRight_T.length; i++)
	{
		var p = this.midPointsRight_T[i];
		p.draw();
	}


	// Draw textual output

	ctx.fillStyle = "black";
	ctx.fillText("Max Ang (deg): " + this.max_ang, 10, 100);

	ctx.fillText("Avg Ang (deg): " + this.avg_ang, 10, 70);

}

Strand.prototype.updateTransformedPoints = function()
{
	this.originPoint_T.moveTo(this.originPoint);
	this.originPoint_T.scaleFactor(zoom);
	this.originPoint_T.rotateY(yaw);
	this.originPoint_T.rotateX(pitch);

	for (var i = 0; i < this.points_T.length; i++)
	{
		this.points_T[i].moveTo(this.points[i]);
		this.points_T[i].scaleFactor(zoom);
		this.points_T[i].rotateY(yaw);
		this.points_T[i].rotateX(pitch);
	}

	if (this.midPointsLeft_T != undefined)
	{
		for (var i = 0; i < this.midPointsLeft_T.length; i++)
		{
			this.midPointsLeft_T[i].moveTo(this.midPointsLeft[i]);
			this.midPointsLeft_T[i].scaleFactor(zoom);
			this.midPointsLeft_T[i].rotateY(yaw);
			this.midPointsLeft_T[i].rotateX(pitch);
		}
	}

	if (this.midPointsRight_T != undefined)
	{
		for (var i = 0; i < this.midPointsRight_T.length; i++)
		{
			this.midPointsRight_T[i].moveTo(this.midPointsRight[i]);
			this.midPointsRight_T[i].scaleFactor(zoom);
			this.midPointsRight_T[i].rotateY(yaw);
			this.midPointsRight_T[i].rotateX(pitch);
		}
	}

}



























function Surface(X, Y, T, U)
{
	this.X = X;
	this.Y = Y;
	this.T = T;
	this.U = U;

	this.drawSurface = true;

	this.drawControlPoints = true;


	// Control points determine the shape of the curve.  Here, we define
	//  an initial array of size X, Y of these control points.  As well,
	//  we define the array of camera-transformed control points

	this.controlPoints = new Array(X);
	this.controlPoints_T = new Array(X);

	for (var i = 0; i < X; i++)
	{
		this.controlPoints[i] = new Array(Y);
		this.controlPoints_T[i] = new Array(Y);
	}

	var lower = -50;
	var upper = 50;

	for (var i = 0; i < X; i++)
	{
		for (var j = 0; j < Y; j++)
		{
			var x = lower + i/(X-1)*(upper - lower);
			var z = lower + j/(X-1)*(upper - lower);

			var width = 0;

			var y = Math.random()*width*2 - width; // Between -width and width

			this.controlPoints[i][j] = new Point(x, y, z)
			this.controlPoints_T[i][j] = new Point(x, y, z, "black", 2);
		}
	}






	// resPoints (Resolution points) are the initial estimate points for the heuristic
	//  point-projection algorithm.  They are a low-resolution sample of the curve, an
	//  array of small enough size that it is not prohibitive to find the minimum distance
	//  of the array of points from one point.  We also define the transformed version.

	var RX = X + 1;
	var RY = Y + 1;

	this.RX = RX;
	this.RY = RY;

	this.resPoints = new Array(RX);
	this.resPoints_T = new Array(RX);

	for (var i = 0; i < RX; i++)
	{
		this.resPoints[i] = new Array(RY);
		this.resPoints_T[i] = new Array(RY);
	}

	// We only need to allocate the object array here.  The correct values will be calculated
	//  in updatePoints();
	for (var i = 0; i < RX; i++)
	{
		for (var j = 0; j < RY; j++)
		{
			this.resPoints[i][j] = new Point(0, 0, 0)
			this.resPoints_T[i][j] = new Point(0, 0, 0, "blue", 1);
		}
	}




	// Draw point are the sample points of the surface which we use the render and display
	//  the shape of the surface.  As well, we define the array of camera-transformed 
	//  sample points.  (Which we need, of course, to draw on the screen).

	this.drawPoints = new Array(T);
	this.drawPoints_T = new Array(T);

	for (var i = 0; i < T; i++)
	{
		this.drawPoints[i] = new Array(U);
		this.drawPoints_T[i] = new Array(U);
	}

	// We only need to allocate the object array of draw points here; the point locations
	//  are calculated in the updatePoints() function.
	for (var i = 0; i < T; i++)
	{
		for (var j = 0; j < U; j++)
		{
			this.drawPoints[i][j] = new Point(0, 0, 0);
			this.drawPoints_T[i][j] = new Point(0, 0, 0);
		}
	}

	this.updatePoints();
};

Surface.prototype.updateNumberofResPoints = function(RX, RY)
{
	this.RX = RX;
	this.RY = RY;

	this.resPoints = new Array(RX);
	this.resPoints_T = new Array(RX);

	for (var i = 0; i < RX; i++)
	{
		this.resPoints[i] = new Array(RY);
		this.resPoints_T[i] = new Array(RY);
	}

	// We only need to allocate the object array here.  The correct values will be calculated
	//  in updatePoints();
	for (var i = 0; i < RX; i++)
	{
		for (var j = 0; j < RY; j++)
		{
			this.resPoints[i][j] = new Point(0, 0, 0)
			this.resPoints_T[i][j] = new Point(0, 0, 0, "blue", 1);
		}
	}
}

Surface.prototype.setControlPoints = function(array_of_points)
{
	this.X = array_of_points.length;
	this.Y = array_of_points[0].length;

	this.controlPoints = new Array(this.X);
	this.controlPoints_T = new Array(this.X);

	for (var i = 0; i < this.X; i++)
	{
		this.controlPoints[i] = new Array(this.Y);
		this.controlPoints_T[i] = new Array(this.Y);

		for (var j = 0; j < this.Y; j++)
		{
			var p_original = array_of_points[i][j]
			var p = new Point(0, 0, 0);
			p.moveTo(p_original);
			var p2 = new Point(0, 0, 0, "black", 4);

			this.controlPoints[i][j] = p;
			this.controlPoints_T[i][j] = p2;
		}
	}

	this.updatePoints();
	DMap.updateProjection();
}

Surface.prototype.updatePoints = function()
{
	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			if (DMap != undefined)
			{
				var size_t = DMap.max_t - DMap.min_t;
				var size_u = DMap.max_u - DMap.min_u;
				var min_t = DMap.min_t;
				var min_u = DMap.min_u;
			}
			else
			{
				var size_t = 1;
				var size_u = 1;
				var min_t = 0;
				var min_u = 0;
			}

			var t = size_t*i/(this.T-1) + min_t;
			var u = size_u*j/(this.U-1) + min_u;

			var coords = this.calc(t, u);
			var p = this.drawPoints[i][j];

			p.x = coords[0];
			p.y = coords[1];
			p.z = coords[2];
		}
	}

	for (var i = 0; i < this.RX; i++)
	{
		for (var j = 0; j < this.RY; j++)
		{
			var t = i/(this.RX-1);
			var u = j/(this.RY-1);

			var coords = this.calc(t, u);
			var p = this.resPoints[i][j];

			p.x = coords[0];
			p.y = coords[1];
			p.z = coords[2];
		}
	}
};

var opt_t = 0;
var opt_lim = 20;
var count = 0;

Surface.prototype.draw = function()
{
	if (!BPlane.finished || this.finished)
	{
		opt_t = 0;
	}

	if (opt_t == opt_lim)
	{
		var score = DMap.score();

		for (var i = 0; i < this.X; i++)
		{
			for (var j = 0; j < this.Y; j++)
			{
				var p = this.controlPoints[i][j];
				this.optimizeControlPoint(p);
			}
		}
		this.updatePoints();
		this.updateTransformedPoints();

		var new_score = DMap.score();

		if (score == new_score)
		{
			if (count > 3)
			{
				this.finished = true;
				count = 0;
			}
			count++;
		}
		else
		{
			count = 0;
		}

		opt_t = 0;
	}
	else
	{
		opt_t++;
	}

	if (this.drawSurface)
	{
		// 'Draw' surface points to calculate their 'scale' (if negative, outside of cam space)
		for (var i = 0; i < this.T; i++)
		{
			for (var j = 0; j < this.U; j++)
			{
				this.drawPoints_T[i][j].draw(false);
			}
		}

		// Draw surface wireframe

		ctx.strokeStyle = "grey";

		ctx.beginPath();

		var needToMove = false;

		for (var i = 0; i < this.T; i++)
		{
			var j = 0;

			var p = this.drawPoints_T[i][j];

			if (p.scale > 0)
			{
				ctx.moveTo(p.x2d, p.y2d);
			}
			else
			{
				needToMove = true;
			}
			


			for (var j = 0; j < this.U; j++)
			{
				var p = this.drawPoints_T[i][j];


				if (p.scale > 0)
				{
					if (!needToMove)
					{
						ctx.lineTo(p.x2d, p.y2d);
					}
					else
					{
						ctx.moveTo(p.x2d, p.y2d);
						needToMove = false;
					}
				}
			}
		}

		var needToMove = false;

		for (var i = 0; i < this.U; i++)
		{
			var j = 0;

			var p = this.drawPoints_T[j][i];

			if (p.scale > 0)
			{
				ctx.moveTo(p.x2d, p.y2d)
			}
			else
			{
				needToMove = true;
			}
			

			for (var j = 0; j < this.T; j++)
			{
				var p = this.drawPoints_T[j][i];
				if (p.scale > 0)
				{
					if (!needToMove)
					{
						ctx.lineTo(p.x2d, p.y2d);
					}
					else
					{
						ctx.moveTo(p.x2d, p.y2d);
						needToMove = false;
					}
				}
				
			}
		}

		ctx.stroke();
	}




	if (this.drawControlPoints)
	{
		// Draw resolution points
		for (var i = 0; i < this.RX; i++)
		{
			for (var j = 0; j < this.RY; j++)
			{
				this.resPoints_T[i][j].draw();
			}
		}


		// Draw control points
		for (var i = 0; i < this.X; i++)
		{
			for (var j = 0; j < this.Y; j++)
			{
				this.controlPoints_T[i][j].draw();
			}
		}		
	}
	else
	{
		// Even if don't draw, still update their screen positions invisibly
		//  so that the mouse object can use them for its initial heuristic
		//  surface projection method.
		for (var i = 0; i < this.RX; i++)
		{
			for (var j = 0; j < this.RY; j++)
			{
				this.resPoints_T[i][j].draw(false);
			}
		}
	}
};

Surface.prototype.closestControlPoint2D = function(obj)
{
	var closest = 999999;
	var closest_id = -1;

	for (var i = 0; i < this.controlPoints_T.length; i++)
	{
		for (var j = 0; j < this.controlPoints_T[i].length; j++)
		{
			var p = this.controlPoints_T[i][j];
			var dist = p.dist2d(obj);

			if (dist < closest)
			{
				closest = dist;
				closest_surface_x = i;
				closest_surface_y = j;
			}
		}
	}

	return [closest_surface_x, closest_surface_y];
};

Surface.prototype.moveControlPointTo2D = function(i, j, x2d, y2d)
{
	var p = this.controlPoints_T[i][j];

	var scale = p.scale;

	// Transform modified screen space coordinates into camera space coordinates
	p.x = (x2d - cvs.width/2) / scale;
	p.y = (y2d - cvs.height/2) / scale;
	p.z = fov/scale - fov;

	// Transform camera space coordinates into world space
	var p_world = new Point;
	p_world.moveTo(p);

	p_world.rotateX(-pitch);
	p_world.rotateY(-yaw);
	p_world.scaleFactor(1/zoom);

	this.controlPoints[i][j].moveTo(p_world);
};

// Given surface parameters t and u, this function returns the xyz coordinates of that surface location.
Surface.prototype.calc = function(t, u)
{
	var sum_x = 0;
	var sum_y = 0;
	var sum_z = 0;

	// Loop through control points
	for (var x = 0; x < this.X; x++)
	{
		for (var y = 0; y < this.Y; y++)
		{
			var control_point = this.controlPoints[x][y];
			var control_x = control_point.x;
			var control_y = control_point.y;
			var control_z = control_point.z;

			var product = this.basis(t, x, this.X - 1) * this.basis(u, y, this.Y - 1);

			sum_x += product*control_x;
			sum_y += product*control_y;
			sum_z += product*control_z;
		}
	}

	return [sum_x, sum_y, sum_z];
}

Surface.prototype.basis = function(t, i, n)
{
	return binomial(n, i)*Math.pow(t, i)*Math.pow(1-t,n-i);
};

Surface.prototype.optimizeControlPoint = function(p)
{
	var iterations = 9;

	var delta_x = 1;
	var delta_y = 1;
	var delta_z = 1;

	var threshold = .0003;

	//var threshold = .001

	var score = DMap.score();

	var previous_state_x = 0;
	var previous_state_y = 0;
	var previous_state_z = 0;

	for (var i = 0; i < iterations; i++)
	{
		p.x += delta_x;
		var score_inc = DMap.score();
		p.x -= 2*delta_x;
		var score_dec = DMap.score();
		p.x += delta_x;

		if (score_inc < score_dec)
		{
			if (score - score_inc > threshold)
			{
				p.x += delta_x;
				score = score_inc;
			}
			else if (previous_state_x == 1)
			{
				delta_x /= 2;
			}
			previous_state_x = 1;
		}
		else if (score_dec < score_inc)
		{
			if (score - score_dec > threshold)
			{
				p.x -= delta_x;
				score = score_dec;
			}
			else if (previous_state_x == -1)
			{
				delta_x /= 2;
			}
			previous_state_x = -1;
		}

		p.y += delta_y;
		var score_inc = DMap.score();
		p.y -= 2*delta_y;
		var score_dec = DMap.score();
		p.y += delta_y;

		if (score_inc < score_dec)
		{
			if (score - score_inc > threshold)
			{
				p.y += delta_y;
				score = score_inc;
			}
			else if (previous_state_y == 1)
			{
				delta_y /= 2;
			}
			previous_state_y = 1;
		}
		else if (score_dec < score_inc)
		{
			if (score - score_dec > threshold)
			{
				p.y -= delta_y;
				score = score_dec;
			}
			else if (previous_state_y == -1)
			{
				delta_y /= 2;
			}
			previous_state_y = -1;
		}

		p.z += delta_z;
		var score_inc = DMap.score();
		p.z -= 2*delta_z;
		var score_dec = DMap.score();
		p.z += delta_z;

		if (score_inc < score_dec)
		{
			if (score - score_inc > threshold)
			{
				p.z += delta_z;
				score = score_inc;
			}
			else if (previous_state_z == 1)
			{
				delta_z /= 2;
			}
			previous_state_z = 1;
		}
		else if (score_dec < score_inc)
		{
			if (score - score_dec > threshold)
			{
				p.z -= delta_z;
				score = score_dec;
			}
			else if (previous_state_z == -1)
			{
				delta_z /= 2;
			}
			previous_state_z = -1;
		}
	}


};

Surface.prototype.updateTransformedPoints = function()
{
	for (var i = 0; i < this.X; i++)
	{
		for (var j = 0; j < this.Y; j++)
		{
			this.controlPoints_T[i][j].moveTo(this.controlPoints[i][j]);
			this.controlPoints_T[i][j].scaleFactor(zoom);
			this.controlPoints_T[i][j].rotateY(yaw);
			this.controlPoints_T[i][j].rotateX(pitch);
		}
	}

	for (var i = 0; i < this.T; i++)
	{
		for (var j = 0; j < this.U; j++)
		{
			this.drawPoints_T[i][j].moveTo(this.drawPoints[i][j]);
			this.drawPoints_T[i][j].scaleFactor(zoom);
			this.drawPoints_T[i][j].rotateY(yaw);
			this.drawPoints_T[i][j].rotateX(pitch);
		}
	}

	for (var i = 0; i < this.RX; i++)
	{
		for (var j = 0; j < this.RY; j++)
		{
			this.resPoints_T[i][j].moveTo(this.resPoints[i][j]);
			this.resPoints_T[i][j].scaleFactor(zoom);
			this.resPoints_T[i][j].rotateY(yaw);
			this.resPoints_T[i][j].rotateX(pitch);
		}
	}
}

Surface.prototype.incrementControlPoints = function()
{
	var x = this.X + 1;
	var y = this.Y + 1;

	var controlPoints = new Array(x);
	var controlPoints_T = new Array(x);

	for (var i = 0; i < x; i++)
	{
		controlPoints[i] = new Array(y);
		controlPoints_T[i] = new Array(y);

		for (var j = 0; j < y; j++)
		{
			var t = i/(x-1)
			var u = j/(y-1)
			
			coords = this.calc(t, u);

			controlPoints[i][j] = new Point(coords[0], coords[1], coords[2]);
			controlPoints_T[i][j] = new Point(0, 0, 0, "black", 4);
		}
	}

	this.X++;
	this.Y++;
	this.controlPoints = controlPoints;
	this.controlPoints_T = controlPoints_T;
}









































function Plane(A, B, C, D)
{
	this.A = A;
	this.B = B;
	this.C = C;
	this.D = D;

	this.points = new Array(); // Array of immutable points
	this.points_T = new Array(); // Array of points in camera space

	this.alpha = 0;
	this.beta = 0;
	this.delta = 0;

	this.generatePoints();

	this.finished = false;
}

Plane.prototype.generatePoints = function()
{
	this.points = this.points.splice(0, 0);
	this.points_T = this.points_T.splice(0, 0);

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
		var size = 20;
		for (var y = -size; y <= size; y += 2)
		{
			for (var z = -size; z <= size; z += 2)
			{
				var x = (-this.D - this.B*y - this.C*z)/this.A;
				var p = new Point(x, y, z, this.color);
				var p2 = new Point(0, 0, 0);
				this.points.push(p);
				this.points_T.push(p2);
			}
		}
	}	
	else if (max_i == 1) // If 'B' is the highest term, generate y-vals
	{
		var size = 20;
		for (var x = -size; x <= size; x += 2)
		{
			for (var z = -size; z <= size; z += 2)
			{
				var y = (-this.D - this.A*x - this.C*z)/this.B;
				var p = new Point(x, y, z, this.color);
				var p2 = new Point(0, 0, 0);
				this.points.push(p);
				this.points_T.push(p2);
			}
		}
	}
	else if (max_i == 2) // If 'C' is the highest term, generate z-vals
	{
		var size = 20;
		for (var x = -size; x <= size; x += 2)
		{
			for (var y = -size; y <= size; y += 2)
			{
				var z = (-this.D - this.A*x - this.B*y)/this.C;
				var p = new Point(x, y, z, this.color);
				var p2 = new Point(0, 0, 0);
				this.points.push(p);
				this.points_T.push(p2);
			}
		}
	}

};

Plane.prototype.draw = function()
{
	this.generatePoints();
	this.updateTransformedPoints();

	for (var i = 0; i < this.points.length; i++)
	{
		this.points_T[i].draw();
	}
};

Plane.prototype.updateTransformedPoints = function()
{
	for (var i = 0; i < this.points.length; i++)
	{
		this.points_T[i].moveTo(this.points[i]);
		this.points_T[i].scaleFactor(zoom);
		this.points_T[i].rotateY(yaw);
		this.points_T[i].rotateX(pitch);
	}
}

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

	for (var i = 0; i < DMap.points.length; i++)
	{
		score += Math.pow(this.distance(DMap.points[i]), 2);
	}

	return score;
};

Plane.prototype.optimize = function()
{
	var base_score = this.score();
	var cut_off = 0;
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

	var total_change = Math.pow(this.alpha - new_alpha, 2) + Math.pow(this.beta - new_beta, 2) + Math.pow(this.delta - new_delta, 2);

	this.alpha = new_alpha;
	this.beta = new_beta;
	this.delta = new_delta;

	return total_change;
};





















function Projection()
{
	this.points = new Array();
	this.points_T = new Array();
}

Projection.prototype.appendPoint = function(x, y, z)
{
	this.points.push(new Point(x, y, z));
	this.points_T.push(new Point(0, 0, 0, "darkgreen", 4));

	this.updateTransformedPoints();
}

Projection.prototype.draw = function()
{
	for (var i = 0; i < this.points_T.length; i++)
	{
		var p = this.points_T[i];
		var para = this.findClosestResPoint(i);
		var closest_p = BSurface.resPoints_T[para[0]][para[1]];

		ctx.strokeStyle = "grey";
		ctx.beginPath();
		ctx.moveTo(p.x2d, p.y2d);
		ctx.lineTo(closest_p.x2d, closest_p.y2d);
		ctx.stroke();



		this.refineProjection(i);

		var coords = BSurface.calc(this.points[i].t, this.points[i].u);
		var proj = new Point(coords[0], coords[1], coords[2], "blue", 1);
		ctx.fillText("Min Dist: " + this.points[i].dist(proj), 20, 20);
		proj.scaleFactor(zoom);
		proj.rotateY(yaw);
		proj.rotateX(pitch);
		proj.draw();
		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(p.x2d, p.y2d);
		ctx.lineTo(proj.x2d, proj.y2d);
		ctx.stroke();


		p.draw();
	}
}

Projection.prototype.refineProjection = function(i)
{
	var p = this.points[i];

	var gap = 1/(BSurface.RX - 1);

	var iterations = 30;

	var delta_t = 2*gap/iterations;
	var delta_u = 2*gap/iterations;

	var threshold = 0;

	var t = p.t;
	var u = p.u;
	var dist = p.distToParameter(t, u);

	var previous_state_t = 0;
	var previous_state_u = 0;

	for (var i = 0; i < iterations; i++)
	{
		var dist_inc = p.distToParameter(t + delta_t, u);
		var dist_dec = p.distToParameter(t - delta_t, u);

		if (dist_inc < dist_dec)
		{
			if (dist - dist_inc > threshold)
			{
				t = t + delta_t;
				dist = dist_inc;
			}
			else if (previous_state_t == 1)
			{
				delta_t /= 2;
			}
			previous_state_t = 1;
		}
		else if (dist_dec < dist_inc)
		{
			if (dist - dist_dec > threshold)
			{
				t = t - delta_t;
				dist = dist_dec;
			}
			else if (previous_state_t == -1)
			{
				delta_t /= 2;
			}
			previous_state_t = -1;
		}


		var dist_inc = p.distToParameter(t, u + delta_u);
		var dist_dec = p.distToParameter(t, u - delta_u);

		if (dist_inc < dist_dec)
		{
			if (dist - dist_inc > threshold)
			{
				u = u + delta_u;
				dist = dist_inc;
			}
			else if (previous_state_u == 1)
			{
				delta_u /= 2;
			}
			previous_state_u = 1;
		}
		else if (dist_dec < dist_inc)
		{
			if (dist - dist_dec > threshold)
			{
				u = u - delta_u;
				dist = dist_dec;
			}
			else if (previous_state_u == -1)
			{
				delta_u /= 2;
			}
			previous_state_u = -1;
		}

	}

	p.t = t;
	p.u = u;
}

Projection.prototype.findClosestResPoint = function(i)
{
	var p = this.points[i];

	var min_dist = 99999999;
	var min_i = -1;
	var min_j = -1;

	for (var i = 0; i < BSurface.RX; i++)
	{
		for (var j = 0; j < BSurface.RY; j++)
		{
			var r = BSurface.resPoints[i][j];

			var dist = p.dist(r);

			if (dist < min_dist)
			{
				min_dist = dist;
				min_i = i;
				min_j = j;
			}
		}
	}

	p.t = min_i/(BSurface.RX - 1);
	p.u = min_j/(BSurface.RY - 1);

	return [min_i, min_j];
}

Projection.prototype.closestPoint2D = function(obj, threshold)
{
	var min_dist = 9999999;
	var min_i = -1;

	for (var i = 0; i < this.points_T.length; i++)
	{
		var p = this.points_T[i];

		var dist = p.dist2d(obj);

		if (dist < min_dist)
		{
			min_dist = dist;
			min_i = i;
		}
	}

	if (min_dist < threshold)
	{
		return min_i;
	}
	else
	{
		return -1;
	}
}

Projection.prototype.movePointTo2D = function(i, x2d, y2d)
{
	var p = this.points_T[i];

	var scale = p.scale;

	// Transform modified screen space coordinates into camera space coordinates
	p.x = (x2d - cvs.width/2) / scale;
	p.y = (y2d - cvs.height/2) / scale;
	p.z = fov/scale - fov;

	// Transform camera space coordinates into world space
	var p_world = new Point;
	p_world.moveTo(p);

	p_world.rotateX(-pitch);
	p_world.rotateY(-yaw);
	p_world.scaleFactor(1/zoom);

	this.points[i].moveTo(p_world);
}

Projection.prototype.updateTransformedPoints = function()
{
	for (var i = 0; i < this.points_T.length; i++)
	{
		this.points_T[i].moveTo(this.points[i]);
		this.points_T[i].scaleFactor(zoom);
		this.points_T[i].rotateY(yaw);
		this.points_T[i].rotateX(pitch);
	}
}





























function Point(x, y, z, color, size, id)
{
	if (color == undefined)
	{
		color = "black";
	}

	if (size == undefined)
	{
		size = 1;
	}

	this.x = x;
	this.y = y;
	this.z = z;
	this.color = color;
	this.size = size;

	this.id = id;
}

Point.prototype.draw = function(actually_draw)
{
	if (actually_draw == undefined)
	{
		actually_draw = true;
	}

	var x3d = this.x;
	var y3d = this.y; 
	var z3d = this.z; 
	this.scale = fov/(fov+z3d); 
	this.x2d = (x3d * this.scale) + cvs.width/2;	
	this.y2d = (y3d * this.scale) + cvs.height/2;

    if (this.scale > 0 && actually_draw)
    {
	    ctx.beginPath();
	    ctx.fillStyle = this.color;
	    ctx.arc(this.x2d, this.y2d, this.scale*this.size, 0, Math.PI*2, true);
	    ctx.fill();
    }
};

Point.prototype.dist2d = function(obj)
{
	return Math.sqrt( Math.pow(this.x2d - obj.x, 2) + Math.pow(this.y2d - obj.y, 2) );
};

Point.prototype.dist = function(obj)
{
	return Math.sqrt( Math.pow(this.x - obj.x, 2) + Math.pow(this.y - obj.y, 2) + Math.pow(this.z - obj.z, 2) );
};

Point.prototype.planeDist = function(A, B, C, D)
{
	return Math.abs(A*this.x + B*this.y + C*this.z + D)/Math.sqrt(A*A + B*B + C*C);
};

Point.prototype.moveTo = function(obj)
{
    this.x = obj.x;
    this.y = obj.y;
    this.z = obj.z;
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
};

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
};

Point.prototype.rotateZ = function(angle)
{
	var p = new Point(this.x, this.y, this.z, this.color);

	x = this.x;
	y = this.y;

	var cosRZ = Math.cos(angle);
	var sinRZ = Math.sin(angle);

	tempx = x;
	tempy = y;

	x = (tempx * cosRZ) + (tempy * -sinRZ);
	y = (tempx * sinRZ) + (tempy * cosRZ);

	this.x = x;
	this.z = z;
};

Point.prototype.rotateAxis = function(ang, ux, uy, uz)
{
	//var x_new = this.x*(Math.cos(ang) + Math.pow(ux, 2)*(1-Math.cos(ang))) + this.y*(uy*ux*(1-Math.cos(ang))+uz*Math.sin(ang)) + this.z*(uz*ux*(1-Math.cos(ang))-uy*Math.sin(ang));
	//var y_new = this.x*(ux*uy*(1-Math.cos(ang))-uz*Math.sin(ang)) + this.y*(Math.cos(ang)+Math.pow(uy,2)*(1-Math.cos(ang))) + this.z*(uz*uy*(1-Math.cos(ang))+ux*Math.sin(ang));
	//var z_new = this.x*(ux*uz*(1-Math.cos(ang))+uy*Math.sin(ang)) + this.y*(uy*uz*(1-Math.cos(ang))-ux*Math.sin(ang)) + this.z*(Math.cos(ang)+Math.pow(uz,2)*(1-Math.cos(ang)));

	var m_11 = Math.cos(ang) + Math.pow(ux,2)*(1-Math.cos(ang));
	var m_12 = ux*uy*(1-Math.cos(ang))-uz*Math.sin(ang);
	var m_13 = ux*uz*(1-Math.cos(ang))+uy*Math.sin(ang);

	var m_21 = uy*ux*(1-Math.cos(ang))+uz*(Math.sin(ang));
	var m_22 = Math.cos(ang) + Math.pow(uy,2)*(1-Math.cos(ang));
	var m_23 = uy*uz*(1-Math.cos(ang))-ux*Math.sin(ang);

	var m_31 = uz*ux*(1-Math.cos(ang))-uy*Math.sin(ang);
	var m_32 = uz*uy*(1-Math.cos(ang))+ux*Math.sin(ang);
	var m_33 = Math.cos(ang) + Math.pow(uz,2)*(1-Math.cos(ang));

	var x_new = this.x*m_11 + this.y*m_21 + this.z*m_31;
	var y_new = this.x*m_12 + this.y*m_22 + this.z*m_32;
	var z_new = this.x*m_13 + this.y*m_23 + this.z*m_33;

	this.x = x_new;
	this.y = y_new;
	this.z = z_new;
};

Point.prototype.distFromLine = function(slope, intersect)
{
	return (slope*this.x - this.z + intersect)/Math.sqrt(Math.pow(slope, 2) + 1);
};

// Given surface parameters t and u, this function returns the distance to that surface location.
Point.prototype.distToParameter = function(t, u)
{
	var coords = BSurface.calc(t, u);
	var x = coords[0];
	var y = coords[1];
	var z = coords[2];
	return Math.sqrt(Math.pow(this.x-x, 2) + Math.pow(this.y-y, 2) + Math.pow(this.z-z, 2));
};

Point.prototype.findClosestResPoint = function()
{
	var min_dist = 99999999;
	var min_i = -1;
	var min_j = -1;

	for (var i = 0; i < BSurface.RX; i++)
	{
		for (var j = 0; j < BSurface.RY; j++)
		{
			var r = BSurface.resPoints[i][j];

			var dist = this.dist(r);

			if (dist < min_dist)
			{
				min_dist = dist;
				min_i = i;
				min_j = j;
			}
		}
	}

	this.t = min_i/(BSurface.RX - 1);
	this.u = min_j/(BSurface.RY - 1);

	return [min_i, min_j];
};

Point.prototype.refineProjection = function(permissive)
{
	if (permissive == undefined)
	{
		permissive = false;
	}

	var gap = 1/(BSurface.RX - 1);

	var iterations = 20;

	var delta_t = 10*gap/iterations;
	var delta_u = 10*gap/iterations;

	var threshold = 0;

	var t = this.t;
	var u = this.u;
	var dist = this.distToParameter(t, u);

	var previous_state_t = 0;
	var previous_state_u = 0;

	for (var i = 0; i < iterations; i++)
	{
		var dist_inc = this.distToParameter(t + delta_t, u);
		var dist_dec = this.distToParameter(t - delta_t, u);

		if (dist_inc < dist_dec)
		{
			if (dist - dist_inc > threshold)
			{
				t = t + delta_t;
				dist = dist_inc;
			}
			else if (previous_state_t == 1)
			{
				delta_t /= 2;
			}
			previous_state_t = 1;
		}
		else if (dist_dec < dist_inc)
		{
			if (dist - dist_dec > threshold)
			{
				t = t - delta_t;
				dist = dist_dec;
			}
			else if (previous_state_t == -1)
			{
				delta_t /= 2;
			}
			previous_state_t = -1;
		}


		var dist_inc = this.distToParameter(t, u + delta_u);
		var dist_dec = this.distToParameter(t, u - delta_u);

		if (dist_inc < dist_dec)
		{
			if (dist - dist_inc > threshold)
			{
				u = u + delta_u;
				dist = dist_inc;
			}
			else if (previous_state_u == 1)
			{
				delta_u /= 2;
			}
			previous_state_u = 1;
		}
		else if (dist_dec < dist_inc)
		{
			if (dist - dist_dec > threshold)
			{
				u = u - delta_u;
				dist = dist_dec;
			}
			else if (previous_state_u == -1)
			{
				delta_u /= 2;
			}
			previous_state_u = -1;
		}
	}


	if (permissive == false)
	{
		if (t < 0)
		{
			t = 0;
		}
		else if (t > 1)
		{
			t = 1;
		}

		if (u < 0)
		{
			u = 0;
		}
		else if (u > 1)
		{
			u = 1;
		}	
	}

	this.t = t;
	this.u = u;
};




















function Mouse()
{
	this.x = 0;
	this.y = 0;
	this.down = false;
    this.inside = false;
    this.rclick = false;

    this.drawPoint;
    this.drawPoint_T;
}

Mouse.draw = function()
{
	/*ctx.beginPath();
	ctx.arc(Mouse.x, Mouse.y, 5, 0, Math.PI*2, true);
	ctx.fill();*/

	if (BSurface.finished)
	{
		// If the Bsurface was only just finished, initialize the drawPoint object.
		if (this.drawPoint_T == undefined)
		{
			BSurface.updateNumberofResPoints(10, 10);
			BSurface.updatePoints();

			this.drawPoint = new Point();
			this.drawPoint_T = new Point(0, 0, 0);
		}

		this.drawPoint_T.draw();
	}

};

Mouse.updatePos = function(evt)
{
	var rect = cvs.getBoundingClientRect();
	this.x = evt.clientX - rect.left - 1;
	this.y = evt.clientY - rect.top - 1;

	if (BSurface.finished)
	{
		var coords = BSurface.calc(this.t, this.u);

		this.drawPoint.x = coords[0];
		this.drawPoint.y = coords[1];
		this.drawPoint.z = coords[2];

		this.drawPoint_T.moveTo(this.drawPoint);
		this.drawPoint_T.scaleFactor(zoom);
		this.drawPoint_T.rotateY(yaw);
		this.drawPoint_T.rotateX(pitch);
	}

};

cvs.addEventListener('mousemove', function(evt)
{
	var old_x = Mouse.x;
	var old_y = Mouse.y;
	Mouse.updatePos(evt)
	var new_x = Mouse.x;
	var new_y = Mouse.y;

	var changed = (old_x != new_x) || (old_y != new_y);

	// if BSurface is optimized, find the mouse projection onto the surface
	// These variables are "t" and "u" of mouse.
	if (BSurface.finished)
	{
		// Find which surface resPoint is closest to mouse

		var min_dist = 99999;
		var min_x = -1;
		var min_y = -1;

		for (var x = 0; x < BSurface.RX; x++)
		{
			for (var y = 0; y < BSurface.RY; y++)
			{
				var p = BSurface.resPoints_T[x][y];

				var dist = p.dist2d(Mouse);

				if (dist < min_dist)
				{
					min_dist = dist;
					min_x = x;
					min_y = y;
				}
			}
		}

		var t = min_x/(BSurface.RX-1);
		var u = min_y/(BSurface.RY-1);

		var dist = min_dist;

		// We now have a reasonable initial estimate for the mouse position in surface space.
		// Time to do a 2-dimensional binary search in the local subspace region.

		var delta_t = 1/(1-BSurface.RX); // delta used for above rough search
		var delta_u = 1/(1-BSurface.RY); // 0.25 if RX and RY is 5

		var search_point = new Point();
		var search_point_T = new Point();

		var N = 60; // Do the 2-dimensional binary search for N iterations

		var div_rate = -1.2; // How fast to decrease the search rate on each step
							// 2 has theoretical optimality if there are no local minima
							// More than 1 but less than 2 has stronger resistance against minima
							// More than 2 almost never finds any minima
							// 1 or less does not converge

		for (var i = 0; i < N; i++)
		{
			delta_t /= div_rate;
			delta_u /= div_rate;

			var t_plus = t + delta_t;

			var coords = BSurface.calc(t_plus, u);

			search_point.x = coords[0];
			search_point.y = coords[1];
			search_point.z = coords[2];

			// Now that the 3-dimensional position is set, we still need to find the camera space position.
			search_point_T.moveTo(search_point);
			search_point_T.scaleFactor(zoom);
			search_point_T.rotateY(yaw);
			search_point_T.rotateX(pitch);

			// We can now invisibly draw the point to the screen, to get its 2-dimensional screen coordinates.
			search_point_T.draw(false);

			var dist_plus = search_point_T.dist2d(Mouse);



			// Now we do the same, only for t-minus

			var t_minus = t - delta_t;

			var coords = BSurface.calc(t_minus, u);

			search_point.x = coords[0];
			search_point.y = coords[1];
			search_point.z = coords[2];

			// Now that the 3-dimensional position is set, we still need to find the camera space position.
			search_point_T.moveTo(search_point);
			search_point_T.scaleFactor(zoom);
			search_point_T.rotateY(yaw);
			search_point_T.rotateX(pitch);

			// We can now invisibly draw the point to the screen, to get its 2-dimensional screen coordinates.
			search_point_T.draw(false);

			var dist_minus = search_point_T.dist2d(Mouse);

			
			// If either of the distances are smaller, set the new t before we optimize for u.

			if (dist_plus < dist && dist_plus < dist_minus && t_plus < 1.1)
			{
				// Adding delta_t is better
				t = t_plus;
				//console.log("Increased t: ", t, delta_t)
			}
			else if (dist_minus < dist && dist_minus < dist_plus && t_minus > -1.1)
			{
				// Subtracting delta_t is better
				t = t_minus;
				//console.log("Decreased t: ", t, -delta_t)
			}
			else
			{
				//console.log("Did not change t: ", t, 0)
			}








			var u_plus = u + delta_u;

			var coords = BSurface.calc(t, u_plus);

			search_point.x = coords[0];
			search_point.y = coords[1];
			search_point.z = coords[2];

			// Now that the 3-dimensional position is set, we still need to find the camera space position.
			search_point_T.moveTo(search_point);
			search_point_T.scaleFactor(zoom);
			search_point_T.rotateY(yaw);
			search_point_T.rotateX(pitch);

			// We can now invisibly draw the point to the screen, to get its 2-dimensional screen coordinates.
			search_point_T.draw(false);

			var dist_plus = search_point_T.dist2d(Mouse);



			// Now we do the same, only for t-minus

			var u_minus = u - delta_u;

			var coords = BSurface.calc(t, u_minus);

			search_point.x = coords[0];
			search_point.y = coords[1];
			search_point.z = coords[2];

			// Now that the 3-dimensional position is set, we still need to find the camera space position.
			search_point_T.moveTo(search_point);
			search_point_T.scaleFactor(zoom);
			search_point_T.rotateY(yaw);
			search_point_T.rotateX(pitch);

			// We can now invisibly draw the point to the screen, to get its 2-dimensional screen coordinates.
			search_point_T.draw(false);

			var dist_minus = search_point_T.dist2d(Mouse);

			
			// If either of the distances are smaller, set the new t before we optimize for u.

			if (dist_plus < dist && dist_plus < dist_minus && u_plus < 1.1)
			{
				// Adding delta_u is better
				u = u_plus;
				//console.log("Increased u: ", u, delta_u)
			}
			else if (dist_minus < dist && dist_minus < dist_plus && u_minus > -1.1)
			{
				// Subtracting delta_u is better
				u = u_minus;
				//console.log("Decreased u: ", u, -delta_u)
			}
			else
			{
				//console.log("Did not change u: ", u, 0)
			}









			Mouse.t = t;
			Mouse.u = u;
		}




	}



	// Used for strand movement code
	if (Mouse.down)
	{
		if (Mouse.held_object != undefined)
		{
			Mouse.holding = true;
			var p = Mouse.held_object; // equals BStrand.originPoint;

			if (p == BStrand.originPoint)
			{
				BStrand.setOrigin(Mouse.t, Mouse.u);
			}
		}
	}



	if (Mouse.down)
	{
		if (Mouse.holding)
		{
			if (Mouse.held_type == 0)
			{
				BSurface.finished = false;
				BSurface.moveControlPointTo2D(Mouse.held_id[0], Mouse.held_id[1], Mouse.x, Mouse.y);
				BSurface.updatePoints();
			}
			else if (Mouse.held_type == 1)
			{
				BProj.movePointTo2D(Mouse.held_id, Mouse.x, Mouse.y)
			}
		}
		else if (changed && !this.hover)
		{
			delta_pitch = (new_y - old_y)*.006;
			if (pitch + delta_pitch <= 90/180*3.1415 && pitch + delta_pitch >= -90/180*3.1415)
			{
				pitch += delta_pitch;
			}

			delta_yaw = (old_x - new_x)*.006;
			yaw += delta_yaw;
		}

		updateTransformedPoints();
	}

}, false);

cvs.addEventListener('mousedown', function(evt)
{
	Mouse.down = true;

	// Check if mouse is over a button or slider

	var any = false;
	for (var i = 0; i < Sliders.length; i++)
	{
		var S = Sliders[i];

		if (S.hover)
		{
			any = true;
			break;
		}
	}

	for (var i = 0; i < ToggleButtons.length; i++)
	{
		var T = ToggleButtons[i];

		if (T.hover)
		{
			any = true;
			break;
		}
	}

	if (any)
	{
		this.hover = true;
	}
	else
	{
		this.hover = false;
	}


	// Check if mouse is over the strand origin point

	if (BSurface.finished)
	{
		var p = BStrand.originPoint_T;
		var dist = p.dist2d(Mouse);

		if (dist < 15)
		{
			Mouse.held_object = BStrand.originPoint;
		}
	}




	// Check if mouse is over a surface control point
	// If the sheet is already optimized and the underlying data is hidden, do not check.

	if (!BSurface.finished)
	{
		var closest_id = BSurface.closestControlPoint2D(Mouse);
		var closest_control_point = BSurface.controlPoints_T[closest_id[0]][closest_id[1]];
		
		var closest_dist = closest_control_point.dist2d(Mouse);
		if (closest_dist < 15)
		{
			BSurface.finished = false;
			Mouse.holding = true;
			Mouse.held_id = closest_id;
			Mouse.held_type = 0;
		}

		var closest_id = BProj.closestPoint2D(Mouse, 15)
		if (closest_id != -1)
		{
			Mouse.holding = true;
			Mouse.held_id = closest_id;
			Mouse.held_type = 1;
		}	
	}



}, false);

cvs.addEventListener('mouseleave', function(evt)
{
	Mouse.holding = false;
	Mouse.objHeld = null;

	Mouse.held_object = undefined;

	Mouse.down = false;
}, false);

cvs.addEventListener('mouseup', function(evt)
{
	Mouse.holding = false;
	Mouse.objHeld = null;

	Mouse.held_object = undefined;

	Mouse.down = false;
}, false);

cvs.addEventListener('dblclick', function(evt)
{

}, false);

cvs.addEventListener('mousewheel',function(evt)
{
	var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));

	zoom *= (1 + delta*.1)

	updateTransformedPoints();

	evt.preventDefault();
    return false; 
}, false);

cvs.addEventListener("DOMMouseScroll",function(evt)
{
	var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));

	zoom *= (1 + delta*.1)

	updateTransformedPoints();

	evt.preventDefault();
	return false;
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
			BStrand.optimized = false;
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
			BStrand.optimized = false;
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