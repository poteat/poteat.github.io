





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

//	BProj.draw();

	BSurface.draw();
	if (DMap != undefined)
	{
		DMap.draw();
	}

	if (DMap != undefined)
	{
		var score = DMap.score();
		var normalized = Math.sqrt(score/DMap.points.length)

		ctx.fillStyle = "black";

		ctx.fillText("Score: " + score, 10, 20);
		ctx.fillText("Normalized Score: " + normalized, 10, 30);
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
				}

				BPerimeter.draw();




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

DensityMap.prototype.updateProjection = function()
{
	var min_t = 0;
	var max_t = 1;
	var min_u = 0;
	var max_u = 1;

	for (var i = 0; i < this.points.length; i++)
	{
		var p = this.points[i];
		p.findClosestResPoint();
		p.refineProjection();

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

	return sum_dist;
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
	p2_T.color = "purple";
	p4_T.color = "purple";
	p1_T.size = 5;
	p2_T.size = 5;
	p3_T.size = 5;
	p4_T.size = 5;

	var array = [[p1,p2], [p4,p3]];

	BSurface.setControlPoints(array);
};







function Perimeter(ConcaveHull)
{
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

		var p_T = new Point(0, 0, 0, "red", 2);

		this.points.push(p);
		this.points_T.push(p_T);
	}

	this.updateTransformedPoints();
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
}

Perimeter.prototype.draw = function()
{
	for (var i = 0; i < this.points_T.length; i++)
	{
		var p = this.points_T[i];
		p.draw();
	}

	ctx.strokeStyle = "red";
	ctx.lineWidth = 2;

	ctx.beginPath();

	for (var i = 0; i < this.points_T.length; i++)
	{
		var p = this.points_T[i];

		var x = p.x2d;
		var y = p.y2d;

		if (i == 0)
		{
			ctx.moveTo(x, y);
		}
		else
		{
			ctx.lineTo(x, y);
		}

		if (i == this.points_T.length - 1)
		{
			var p = this.points_T[0];

			var x = p.x2d;
			var y = p.y2d;

			ctx.lineTo(x, y);
		}

	}

	ctx.lineWidth = 1;
	ctx.stroke();

	ctx.strokeStyle = "black";
}












function Surface(X, Y, T, U)
{
	this.X = X;
	this.Y = Y;
	this.T = T;
	this.U = U;


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

//	this.points[0][0] = array_of_points[0][0];
//	this.points[0][3] = array_of_points[0][1];
//	this.points[3][0] = array_of_points[1][0];
//	this.points[3][3] = array_of_points[1][1];

//	this.updatePoints();
//	this.updateTransformedPoints();
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

	var threshold = .5;

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

	ctx.fillText("T, U: " + t + " " + u, 20, 100);

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

Point.prototype.refineProjection = function()
{
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
	var old_x = Mouse.x;
	var old_y = Mouse.y;
	Mouse.updatePos(evt)
	var new_x = Mouse.x;
	var new_y = Mouse.y;

	var changed = (old_x != new_x) || (old_y != new_y);

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
		else if (changed)
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

	// Check if mouse is over a point
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


init();