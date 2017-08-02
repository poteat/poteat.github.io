function Perimeter(ConcaveHull) {

    // Old feature of displaying colored perimeter, based on local error of fit 
    // estimation. To enable, set to 'true' - although local error of fit never 
    // ended up being useful.

    this.colored_perimeter = false;


    this.vertices = ConcaveHull;

    this.points = new Array();
    this.points_T = new Array();

    for (var i = 0; i < ConcaveHull.length; i++) {
        var V = ConcaveHull[i];

        var t = V[0];
        var u = V[1];

        var calc = BSurface.calc(t, u);

        var p = new Point(calc[0], calc[1], calc[2]);
        p.t = t;
        p.u = u;

        var p_T = new Point(0, 0, 0, "black", 3);

        this.points.push(p);
        this.points_T.push(p_T);
    }

    this.R = 30;
    var R = this.R;
    var buffer = .03;

    this.surfacePointsX = new Array(R);
    this.surfacePointsX_T = new Array(R);

    for (var i = 0; i < R; i++) {
        this.surfacePointsX[i] = new Array(R);
        this.surfacePointsX_T[i] = new Array(R);

    }

    for (var i = 0; i < R; i++) {
        var t = DMap.min_t + buffer + (DMap.max_t - DMap.min_t - buffer * 2) *
            i / (R - 1);

        var IntersectionVertices = getIntersectionPoints(t, 0, 0, ConcaveHull,
            true);

        if (IntersectionVertices != false) {
            var V1 = IntersectionVertices[0];
            var V2 = IntersectionVertices[1];

            var u1 = V1[1];
            var u2 = V2[1];

            for (var j = 0; j < R; j++) {
                var u = u1 + (u2 - u1) * j / (R - 1);

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

    for (var i = 0; i < R; i++) {
        this.surfacePointsY[i] = new Array(R);
        this.surfacePointsY_T[i] = new Array(R);

    }

    for (var i = 0; i < R; i++) {
        var u = DMap.min_u + buffer + (DMap.max_u - DMap.min_u - buffer * 2) *
            i / (R - 1);

        var IntersectionVertices = getIntersectionPoints(0, u, Math.PI / 2,
            ConcaveHull, true);

        if (IntersectionVertices != false) {
            var V1 = IntersectionVertices[0];
            var V2 = IntersectionVertices[1];

            var t1 = V1[0];
            var t2 = V2[0];

            for (var j = 0; j < R; j++) {
                var t = t1 + (t2 - t1) * j / (R - 1);

                var coords = BSurface.calc(t, u);

                var p = new Point(coords[0], coords[1], coords[2]);
                var p_T = new Point(0, 0, 0, "blue", 3);

                this.surfacePointsY[i][j] = p;
                this.surfacePointsY_T[i][j] = p_T;
            }
        }
    }

    // Create uniform sampling on surface, but in boundary

    var sampling_dist = .05;

    var t_range = DMap.max_t - DMap.min_t;
    var u_range = DMap.max_u - DMap.min_u;

    this.surfaceSamples = new Array();

    for (var i = DMap.min_t; i < DMap.max_t; i += sampling_dist) {
        for (var j = DMap.min_u; j < DMap.max_u; j += sampling_dist) {
            var p = BSurface.sample(i, j);
            this.surfaceSamples.push(p);
        }
    }


    var central_coords = this.getSurfaceCentroid();
    this.centralPoint = BSurface.sample(central_coords[0], central_coords[1]);
    this.centralPoint_T = new Point(0, 0, 0, "purple", 5);


    // Artificially increase size of perimeter

    var central_coords = this.getSurfaceCentroid();
    var center_t = central_coords[0];
    var center_u = central_coords[1];

    var multiplier = 1.00;

    for (var i = 0; i < this.points.length; i++) {
        var p = this.points[i];

        p.t = center_t + (p.t - center_t) * multiplier;
        p.u = center_u + (p.u - center_u) * multiplier;

        p = BSurface.sample(p.t, p.u);

        this.points[i] = p;
    }

    for (var i = 0; i < this.vertices.length; i++) {
        var v = this.vertices[i];
        v[0] = center_t + (v[0] - center_t) * multiplier;
        v[1] = center_u + (v[1] - center_u) * multiplier;

        this.vertices[i] = v;
    }




    this.updateBoundingLine();

    this.updateTransformedPoints();

    if (this.colored_perimeter) {
        this.updateColorError();
    }
}

Perimeter.prototype.getSurfaceCentroid = function() {
    /**
     * Returns (t,u) coordinates which represent the centroid of the surface,
     * defined via the arithmetic average of the surface coordinates of each
     * hull vertex that defines the polygonal boundary.
     */

    Hull = this.vertices;

    var avgt = 1;
    var avgu = 1;

    for (var i = 0; i < Hull.length; i++) {
        var V = Hull[i];

        avgt += Math.pow(V[0], 2);
        avgu += Math.pow(V[1], 2);
    }

    avgt /= Hull.length;
    avgu /= Hull.length;

    avgt = Math.sqrt(avgt);
    avgu = Math.sqrt(avgu);

    avgt = 0;
    avgu = 0;

    for (var i = 0; i < DMap.points.length; i++) {
        var p = DMap.points[i];
        avgt += p.t;
        avgu += p.u;
    }

    avgt /= DMap.points.length;
    avgu /= DMap.points.length;

    return [avgt, avgu];

}

Perimeter.prototype.updateColorError = function() {
    var L = this.points.length;
    var P_prev;
    var P_next;

    for (var i = 0; i < L; i++) {
        var P = this.points[i];
        if (i == 0) // If first
        {
            P_prev = this.points[L - 1];
            P_next = this.points[1];
        } else if (i == L - 1) // If last
        {
            P_prev = this.points[L - 2];
            P_next = this.points[0];
        } else {
            P_prev = this.points[i - 1];
            P_next = this.points[i + 1];
        }

        // Calculate 3D (true) distance between P and P_prev/P_next.
        // Then find their average.

        var threshold = (P.dist(P_prev) + P.dist(P_next)) / 2;

        var threshold = 5;


        /*
        // *************************
        // Loop through voxels.  Find maximum proj dist in set of dist less than
        // threshold.



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

        // Loop through all true voxels.  If their distance to P is less than 
        // threshold, Add their projection distance to a sum.

        var proj_dist_avg = 0;
        var num = 0;

        for (var j = 0; j < DMap.points.length; j++) {
            var voxel = DMap.points[j];

            var dist = voxel.dist(P);

            if (dist < threshold) {
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

    // Now all perimeter errors are calculated.  We now calculate each 
    // normalized error from 0 to 1.

    // Find the minimum and maximum errors.

    var min_error = this.points[0].error;
    var max_error = this.points[0].error;
    var min_error_i = 0;
    var max_error_i = 0;

    for (var i = 1; i < this.points.length; i++) {
        var P = this.points[i];

        if (P.error < min_error) {
            min_error = P.error;
            min_error_i = i;
        }

        if (P.error > max_error) {
            max_error = P.error;
            max_error_i = i;
        }
    }

    // Loop through all points and set their normalized error.

    var range = max_error - min_error;

    if (range == 0) {
        range = 1;
    }

    for (var i = 0; i < this.points.length; i++) {
        var P = this.points[i];

        var error = P.error;

        var normalized_error = (error - min_error) / range;

        P.normalized_error = normalized_error;
    }

    // Loop through all points, calculate the color by linear interpolation.

    var low_color = [0, 0, 255]; // Blue
    var high_color = [255, 0, 0]; // Red

    for (var i = 0; i < this.points.length; i++) {
        var P = this.points[i];
        var percent = P.normalized_error;

        var interpolated_color = [0, 0, 0];

        for (var j = 0; j < interpolated_color.length; j++) {
            var high = high_color[j];
            var low = low_color[j];
            var range = high - low;

            var color_value = Math.round(percent * range + low);

            interpolated_color[j] = color_value;
        }

        var P_T = this.points_T[i];

        // Convert interpolated color to string.
        // Convert [0, 0, 255] to "#0000FF"

        var r = interpolated_color[0];
        var g = interpolated_color[1];
        var b = interpolated_color[2];

        color_string = "#" + ((1 << 24) + (r << 16) + (g << 8) +
            b).toString(16).slice(1);

        P_T.color = color_string;
    }
}

Perimeter.prototype.updateTransformedPoints = function() {

    this.centralPoint_T.moveTo(this.centralPoint);
    this.centralPoint_T.scaleFactor(zoom);
    this.centralPoint_T.rotateY(yaw);
    this.centralPoint_T.rotateX(pitch);

    for (var i = 0; i < this.points_T.length; i++) {
        this.points_T[i].moveTo(this.points[i]);
        this.points_T[i].scaleFactor(zoom);
        this.points_T[i].rotateY(yaw);
        this.points_T[i].rotateX(pitch);
    }

    for (var i = 0; i < this.R; i++) {
        if (this.surfacePointsX_T[i][0] != undefined) {
            for (var j = 0; j < this.R; j++) {
                this.surfacePointsX_T[i][j].moveTo(this.surfacePointsX[i][j]);
                this.surfacePointsX_T[i][j].scaleFactor(zoom);
                this.surfacePointsX_T[i][j].rotateY(yaw);
                this.surfacePointsX_T[i][j].rotateX(pitch);
            }
        }
    }

    for (var i = 0; i < this.R; i++) {
        if (this.surfacePointsY_T[i][0] != undefined) {
            for (var j = 0; j < this.R; j++) {
                this.surfacePointsY_T[i][j].moveTo(this.surfacePointsY[i][j]);
                this.surfacePointsY_T[i][j].scaleFactor(zoom);
                this.surfacePointsY_T[i][j].rotateY(yaw);
                this.surfacePointsY_T[i][j].rotateX(pitch);
            }
        }
    }
}

Perimeter.prototype.draw = function() {

    var actually_draw = this.colored_perimeter;

    for (var i = 0; i < this.points_T.length; i++) {
        var p = this.points_T[i];

        p.draw(actually_draw);
    }

    for (var i = 0; i < this.R; i++) {
        for (var j = 0; j < this.R; j++) {
            var p = this.surfacePointsX_T[i][j];
            p.draw(false);
        }
    }

    for (var i = 0; i < this.R; i++) {
        for (var j = 0; j < this.R; j++) {
            var p = this.surfacePointsY_T[i][j];
            p.draw(false);
        }
    }

    // Draw surface wireframe

    var draw_surface_wireframe = false;

    if (draw_surface_wireframe) {
        ctx.strokeStyle = "grey";

        ctx.beginPath();

        var needToMove = false;

        for (var i = 0; i < this.R; i++) {
            var j = 0;

            var p = this.surfacePointsX_T[i][j];

            if (p.scale > 0) {
                ctx.moveTo(p.x2d, p.y2d);
            } else {
                needToMove = true;
            }

            for (var j = 0; j < this.R; j++) {
                var p = this.surfacePointsX_T[i][j];

                if (p.scale > 0) {
                    if (!needToMove) {
                        ctx.lineTo(p.x2d, p.y2d);
                    } else {
                        ctx.moveTo(p.x2d, p.y2d);
                        needToMove = false;
                    }
                }
            }
        }

        ctx.stroke();

        ctx.beginPath();

        var needToMove = false;

        for (var i = 0; i < this.R; i++) {
            var j = 0;

            var p = this.surfacePointsY_T[i][j];

            if (p.scale > 0) {
                ctx.moveTo(p.x2d, p.y2d);
            } else {
                needToMove = true;
            }

            for (var j = 0; j < this.R; j++) {
                var p = this.surfacePointsY_T[i][j];

                if (p.scale > 0) {
                    if (!needToMove) {
                        ctx.lineTo(p.x2d, p.y2d);
                    } else {
                        ctx.moveTo(p.x2d, p.y2d);
                        needToMove = false;
                    }
                }
            }
        }

        ctx.stroke();
    }






    // Draw a linearly interpolated colored line between each perimeter point.

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;

    var L = this.points_T.length;

    for (var i = 0; i < L; i++) {
        var P = this.points_T[i];

        if (i == L - 1) // If last
        {
            var P_next = this.points_T[0];
        } else {
            var P_next = this.points_T[i + 1];
        }

        if (!P.visible() && !P_next.visible()) {
            continue;
        }

        if (this.colored_perimeter) {
            var gradient = ctx.createLinearGradient(P.x2d, P.y2d, P_next.x2d,
                P_next.y2d);
            gradient.addColorStop(0, P.color);
            gradient.addColorStop(1, P_next.color);

            ctx.strokeStyle = gradient;
        } else {
            ctx.strokeStyle = 'black';
        }

        ctx.beginPath();

        ctx.moveTo(P.x2d, P.y2d);
        ctx.lineTo(P_next.x2d, P_next.y2d);

        ctx.stroke();
    }

    this.centralPoint_T.draw();

    // Draw bounding line points

    /*
    this.p1_T.transform(this.p1);
    this.p1_T.draw();

    this.p2_T.transform(this.p2);
    this.p2_T.draw();
    */

    ctx.lineWidth = 1;

    ctx.strokeStyle = "black";
}

Perimeter.prototype.updateBoundingLine = function() {
    var v = this.vertices;
    var l = v.length;

    var avgx = 0;
    var avgy = 0;

    for (var i = 0; i < l; i++) {
        avgx += v[i][0];
        avgy += v[i][1];
    }

    avgx /= l;
    avgy /= l;

    var vx = 0;
    var vy = 0;
    var vxy = 0;

    for (var i = 0; i < l; i++) {
        var delta_x = v[i][0] - avgx;
        var delta_y = v[i][1] - avgy;

        vx += Math.pow(delta_x, 2);
        vy += Math.pow(delta_y, 2);
        vxy += delta_x * delta_y;
    }

    vx /= l - 1;
    vy /= l - 1;
    vxy /= l - 1;

    var m = (vy - vx + Math.sqrt(Math.pow(vy - vx, 2) + 4 * vxy * vxy)) / 2 / vxy;
    var b = avgy - m * avgx;

    var min_proj = [null, Infinity];
    var max_proj = [null, -Infinity];

    for (var i = 0; i < l; i++) {
        var x = v[i][0];
        var y = v[i][1];

        var proj_x = (x + m * (y - b)) / (m * m + 1);
        var proj_y = (m * (x + m * y) + b) / (m * m + 1);

        var dir = sign(proj_x - avgx);
        var proj_dist = dir * (Math.pow(proj_x - avgx, 2) +
            Math.pow(proj_y - avgy, 2));

        min_proj = proj_dist < min_proj[1] ? [i, proj_dist] : min_proj;
        max_proj = proj_dist > max_proj[1] ? [i, proj_dist] : max_proj;
    }

    min_proj = v[min_proj[0]];
    max_proj = v[max_proj[0]];

    var x1 = avgx;
    var y1 = avgy;
    var m1 = m;

    var x2 = min_proj[0];
    var y2 = min_proj[1];
    var m2 = -1 / m;

    var x_hat = ((y2 - m2 * x2) - (y1 - m1 * x1)) / (m1 - m2);
    var y_hat = m1 * x_hat + (y1 - m1 * x1);

    var p1 = BSurface.sample(x_hat, y_hat);
    var p1_T = new Point(0, 0, 0, "black", 5);
    this.p1 = p1;
    this.p1_T = p1_T;



    var x2 = max_proj[0];
    var y2 = max_proj[1];
    var m2 = -1 / m;

    var x_hat = ((y2 - m2 * x2) - (y1 - m1 * x1)) / (m1 - m2);
    var y_hat = m1 * x_hat + (y1 - m1 * x1);

    var p2 = BSurface.sample(x_hat, y_hat);
    var p2_T = new Point(0, 0, 0, "black", 5);
    this.p2 = p2;
    this.p2_T = p2_T;


    var l1 = Math.pow(avgx - p1.t, 2) + Math.pow(avgy - p1.u, 2);
    var l2 = Math.pow(avgx - p1.t, 2) + Math.pow(avgy - p2.u, 2);

    l1 = l1 > l2 ? l1 : l2;
    this.half_length = Math.sqrt(l1);

    // console.log(this.half_length);
}