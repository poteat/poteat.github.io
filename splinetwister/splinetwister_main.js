// Camera and animation parameters
var fps = 30;
var fov = 250;
var yaw = 10;
var pitch = 0.7;
var zoom = 8;

// Canvas and drawing DOM objects
var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');

var dl = document.getElementById('surface_download_link');
var fit_dl = document.getElementById('fit_download_link');
var strand_dl = document.getElementById('strand_download_link');
var set_dl = document.getElementById('set_download_link');

zip.workerScriptsPath = "/splinetwister/zip/";
//zip.useWebWorkers = false;

// Global object declarations
var Mouse = new Mouse();
var BSurface;
var DemingRegressor;
var BProj;

// Program entry and loop definition
clearInterval(mainloop);
var mainloop = setInterval("main();", 1000 / fps);

var first_execution = true;
var BPerimeter;

var BStrand;

// Program entry point, runs once at initialization of application.
function init()
{
    loadServerMRC("density_map.mrc");

    BSurface = new Surface(4, 4, 20, 20);
    BPlane = new Plane(1, -3, 1, 2);
    BProj = new Projection();

    updateTransformedPoints();
};

var desired_control_points = 4;

var updated_pdb = false;

// Main program control loop, responsible for draw calls.
function main()
{
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    if (DMap != undefined)
        DMap.draw();

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
        if (!BSurface.finished)
        {
            var score = DMap.score();
        }
        else
        {
            var score = DMap.saved_score;
        }


        ctx.fillStyle = "black";

        ctx.fillText("Score: " + (score), 10, 20);
        ctx.fillText("Number of points: " + DMap.points.length, 10, 40);

        ctx.fillText("Foldedness: " + DMap.foldedness(), 10, 180);

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
                        sample_points[i].rotateAxis(-DMap.rot_theta,
                            DMap.rot_ux, DMap.rot_uy, DMap.rot_uz)

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


                    // Build filename by appending "_SplineFit" to the end of
                    // the input file

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

                // Now that the surface is finished optimizing itself, we can
                // calculate the projected concave hull!

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

                // Post-processing work after surface fit.

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

                var mag = Math.sqrt(Math.pow(BPlane.A, 2) +
                    Math.pow(BPlane.C, 2));

                DMap.rot_ux = BPlane.C / mag;
                DMap.rot_uy = 0;
                DMap.rot_uz = -BPlane.A / mag;

                DMap.rot_theta = Math.acos(BPlane.B);

                DMap.rotateAxis(DMap.rot_theta, DMap.rot_ux, DMap.rot_uy,
                    DMap.rot_uz);

                DMap.updateTransformedPoints();

                // Calculate bounding box
                DMap.calculateBoundingBox();
            }

            BPlane.draw();
        }
    }
};

function initializeStrandFit()
{
    BStrand = new Strand();
};

// updateTransformedPoints()
// ----------------------------------------------------------------------
// This function updates the "camera-transformed" set of points belonging to 
// each object.
// The transformation consists of two rotations around the Y and X axes, by the 
// yaw and pitch camera angles respectively.  There is also a scaling
// transformation for zoom.

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
};

function generatePDBString(points)
{
    var string = "";

    for (var i = 0; i < points.length; i++)
    {
        if (i + 1 < 10)
        {
            var space = "     ";
        }
        else if (i + 1 < 100)
        {
            var space = "    ";
        }
        else if (i + 1 < 1000)
        {
            var space = "   ";
        }
        else if (i + 1 < 10000)
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
            var x = points[i].x.toPrecision(precision - 1);

            if (x > -.1 && x < .1)
            {
                var x = points[i].x.toPrecision(precision - 2);
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
            var y = points[i].y.toPrecision(precision - 1);

            if (y > -.1 && y < .1)
            {
                var y = points[i].y.toPrecision(precision - 2);
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
            var z = points[i].z.toPrecision(precision - 1);

            if (z > -.1 && z < .1)
            {
                var z = points[i].z.toPrecision(precision - 2);
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

        string += "ATOM " + space + (i + 1) + "  C   HOH A   1     " +
            x_space + x + " " + y_space + y + " " + z_space + z +
            "                          \n";
    }

    return string;
};

function generateFitString()
{
    var string = "" + density_threshold + "\n";

    string += DMap.x_avg + " " + DMap.y_avg + " " + DMap.z_avg + "\n";

    string += DMap.rot_theta + " " + DMap.rot_ux + " " + DMap.rot_uy + " " +
        DMap.rot_uz + "\n";

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
};

function generateTextFile(string)
{
    var data = new Blob([string],
    {
        type: 'text/plain'
    });

    file = window.URL.createObjectURL(data);

    return file;
};





// ----------------------------------------------------------------------
// Global mathematical functions.
// ----------------------------------------------------------------------

// sign(x) returns -1 if x is negative, 1 if x is positive, and 0 if x is zero.
function sign(x)
{
    return x > 0 ? 1 : x < 0 ? -1 : 0;
};

// binomial(n,k) returns the binomial coefficient of n, k.  i.e. N select K.  
// Used primarily for generating surface points.
function binomial(n, k)
{
    var prod = 1;
    for (i = 1; i <= k; i++)
    {
        prod *= (n + 1 - i) / i;
    }

    return prod;
};

function clamp(num, min, max)
{
    return num < min ? min : num > max ? max : num;
};









function loadServerMRC(file)
{
    var oReq = new XMLHttpRequest();
    oReq.open("GET", "/" + file, true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function(oEvent)
    {
        var arrayBuffer = oReq.response; // Note: not oReq.responseText
        if (arrayBuffer)
        {
            var byteArray = new Uint8Array(arrayBuffer);

            dataView = new DataView(arrayBuffer);

            DMap = new DensityMap();

            DMap.filename = "sample.pdb";

            updateTransformedPoints();

            mainloop = setInterval("main();", 1000 / fps);
        }
    };

    oReq.send(null);
};

var DMap;
var dataView;
var density_threshold = 0.31;

document.getElementById('density_threshold').addEventListener('change',
    changeDensity, false);

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
};

document.getElementById('mrc_file').addEventListener('change', loadLocalMRC,
    false);

function loadLocalMRC(evt)
{
    var file = evt.target.files[0];

    var exploded_filename = (file.name).split(".");
    var extension = exploded_filename[exploded_filename.length - 1];

    var fileReader = new FileReader();

    if (extension == 'mrc')
    {
        fileReader.readAsArrayBuffer(file);

        fileReader.onload = function(oEvent)
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

        fileReader.onload = function(oEvent)
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

};

document.getElementById('fit_file').addEventListener('change', loadFittingFile,
    false);

function loadFittingFile(evt)
{
    var file = evt.target.files[0];
    var fileReader = new FileReader();
    fileReader.readAsText(file);

    fileReader.onload = function(oEvent)
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

        DMap.createFromFit(avgx, avgy, avgz, rot_theta, rot_ux, rot_uy, rot_uz,
            min_t, max_t, min_u, max_u);

        BSurface.setControlPoints(array_of_points);
        BSurface.finished = true;
        BPlane.finished = true;

        DMap.updateProjection();

        updateTransformedPoints();
    };
};

function readInt(i)
{
    i *= 4;
    return dataView.getInt32(i, true);
};

function readFloat(i)
{
    i *= 4;
    return dataView.getFloat32(i, true);
};

function createArray(length)
{
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1)
    {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) arr[length - 1 - i] = createArray.apply(this, args);
    }

    return arr;
};


document.getElementById('strand_file').addEventListener('change',
    loadStrandFile,
    false);

function loadStrandFile(evt)
{
    var file = evt.target.files[0];
    var fileReader = new FileReader();
    fileReader.readAsText(file);

    fileReader.onload = function(oEvent)
    {
        var fit_string = oEvent.target.result;

        var lines = fit_string.split("\n");

        var points = new Array();

        for (var i = 0; i < lines.length; i++)
        {
            var line = lines[i];

            var words = line.split(/ +/g);

            // Loop through each line, only processing those N, CA, C

            var type = words[0];
            var element = words[2];

            var backbone = element == "N" || element == "CA" || element == "C";

            if (type == "ATOM" && backbone)
            {
                console.log(type);

                var x = words[6];
                var y = words[7];
                var z = words[8];

                // Transform to DMap logical space.

                x -= DMap.x_avg;
                y -= DMap.y_avg;
                z -= DMap.z_avg;

                var p = new Point(x, y, z);

                p.rotateAxis(DMap.rot_theta, DMap.rot_ux, DMap.rot_uy, DMap.rot_uz);

                points.push(p);
            }
        }

        BStrand.importStrands(points);
    };
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
};

Mouse.draw = function()
{
    /*ctx.beginPath();
    ctx.arc(Mouse.x, Mouse.y, 5, 0, Math.PI*2, true);
    ctx.fill();*/

    if (BSurface.finished)
    {
        // If the Bsurface was only just finished, initialize the drawPoint 
        // object.
        if (this.drawPoint_T == undefined)
        {
            BSurface.updateNumberofResPoints(10, 10);
            BSurface.updatePoints();

            this.drawPoint = new Point();
            this.drawPoint_T = new Point(0, 0, 0);
        }

        this.drawPoint_T.draw();
    }
};;

Mouse.updatePos = function(evt)
{
    var rect = cvs.getBoundingClientRect();
    this.x = evt.clientX - rect.left - 1;
    this.y = evt.clientY - rect.top - 1;
};;

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

        var t = min_x / (BSurface.RX - 1);
        var u = min_y / (BSurface.RY - 1);

        var dist = min_dist;

        // We now have a reasonable initial estimate for the mouse position in 
        // surface space. Time to do a 2-dimensional binary search in the local 
        // subspace region.

        var delta_t = 1 / (1 - BSurface.RX); // delta used for above rough 
        // search
        var delta_u = 1 / (1 - BSurface.RY); // 0.25 if RX and RY is 5

        var search_point = new Point();
        var search_point_T = new Point();

        var N = 60; // Do the 2-dimensional binary search for N iterations

        var div_rate = -1.2; // How fast to decrease the search rate on each 
        //step
        //
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

            // Now that the 3-dimensional position is set, we still need to find
            // the camera space position.
            search_point_T.moveTo(search_point);
            search_point_T.scaleFactor(zoom);
            search_point_T.rotateY(yaw);
            search_point_T.rotateX(pitch);

            // We can now invisibly draw the point to the screen, to get its 
            // 2-dimensional screen coordinates.
            search_point_T.draw(false);

            var dist_plus = search_point_T.dist2d(Mouse);



            // Now we do the same, only for t-minus

            var t_minus = t - delta_t;

            var coords = BSurface.calc(t_minus, u);

            search_point.x = coords[0];
            search_point.y = coords[1];
            search_point.z = coords[2];

            // Now that the 3-dimensional position is set, we still need to find
            //  the camera space position.
            search_point_T.moveTo(search_point);
            search_point_T.scaleFactor(zoom);
            search_point_T.rotateY(yaw);
            search_point_T.rotateX(pitch);

            // We can now invisibly draw the point to the screen, to get its 
            // 2-dimensional screen coordinates.
            search_point_T.draw(false);

            var dist_minus = search_point_T.dist2d(Mouse);


            // If either of the distances are smaller, set the new t before we
            //  optimize for u.

            if (dist_plus < dist && dist_plus < dist_minus && t_plus < 1.1)
            {
                // Adding delta_t is better
                t = t_plus;
                //console.log("Increased t: ", t, delta_t)
            }
            else if (dist_minus < dist && dist_minus < dist_plus &&
                t_minus > -1.1)
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

            // Now that the 3-dimensional position is set, we still need to find
            // the camera space position.
            search_point_T.moveTo(search_point);
            search_point_T.scaleFactor(zoom);
            search_point_T.rotateY(yaw);
            search_point_T.rotateX(pitch);

            // We can now invisibly draw the point to the screen, to get its 
            // 2-dimensional screen coordinates.
            search_point_T.draw(false);

            var dist_plus = search_point_T.dist2d(Mouse);



            // Now we do the same, only for t-minus

            var u_minus = u - delta_u;

            var coords = BSurface.calc(t, u_minus);

            search_point.x = coords[0];
            search_point.y = coords[1];
            search_point.z = coords[2];

            // Now that the 3-dimensional position is set, we still need to find
            // the camera space position.
            search_point_T.moveTo(search_point);
            search_point_T.scaleFactor(zoom);
            search_point_T.rotateY(yaw);
            search_point_T.rotateX(pitch);

            // We can now invisibly draw the point to the screen, to get its 
            // 2-dimensional screen coordinates.
            search_point_T.draw(false);

            var dist_minus = search_point_T.dist2d(Mouse);


            // If either of the distances are smaller, set the new t before we
            // optimize for u.

            if (dist_plus < dist && dist_plus < dist_minus && u_plus < 1.1)
            {
                // Adding delta_u is better
                u = u_plus;
                //console.log("Increased u: ", u, delta_u)
            }
            else if (dist_minus < dist && dist_minus < dist_plus &&
                u_minus > -1.1)
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
                BSurface.moveControlPointTo2D(Mouse.held_id[0],
                    Mouse.held_id[1], Mouse.x, Mouse.y);
                BSurface.updatePoints();
            }
            else if (Mouse.held_type == 1)
            {
                BProj.movePointTo2D(Mouse.held_id, Mouse.x, Mouse.y)
            }
        }
        else if (changed && !this.hover)
        {
            delta_pitch = (new_y - old_y) * .006;
            if (pitch + delta_pitch <= 90 / 180 * 3.1415 && pitch +
                delta_pitch >= -90 / 180 * 3.1415)
            {
                pitch += delta_pitch;
            }

            delta_yaw = (old_x - new_x) * .006;
            yaw += delta_yaw;
        }

        updateTransformedPoints();
    }
};, false);

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



    // Check if mouse is over a surface control point
    // If the sheet is already optimized and the underlying data is hidden, do 
    // not check.

    if (!BSurface.finished)
    {
        var closest_id = BSurface.closestControlPoint2D(Mouse);
        var closest_control_point = BSurface.controlPoints_T[closest_id[0]]
            [closest_id[1]];

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
};, false);

cvs.addEventListener('mouseleave', function(evt)
{
    Mouse.holding = false;
    Mouse.objHeld = null;

    Mouse.held_object = undefined;

    Mouse.down = false;
};, false);

cvs.addEventListener('mouseup', function(evt)
{
    Mouse.holding = false;
    Mouse.objHeld = null;

    Mouse.held_object = undefined;

    Mouse.down = false;
};, false);

cvs.addEventListener('mousewheel', function(evt)
{
    var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));

    zoom *= (1 + delta * .1)

    updateTransformedPoints();

    evt.preventDefault();
    return false;
};, false);

cvs.addEventListener("DOMMouseScroll", function(evt)
{
    var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));

    zoom *= (1 + delta * .1)

    updateTransformedPoints();

    evt.preventDefault();
    return false;
};, false);







// Add event listener for the strand download button: That way, we can update 
// the strand render when we need to.
strand_dl.addEventListener('mouseover', function(evt)
{
    if (BStrand && !BStrand.updated)
    {
        BStrand.updateDownload();
    }
};, false);


set_dl.addEventListener('mouseup', function(evt)
{
    if (BStrand && BStrand.generatedSet != true)
    {
        console.log("MOUSECLICK EVENT");
        set_dl.text = "Zipping files..."



        var angle_delta = Number(document.getElementById("sampleset_angle").value);
        var offset_min = Number(document.getElementById("sampleset_offset_min").value);
        var offset_max = Number(document.getElementById("sampleset_offset_max").value);
        var offset_num = Number(document.getElementById("sampleset_offset_num").value);

        BStrand.generateSampleSet(angle_delta, offset_min, offset_max, offset_num);
    }
};, false);




var Sliders = new Array();

function Create_Slider(x, y, width, height, text, bar_width, min_val, max_val,
    default_val)
{
    var id = Sliders.length;
    Sliders.push(new Slider(x, y, width, height, text, bar_width, min_val,
        max_val, default_val, id));

    return id;
};

function Slider(x, y, width, height, text, bar_width, min_val, max_val,
    default_val, id)
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

    var setting = (default_val - min_val) / (max_val - min_val);

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
};

Slider.prototype.draw = function()
{
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = "silver";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.stroke();

    var box_xpos = this.x + this.setting * (this.width - this.bar_width);
    var box_ypos = this.y;

    var box_width = this.bar_width;
    var box_height = this.height;

    var box_right = box_xpos + box_width;
    var box_bottom = box_ypos + box_height;


    if (this.held)
    {
        var setting = (Mouse.x - this.x - box_width / 2) / (this.width -
            box_width);
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


    if (Mouse.x > box_xpos && Mouse.x < box_right && Mouse.y > box_ypos &&
        Mouse.y < box_bottom)
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

    this.value = this.min_val + this.setting * (this.max_val - this.min_val);

    ctx.beginPath();
    ctx.rect(box_xpos, box_ypos, box_width, box_height);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.fillText("" + (this.value).toFixed(2), this.x + 13, this.y + 3 +
        this.height / 2);
};;

Slider.prototype.setValue = function(val)
{
    this.setting = (val - this.min_val) / (this.max_val - this.min_val);
    this.value = val;
};

Slider.prototype.setActive = function(activated)
{
    this.activated = activated;
};;









// Global variable of all toggle button objects, so that the mouse can check for
//  hovering, and handle it.
var ToggleButtons = new Array();

// Used by anything to create a new toggle button object,
// returns id, which the calling function can use to access the object through
// ToggleButtons array.
function Create_ToggleButton(x, y, width, height, text)
{
    var id = ToggleButtons.length;
    ToggleButtons.push(new ToggleButton(x, y, width, height, text, id));

    return id;
};

// Used by anything to destroy a toggle button with a given id.  Silently fails 
// if the id is not valid.
function Destroy_ToggleButton(id)
{
    if (id >= 0 && id < ToggleButtons.length)
    {
        ToggleButtons.splice(id, 1);
    }
};

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
};

// Draws this particular button, called by main in a loop of all toggle buttons,
// to draw all of them. Drawing state depends on whether the button is activated
// or not.
ToggleButton.prototype.draw = function()
{
    if (Mouse.x > this.x && Mouse.x < this.x + this.width && Mouse.y > this.y &&
        Mouse.y < this.y + this.height)
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
                // Mouse was pressed, now it's still hovering, but it's not 
                // pressing.  Ergo, a click!
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
    ctx.fillText(this.text, this.x + 10, this.y + this.height / 1.6);
};;

// Called by anything to see if the button is active or not.
ToggleButton.prototype.isActivated = function()
{
    return this.activated;
};;

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
};;


init();