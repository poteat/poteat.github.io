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

DensityMap.prototype.createFromFit = function(x_avg, y_avg, z_avg, rot_theta,
    rot_ux, rot_uy, rot_uz, min_t, max_t, min_u, max_u)
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

    this.xorigin = readFloat(23 + 26);
    this.yorigin = readFloat(23 + 27);
    this.zorigin = readFloat(23 + 28);

    this.scale = this.xlength / this.mx; // The size of each voxel in Angstroms

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
                var density = readFloat(256 + (z * this.nx * this.ny + y *
                    this.nx + x));
                if (density > density_threshold)
                {
                    var scale = this.scale;
                    var p = new Point(((x + this.xorigin) - x_avg) * scale,
                        ((y + this.yorigin) - y_avg) * scale, ((z +
                            this.zorigin) - z_avg) * scale);
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

    BSurface.finished = true;
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

    this.xorigin = readFloat(23 + 26);
    this.yorigin = readFloat(23 + 27);
    this.zorigin = readFloat(23 + 28);

    this.scale = this.xlength / this.mx; // The size of each voxel in Angstroms

    //this.nlabl = readInt(23+29+3);

    voxel = createArray(this.nx, this.ny, this.nz);

    // Populate voxel with points

    

    var USE_GRASSFIRE = true;

    for (var i = 0; i < this.nx; i++)
    {
        for (var j = 0; j < this.ny; j++)
        {
            for (var k = 0; k < this.nz; k++)
            {
                var density = readFloat(256 + (k * this.nx * this.ny + j *
                    this.nx + i));

                if (density > density_threshold)
                {
                    if (USE_GRASSFIRE)
                    {
                        voxel[i][j][k] = -1;
                    }
                    else
                    {
                        voxel[i][j][k] = density;
                    }
                }
                else
                {
                    voxel[i][j][k] = 0;
                }
            }
        }
    }


    
    if (USE_GRASSFIRE)
    {
        var finished = false;
        var depth = 0;

        while (finished == false)
        {
            finished = true;

            for (var i = 0; i < this.nx; i++)
            {
                for (var j = 0; j < this.ny; j++)
                {
                    for (var k = 0; k < this.nz; k++)
                    {
                        if (voxel[i][j][k] == -1)
                        {
                            var _left  = voxel[i-1][j][k] == depth;
                            var _right = voxel[i+1][j][k] == depth;
                            var _down  = voxel[i][j-1][k] == depth;
                            var _up    = voxel[i][j+1][k] == depth;
                            var _out   = voxel[i][j][k-1] == depth;
                            var _in    = voxel[i][j][k+1] == depth;

                            if (_left || _right || _down || _up || _out || _in)
                            {
                                voxel[i][j][k] = depth + 1;
                                finished = false
                            }
                        }
                    }
                }
            }

            depth++;
        }

        var max_depth = depth - 1;

        // Normalize all depth values.

        for (var i = 0; i < this.nx; i++)
        {
            for (var j = 0; j < this.ny; j++)
            {
                for (var k = 0; k < this.nz; k++)
                {
                    voxel[i][j][k] /= max_depth;
                }
            }
        }

        // Multiply voxel depth values with original file densities

        for (var i = 0; i < this.nx; i++)
        {
            for (var j = 0; j < this.ny; j++)
            {
                for (var k = 0; k < this.nz; k++)
                {
                    voxel[i][j][k] *= readFloat(256 + (k * this.nx * this.ny + j *
                        this.nx + i));
                }
            }
        }        
    }





    // Convert voxel to traditional point set.

    var x_sum = 0;
    var y_sum = 0;
    var z_sum = 0;

    var count = 0;

    for (var i = 0; i < this.nx; i++)
    {
        for (var j = 0; j < this.ny; j++)
        {
            for (var k = 0; k < this.nz; k++)
            {
                var density = voxel[i][j][k];

                if (density)
                {
                    count++;

                    x_sum += (i * this.scale + this.xorigin);
                    y_sum += (j * this.scale + this.yorigin);
                    z_sum += (k * this.scale + this.zorigin);
                }
            }
        }
    }

    this.x_avg = x_sum / count;
    this.y_avg = y_sum / count;
    this.z_avg = z_sum / count;

    this.points = new Array();
    this.points_T = new Array();

    for (var i = 0; i < this.nx; i++)
    {
        for (var j = 0; j < this.ny; j++)
        {
            for (var k = 0; k < this.nz; k++)
            {
                var density = voxel[i][j][k];

                if (density)
                {
                    var p = new Point(0, 0, 0);
                    p.x = i * this.scale + this.xorigin - this.x_avg;
                    p.y = j * this.scale + this.yorigin - this.y_avg;
                    p.z = k * this.scale + this.zorigin - this.z_avg;
                    p.density = density;

                    var p2 = new Point(0, 0, 0);

                    this.points.push(p);
                    this.points_T.push(p2);            
                }
            }
        }
    }

    

    /*

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
                var density = readFloat(256 + (z * this.nx * this.ny + y *
                    this.nx + x));
                if (density > density_threshold)
                {
                    num++;

                    x_avg += (x * this.scale + this.xorigin);
                    y_avg += (y * this.scale + this.yorigin);
                    z_avg += (z * this.scale + this.zorigin);
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
                var density = readFloat(256 + (z * this.nx * this.ny + y *
                    this.nx + x));
                if (density > density_threshold)
                {
                    var scale = this.scale;

                    var p = new Point(
                        x * scale + this.xorigin - x_avg,
                        y * scale + this.yorigin - y_avg,
                        z * scale + this.zorigin - z_avg);

                    p.density = density;

                    var p2 = new Point(0, 0, 0);
                    this.points.push(p);
                    this.points_T.push(p2);
                }
            }
        }
    }*/
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
var lim = 0;

DensityMap.prototype.draw = function()
{
    if (BSurface.finished)
    {
        // If the surface has been matched, lets draw the voxels transparently.

        ctx.globalAlpha = .5;
    }

    for (var i = 0; i < this.points.length; i++)
    {
        this.points_T[i].draw();

        if (this.extension == 'pdb')
        {
            // alert(this.points_T[i].x + " " + this.points_T[i].y + " " + 
            // this.points_T[i].z);
        }
    }

    if (t == lim)
    {
        if (BSurface.finished == false)
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
    }

    ctx.globalAlpha = 1;
};

DensityMap.prototype.updateProjection = function(permissive)
{
    permissive = true;

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
        sum_dist += Math.pow(p.density, 2) * Math.pow(p.dist(proj), 2);
    }

    this.saved_score = Math.sqrt(sum_dist / this.points.length);

    if (DMap.X < 4)
    {
        return this.saved_score + this.foldedness();
    }
    else
    {
        return this.saved_score + this.foldedness();
    }
};

DensityMap.prototype.angleBetweenTwoVectors = function(x1, y1, z1, x2, y2, z2)
{
    var l1 = Math.sqrt(Math.pow(x1, 2) + Math.pow(y1, 2) + Math.pow(z1, 2));
    var l2 = Math.sqrt(Math.pow(x2, 2) + Math.pow(y2, 2) + Math.pow(z2, 2));

    var dot = x1 * x2 + y1 * y2 + z1 * z2;

    var ang = Math.acos(dot / l1 / l2);

    // Twist direction calculation

    var cross_x = y1 * z2 - z1 * y2;
    var cross_y = z1 * x2 - x1 * z2;
    var cross_z = x1 * y2 - y1 * x2;

    var delta_x = x1 - x2;
    var delta_y = y1 - y2;
    var delta_z = z1 - z2;

    var dot_dir = cross_x * delta_x + cross_y * delta_y + cross_z * delta_z;

    var dir = sign(dot_dir);

    return dir * ang;
}

DensityMap.prototype.angleBetweenThreePoints = function(p1, p2, p3)
{
    var x1 = p2.x - p1.x;
    var y1 = p2.y - p1.y;
    var z1 = p2.z - p1.z;

    var x2 = p3.x - p2.x;
    var y2 = p3.y - p2.y;
    var z2 = p3.z - p3.z;

    return this.angleBetweenTwoVectors(x1, y1, z1, x2, y2, z2);
}

DensityMap.prototype.foldedness = function()
{
    // New foldedness heuristic.  Use surface sample points to calculate
    // the maximum foldedness of the sheet.  If the maximum foldedness is
    // violated, increase the score dramatically.


    var grid = BSurface.drawPoints;

    for (var i = 0; i < grid; i++)
    {
        var p = grid[i];

        var coords = BSurface.calc(p.t, p.u);

        p.x = coords[0];
        p.y = coords[1];
        p.z = coords[2];
    }

    var max_folded = -Infinity;

    for (var i = 0; i < grid.length; i++)
    {
        var row = grid[i];

        for (var j = 0; j < row.length; j++)
        {
            var r1 = grid[i - 1];
            var r2 = grid[i];
            var r3 = grid[i + 1];

            var valid = r1 != undefined && r2 != undefined && r3 != undefined;

            if (!valid)
            {
                break;
            }

            var p1 = grid[i][j];
            var p2 = grid[i + 1][j];
            var p3 = grid[i][j - 1];
            var p4 = grid[i - 1][j];
            var p5 = grid[i][j + 1];

            var valid = (p1 != undefined && p2 != undefined &&
                p3 != undefined && p4 != undefined &&
                p5 != undefined);

            if (valid)
            {
                var vertical_twist = this.angleBetweenThreePoints(p5, p2, p3);
                var horizontal_twist = this.angleBetweenThreePoints(p4, p1, p2);

                var foldedness = Math.max(Math.abs(vertical_twist),
                    Math.abs(horizontal_twist)) / 2;

                if (foldedness > max_folded)
                {
                    max_folded = foldedness;
                }
            }
        }
    }

    return max_folded * max_folded;
}

DensityMap.prototype.generateCroppedSurface = function(num_X, num_Y)
{
    this.updateProjection();

    var size_t = this.max_t - this.min_t;
    var delta_t = size_t / (num_X - 1);

    var size_u = this.max_u - this.min_u;
    var delta_u = size_u / (num_Y - 1);

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
        t = clamp(Math.round((t - this.min_t) / delta_t), 0, num_X - 1);

        u = clamp(Math.round((u - this.min_u) / delta_u), 0, num_Y - 1);

        bit_array[t][u] = true;
    }

    var points = new Array();

    for (var i = 0; i < num_X; i++)
    {
        for (var j = 0; j < num_Y; j++)
        {
            if (bit_array[i][j] == true)
            {
                var t = i * delta_t + this.min_t;
                var u = j * delta_u + this.min_u;

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

    slope = (vr_z - vr_x + Math.sqrt(Math.pow(vr_z - vr_x, 2) + 4 *
        Math.pow(covr, 2))) / (2 * covr);
    intersect = avgz - slope * avgx;

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

        var projection_x = (x + m * (z - b)) / (Math.pow(m, 2) + 1);
        var projection_z = (m * (x + m * z) + b) / (Math.pow(m, 2) + 1);

        var direction = sign(projection_x - avgx);

        var proj_dist = direction * Math.sqrt(Math.pow(projection_x - avgx, 2) +
            Math.pow(projection_z - avgz, 2));

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

    var array = [
        [p1, p2],
        [p4, p3]
    ];

    BSurface.setControlPoints(array);
};