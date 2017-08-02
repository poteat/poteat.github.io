function Surface(X, Y, T, U) {
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

    for (var i = 0; i < X; i++) {
        this.controlPoints[i] = new Array(Y);
        this.controlPoints_T[i] = new Array(Y);
    }

    var lower = -50;
    var upper = 50;

    for (var i = 0; i < X; i++) {
        for (var j = 0; j < Y; j++) {
            var x = lower + i / (X - 1) * (upper - lower);
            var z = lower + j / (X - 1) * (upper - lower);

            var width = 0;

            var y = Math.random() * width * 2 - width; // Between -width and 
            // width

            this.controlPoints[i][j] = new Point(x, y, z)
            this.controlPoints_T[i][j] = new Point(x, y, z, "black", 2);
        }
    }


    // resPoints (Resolution points) are the initial estimate points for the 
    //  heuristic point-projection algorithm.  They are a low-resolution sample 
    //  of the curve, an array of small enough size that it is not prohibitive 
    //  to find the minimum distance of the array of points from one point.  
    //  We also define the transformed version.

    var RX = X + 1;
    var RY = Y + 1;

    this.RX = RX;
    this.RY = RY;

    this.resPoints = new Array(RX);
    this.resPoints_T = new Array(RX);

    for (var i = 0; i < RX; i++) {
        this.resPoints[i] = new Array(RY);
        this.resPoints_T[i] = new Array(RY);
    }

    // We only need to allocate the object array here.  The correct values will 
    // be calculated in updatePoints();
    for (var i = 0; i < RX; i++) {
        for (var j = 0; j < RY; j++) {
            this.resPoints[i][j] = new Point(0, 0, 0)
            this.resPoints_T[i][j] = new Point(0, 0, 0, "blue", 1);
        }
    }




    // Draw point are the sample points of the surface which we use the render 
    // 	and display the shape of the surface.  As well, we define the array of 
    // 	camera-transformed sample points.  (Which we need, of course, to draw on
    // 	 the screen).

    this.drawPoints = new Array(T);
    this.drawPoints_T = new Array(T);

    for (var i = 0; i < T; i++) {
        this.drawPoints[i] = new Array(U);
        this.drawPoints_T[i] = new Array(U);
    }

    // We only need to allocate the object array of draw points here; the point 
    // locations are calculated in the updatePoints() function.
    for (var i = 0; i < T; i++) {
        for (var j = 0; j < U; j++) {
            this.drawPoints[i][j] = new Point(0, 0, 0);
            this.drawPoints_T[i][j] = new Point(0, 0, 0);
        }
    }

    this.updatePoints();
};

Surface.prototype.updateNumberofResPoints = function(RX, RY) {
    this.RX = RX;
    this.RY = RY;

    this.resPoints = new Array(RX);
    this.resPoints_T = new Array(RX);

    for (var i = 0; i < RX; i++) {
        this.resPoints[i] = new Array(RY);
        this.resPoints_T[i] = new Array(RY);
    }

    // We only need to allocate the object array here.  The correct values will 
    // be calculated in updatePoints();
    for (var i = 0; i < RX; i++) {
        for (var j = 0; j < RY; j++) {
            this.resPoints[i][j] = new Point(0, 0, 0)
            this.resPoints_T[i][j] = new Point(0, 0, 0, "blue", 1);
        }
    }
}

Surface.prototype.setControlPoints = function(array_of_points) {
    this.X = array_of_points.length;
    this.Y = array_of_points[0].length;

    this.controlPoints = new Array(this.X);
    this.controlPoints_T = new Array(this.X);

    for (var i = 0; i < this.X; i++) {
        this.controlPoints[i] = new Array(this.Y);
        this.controlPoints_T[i] = new Array(this.Y);

        for (var j = 0; j < this.Y; j++) {
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

Surface.prototype.updatePoints = function() {
    for (var i = 0; i < this.T; i++) {
        for (var j = 0; j < this.U; j++) {
            if (DMap != undefined) {
                var size_t = DMap.max_t - DMap.min_t;
                var size_u = DMap.max_u - DMap.min_u;
                var min_t = DMap.min_t;
                var min_u = DMap.min_u;
            } else {
                var size_t = 1;
                var size_u = 1;
                var min_t = 0;
                var min_u = 0;
            }

            var t = size_t * i / (this.T - 1) + min_t;
            var u = size_u * j / (this.U - 1) + min_u;

            var coords = this.calc(t, u);
            var p = this.drawPoints[i][j];

            p.x = coords[0];
            p.y = coords[1];
            p.z = coords[2];
        }
    }

    for (var i = 0; i < this.RX; i++) {
        for (var j = 0; j < this.RY; j++) {
            var t = i / (this.RX - 1);
            var u = j / (this.RY - 1);

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

Surface.prototype.draw = function() {
    if (!BPlane.finished || this.finished) {
        opt_t = 0;
    }

    if (opt_t == opt_lim) {
        var score = DMap.score();

        for (var i = 0; i < this.X; i++) {
            for (var j = 0; j < this.Y; j++) {
                var p = this.controlPoints[i][j];
                this.optimizeControlPoint(p);
            }
        }
        this.updatePoints();
        this.updateTransformedPoints();

        var new_score = DMap.score();

        if (score == new_score) {
            if (count > 3) {
                this.finished = true;
                count = 0;
            }
            count++;
        } else {
            count = 0;
        }

        opt_t = 0;
    } else {
        opt_t++;
    }

    if (this.drawSurface) {
        // 'Draw' surface points to calculate their 'scale' (if negative, 
        // outside of cam space)
        for (var i = 0; i < this.T; i++) {
            for (var j = 0; j < this.U; j++) {
                this.drawPoints_T[i][j].draw(false);
            }
        }

        // Draw surface wireframe

        ctx.strokeStyle = "grey";

        ctx.beginPath();

        var needToMove = false;

        for (var i = 0; i < this.T; i++) {
            var j = 0;

            var p = this.drawPoints_T[i][j];

            if (p.scale > 0) {
                ctx.moveTo(p.x2d, p.y2d);
            } else {
                needToMove = true;
            }



            for (var j = 0; j < this.U; j++) {
                var p = this.drawPoints_T[i][j];


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

        var needToMove = false;

        for (var i = 0; i < this.U; i++) {
            var j = 0;

            var p = this.drawPoints_T[j][i];

            if (p.scale > 0) {
                ctx.moveTo(p.x2d, p.y2d)
            } else {
                needToMove = true;
            }


            for (var j = 0; j < this.T; j++) {
                var p = this.drawPoints_T[j][i];
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




    if (this.drawControlPoints) {
        // Draw resolution points
        for (var i = 0; i < this.RX; i++) {
            for (var j = 0; j < this.RY; j++) {
                this.resPoints_T[i][j].draw();
            }
        }


        // Draw control points
        for (var i = 0; i < this.X; i++) {
            for (var j = 0; j < this.Y; j++) {
                this.controlPoints_T[i][j].draw();
            }
        }
    } else {
        // Even if don't draw, still update their screen positions invisibly
        //  so that the mouse object can use them for its initial heuristic
        //  surface projection method.
        for (var i = 0; i < this.RX; i++) {
            for (var j = 0; j < this.RY; j++) {
                this.resPoints_T[i][j].draw(false);
            }
        }
    }
};

Surface.prototype.closestControlPoint2D = function(obj) {
    var closest = 999999;
    var closest_id = -1;

    for (var i = 0; i < this.controlPoints_T.length; i++) {
        for (var j = 0; j < this.controlPoints_T[i].length; j++) {
            var p = this.controlPoints_T[i][j];
            var dist = p.dist2d(obj);

            if (dist < closest) {
                closest = dist;
                closest_surface_x = i;
                closest_surface_y = j;
            }
        }
    }

    return [closest_surface_x, closest_surface_y];
};

Surface.prototype.moveControlPointTo2D = function(i, j, x2d, y2d) {
    var p = this.controlPoints_T[i][j];

    var scale = p.scale;

    // Transform modified screen space coordinates into camera space coordinates
    p.x = (x2d - cvs.width / 2) / scale;
    p.y = (y2d - cvs.height / 2) / scale;
    p.z = fov / scale - fov;

    // Transform camera space coordinates into world space
    var p_world = new Point;
    p_world.moveTo(p);

    p_world.rotateX(-pitch);
    p_world.rotateY(-yaw);
    p_world.scaleFactor(1 / zoom);

    this.controlPoints[i][j].moveTo(p_world);
};

Surface.prototype.sample = function(t, u) {
    var coords = this.calc(t, u);
    var p = new Point(coords[0], coords[1], coords[2]);
    p.t = t;
    p.u = u;

    return p;
}

Surface.prototype.calc = function(t, u) {
    var sum_x = 0;
    var sum_y = 0;
    var sum_z = 0;

    // Loop through control points
    for (var x = 0; x < this.X; x++) {
        for (var y = 0; y < this.Y; y++) {
            var control_point = this.controlPoints[x][y];
            var control_x = control_point.x;
            var control_y = control_point.y;
            var control_z = control_point.z;

            var product = this.basis(t, x, this.X - 1) * this.basis(u, y,
                this.Y - 1);

            sum_x += product * control_x;
            sum_y += product * control_y;
            sum_z += product * control_z;
        }
    }

    return [sum_x, sum_y, sum_z];
}

Surface.prototype.basis = function(t, i, n) {
    return binomial(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i);
};

Surface.prototype.optimizeControlPoint = function(p) {
    var iterations = 15;

    var delta_x = 1;
    var delta_y = 1;
    var delta_z = 1;

    // var threshold = .0003;

    var threshold = .0003;

    if (DMap.X >= 4) {
        threshold = .0003;
    }

    var score = DMap.score();

    var previous_state_x = 0;
    var previous_state_y = 0;
    var previous_state_z = 0;

    for (var i = 0; i < iterations; i++) {
        p.x += delta_x;
        var score_inc = DMap.score();
        p.x -= 2 * delta_x;
        var score_dec = DMap.score();
        p.x += delta_x;

        if (score_inc < score_dec) {
            if (score - score_inc > threshold) {
                p.x += delta_x;
                score = score_inc;
            } else if (previous_state_x == 1) {
                delta_x /= 2;
            }
            previous_state_x = 1;
        } else if (score_dec < score_inc) {
            if (score - score_dec > threshold) {
                p.x -= delta_x;
                score = score_dec;
            } else if (previous_state_x == -1) {
                delta_x /= 2;
            }
            previous_state_x = -1;
        }

        p.y += delta_y;
        var score_inc = DMap.score();
        p.y -= 2 * delta_y;
        var score_dec = DMap.score();
        p.y += delta_y;

        if (score_inc < score_dec) {
            if (score - score_inc > threshold) {
                p.y += delta_y;
                score = score_inc;
            } else if (previous_state_y == 1) {
                delta_y /= 2;
            }
            previous_state_y = 1;
        } else if (score_dec < score_inc) {
            if (score - score_dec > threshold) {
                p.y -= delta_y;
                score = score_dec;
            } else if (previous_state_y == -1) {
                delta_y /= 2;
            }
            previous_state_y = -1;
        }

        p.z += delta_z;
        var score_inc = DMap.score();
        p.z -= 2 * delta_z;
        var score_dec = DMap.score();
        p.z += delta_z;

        if (score_inc < score_dec) {
            if (score - score_inc > threshold) {
                p.z += delta_z;
                score = score_inc;
            } else if (previous_state_z == 1) {
                delta_z /= 2;
            }
            previous_state_z = 1;
        } else if (score_dec < score_inc) {
            if (score - score_dec > threshold) {
                p.z -= delta_z;
                score = score_dec;
            } else if (previous_state_z == -1) {
                delta_z /= 2;
            }
            previous_state_z = -1;
        }
    }


};

Surface.prototype.updateTransformedPoints = function() {
    for (var i = 0; i < this.X; i++) {
        for (var j = 0; j < this.Y; j++) {
            this.controlPoints_T[i][j].moveTo(this.controlPoints[i][j]);
            this.controlPoints_T[i][j].scaleFactor(zoom);
            this.controlPoints_T[i][j].rotateY(yaw);
            this.controlPoints_T[i][j].rotateX(pitch);
        }
    }

    for (var i = 0; i < this.T; i++) {
        for (var j = 0; j < this.U; j++) {
            this.drawPoints_T[i][j].moveTo(this.drawPoints[i][j]);
            this.drawPoints_T[i][j].scaleFactor(zoom);
            this.drawPoints_T[i][j].rotateY(yaw);
            this.drawPoints_T[i][j].rotateX(pitch);
        }
    }

    for (var i = 0; i < this.RX; i++) {
        for (var j = 0; j < this.RY; j++) {
            this.resPoints_T[i][j].moveTo(this.resPoints[i][j]);
            this.resPoints_T[i][j].scaleFactor(zoom);
            this.resPoints_T[i][j].rotateY(yaw);
            this.resPoints_T[i][j].rotateX(pitch);
        }
    }
}

Surface.prototype.incrementControlPoints = function() {
    var x = this.X + 1;
    var y = this.Y + 1;

    var controlPoints = new Array(x);
    var controlPoints_T = new Array(x);

    for (var i = 0; i < x; i++) {
        controlPoints[i] = new Array(y);
        controlPoints_T[i] = new Array(y);

        for (var j = 0; j < y; j++) {
            var t = i / (x - 1)
            var u = j / (y - 1)

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