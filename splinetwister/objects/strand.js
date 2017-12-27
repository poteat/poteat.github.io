function Strand()
{
    this.originPoint;

    this.optimize_button;

    this.angle_slider;
    this.offset_slider;

    this.strand_gap;
    this.angle;
    this.offset;

    this.strandMap;

    this.initialize();
};

Strand.prototype.initialize = function ()
{
    this.originPoint = new Point(0, 0, 0);

    optimize_button = Create_ToggleButton(550, 30, 70, 25, "Optimize");
    angle_slider = Create_Slider(550, 60, 150, 20, "Angle", 10, 0, 179.99, 45);
    offset_slider = Create_Slider(550, 90, 150, 20, "Offset", 10, -1.99, 2, 0);
    gap_slider = Create_Slider(550, 120, 150, 20, "Gap", 10, 4, 5, 4.85);

    this.optimize_button = ToggleButtons[optimize_button];
    this.angle_slider = Sliders[angle_slider];
    this.offset_slider = Sliders[offset_slider];
    this.gap_slider = Sliders[gap_slider];

    var coords = BPerimeter.getSurfaceCentroid();
    var avgt = coords[0];
    var avgu = coords[1];

    this.setOrigin(avgt, avgu);

    this.angle = 45;
    this.offset = 0;
    this.strand_gap = 4.85;

    this.updateStrandMap(this.angle, this.offset, this.strand_gap);
};

Strand.prototype.importStrands = function (points)
{
    // We first define an array of arrays, each array representing a strand.
    // They initially are in arbitrary order, and we need to solve a matching
    // problem to find out their true relationship with the simulated strands.

    this.truePoints = new Array();

    this.truePoints[0] = new Array();

    var epsilon = 2;

    var prev_p = points[0];

    var s = 0;

    for (var i = 0; i < points.length; i++)
    {
        var p = points[i];

        var dist = p.dist(prev_p);

        console.log(dist);

        if (p.dist(prev_p) < epsilon)
        {
            this.truePoints[s].push(p);
        }
        else
        {
            this.truePoints[s + 1] = new Array();
            s++;
            this.truePoints[s].push(p);
        }

        prev_p = p;
    }

    // Loop through all true strands, calculating their average x y z coord.

    var L = this.truePoints.length;
    var avg = new Array();

    for (var i = 0; i < L; i++)
    {
        var s = this.truePoints[i];

        var sum_x = 0;
        var sum_y = 0;
        var sum_z = 0;

        for (var j = 0; j < s.length; j++)
        {
            var p = s[j];

            sum_x += p.x;
            sum_y += p.y;
            sum_z += p.z;
        }

        sum_x /= s.length;
        sum_y /= s.length;
        sum_z /= s.length;

        avg.push(new Point(sum_x, sum_y, sum_z));
    }

    // Now that we have the true strand center points, find the delta of each
    // from the central surface point.  This is a simplified heuristic to find
    // the true strand which is associated with the central simulated strand.

    var min_dist = Infinity;
    var min_id = -1;

    for (var i = 0; i < avg.length; i++)
    {
        var p = avg[i];

        var dist = p.dist(this.originPoint);

        if (dist < min_dist)
        {
            min_dist = dist;
            min_id = i;
        }
    }

    this.central_strand = min_id;

    // For the optimization process, we define, for each true strand, M sample
    // points that are uniformly spaced throughout the strand.

    M = 10;

    for (var i = 0; i < this.truePoints.length; i++)
    {
        var s = this.truePoints[i];

        var range = s.length - 1;

        s.samples = new Array();

        for (var j = 0; j < M; j++)
        {
            var t = j / (M - 1);

            var index = Math.round(t * range);

            s.samples[j] = s[index];
        }
    }

    this.optimizeToTrueStructure();

    this.truePoints_T = new Array();

    for (var i = 0; i < this.truePoints.length; i++)
    {
        this.truePoints_T.push(new Array());

        for (var j = 0; j < this.truePoints[i].length; j++)
        {
            var color = "Black";
            color = i == min_id ? "Red" : color;

            var p = new Point(0, 0, 0, color, 3);
            p.transform(this.truePoints[i][j]);
            this.truePoints_T[i].push(p);
        }
    }
};

Strand.prototype.optimizeToTrueStructure = function ()
{
    // We have the scoring function, so now we call an initial optimization to
    // improve the matching between strands.

    var ang_scores = new Array();

    var N = 10;

    this.ignoreChanges = true;

    var ang_min = 0;
    var ang_max = 180;

    for (var i = 0; i < N; i++)
    {
        var t = i / (N - 1);
        var ang = t * (180 - 180 / N);

        this.updateStrandMap(ang, this.offset, this.strand_gap);

        var score = this.scoreViaTrueStrand(this.strandMap[0], this.truePoints[this.central_strand]);

        ang_scores.push([ang, score]);
    }

    // Loop through ang_scores, and choose the angle with the lowest score.

    var min_score = Infinity;
    var min_index = -1;

    for (var i = 0; i < ang_scores.length; i++)
    {
        var score = ang_scores[i][1];

        if (score < min_score)
        {
            min_score = score;
            min_index = i;
        }
    }

    var min_ang = ang_scores[min_index][0];

    // Now we loop through N offsets to find the rough best offset.

    var offset_scores = new Array();

    var search_range = 4;

    for (var i = 0; i < N; i++)
    {
        var t = i / (N - 1);
        var offset = search_range * t - search_range / 2;

        this.updateStrandMap(min_ang, offset, this.strand_gap);

        var score = this.scoreViaTrueStrand(this.strandMap[0], this.truePoints[this.central_strand]);

        offset_scores.push([offset, score]);
    }

    // Loop through offset_scores, and choose the offset with the lowest score.
    // We then have the rough 2*N optimized parameter.

    var min_score = Infinity;
    var min_index = -1;

    for (var i = 0; i < ang_scores.length; i++)
    {
        var score = offset_scores[i][1];

        if (score < min_score)
        {
            min_score = score;
            min_index = i;
        }
    }

    var min_offset = offset_scores[min_index][0];

    this.updateStrandMap(this.angle, min_offset, this.strand_gap);

    // Search 10x10 = 100 different options within smaller search space.

    var search_space_divider = 10;

    var angle_delta = 180 / search_space_divider;
    var angle_center = this.angle;

    var offset_delta = search_range / search_space_divider;
    var offset_center = this.offset;

    var N = 10;

    var scores = new Array(N);

    var min_score = Infinity;
    var best_angle = this.angle;
    var best_offset = this.offset;

    for (var i = 0; i < N; i++)
    {
        scores[i] = new Array(N);

        for (var j = 0; j < N; j++)
        {
            var t1 = i / (N - 1);
            var t2 = j / (N - 1);

            var min_angle = angle_center - angle_delta / 2;
            var angle = min_angle + t1 * angle_delta;

            var min_offset = offset_center - offset_delta / 2;
            var offset = min_offset + t2 * offset_delta;

            this.updateStrandMap(angle, offset, this.strand_gap);
            var score = this.scoreViaTrueStrand(this.strandMap[0], this.truePoints[this
                .central_strand]);

            console.log(ang, offset, score);

            if (score < min_score)
            {
                min_score = score;
                best_angle = angle;
                best_offset = offset;
            }

            scores[i][j] = score;
        }
    }

    // Set best found results to map.

    this.updateStrandMap(best_angle, best_offset, this.strand_gap);

    console.log("Running strand_gap improvement process.");

    // Find the strand_gap which best matches the true structure

    var gap_center = 4.75;
    var gap_delta = .5;

    var N = 100;

    var min_score = Infinity;
    var best_gap = this.strand_gap;

    var map = this.strandMap;

    for (var i = 0; i < N; i++)
    {
        var t = i / (N - 1);

        var min_gap = gap_center - gap_delta / 2;
        var strand_gap = min_gap + t * gap_delta;

        this.updateStrandMap(this.angle, this.offset, strand_gap);

        var score = 0;
        for (var j = map._length; j < map.length; j++)
        {
            if (map[j].length - map[j]._length > 0)
            {
                if (this.truePoints[j + this.central_strand] != undefined)
                {
                    var change = this.scoreViaTrueStrand(this.strandMap[j],
                        this.truePoints[j + this.central_strand]);

                    score += change
                }

            }
        }

        if (score < min_score)
        {
            min_score = score;
            best_gap = strand_gap;
        }
    }

    this.updateStrandMap(best_angle, best_offset, best_gap);
};

Strand.prototype.setOrigin = function (t, u)
{
    var coords = BSurface.calc(t, u);

    this.originPoint.x = coords[0];
    this.originPoint.y = coords[1];
    this.originPoint.z = coords[2];

    this.originPoint.t = t;
    this.originPoint.u = u;
};

Strand.prototype.twistAngle = function (s1_1, s1_2, s2_1, s2_2)
{
    var x1 = s1_2.x - s1_1.x;
    var y1 = s1_2.y - s1_1.y;
    var z1 = s1_2.z - s1_1.z;

    var x2 = s2_2.x - s2_1.x;
    var y2 = s2_2.y - s2_1.y;
    var z2 = s2_2.z - s2_1.z;

    var twist = this.angleBetweenTwoVectors(x1, y1, z1, x2, y2, z2, s1_1, s2_1);

    return twist;
};

Strand.prototype.angleBetweenTwoVectors = function (x1, y1, z1, x2, y2, z2, p1, p3)
{
    var l1 = Math.sqrt(Math.pow(x1, 2) + Math.pow(y1, 2) + Math.pow(z1, 2));
    var l2 = Math.sqrt(Math.pow(x2, 2) + Math.pow(y2, 2) + Math.pow(z2, 2));

    var dot = x1 * x2 + y1 * y2 + z1 * z2;

    var ang = Math.acos(dot / l1 / l2);

    // Twist direction calculation

    var cross_x = y1 * z2 - z1 * y2;
    var cross_y = z1 * x2 - x1 * z2;
    var cross_z = x1 * y2 - y1 * x2;

    var delta_x = p1.x - p3.x;
    var delta_y = p1.y - p3.y;
    var delta_z = p1.z - p3.z;

    var dot_dir = cross_x * delta_x + cross_y * delta_y + cross_z * delta_z;

    var dir = sign(dot_dir);

    return dir * ang;
};

Strand.prototype.distBetweenSamples = function (x1, y1, z1, x2, y2, z2)
{
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 -
        z2, 2));
};

Strand.prototype.linearInterpolate = function (x_array, y_array, x)
{
    // Linearly interpolates to find x from a table x_array; y_array
    // such that x_array and y_array have the same length, and are
    // sorted in terms of x_array.

    // Returns y extrema if x is outside of bounds (i.e. does no extrapolation)

    if (x_array.length == 0)
    {
        return 0;
    }

    if (x <= x_array[0])
    {
        return y_array[0];
    }

    for (var i = 1; i < x_array.length; i++)
    {
        var upper_bound = x_array[i];
        var lower_bound = x_array[i - 1];

        if (x <= upper_bound)
        {
            var range = upper_bound - lower_bound;
            var delta = x - lower_bound;
            var slope = (y_array[i] - y_array[i - 1]) / range;

            var y = y_array[i - 1] + delta * slope;

            return y;
        }
    }

    if (x > x_array[x_array.length - 1])
    {
        return y_array[x_array.length - 1];
    }
};

Strand.prototype.euclideanShift = function (points, ang, dist)
{
    // Takes in angle in degrees
    // 
    var projected = new Array();

    if (dist > 0)
    {
        var sign = 1;
    }
    else
    {
        dist = Math.abs(dist);
        var sign = -1;
    }

    // Currently 5
    var strand_gap = dist;

    var eps_dist = 0.001;
    var ang = this.angle;

    var N = 10;

    var x_ang_array = new Array();
    var y_ang_array = new Array();

    for (var t = 0; t <= 1; t += 1 / (N - 1))
    {
        var range = (points.length - 1) - points._length;

        var i = Math.round(points._length + t * range);

        var p1 = points[i];
        var p2 = points[i + 1];

        if (p2 == undefined)
        {
            break;
        }

        var angle_shift = 0;

        var delta = 20;

        for (var j = 0; j < 40; j++)
        {
            // Calculate the current angle
            // 
            var dt = p1.t + Math.cos((ang + angle_shift) / 180 * Math.PI) * eps_dist;
            var du = p1.u + Math.sin((ang + angle_shift) / 180 * Math.PI) * eps_dist;
            var p3 = BSurface.sample(dt, du);
            var delta_angle = Math.abs(this.angleBetween(p1, p2, p3));

            angle_shift += delta;
            var dt = p1.t + Math.cos((ang + angle_shift) / 180 * Math.PI) * eps_dist;
            var du = p1.u + Math.sin((ang + angle_shift) / 180 * Math.PI) * eps_dist;
            var p3 = BSurface.sample(dt, du);
            var delta_angle_plus = Math.abs(this.angleBetween(p1, p2, p3));

            angle_shift -= 2 * delta;
            var dt = p1.t + Math.cos((ang + angle_shift) / 180 * Math.PI) * eps_dist;
            var du = p1.u + Math.sin((ang + angle_shift) / 180 * Math.PI) * eps_dist;
            var p3 = BSurface.sample(dt, du);
            var delta_angle_minus = Math.abs(this.angleBetween(p1, p2, p3));

            if (Math.abs(delta_angle_plus - 90) < Math.abs(delta_angle_minus - 90))
            {
                angle_shift += 2 * delta;
            }

            delta /= 2;
        }

        if (i != points.length - 1)
        {
            x_ang_array.push(i);
            y_ang_array.push(angle_shift);
        }
        else
        {
            x_ang_array.push(points.length - 1)
            y_ang_array.push(0);
        }
    }

    // For a subset of points defined by N, build a look-up table of euclid
    // shifts.

    var N = 10;

    var x_array = new Array();
    var y_array = new Array();

    for (var t = 0; t <= 1; t += 1 / (N - 1))
    {
        var range = (points.length - 1) - points._length;

        var i = Math.round(points._length + t * range);

        var p = points[i];

        // Now we find the euclid shift for this particular point.

        var delta = 0.1;

        var shift_angle = this.linearInterpolate(x_ang_array, y_ang_array, i);

        var adjusted_ang = (ang + shift_angle) / 180 * Math.PI;

        var _cos = Math.cos(adjusted_ang);
        var _sin = Math.sin(adjusted_ang);

        var dt = _cos * delta;
        var du = _sin * delta;

        dist = p.distToParameter(p.t + sign * dt, p.u + sign * du);

        while (Math.abs(dist - strand_gap) > 0.001)
        {
            if (dist > strand_gap)
            {
                delta /= 2;

                dt -= _cos * delta;
                du -= _sin * delta;
            }
            else
            {
                dt += _cos * delta;
                du += _sin * delta;
            }

            dist = p.distToParameter(p.t + sign * dt, p.u + sign * du);
        }

        // Now |dt,du| represents the euclid shift parameter.

        x_array.push(i);
        y_array.push(Math.sqrt(dt * dt + du * du));
    }

    var neg_length = 0;

    for (var i = points._length; i < points.length; i++)
    {
        var p = points[i];

        var delta = this.linearInterpolate(x_array, y_array, i);

        var shift_angle = this.linearInterpolate(x_ang_array, y_ang_array, i);

        var adjusted_ang = (ang + shift_angle) / 180 * Math.PI;

        var dt = Math.cos(adjusted_ang) * delta;
        var du = Math.sin(adjusted_ang) * delta;

        var coords = BSurface.calc(p.t + sign * dt, p.u + sign * du);

        var p_new = new Point(coords[0], coords[1], coords[2]);
        p_new.t = p.t + sign * dt;
        p_new.u = p.u + sign * du;

        if (i >= 0)
        {
            projected[i] = p_new;
        }
        else
        {
            if (neg_length == 0)
            {
                neg_length = -i;
            }

            projected[i] = p_new;
        }

    }

    projected._length = -neg_length;

    return projected;
};

Strand.prototype.cullExteriorPoints = function (points)
{
    // Returns set of points which are inside of the hull boundary.  If none of the 
    // given points are inside the hull boundary, returns false.

    if (points.length == 0 && points._length == 0)
    {
        return false;
    }

    var min = -Infinity;
    var max = Infinity;

    // Find minimum element that is inside the hull boundary.

    for (var i = points._length; i < points.length; i++)
    {
        var p = points[i];

        if (isInsidePolygon(p.t, p.u, BPerimeter.vertices))
        {
            min = i;
            break;
        }
    }

    for (var i = points.length - 1; i >= points._length; i--)
    {
        var p = points[i];

        if (isInsidePolygon(p.t, p.u, BPerimeter.vertices))
        {
            max = i;
            break;
        }
    }

    if (min == -Infinity || max == Infinity)
    {
        return false;
    }

    // Now that we have the max and min, just apply them to a new culled array.

    var culled = new Array();

    culled._length = min;

    for (var i = min; i <= max; i++)
    {
        culled[i] = points[i];
    }

    if (culled.length > 0 || culled._length < 0)
    {
        return culled;
    }
    else
    {
        return false;
    }
};

Strand.prototype.generateStrandString = function (angle, offset, gap)
{
    console.log(angle, offset, gap);
    this.updateStrandMap(angle, offset, gap);

    var sample_points = new Array();

    var map = this.strandMap;

    for (var i = map._length; i < map.length; i++)
    {
        for (var j = map[i]._length; j < map[i].length; j++)
        {
            var p = map[i][j];

            if (p != undefined)
            {
                var p_copy = new Point(p.x, p.y, p.z);

                sample_points.push(p_copy);
            }
        }
    }

    // Undo plane and centering transformations
    for (var i = 0; i < sample_points.length; i++)
    {
        sample_points[i].rotateAxis(-DMap.rot_theta, DMap.rot_ux, DMap.rot_uy,
            DMap.rot_uz)

        sample_points[i].x += DMap.x_avg
        sample_points[i].y += DMap.y_avg
        sample_points[i].z += DMap.z_avg
    }

    var string = generatePDBString(sample_points);

    return string;
};

Strand.prototype.getFilename = function ()
{
    var filename = DMap.filename;
    var exploded_filename = filename.split(".");

    var strand_filename = "";

    for (var i = 0; i < exploded_filename.length - 2; i++)
    {
        strand_filename += (exploded_filename[i] + ".");
    }
    strand_filename += (exploded_filename[i]);

    return strand_filename;
};

Strand.prototype.generateSampleSet = function (angle_delta, offset_min, offset_max, offset_num)
{
    this.generatedSet = true;

    // First, generate an array of strings, each string being a file.
    // Also generate an array of filenames

    var files = new Array();
    var filenames = new Array();

    var angle = 0;

    var offset_delta = offset_max - offset_min;

    while (angle < 360)
    {
        for (var i = 0; i < offset_num; i++)
        {
            var offset = offset_min + i / (offset_num - 1) * offset_delta;

            console.log("Generating a" + angle + "_o" + offset);

            var file = this.generateStrandString(angle, offset, 4.92);
            var filename = this.getFilename() + "_a" + angle.toFixed(0) + "_o" +
                offset.toFixed(2) + "_Strands.pdb";

            files.push(file);
            filenames.push(filename);
        }

        angle += angle_delta;
    }

    var zip_name = this.getFilename() + "_StrandSet.zip";
    set_dl.download = zip_name;

    zip.createWriter(new zip.BlobWriter("application/zip"), function (writer)
    {
        var f = 0;

        function nextFile(f)
        {
            writer.add(filenames[f], new zip.TextReader(files[f]), function ()
            {
                console.log(f);
                f++;
                if (f < files.length)
                {
                    nextFile(f);
                }
                else close();
            });
        }

        function close()
        {
            writer.close(function (blob)
            {

                var set_dl = document.getElementById('set_download_link');

                set_dl.text = "Set Finished. Click to download"

                zip_file = window.URL.createObjectURL(blob);
                console.log(zip_file);
                set_dl.href = zip_file;
            });
        }

        nextFile(f);

    }, onerror)
};

Strand.prototype.updateDownload = function ()
{
    // We now happily have the full set of strand sample points, so we can 
    // generate a pdb file and hook it to the button (magic)

    // Create new array of strand samples to perform work on.

    var sample_points = new Array();

    var map = this.strandMap;

    for (var i = map._length; i < map.length; i++)
    {
        for (var j = map[i]._length; j < map[i].length; j++)
        {
            var p = map[i][j];

            if (p != undefined)
            {
                var p_copy = new Point(p.x, p.y, p.z);

                sample_points.push(p_copy);
            }
        }
    }

    // Undo plane and centering transformations
    for (var i = 0; i < sample_points.length; i++)
    {
        sample_points[i].rotateAxis(-DMap.rot_theta, DMap.rot_ux, DMap.rot_uy,
            DMap.rot_uz)

        sample_points[i].x += DMap.x_avg
        sample_points[i].y += DMap.y_avg
        sample_points[i].z += DMap.z_avg
    }

    var string = generatePDBString(sample_points);

    var file = generateTextFile(string);

    strand_dl.href = file;

    // Build filename by appending "_SplineFit" to the end of the input file

    var filename = DMap.filename;
    var exploded_filename = filename.split(".");

    var strand_filename = "";

    for (var i = 0; i < exploded_filename.length - 2; i++)
    {
        strand_filename += (exploded_filename[i] + ".");
    }
    strand_filename += (exploded_filename[i]);

    strand_filename += "_SplineFit";

    var opt_method = document.getElementById("twist_menu");
    var optimization_method_name = opt_method.options[opt_method.selectedIndex].text;

    var opt_method2 = document.getElementById("angle_menu");
    var optimization_method_name2 = opt_method2.options[opt_method2.selectedIndex].text;

    strand_filename += "_" + optimization_method_name + "_" + optimization_method_name2 + ".pdb";

    strand_dl.download = strand_filename;
};

Strand.prototype.crossProduct = function (v1, v2)
{
    var v = new Array(3);

    v[0] = v1[1] * v2[2] - v1[2] * v2[1];
    v[1] = v1[2] * v2[0] - v1[0] * v2[2];
    v[2] = v1[0] * v2[1] - v1[1] * v2[0];

    return v;
};

Strand.prototype.dotProduct = function (v1, v2)
{
    var v = new Array(3);

    v[0] = v1[0] * v2[0];
    v[1] = v1[1] * v2[1];
    v[2] = v1[2] * v2[2];

    return v[0] + v[1] + v[2];
};

Strand.prototype.subtractVector = function (v1, v2)
{
    var v = new Array(3);

    v[0] = v1[0] - v2[0];
    v[1] = v1[1] - v2[1];
    v[2] = v1[2] - v2[2];

    return v;
};

Strand.prototype.absoluteVector = function (v)
{
    return Math.sqrt(
        Math.pow(v[0], 2) + Math.pow(v[1], 2) + Math.pow(v[2], 2));
};

Strand.prototype.divideVector = function (v1, divisor)
{
    var v = new Array(3);

    v[0] = v1[0] / divisor;
    v[1] = v1[1] / divisor;
    v[2] = v1[2] / divisor;

    return v;
};

Strand.prototype.dihedralAngle = function (p1, p2, p3, p4)
{
    var p1 = [p1.x, p1.y, p1.z];
    var p2 = [p2.x, p2.y, p2.z];
    var p3 = [p3.x, p3.y, p3.z];
    var p4 = [p4.x, p4.y, p4.z];

    var b1 = this.subtractVector(p2, p1);
    var b2 = this.subtractVector(p3, p2);
    var b3 = this.subtractVector(p4, p3);

    var cross1 = this.crossProduct(b1, b2);
    var cross2 = this.crossProduct(b2, b3);
    var double_cross = this.crossProduct(cross1, cross2);
    var right = this.dotProduct(cross1, cross2);

    var magnitude = this.absoluteVector(b2);
    var divided = this.divideVector(b2, magnitude);

    var left = this.dotProduct(double_cross, divided);

    var angle = Math.atan2(left, right);

    return angle;
};

Strand.prototype.draw = function ()
{
    if (this.optimizing)
    {
        return;
    }

    if (!this.ignoreChanges)
    {
        if ((this.angle_slider.value != this.angle) ||
            (this.offset_slider.value != this.offset) ||
            (this.gap_slider.value != this.strand_gap))
        {
            this.angle = this.angle_slider.value;
            this.offset = this.offset_slider.value;
            this.strand_gap = this.gap_slider.value;

            this.updateStrandMap(this.angle, this.offset, this.strand_gap);
        }
    }
    else
    {
        this.angle_slider.setValue(this.angle);
        this.offset_slider.setValue(this.offset);
        this.gap_slider.setValue(this.strand_gap);

        this.ignoreChanges = false;
    }

    var map = this.strandMap;

    // Find pair of simulated strands with most shared connections.
    var max_count = -Infinity;
    var max_index = -Infinity;
    for (var i = map._length; i < map.length - 1; i++)
    {
        var s1 = map[i];
        var s2 = map[i + 1];

        // Loop through s1, counting how many elements also exist in s2.
        var count = 0;
        for (var j = s1._length; j < s1.length; j++)
        {
            if (s1[j] != undefined && s2[j] != undefined)
            {
                count++;
            }
        }

        if (count > max_count)
        {
            max_count = count;
            max_index = i;
        }
    }

    // Loop through pair, and find the minimum and maximum twist angle between them.

    var s1 = map[max_index];
    var s2 = map[max_index + 1];

    var min_angle = Infinity;
    var max_angle = -Infinity;

    for (var i = s1._length; i < s1.length - 1; i++)
    {
        var s1_1 = s1[i];
        var s1_2 = s1[i + 1];

        var s2_1 = s2[i];
        var s2_2 = s2[i + 1];

        var defined = s1_1 && s1_2 && s2_1 && s2_2;

        if (defined)
        {
            var angle = this.twistAngle(s1_1, s1_2, s2_1, s2_2);

            if (angle < min_angle)
            {
                min_angle = angle;
            }

            if (angle > max_angle)
            {
                max_angle = angle;
            }
        }
    }

    // Loop through pair, calculating the N average of each N-group of sample
    // pairs, and finding the max N-avg and min N-avg.  N > 0

    var s1 = map[max_index];
    var s2 = map[max_index + 1];

    var min_avg_angle = Infinity;
    var max_avg_angle = -Infinity;

    var N = 4;

    for (var i = s1._length; i < s1.length - N; i++)
    {
        var sumtwist = 0;

        for (var j = 0; j < N; j++)
        {
            var s1_1 = s1[i + j];
            var s1_2 = s1[i + j + 1];

            var s2_1 = s2[i + j];
            var s2_2 = s2[i + j + 1];

            var defined = s1_1 && s1_2 && s2_1 && s2_2;

            if (defined)
            {
                var angle = this.twistAngle(s1_1, s1_2, s2_1, s2_2);

                sumtwist += angle;
            }
            else
            {
                sumtwist = NaN;
                break;
            }
        }

        if (sumtwist == sumtwist)
        {
            if (sumtwist < min_avg_angle)
            {
                min_avg_angle = sumtwist;
            }

            if (sumtwist > max_avg_angle)
            {
                max_avg_angle = sumtwist;
            }
        }
    }

    // Calculate "strand coverage" score.  For all voxels, loop through all
    // strand samples, and find the smallest distance.  Add this distance,
    // squared, to a sum.  Then divide by num of voxels, then SQRT.

    var coverage_score = this.coverageScore();

    ctx.fillText("Min twist angle: " + min_angle, 10, 90);
    ctx.fillText("Max twist angle: " + max_angle, 10, 100);

    ctx.fillText("MinAvg twist angle: " + min_avg_angle, 10, 120);
    ctx.fillText("MaxAvg twist angle: " + max_avg_angle, 10, 130);
    ctx.fillText("Coverage score: " + coverage_score, 10, 150);

    //HTML Input Menu for calculating twist by various methods

    //Menu variable
    var ang_generation_method = document.getElementById('twist_menu').value;
    var ang_pref = document.getElementById('angle_menu').value;
    var highlight = document.getElementById('highlight_menu').value;


    //Twist generation from the automatically generated center
    if (ang_generation_method == 1)
    {
        // Calculate max twist of region 1 and region 2 in center point.
        var map = this.strandMap;

        var dist_limit = 4; // Angstroms

        //Max angle case
        if (ang_pref == 0)
        {
            var ang1 = this.maxAngleOfStrand(-1, dist_limit);
            var ang2 = this.maxAngleOfStrand(0, dist_limit);
            var max_ang = Math.max(ang1, ang2);
            ctx.fillText("Central Max Ang: " + max_ang, 10, 170);
        }

        //Av angle case
        else if (ang_pref == 1)
        {
            var av1 = this.avgAngleOfStrand(-1, dist_limit);
            var av2 = this.avgAngleOfStrand(0, dist_limit);
            var av_ang = (av1+av2)/2;
            ctx.fillText("Central Av Ang: " + av_ang, 10, 170);
        }

        // Loop through all strand points and set color depending on distance to center



        if(highlight == 0)
        {
            for (var i = map._length; i < map.length; i++)
            {
                var s = map[i];
                for (var j = s._length; j < s.length; j++)
                {
                    var p = s[j];
                    var p_draw = this.strandMap_T[i][j];

                    if (p != undefined)
                    {
                        if (p.dist(BPerimeter.centralPoint) > dist_limit)
                        {
                            p_draw.color = "black";
                            p_draw.size = 1;
                        }
                        else
                        {
                            p_draw.color = "red";
                            p_draw.size = 3;
                        }
                    }
                }
            }
        }

        if(highlight == 1)
        {
            if(ang_pref == 0)
            {
                this.twistScaleColor(max_ang, 0);
                this.twistScaleColor(max_ang, -1);
            }

            if(ang_pref == 1)
            {
                this.twistScaleColor(av_ang, 0);
                this.twistScaleColor(av_ang, -1);
            }
        }



        this.drawMap();
        this.drawTrueStrands();
    }

    //Twist generation from the longest strand
    else if (ang_generation_method == 2)
    {
        //find longest strand
        //Probably not the best method if a strand ties another in length

        var longest_strand_length = 0;
        var longest_strand = 0;
        var map = this.strandMap;

        for (var i = map._length; i < map.length; i++)
        {
            var s = map[i];
            for (var j = s._length; j < s.length; j++)
            {
                if (s.length - s._length > longest_strand_length)
                {
                    longest_strand_length = s.length - s._length;
                    longest_strand = i;
                }
            }
        }

        //indicator if two strands tie for longest

        for (i = map._length; i < map.length; i++)
        {
            s = map[i];
            for (j = s._length; j < s.length; j++)
            {
                if (s.length - s._length == longest_strand_length && i != longest_strand)
                {
                    ctx.fillText("Error: multiple strands are tied in length.", 10, 200);
                }
            }
        }

        //Max angle
        if (ang_pref == 0)
        {
            var max_ang = this.maxAngleOfStrand(longest_strand, Infinity);
            ctx.fillText("Longest Strand Max Ang: " + max_ang, 10, 170);
        }

        //Av angle
        else if (ang_pref == 1)
        {
            var av_ang = this.avgAngleOfStrand(longest_strand, Infinity);
            ctx.fillText("Longest Strand Av Ang: " + av_ang, 10, 170);
        }

        if(highlight == 0)
        {
        
            for (i = map._length; i < map.length; i++)
            {
                s = map[i];
                for (j = s._length; j < s.length; j++)
                {
                    p = s[j];
                    p_draw = this.strandMap_T[i][j];

                    if (p != undefined)
                    {
                        if (i != longest_strand)
                        {
                            p_draw.color = "black";
                            p_draw.size = 1;
                        }
                        else
                        {
                            p_draw.color = "red";
                            p_draw.size = 3;
                        }
                    }
                }
            }
        }

        if(highlight == 1)
        {
            if(ang_pref == 0)
            {
                this.twistScaleColor(max_ang, longest_strand);
            }
            
            if(ang_pref == 1)
            {
                this.twistScaleColor(av_ang, longest_strand);
            }
        }

        this.drawMap();
        this.drawTrueStrands();
    }

    //Twist generation from the two longest strands
    else if (ang_generation_method == 3)
    {
        //find 2 longest strands

        var longest_strand_length = 0;
        var longest_strand = 0;
        var second_largest = 0;
        var map = this.strandMap;

        for (var i = map._length; i < map.length; i++)
        {
            var s = map[i];
            for (var j = s._length; j < s.length; j++)
            {
                if (s.length - s._length > longest_strand_length)
                {
                    longest_strand_length = s.length - s._length;
                    second_largest = longest_strand;
                    longest_strand = i;
                }
            }
        }

        //Max angle case
        if (ang_pref == 0)
        {
            var ang1 = this.maxAngleOfStrand(longest_strand, Infinity);
            var ang2 = this.maxAngleOfStrand(second_largest, Infinity);
            var max_ang = Math.max(ang1, ang2);
            ctx.fillText("2 Strands Max Ang: " + max_ang, 10, 170);
        }

        //Av angle case
        else if (ang_pref == 1)
        {

            var av_ang = (this.avgAngleOfStrand(longest_strand, Infinity) +
            this.avgAngleOfStrand(second_largest, Infinity)) / 2;

            ctx.fillText("2 Strands Av Ang: " + av_ang, 10, 170);

        }



        var map = this.strandMap;

        if(highlight == 0)
        {

            for (var i = map._length; i < map.length; i++)
            {
                var s = map[i];
                for (var j = s._length; j < s.length; j++)
                {
                    var p = s[j];
                    var p_draw = this.strandMap_T[i][j];

                    if (p != undefined)
                    {
                        if (i != longest_strand && i != second_largest)
                        {
                            p_draw.color = "black";
                            p_draw.size = 1;
                        }
                        else
                        {
                            p_draw.color = "red";
                            p_draw.size = 3;
                        }
                    }
                }
            }
        }

        if(highlight == 1)
        {
            if(ang_pref == 0)
            {
                this.twistScaleColor(max_ang, longest_strand);
                this.twistScaleColor(max_ang, second_largest);
            }
            
            if(ang_pref == 1)
            {
                this.twistScaleColor(av_ang, longest_strand);
                this.twistScaleColor(av_ang, second_largest);
            }
        }

        this.drawMap();
        this.drawTrueStrands();
    }

    //Twist generation from two longest pairs
    else if (ang_generation_method == 4)
    {

        //find the two longest strand pairs
        var map = this.strandMap;
        var maxPair = new Array(6);
        for (var i=0; i<6; i++)
        {
            maxPair[i] = 0;
        }
        var temp1 = 0;
        var temp2 = 0;

        for (var i = map._length; i < map.length - 2; i++)
        {
            var s = map[i];
            temp1 = s.length - s._length;
            temp2 = map[i+1].length - map[i+1]._length;

            if(i != map._length)
            {
                if (temp1 > temp2)
                {
                    if (temp2 > maxPair[0] || temp2 == maxPair[0])
                    {
                        maxPair[0] = temp2;
                        maxPair[1] = i;
                        maxPair[2] = i+1;

                    }
                }

                else
                {
                    if (temp1 > maxPair[0] || temp1 == maxPair[0])
                    {
                        maxPair[0] = temp1;
                        maxPair[1] = i;
                        maxPair[2] = i + 1;
                    }
                }
            }
        }

        //loop for second pair

        for (var i = map._length; i < map.length - 2; i++)
        {
            var s = map[i];

            temp1 = s.length - s._length;
            temp2 = map[i+1].length - map[i+1]._length;

            if (i != map._length)
            {

                if (temp1 > temp2)
                {
                    if ((temp2 > maxPair[5] || temp2 == maxPair[5]) && i != maxPair[1])
                    {
                        maxPair[5] = temp2;
                        maxPair[3] = i;
                        maxPair[4] = i+1;

                    }
                }

                else
                {
                    if ((temp1 > maxPair[5] || temp1 == maxPair[5]) && i != maxPair[1])
                    {
                        maxPair[5] = temp1;
                        maxPair[3] = i;
                        maxPair[4] = i + 1;
                    }
                }
            }
        }

            //Use two longest strand pairs to find angle av or max
            //Max angle case

            if (ang_pref == 0)
            {
                var ang1 = this.maxAngleOfStrand(maxPair[1], Infinity);
                var ang2 = this.maxAngleOfStrand(maxPair[3], Infinity);
                var max_ang = Math.max(ang1, ang2);

                ctx.fillText("2 Longest Strand Pair Max Ang: " + max_ang, 10, 170);
            }

            else if (ang_pref == 1)
            {
                var ang1 = this.avgAngleOfStrand(maxPair[1], Infinity);
                var ang2 = this.avgAngleOfStrand(maxPair[3], Infinity);
                var av_ang = (ang1 + ang2)/2;

                ctx.fillText("2 Longest Strand Pair Av Ang: " + av_ang, 10, 170);
            }

            //draw map on grid

        if(highlight == 0)
        {

            for (var i = map._length; i < map.length; i++)
            {
                var s = map[i];
                for (var j = s._length; j < s.length; j++)
                {
                    var p = s[j];
                    var p_draw = this.strandMap_T[i][j];

                    if (p != undefined)
                    {
                        if(i==maxPair[1] || i==maxPair[2] || i==maxPair[3] || i==maxPair[4])
                        {
                            p_draw.color = "red";
                            p_draw.size = 3;
                        }

                        else
                        {
                            p_draw.color = "black";
                            p_draw.size = 1;
                        }
                    }
                }
            }
        }

        if(highlight ==1)
        {
            if(ang_pref == 0)
            {
                this.twistScaleColor(max_ang, maxPair[1]);
                this.twistScaleColor(max_ang, maxPair[3]);
            }
            
            if(ang_pref == 1)
            {
                this.twistScaleColor(av_ang, maxPair[1]);
                this.twistScaleColor(av_ang, maxPair[3]);
            }
        }

            this.drawMap();
            this.drawTrueStrands();
    }

    //Twist generation with the two longest strand pairs that are not on the ends
    else if (ang_generation_method == 5)
    {
        //find the two longest strand pairs
        var map = this.strandMap;
        var maxPair = new Array(6);
        for (var i=0; i<6; i++)
        {
            maxPair[i] = 0;
        }
        var temp1 = 0;
        var temp2 = 0;

        for (var i = map._length+1; i < map.length - 3; i++)
        {
            var s = map[i];
            temp1 = s.length - s._length;
            temp2 = map[i+1].length - map[i+1]._length;

            if(i != map._length)
            {
                if (temp1 > temp2)
                {
                    if (temp2 > maxPair[0] || temp2 == maxPair[0])
                    {
                        maxPair[0] = temp2;
                        maxPair[1] = i;
                        maxPair[2] = i+1;

                    }
                }

                else
                {
                    if (temp1 > maxPair[0] || temp1 == maxPair[0])
                    {
                        maxPair[0] = temp1;
                        maxPair[1] = i;
                        maxPair[2] = i + 1;
                    }
                }
            }
        }

        //loop for second pair

        for (var i = map._length+1; i < map.length - 3; i++)
        {
            var s = map[i];

            temp1 = s.length - s._length;
            temp2 = map[i+1].length - map[i+1]._length;

            if (i != map._length)
            {

                if (temp1 > temp2)
                {
                    if ((temp2 > maxPair[5] || temp2 == maxPair[5]) && i != maxPair[1])
                    {
                        maxPair[5] = temp2;
                        maxPair[3] = i;
                        maxPair[4] = i+1;

                    }
                }

                else
                {
                    if ((temp1 > maxPair[5] || temp1 == maxPair[5]) && i != maxPair[1])
                    {
                        maxPair[5] = temp1;
                        maxPair[3] = i;
                        maxPair[4] = i + 1;
                    }
                }
            }
        }

            //Use two longest strand pairs to find angle av or max
            //Max angle case

            if (ang_pref == 0)
            {
                var ang1 = this.maxAngleOfStrand(maxPair[1], Infinity);
                var ang2 = this.maxAngleOfStrand(maxPair[3], Infinity);
                var max_ang = Math.max(ang1, ang2);

                ctx.fillText("2 Longest Strand Pair Max Ang: " + max_ang, 10, 170);
            }

            else if (ang_pref == 1)
            {
                var ang1 = this.avgAngleOfStrand(maxPair[1], Infinity);
                var ang2 = this.avgAngleOfStrand(maxPair[3], Infinity);
                var av_ang = (ang1 + ang2)/2;

                ctx.fillText("2 Longest Strand Pair Av Ang: " + av_ang, 10, 170);
            }

            //draw map on grid
        if(highlight == 0)
        {

            for (var i = map._length; i < map.length; i++)
            {
                var s = map[i];
                for (var j = s._length; j < s.length; j++)
                {
                    var p = s[j];
                    var p_draw = this.strandMap_T[i][j];

                    if (p != undefined)
                    {
                        if(i==maxPair[1] || i==maxPair[2] || i==maxPair[3] || i==maxPair[4])
                        {
                            p_draw.color = "red";
                            p_draw.size = 3;
                        }

                        else
                        {
                            p_draw.color = "black";
                            p_draw.size = 1;
                        }
                    }
                }
            }
        }

        if(highlight == 1)
        {
            if(ang_pref == 0)
            {
                this.twistScaleColor(max_ang, maxPair[1]);
                this.twistScaleColor(max_ang, maxPair[3]);
            }
            
            if(ang_pref == 1)
            {
                this.twistScaleColor(av_ang, maxPair[1]);
                this.twistScaleColor(av_ang, maxPair[3]);
            }
        }

            this.drawMap();
            this.drawTrueStrands();
    }

    //Twist generation from all strands
    else if (ang_generation_method == 6)
    {
        var map = this.strandMap;

        //Max angle case
        if (ang_pref == 0)
        {

            var max_ang = 0;

            for (var i = map._length+1; i < map.length-1; i++)
            {
                var current_ang = this.maxAngleOfStrand(i, Infinity);

                if (current_ang != Infinity && current_ang != -Infinity)
                {
                    if (current_ang > max_ang)
                    {
                        max_ang = current_ang;
                    }
                }
            }
            ctx.fillText("Max Ang: " + max_ang, 10, 170);
        }

        //Av angle case
        if (ang_pref == 1)
        {
            var denominator = (map.length - map._length)-2;
            var total_angle = 0;

            for (var i = map._length+1; i < map.length-1; i++)
            {
                var current_ang = this.avgAngleOfStrand(i, Infinity);
                total_angle += current_ang;
            }

            var av_ang = total_angle/denominator;
            ctx.fillText("Av Overall Ang: " + av_ang, 10, 170);
        }

        if(highlight == 0)
        {

            for (var i = map._length+1; i < map.length-1; i++)
            {
                var s = map[i];
                for (var j = s._length; j < s.length; j++)
                {
                    var p = s[j];
                    var p_draw = this.strandMap_T[i][j];

                    if (p != undefined)
                    {
                        p_draw.color = "red";
                        p_draw.size = 3;
                    }
                }
            }
        }

        if(highlight == 1)
        {
            for (var i = map._length+1; i < map.length-1; i++)
            {
                if(ang_pref == 0)
                {
                    this.twistScaleColor(max_ang, i);
                }

                if(ang_pref == 1)
                {
                    this.twistScaleColor(av_ang, i);
                }
            }
        }

        this.drawMap();
        this.drawTrueStrands();
    }

    //Twist generation from all strands except the ones on the end
    else if (ang_generation_method == 7)
    {
        var map = this.strandMap;

        //Max angle case
        if (ang_pref == 0)
        {

            var max_ang = 0;

            for (var i = map._length+2; i < map.length-2; i++)
            {
                var current_ang = this.maxAngleOfStrand(i, Infinity);

                if (current_ang != Infinity && current_ang != -Infinity)
                {
                    if (current_ang > max_ang)
                    {
                        max_ang = current_ang;
                    }
                }
            }
            ctx.fillText("Max Ang: " + max_ang, 10, 170);
        }

        //Av angle case
        if (ang_pref == 1)
        {
            var denominator = (map.length - map._length)-4;
            var total_angle = 0;

            for (var i = map._length+2; i < map.length-2; i++)
            {
                var current_ang = this.avgAngleOfStrand(i, Infinity);
                total_angle += current_ang;
            }

            var av_ang = total_angle/denominator;
            ctx.fillText("Av Overall Ang: " + av_ang, 10, 170);
        }

        if(highlight == 0)
        {

            for (var i = map._length+2; i < map.length-2; i++)
            {
                var s = map[i];
                for (var j = s._length; j < s.length; j++)
                {
                    var p = s[j];
                    var p_draw = this.strandMap_T[i][j];

                    if (p != undefined)
                    {
                        p_draw.color = "red";
                        p_draw.size = 3;
                    }
                }
            }
        }

        if(highlight == 1)
        {
            for (var i = map._length+2; i < map.length-2; i++)
            {
                if(ang_pref == 0)
                {
                    this.twistScaleColor(max_ang, i);
                }

                if(ang_pref == 1)
                {
                    this.twistScaleColor(av_ang, i);
                }
            }
        }

        this.drawMap();
        this.drawTrueStrands();
    }

    //Default Case - Automatically choses a method based on protein strand characteristics
    else 
    {
        //Check for number of strands, where the longest strands are, and the shape of the protein
        var sheetSize = (map.length-1) - (1 + map._length);

        ///small strands (<4) use 2 longest pairs
        if (sheetSize < 4)
        {
            var map = this.strandMap;
            //find the two longest strand pairs
        
            var maxPair = new Array(6);
            for (var i=0; i<6; i++)
            {
                maxPair[i] = 0;
            }
            var temp1 = 0;
            var temp2 = 0;

            for (var i = map._length; i < map.length - 2; i++)
            {
                var s = map[i];
                temp1 = s.length - s._length;
                temp2 = map[i+1].length - map[i+1]._length;

                if(i != map._length)
                {
                    if (temp1 > temp2)
                    {
                        if (temp2 > maxPair[0] || temp2 == maxPair[0])
                        {
                            maxPair[0] = temp2;
                            maxPair[1] = i;
                            maxPair[2] = i+1;

                        }
                    }

                    else
                    {
                        if (temp1 > maxPair[0] || temp1 == maxPair[0])
                        {
                            maxPair[0] = temp1;
                            maxPair[1] = i;
                            maxPair[2] = i + 1;
                        }
                    }
                }
            }

            //loop for second pair

            for (var i = map._length; i < map.length - 2; i++)
            {
                var s = map[i];

                temp1 = s.length - s._length;
                temp2 = map[i+1].length - map[i+1]._length;

                if (i != map._length)
                {

                    if (temp1 > temp2)
                    {
                        if ((temp2 > maxPair[5] || temp2 == maxPair[5]) && i != maxPair[1])
                        {
                            maxPair[5] = temp2;
                            maxPair[3] = i;
                            maxPair[4] = i+1;

                        }
                    }

                    else
                    {
                        if ((temp1 > maxPair[5] || temp1 == maxPair[5]) && i != maxPair[1])
                        {
                            maxPair[5] = temp1;
                            maxPair[3] = i;
                            maxPair[4] = i + 1;
                        }
                    }
                }
            }


            var ang1 = this.avgAngleOfStrand(maxPair[1], Infinity);
            var ang2 = this.avgAngleOfStrand(maxPair[3], Infinity);
            var av_ang = (ang1 + ang2)/2;

            ctx.fillText("2 Longest Strand Pair Av Ang: " + av_ang, 10, 170);

            //draw map on grid
        if(highlight == 0)
        {

            for (var i = map._length; i < map.length; i++)
            {
                var s = map[i];
                for (var j = s._length; j < s.length; j++)
                {
                    var p = s[j];
                    var p_draw = this.strandMap_T[i][j];

                    if (p != undefined)
                    {
                        if(i==maxPair[1] || i==maxPair[2] || i==maxPair[3] || i==maxPair[4])
                        {
                            p_draw.color = "red";
                            p_draw.size = 3;
                        }

                        else
                        {
                            p_draw.color = "black";
                            p_draw.size = 1;
                        }
                    }
                }
            }
        }

        if(highlight == 1)
        {

        }

            this.drawMap();
            this.drawTrueStrands();
        }

        ///medium strands use all angles
        else if (sheetSize == 4 || sheetSize == 5)
        {
            var map = this.strandMap;
            var denominator = (map.length - map._length)-2;
            var total_angle = 0;

            for (var i = map._length+1; i < map.length-1; i++)
            {
                var current_ang = this.avgAngleOfStrand(i, Infinity);
                total_angle += current_ang;
            }

            var av_ang = total_angle/denominator;
            ctx.fillText("Av Overall Ang: " + av_ang, 10, 170);

        if(highlight == 0)
        {

            for (var i = map._length+1; i < map.length-1; i++)
            {
                var s = map[i];
                for (var j = s._length; j < s.length; j++)
                {
                    var p = s[j];
                    var p_draw = this.strandMap_T[i][j];

                    if (p != undefined)
                    {
                        p_draw.color = "red";
                        p_draw.size = 3;
                    }
                }
            }
        }

        if(highlight == 1)
        {

        }

            this.drawMap();
            this.drawTrueStrands();
        }

        ///largest strands(5+) use all strands except last two
        else
        {
            var map = this.strandMap;
            var denominator = (map.length - map._length)-4;
            var total_angle = 0;

            for (var i = map._length+2; i < map.length-2; i++)
            {
                var current_ang = this.avgAngleOfStrand(i, Infinity);
                total_angle += current_ang;
            }

            var av_ang = total_angle/denominator;
            ctx.fillText("Av Overall Ang: " + av_ang, 10, 170);

        if(highlight == 0)
        {

            for (var i = map._length+2; i < map.length-2; i++)
            {
                var s = map[i];
                for (var j = s._length; j < s.length; j++)
                {
                    var p = s[j];
                    var p_draw = this.strandMap_T[i][j];

                    if (p != undefined)
                    {
                        p_draw.color = "red";
                        p_draw.size = 3;
                    }
                }
            }
        }

        if(highlight == 1)
        {

        }

            this.drawMap();
            this.drawTrueStrands();
        }

        //"Bowtie" protein case?
        //Show the method utilized

        if (sheetSize < 4)
        {
            ctx.fillStyle = "red";
            ctx.fillText("Selected Mehod: 2 Longest Pairs Av", 10, 210);
        }

        else if (sheetSize == 4 || sheetSize == 5)
        {
            ctx.fillStyle = "red";
            ctx.fillText("Selected Mehod: All Strands Av", 10, 210);
        }

        else
        {
            ctx.fillStyle = "red";
            ctx.fillText("Selected Mehod: All Strands Except Last Av", 10, 210);
        }
    }

    //End of Twist generation menu

    if (this.optimize_button.isActivated())
    {
        this.optimizePrediction();

        this.optimize_button.toggle();
    }

    if (this.truePoints != undefined)
    {
        // We call "scoreViaTrueStrand" to find the matching between a given
        // simulated strand and a given true strand.

        var score = 0;
        for (var j = map._length; j < map.length; j++)
        {
            if (map[j].length - map[j]._length > 0)
            {
                var change = this.scoreViaTrueStrand(this.strandMap[j], this.truePoints[j +
                    this.central_strand]);

                score += change
            }
        }

        ctx.fillText("True-match score: " + score, 10, 80);
    }
};

Strand.prototype.optimizePrediction = function ()
{
    // Optimize (maximize) maximum angle of longest strand pair region.

    // Begin by searching 20x angle space.

    this.optimizing = true;

    console.log("Performing initial angle space search");

    var N = 20;
    var max_score = -Infinity;
    var max_ang = -Infinity;

    for (var i = 0; i < N; i++)
    {
        var ang = i / N * 180;

        this.updateStrandMap(ang, 0, this.strand_gap);

        var score = this.calculateScore();

        console.log(score);

        if (score > max_score)
        {
            max_score = score;
            max_ang = ang;
        }
    }

    this.angle = max_ang;

    // Then search 20x offset space
    // 

    var N = 20;
    var max_score = -Infinity;
    var max_val = -Infinity;
    var min_offset = -2;
    var max_offset = 2;

    for (var i = 0; i < N; i++)
    {
        var t = i / (N - 1);
        var offset = min_offset + (max_offset - min_offset) * t;

        this.updateStrandMap(this.angle, offset, this.strand_gap);

        var score = this.calculateScore();

        if (score > max_score)
        {
            max_score = score;
            max_val = offset;
        }
    }

    this.offset = max_val;

    // Finally, search 20x 20x in both spaces, in a subregion

    var N = 15;
    var M = 15;

    var ang_delta = 10; // Plus or minus this many degrees to search
    var offset_delta = 1;

    var min_s_ang = this.angle - ang_delta;

    if (min_s_ang < 0)
    {
        min_s_ang = 0;
    }

    var min_s_offset = this.offset - offset_delta;

    var max_score = -Infinity;
    var best_angle = -Infinity;
    var best_offset = -Infinity;

    for (var i = 0; i < N; i++)
    {
        var t_ang = i / (N - 1);

        var ang = min_s_ang + ang_delta * 2 * t_ang;

        this.updateStrandMap(ang, 0, this.strand_gap);

        var score = this.calculateScore();

        console.log(ang, 0, score);

        if (score > max_score)
        {
            max_score = score;
            best_angle = ang;
        }

        for (var j = 0; j < M; j++)
        {
            var t_offset = j / (M - 1);

            var offset = min_s_offset + offset_delta * 2 * t_offset;

            this.updateStrandMap(ang, offset, this.strand_gap);

            score = this.calculateScore();

            console.log(ang, offset, score);

            if (score > max_score)
            {
                max_score = score;
                best_angle = ang;
                best_offset = offset;
            }
        }
    }

    this.angle = best_angle;
    this.offset = best_offset;

    console.log("Beginning strand coverage optimization");

    // Do 20x search on minimizing coverage score.

    var N = 20;

    var low_offset = -2;
    var high_offset = 2;

    var min_score = Infinity;
    var best_offset = Infinity;

    for (var i = 0; i < N; i++)
    {
        var t = i / (N - 1);

        var offset = low_offset + (high_offset - low_offset) * t;

        this.updateStrandMap(this.angle, offset, this.strand_gap);

        var score = this.coverageScore();

        if (score < min_score)
        {
            min_score = score;
            best_offset = offset;
        }

        console.log(offset, score);
    }

    this.updateStrandMap(this.angle, best_offset, this.strand_gap);

    console.log("Best found parameters:");
    console.log(this.angle, this.offset, this.strand_gap);

    this.optimizing = false;
};

Strand.prototype.drawMap = function ()
{
    // Draw all strand map points:

    var map = this.strandMap_T;

    for (var i = map._length; i < map.length; i++)
    {
        for (var j = map[i]._length; j < map[i].length; j++)
        {
            var p = map[i][j];

            if (p != undefined)
            {
                p.draw();
            }
        }
    }

    // Draw all parallel strand lines (first part of grid)

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;

    for (var i = map._length; i < map.length; i++)
    {
        for (var j = map[i]._length; j < map[i].length - 1; j++)
        {
            var p1 = map[i][j];
            var p2 = map[i][j + 1];

            if (p1 != undefined && p2 != undefined)
            {
                if (p1.visible() || p2.visible())
                {
                    ctx.beginPath();
                    ctx.moveTo(p1.x2d, p1.y2d);
                    ctx.lineTo(p2.x2d, p2.y2d);
                    ctx.stroke();
                }
            }
        }
    }

    // Loop through all strands from left to right, drawing if both exist, and
    // at least one is visible.

    for (var i = map._length; i < map.length - 1; i++)
    {
        for (var j = map[i]._length; j < map[i].length; j++)
        {
            var p1 = map[i][j];
            var p2 = map[i + 1][j];

            if (p1 != undefined && p2 != undefined)
            {
                if (p1.visible() || p2.visible())
                {
                    ctx.beginPath();
                    ctx.moveTo(p1.x2d, p1.y2d);
                    ctx.lineTo(p2.x2d, p2.y2d);
                    ctx.stroke();
                }
            }
        }
    }
};

Strand.prototype.calculateScore = function ()
{
    var scoring_function = document.getElementById("twist_menu").value;
    var score;

    if (scoring_function == 0)
    {
        score = this.automaticMethodSelection();
    }
    else if (scoring_function == 1)
    {
        score = this.centerStrandScore();
    }
    else if (scoring_function == 2)
    {
         score = this.longestStrandScore();
    }
    else if (scoring_function == 3)
    {
        score = this.twoLongestStrandsScore();
    }
    else if (scoring_function == 4)
    {
        score = this.twoLongestPairsScore();
    }
    else if (scoring_function == 5)
    {
        score = this.twoLongestMiddlePairs();
    }
    else if (scoring_function == 6)
    {
        score = this.allStrandsScore();
    }
    else if (scoring_function == 7)
    {
        score = this.allStrandsExceptLast();
    }

    return score;
};

Strand.prototype.maxAngleOfStrand = function (strand_num, dist_limit)
{
    var scoring_function = document.getElementById("twist_menu").value;
    var map = this.strandMap

    var s = map[strand_num];

    if(scoring_function == 4 || scoring_function == 5)
    {
        var s_left = map[strand_num];
        var s_right = map[strand_num + 1];
    }

    else
    {
        var s_left = map[strand_num - 1];
        var s_right = map[strand_num + 1];
    }

    var max_angle = -Infinity;

    var center = BPerimeter.centralPoint;

    // Loop through all valid angles associated with strand_num and its left neighbor

    for (var i = s._length; i < s.length; i++)
    {
        var p1 = s[i];
        var p2 = s[i + 1];
        var p3 = s_left[i];
        var p4 = s_left[i + 1];

        var defined = p1 && p2 && p3 && p4;
        var in_range = defined &&
            (p1.dist(center) < dist_limit ||
                p2.dist(center) < dist_limit ||
                p3.dist(center) < dist_limit ||
                p4.dist(center) < dist_limit);

        if (in_range)
        {
            var angle = this.twistAngle(p1, p2, p3, p4);

            if (angle > max_angle)
            {
                max_angle = angle;
            }
        }
    }

    // Loop through all valid angles of its right neighbor

    for (var i = s._length; i < s.length; i++)
    {
        var p1 = s[i];
        var p2 = s[i + 1];
        var p3 = s_right[i];
        var p4 = s_right[i + 1];

        var defined = p1 && p2 && p3 && p4;
        var in_range = defined &&
            (p1.dist(center) < dist_limit ||
                p2.dist(center) < dist_limit ||
                p3.dist(center) < dist_limit ||
                p4.dist(center) < dist_limit);

        if (in_range)
        {
            var angle = this.twistAngle(p1, p2, p3, p4)

            if (angle > max_angle)
            {
                max_angle = angle;
            }
        }
    }

    return max_angle;
};

Strand.prototype.avgAngleOfStrand = function (strand_num, dist_limit)
{
    var scoring_function = document.getElementById("twist_menu").value;
    var map = this.strandMap

    var s = map[strand_num];
    var center = BPerimeter.centralPoint;
    var avg_angle = 0;
    var count = 0;

    if(scoring_function == 4 || scoring_function == 5)
    {
        var s_right = map[strand_num + 1];

        for (var i = s._length; i < s.length; i++)
        {
            var p1 = s[i];
            var p2 = s[i + 1];
            var p3 = s_right[i];
            var p4 = s_right[i + 1];

            var defined = p1 && p2 && p3 && p4;
            var in_range = defined &&
                (p1.dist(center) < dist_limit ||
                p2.dist(center) < dist_limit ||
                p3.dist(center) < dist_limit ||
                p4.dist(center) < dist_limit);

            if (in_range)
            {
                var angle = this.twistAngle(p1, p2, p3, p4)

                avg_angle += angle;
                count++;
            }
        }

        avg_angle /= count;
        return avg_angle;
    }

    else
    {
        var s_left = map[strand_num - 1];
        var s_right = map[strand_num + 1];
    }

    // Loop through all valid angles associated with strand_num and its left neighbor

    for (var i = s._length; i < s.length; i++)
    {
        var p1 = s[i];
        var p2 = s[i + 1];
        var p3 = s_left[i];
        var p4 = s_left[i + 1];

        var defined = p1 && p2 && p3 && p4;
        var in_range = defined &&
            (p1.dist(center) < dist_limit ||
                p2.dist(center) < dist_limit ||
                p3.dist(center) < dist_limit ||
                p4.dist(center) < dist_limit);

        if (in_range)
        {
            var angle = this.twistAngle(p1, p2, p3, p4)

            avg_angle += angle;
            count++;
        }
    }

    // Loop through all valid angles of its right neighbor

    for (var i = s._length; i < s.length; i++)
    {
        var p1 = s[i];
        var p2 = s[i + 1];
        var p3 = s_right[i];
        var p4 = s_right[i + 1];

        var defined = p1 && p2 && p3 && p4;
        var in_range = defined &&
            (p1.dist(center) < dist_limit ||
                p2.dist(center) < dist_limit ||
                p3.dist(center) < dist_limit ||
                p4.dist(center) < dist_limit);

        if (in_range)
        {
            var angle = this.twistAngle(p1, p2, p3, p4)

            avg_angle += angle;
            count++;
        }
    }

    avg_angle /= count;
    return avg_angle;
};

Strand.prototype.coverageScore = function ()
{
    var sum_dist = 0;

    var map = this.strandMap;

    var strand_count = 0;

    for (var i = map._length; i < map.length; i++)
    {
        var s = map[i];
        for (var j = s._length; j < s.length; j++)
        {
            if (j != undefined)
            {
                strand_count += 1;
                break;
            }
        }
    }

    for (var i = 0; i < BPerimeter.surfaceSamples.length; i++)
    {
        var vox = BPerimeter.surfaceSamples[i];

        var min_dist = Infinity;

        for (var j = map._length; j < map.length; j++)
        {
            var s = map[j];

            for (var k = s._length; k < s.length - 1; k++)
            {
                var p = s[k];
                var dist = Infinity;

                if (p != undefined)
                {
                    dist = vox.squareDist(p);
                }

                if (dist < min_dist)
                {
                    min_dist = dist;
                }
            }
        }

        sum_dist += min_dist;
    }

    sum_dist /= BPerimeter.surfaceSamples.length;
    var coverage_score = sum_dist;

    return coverage_score; // + strand_count;
};

Strand.prototype.drawTrueStrands = function ()
{
    if (this.truePoints_T != undefined)
    {
        for (var i = 0; i < this.truePoints_T.length; i++)
        {
            for (var j = 0; j < this.truePoints_T[i].length; j++)
            {
                var p = this.truePoints_T[i][j];
                p.draw();
            }
        }
    }
};

Strand.prototype.scoreViaTrueStrand = function (sim_strand, true_strand)
{
    // First, we find the closest M-point (for each sim-point).

    var score = 0;

    if (true_strand == undefined)
    {
        return 0;
    }

    // Loop through all true samples, finding their minimum distance to a sim

    for (var i = 0; i < true_strand.length; i++)
    {
        var p = true_strand[i];

        var min_dist = Infinity;

        for (var j = sim_strand._length; j < sim_strand.length; j++)
        {
            var sim_point = sim_strand[j];

            var dist = p.dist(sim_point);

            if (dist < min_dist)
            {
                min_dist = dist;
            }
        }

        score += min_dist;
    }

    return Math.sqrt(score / sim_strand.length);
};

Strand.prototype.angleBetween = function (p1, p2, p3)
{
    // Returns the angle between p2-p1 and p3-p1.

    var x1 = p2.x - p1.x;
    var y1 = p2.y - p1.y;
    var z1 = p2.z - p1.z;

    var x2 = p3.x - p1.x;
    var y2 = p3.y - p1.y;
    var z2 = p3.z - p1.z;

    var dot = x1 * x2 + y1 * y2 + z1 * z2;
    var l1 = Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1);
    var l2 = Math.sqrt(x2 * x2 + y2 * y2 + z2 * z2);

    return Math.acos(dot / l1 / l2) / Math.PI * 180;
};

Strand.prototype.updateStrandMap = function (angle, offset, strand_gap)
{
    /**
     * We may store the strand samples as a 2-dimensional arbitrary indice map,
     * the first dimension specifying the strand (0 being the central strand).
     * The second dimension specifies the particular strand points.  This
     * dimension may be a subset of other strand samples, depending on the
     * actual boundary of the surface.
     */

    if (angle > 180)
    {
        angle = 180;
    }
    else if (angle < -180)
    {
        angle = -180;
    }

    this.angle = angle;
    this.offset = offset;
    this.strand_gap = strand_gap;

    this.angle_slider.setValue(angle);
    this.offset_slider.setValue(offset);
    this.gap_slider.setValue(strand_gap);

    this.strandMap = new Array();

    // We first generate strand 0, positive samples.

    var Hull = BPerimeter.vertices;

    var offset_x = Math.cos((this.angle) / 180 * Math.PI) * this.offset;
    var offset_y = Math.sin((this.angle) / 180 * Math.PI) * this.offset;

    // Perform a temporary euclidean shift on the origin point to implement
    // the offset on strand generation.

    var coords = BPerimeter.getSurfaceCentroid();
    var avgt = coords[0];
    var avgu = coords[1];
    this.originPoint = BSurface.sample(avgt, avgu);
    var p = [this.originPoint]
    p._length = 0;
    p = this.euclideanShift(p, this.angle, offset);
    this.originPoint = p[0];

    var intersects = getIntersectionPoints(this.originPoint.t,
        this.originPoint.u, (this.angle) / 180 * Math.PI, Hull,
        true);

    // First, we generate the central strand.  We do this by finding the two
    // perimeter collision points, and arbitrarily scaling them up.

    // dx1, dy1, dx2, dy2 now represent surface coordinates that we want to
    // generate strand 0 from.

    var number_of_samples = 200;

    var delta = 1 / number_of_samples;

    this.strandMap[0] = new Array();

    this.strandMap[0][0] = this.originPoint;

    var len = 1.5 * BPerimeter.half_length;

    var dx1 = intersects[0][0];
    var dy1 = intersects[0][1];

    var dx2 = intersects[1][0];
    var dy2 = intersects[1][1];

    var l1 = Math.sqrt(Math.pow(this.originPoint.t - dx1, 2) + Math.pow(
        this.originPoint.u - dy1, 2));

    var l2 = Math.sqrt(Math.pow(this.originPoint.t - dx2, 2) + Math.pow(
        this.originPoint.u - dy2, 2));

    var l3 = Math.sqrt(Math.pow(dx1 - dx2, 2) + Math.pow(dy1 - dy2, 2));

    dx1 = this.originPoint.t + (dx1 - this.originPoint.t) / l1;
    dy1 = this.originPoint.u + (dy1 - this.originPoint.u) / l1;

    dx2 = this.originPoint.t + (dx2 - this.originPoint.t) / l2;
    dy2 = this.originPoint.u + (dy2 - this.originPoint.u) / l2;

    if (l3 + 0.001 < l1 + l2)
    {
        if (l1 < l2)
        {
            dx1 = this.originPoint.t - (dx1 - this.originPoint.t);
            dy1 = this.originPoint.u - (dy1 - this.originPoint.u);
        }
        else
        {
            dx2 = this.originPoint.t - (dx2 - this.originPoint.t);
            dy2 = this.originPoint.u - (dy2 - this.originPoint.u);
        }
    }

    // Linearly interpolate from centroid to (dx1, dy1).

    var i = 0;

    var scale = len;

    for (var t = delta; t <= 1; t += delta)
    {
        var dx = this.originPoint.t + scale * t * (dx1 - this.originPoint.t);
        var dy = this.originPoint.u + scale * t * (dy1 - this.originPoint.u);

        var p = BSurface.sample(dx, dy);

        i++;

        this.strandMap[0][i] = p;
    }

    // Linearly interpolate from centroid the other way, assigning to negative
    // indice space.

    var i = 0;

    for (var t = delta; t <= 1; t += delta)
    {
        var dx = this.originPoint.t + scale * t * (dx2 - this.originPoint.t);
        var dy = this.originPoint.u + scale * t * (dy2 - this.originPoint.u);

        var p = BSurface.sample(dx, dy);

        i++;

        this.strandMap[0][-i] = p;
    }

    this.strandMap[0]._length = -i;

    // Euclidean shift the central strand once in left and right directions.

    for (var sign = -1; sign <= 1; sign += 2)
    {
        var shifted = this.euclideanShift(this.strandMap[0], this.angle,
            sign * this.strand_gap);

        this.strandMap[1 * sign] = shifted;
    }

    this.strandMap._length = -1;

    // Cull central strand, and check the length.  If the length is zero, this
    // implies the central strand is not on the sheet, so we abort.

    var culled = this.cullExteriorPoints(this.strandMap[0]);

    if (culled._length != undefined)
    {
        this.strandMap[0] = culled;
    }
    else
    {
        console.log("Culled central strand is zero length.")
        return;
    }

    // At this point the central strand is culled, and we have both an immediate
    // right and left strand set.

    // We now take the left strand, extend it, and cull it, iteratively.
    // We also do the right strand side using the for-sign idiom.

    for (var sign = -1; sign <= 1; sign += 2)
    {
        var i = 1 * sign;

        while (true)
        {
            var extended = this.euclideanShift(this.strandMap[i], this.angle,
                sign * this.strand_gap);

            var culled = this.cullExteriorPoints(this.strandMap[i]);

            // var culled = this.strandMap[i];

            if (culled._length != undefined)
            {
                this.strandMap[i] = culled;
                this.strandMap[i + sign] = extended;
            }
            else
            {
                // if (culled != false)

                /**
                 * Here lied an absolutely mind-shattering bug, which over hours
                 * I tracked down and hunted.  Apparently, empty arrays are
                 * 'falsey', and thus return are == to false.  In my cull code,
                 * I either return a negative-indice array if there is a result,
                 * or I return 'false' if the resultant array is empty.
                 *
                 * This lead to a strange and obscure corner case where arrays
                 * purely formed from negatively indexed elements were not
                 * rendered on the viewer.  This may be the trickiest bug I've
                 * solved yet.
                 */

                this.strandMap[i] = new Array();
                this.strandMap[i]._length = 0;
                break;
            }

            i += sign;
        }

        if (sign == -1)
        {
            this.strandMap._length = i;
        }
    }

    var map = this.strandMap;

    // Now we do heuristic post-processing with improves accuracy on true
    // sheets (see blue-ink research page "proposed length-displacement
    // reduction algorithm".
    // 
    // Drop any samples that do not have left or right neighbors.

    // Removed for simulated cases

    /*

    for (var iterations = 0; iterations < 2; iterations++)
    {
        for (var i = map._length; i < map.length; i++)
        {
            var strand = map[i];

            var left;
            var right;

            for (var j = strand._length; j < strand.length; j++)
            {
                var p = strand[j];

                if (p != undefined)
                {
                    if (map[i - 1] != undefined)
                    {
                        left = map[i - 1][j];
                    }

                    if (map[i + 1] != undefined)
                    {
                        right = map[i + 1][j];
                    }

                    if (left == undefined && right == undefined)
                    {
                        delete map[i][j];

                        if (j == strand._length)
                        {
                            strand._length++;
                        }
                    }
                }
            }
        }

        */


        // Loop through each strand... if the strand has less or eq than 7 samples,
        // destroy it.

        for (var i = map._length; i < map.length; i++)
        {
            var strand = map[i];

            var num = 0;

            for (var j = strand._length; j < strand.length; j++)
            {
                var p = strand[j];

                if (p != undefined)
                {
                    num++;
                }
            }

            strand.num = num;

            if (num <= 7)
            {
                for (var j = strand._length; j < strand.length; j++)
                {
                    var p = strand[j];

                    if (p != undefined)
                    {
                        delete map[i][j];
                    }
                }

                strand.num = 0;
            }
        }

        /*

        // On each strand, remove every sample which is outside the hull.

        for (var i = map._length; i < map.length; i++)
        {
            var strand = map[i];

            for (var j = strand._length; j < strand.length; j++)
            {
                var p = strand[j];

                if (p != undefined)
                {
                    if (!isInsidePolygon(p.t, p.u, BPerimeter.vertices))
                    {
                        delete map[i][j];
                    }
                }
            }
        }


        // On each strand, identify the number of regions.

        for (var i = map._length; i < map.length; i++)
        {
            var strand = map[i];

            if (strand.num != 0)
            {
                var region_num = 0;
                var in_region = false;
                var regions = new Array();

                for (var j = strand._length; j < strand.length; j++)
                {
                    var p = map[i][j];

                    if (p != undefined)
                    {
                        if (!in_region)
                        {
                            regions[region_num] = new Array();
                            regions[region_num].left_num = 0;
                            regions[region_num].right_num = 0;
                            region_num++;
                        }

                        regions[region_num - 1].push(j);

                        if (map[i - 1][j] != undefined)
                        {
                            regions[region_num - 1].left_num++;
                        }
                        if (map[i + 1][j] != undefined)
                        {
                            regions[region_num - 1].right_num++;
                        }

                        in_region = true;
                    }
                    else
                    {
                        in_region = false;
                    }
                }

                var max_score = 0;
                var max_index = 0;

                for (var j = 0; j < regions.length; j++)
                {
                    var score =
                        Math.pow(regions[j].left_num, 2) +
                        Math.pow(regions[j].right_num, 2);

                    if (score > max_score)
                    {
                        max_score = score;
                        max_index = j;
                    }
                }

                // Delete all regions except the one with maximal score.

                for (var j = 0; j < regions.length; j++)
                {
                    if (j != max_index)
                    {
                        for (var k = 0; k < regions[j].length; k++)
                        {
                            var p_index = regions[j][k];
                            var p = map[i][p_index];

                            if (p != undefined)
                            {
                                delete map[i][p_index];
                            }
                        }
                    }
                }
            }
        }
    }

    */

    // End region for proposed length displacement reduction heuristic

    // Loop through strands, cleaning up.

    for (var i = map._length; i < map.length; i++)
    {
        var min = map[i]._length;
        var max = map[i].length;

        var found_valid_thus_far = false;

        for (var j = map[i]._length; j < map[i].length; j++)
        {
            var p = map[i][j];

            if (p == undefined && found_valid_thus_far == false)
            {
                min = j + 1;
            }
            else
            {
                found_valid_thus_far = true;
            }
        }

        map[i]._length = min;
    }

    /* Dihedral angle calculation, completely unimportant for now
    console.clear();

    console.log("Strand dihedral angles:");

    var total_average = 0;
    var total_count = 0;

    for (var i = map._length; i < map.length; i++)
    {
        if (map[i]._length < map[i].length - 4)
        {
            console.log("Strand number: " + i);

            var sum = 0;
            var count = 0;

            for (var j = map[i]._length; j < map[i].length - 4; j++)
            {
                var p1 = map[i][j];
                var p2 = map[i][j + 1];
                var p3 = map[i][j + 2];
                var p4 = map[i][j + 3];

                if (p1 != undefined && p2 != undefined &&
                    p3 != undefined && p4 != undefined)
                {
                    var dihedral_angle = this.dihedralAngle(p1, p2, p3, p4);
                    dihedral_angle = dihedral_angle / Math.PI * 180;

                    sum += Math.abs(dihedral_angle);
                    count += 1;
                }
            }

            sum /= count;

            total_average += sum;
            total_count += 1;

            console.log(sum); // Now average            
        }
    }

    total_average /= total_count;

    console.log("Total average: " + total_average)

    */

    // Create transposed version of strandMap

    this.strandMap_T = new Array();
    this.strandMap_T._length = this.strandMap._length;

    for (var i = this.strandMap._length; i < this.strandMap.length; i++)
    {
        this.strandMap_T[i] = new Array();
        this.strandMap_T[i]._length = this.strandMap[i]._length;

        for (var j = this.strandMap[i]._length; j < this.strandMap[i].length; j++)
        {
            var p = this.strandMap[i][j];

            if (p != undefined)
            {
                this.strandMap_T[i][j] = p.clone("black", 1);
                this.strandMap_T[i][j].transform(p);
            }
        }
    }
};

Strand.prototype.updateTransformedPoints = function ()
{
    var map = this.strandMap_T;

    for (var i = map._length; i < map.length; i++)
    {
        for (var j = map[i]._length; j < map[i].length; j++)
        {
            var p = map[i][j];

            if (p != undefined)
            {
                p.transform(this.strandMap[i][j]);
            }
        }
    }

    if (this.truePoints_T != undefined)
    {
        for (var i = 0; i < this.truePoints_T.length; i++)
        {
            for (var j = 0; j < this.truePoints_T[i].length; j++)
            {
                var p = this.truePoints_T[i][j];
                p.transform(this.truePoints[i][j]);
            }
        }
    }
};

Strand.prototype.centerStrandScore = function ()
{
    var ang_pref = document.getElementById('angle_menu').value;

    if (ang_pref == 0)
    {
        var dist_limit = 4;

        var ang1 = this.maxAngleOfStrand(-1, dist_limit);
        var ang2 = this.maxAngleOfStrand(0, dist_limit);
        var ang3 = this.maxAngleOfStrand(1, dist_limit);

        console.log("    Strand number: ", -1, "Angle: ", ang1);
        console.log("    Strand number: ", 0, "Angle: ", ang2);
        console.log("    Strand number: ", 1, "Angle: ", ang3);

        var max_ang = Math.max(ang1, ang2, ang3);

        return max_ang;
    }

    else if (ang_pref == 1)
    {
        var av_ang = this.avgAngleOfStrand(0, 4);
        console.log("    Strand number: ", 0, "Angle: ", av_ang);
        return av_ang;
    }
};

Strand.prototype.longestStrandScore = function ()
{
    var ang_pref = document.getElementById('angle_menu').value;
    //find longest strand

    var longest_strand_length = 0;
    var longest_strand = 0;
    var map = this.strandMap;

    for (var i = map._length; i < map.length; i++)
    {
        var s = map[i];
        for (var j = s._length; j < s.length; j++)
        {
            if (s.length - s._length > longest_strand_length)
            {
                longest_strand_length = s.length - s._length;
                longest_strand = i;
            }
        }
    }

    if (ang_pref == 0)
    {
        var max_ang = this.maxAngleOfStrand(longest_strand, Infinity);
        console.log("    Strand number: ", longest_strand, "Angle: ", max_ang);
        return max_ang;
    }

    else if (ang_pref == 1)
    {
        var av_ang = this.avgAngleOfStrand(longest_strand, Infinity);
        console.log("    Strand number: ", longest_strand, "Angle: ", av_ang);
        return av_ang;
    }
};

Strand.prototype.twoLongestStrandsScore = function ()
{
    var ang_pref = document.getElementById('angle_menu').value;
    //find 2 longest strands

    var longest_strand_length = 0;
    var longest_strand = 0;
    var second_largest = 0;
    var map = this.strandMap;

    for (var i = map._length; i < map.length; i++)
    {
        var s = map[i];
        for (var j = s._length; j < s.length; j++)
        {
            if (s.length - s._length > longest_strand_length)
            {
                longest_strand_length = s.length - s._length;
                second_largest = longest_strand;
                longest_strand = i;
            }
        }
    }

    if (ang_pref == 0)
    {
        var ang1 = this.maxAngleOfStrand(longest_strand, Infinity);
        var ang2 = this.maxAngleOfStrand(second_largest, Infinity);
        console.log("    Strand number: ", longest_strand, "Angle: ", ang1);
        console.log("    Strand number: ", second_largest, "Angle: ", ang2);
        var max_ang = Math.max(ang1, ang2);
        return max_ang;
    }

    else if (ang_pref == 1)
    {
        var ang1 = this.avgAngleOfStrand(longest_strand, Infinity);
        var ang2 = this.avgAngleOfStrand(second_largest, Infinity);
        console.log("    Strand number: ", longest_strand, "Angle: ", ang1);
        console.log("    Strand number: ", second_largest, "Angle: ", ang2);
        var av_ang = (ang1+ang2) / 2;
        return av_ang;
    }
};

Strand.prototype.allStrandsScore = function ()
{
    var ang_pref = document.getElementById('angle_menu').value;
    var scoring_function = document.getElementById("twist_menu").value;
    var map = this.strandMap;

        //Max angle case
        if (ang_pref == 0 && scoring_function != 0)
        {

            var max_ang = 0;

            for (var i = map._length+1; i < map.length-1; i++)
            {
                var current_ang = this.maxAngleOfStrand(i, Infinity);

                if (current_ang != Infinity && current_ang != -Infinity)
                {
                    if (current_ang > max_ang)
                    {
                        max_ang = current_ang;
                    }
                }
            }
            console.log("    All Strands ", "Angle: ", max_ang);
            return max_ang;
        }

        //Av angle case
        if (ang_pref == 1 || scoring_function == 0)
        {
            var denominator = (map.length - map._length)-2;
            var total_angle = 0;

            for (var i = map._length+1; i < map.length-1; i++)
            {
                var current_ang = this.avgAngleOfStrand(i, Infinity);
                total_angle += current_ang;
            }

            var av_ang = total_angle/denominator;
            console.log("    All Strands ", "Angle: ", av_ang);         
            return av_ang;
        }
};

Strand.prototype.twoLongestPairsScore = function ()
{
    var ang_pref = document.getElementById('angle_menu').value;
    var scoring_function = document.getElementById("twist_menu").value;
    //find the two longest strand pairs
    var map = this.strandMap;
    var maxPair = new Array(6);
    for (var i=0; i<6; i++)
    {
        maxPair[i] = 0;
    }
    var temp1 = 0;
    var temp2 = 0;

    for (var i = map._length+1; i < map.length - 3; i++)
    {
        var s = map[i];
        temp1 = s.length - s._length;
        temp2 = map[i+1].length - map[i+1]._length;

        if(i != map._length)
        {
            if (temp1 > temp2)
            {
                if (temp2 > maxPair[0] || temp2 == maxPair[0])
                {
                    maxPair[0] = temp2;
                    maxPair[1] = i;
                    maxPair[2] = i+1;

                }
            }

            else
            {
                if (temp1 > maxPair[0] || temp1 == maxPair[0])
                {
                    maxPair[0] = temp1;
                    maxPair[1] = i;
                    maxPair[2] = i + 1;
                }
            }
        }
    }

    //loop for second pair

    for (var i = map._length+1; i < map.length - 3; i++)
    {
        var s = map[i];

        temp1 = s.length - s._length;
        temp2 = map[i+1].length - map[i+1]._length;

        if (i != map._length)
        {

            if (temp1 > temp2)
            {
                if ((temp2 > maxPair[5] || temp2 == maxPair[5]) && i != maxPair[1])
                {
                    maxPair[5] = temp2;
                    maxPair[3] = i;
                    maxPair[4] = i+1;

                }
            }

            else
            {
                if ((temp1 > maxPair[5] || temp1 == maxPair[5]) && i != maxPair[1])
                {
                    maxPair[5] = temp1;
                    maxPair[3] = i;
                    maxPair[4] = i + 1;
                }
            }
        }
    }

    if (ang_pref == 0 && scoring_function != 0)
    {
        var ang1 = this.maxAngleOfStrand(maxPair[1], Infinity);
        var ang2 = this.maxAngleOfStrand(maxPair[3], Infinity);
        console.log("    Strand number: ", maxPair[1], "Angle: ", ang1);
        console.log("    Strand number: ", maxPair[3], "Angle: ", ang2);
        var max_ang = Math.max(ang1, ang2);

        return max_ang;
    }

    else if (ang_pref == 1 || scoring_function == 0)
    {
        var ang1 = this.avgAngleOfStrand(maxPair[1], Infinity);
        var ang2 = this.avgAngleOfStrand(maxPair[3], Infinity);
        console.log("    Strand number: ", maxPair[1], "Angle: ", ang1);
        console.log("    Strand number: ", maxPair[2], "Angle: ", ang2);
        var av_ang = (ang1 + ang2) /2 ;

        return av_ang;
    }
};

Strand.prototype.allStrandsExceptLast = function ()
{
    var ang_pref = document.getElementById('angle_menu').value;
    var scoring_function = document.getElementById("twist_menu").value;
    var map = this.strandMap;

        //Max angle case
        if (ang_pref == 0 && scoring_function != 0)
        {
            var max_ang = 0;

            for (var i = map._length+2; i < map.length-2; i++)
            {
                var current_ang = this.maxAngleOfStrand(i, Infinity);

                if (current_ang != Infinity && current_ang != -Infinity)
                {
                    if (current_ang > max_ang)
                    {
                        max_ang = current_ang;
                    }
                }
            }
            console.log("    All strands except last: ", "Angle: ", max_ang);
            return max_ang;
        }

        //Av angle case
        if (ang_pref == 1 || scoring_function == 0)
        {
            var denominator = (map.length - map._length)-4;
            var total_angle = 0;

            for (var i = map._length+2; i < map.length-2; i++)
            {
                var current_ang = this.avgAngleOfStrand(i, Infinity);
                total_angle += current_ang;
            }

            var av_ang = total_angle/denominator;
            console.log("    All strands except last: ", "Angle: ", av_ang);
            return av_ang;
        }
};

Strand.prototype.automaticMethodSelection = function ()
{
    var map = this.strandMap;
    var select_score;

        //Check for number of strands, where the longest strands are, and the shape of the protein
         var sheetSize = (map.length-1) - (1 + map._length);

            ///small strands (<4) use 2 longest pairs
            if (sheetSize < 4)
            {
                select_score = this.twoLongestPairsScore();
            }

            ///medium strands use all angles
            else if (sheetSize == 4 || sheetSize == 5)
            {
                select_score = this.allStrandsScore();
            }

            ///largest strands(5+) use all strands except last two
            else
            {
                select_score = this.allStrandsExceptLast();
            }


     return select_score;
};

Strand.prototype.twoLongestMiddlePairs = function()
{
 var ang_pref = document.getElementById('angle_menu').value;
    //find the two longest strand pairs
    var map = this.strandMap;
    var maxPair = new Array(6);
    for (var i=0; i<6; i++)
    {
        maxPair[i] = 0;
    }
    var temp1 = 0;
    var temp2 = 0;

    for (var i = map._length; i < map.length - 2; i++)
    {
        var s = map[i];
        temp1 = s.length - s._length;
        temp2 = map[i+1].length - map[i+1]._length;

        if(i != map._length)
        {
            if (temp1 > temp2)
            {
                if (temp2 > maxPair[0] || temp2 == maxPair[0])
                {
                    maxPair[0] = temp2;
                    maxPair[1] = i;
                    maxPair[2] = i+1;

                }
            }

            else
            {
                if (temp1 > maxPair[0] || temp1 == maxPair[0])
                {
                    maxPair[0] = temp1;
                    maxPair[1] = i;
                    maxPair[2] = i + 1;
                }
            }
        }
    }

    //loop for second pair

    for (var i = map._length; i < map.length - 2; i++)
    {
        var s = map[i];

        temp1 = s.length - s._length;
        temp2 = map[i+1].length - map[i+1]._length;

        if (i != map._length)
        {

            if (temp1 > temp2)
            {
                if ((temp2 > maxPair[5] || temp2 == maxPair[5]) && i != maxPair[1])
                {
                    maxPair[5] = temp2;
                    maxPair[3] = i;
                    maxPair[4] = i+1;

                }
            }

            else
            {
                if ((temp1 > maxPair[5] || temp1 == maxPair[5]) && i != maxPair[1])
                {
                    maxPair[5] = temp1;
                    maxPair[3] = i;
                    maxPair[4] = i + 1;
                }
            }
        }
    }

    if (ang_pref == 0)
    {
        var ang1 = this.maxAngleOfStrand(maxPair[1], Infinity);
        var ang2 = this.maxAngleOfStrand(maxPair[3], Infinity);
        console.log("    Strand number: ", maxPair[1], "Angle: ", ang1);
        console.log("    Strand number: ", maxPair[3], "Angle: ", ang2);
        var max_ang = Math.max(ang1, ang2);

        return max_ang;
    }

    else if (ang_pref == 1)
    {
        var ang1 = this.avgAngleOfStrand(maxPair[1], Infinity);
        var ang2 = this.avgAngleOfStrand(maxPair[3], Infinity);
        var av_ang = (ang1 + ang2) /2 ;
        console.log("    Strand number: ", maxPair[1], "Angle: ", ang1);
        console.log("    Strand number: ", maxPair[3], "Angle: ", ang2);
        return av_ang;
    }
};

Strand.protoype.twistScaleColor = function(maxOrAv, strand_num)
{
    var ang_generation_method = document.getElementById('twist_menu').value;
    var ang_pref = document.getElementById('angle_menu').value;

    if(ang_generation_method == 1)
    {
        dist_limit == 4;
    }
    else
    {
        dist_limit == Infinity;
    }

    var map = this.strandMap;
    var s = map[strand_num];
    var lowestAng = maxOrAv;
    var highestAng = maxOrAv;

    for (var i = s._length; i < s.length; i++)
    {

        if(ang_generation_method != 4 && ang_generation_method != 5)
        {
            var p1 = s[i];
            var p2 = s[i + 1];
            var p3 = s_left[i];
            var p4 = s_left[i + 1];

            var defined = p1 && p2 && p3 && p4;
            var in_range = defined &&
                (p1.dist(center) < dist_limit ||
                    p2.dist(center) < dist_limit ||
                    p3.dist(center) < dist_limit ||
                    p4.dist(center) < dist_limit);

            if (in_range)
            {
                var ang1 = this.twistAngle(p1, p2, p3, p4);
                if(ang1 != Infinity && ang1 != -Infinity)
                {
                    if (ang1 < lowestAng)
                    (lowestAng = ang1)
                    if (ang1 > highestAng)
                    (highestAng = ang1)
                }
            }
        }

        var p1 = s[i];
        var p2 = s[i + 1];
        var p3 = s_right[i];
        var p4 = s_right[i + 1];

        var defined = p1 && p2 && p3 && p4;
        var in_range = defined &&
            (p1.dist(center) < dist_limit ||
                p2.dist(center) < dist_limit ||
                p3.dist(center) < dist_limit ||
                p4.dist(center) < dist_limit);

        if (in_range)
        {
            if(ang2 != Infinity && ang2 != -Infinity)
            {
                var ang2 = this.twistAngle(p1, p2, p3, p4)
                if (ang2 < lowestAng)
                (lowestAng = ang2)
                if (ang2 > highestAng)
                (highestAng = ang2)
            }
        }


        if(ang_generation_method != 4 && ang_generation_method != 5)
        {
            if(ang_pref == 0)
            {
                var angle = Math.max(ang1, ang2);
            }
            if(ang_pref == 1)
            {
                var angle = (ang1+ang2)/2;
            }
        }
        
        angle = 255*(angle-lowestAng)/highestAng;
        p_draw.color = rgb(0,0,angle);
        p_draw.size = 1;
    }
};