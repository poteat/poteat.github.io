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
};

Point.prototype.draw = function(actually_draw)
{
    if (actually_draw == undefined)
    {
        actually_draw = true;
    }

    var x3d = this.x;
    var y3d = this.y;
    var z3d = this.z;
    this.scale = fov / (fov + z3d);
    this.x2d = (x3d * this.scale) + cvs.width / 2;
    this.y2d = (y3d * this.scale) + cvs.height / 2;

    if (this.scale > 0 && actually_draw)
    {
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x2d, this.y2d, this.scale * this.size, 0, Math.PI * 2,
            true);
        ctx.fill();
    }
};;

Point.prototype.dist2d = function(obj)
{
    return Math.sqrt(Math.pow(this.x2d - obj.x, 2) + Math.pow(this.y2d - obj.y,
        2));
};;

Point.prototype.dist = function(obj)
{
    return Math.sqrt(Math.pow(this.x - obj.x, 2) + Math.pow(this.y - obj.y,
        2) + Math.pow(this.z - obj.z, 2));
};;

Point.prototype.squareDist = function(obj)
{
    if (obj)
        return Math.pow(this.x - obj.x, 2) + Math.pow(this.y - obj.y,
            2) + Math.pow(this.z - obj.z, 2);
    return 0;
};

Point.prototype.planeDist = function(A, B, C, D)
{
    return Math.abs(A * this.x + B * this.y + C * this.z + D) / Math.sqrt(A *
        A + B * B + C * C);
};;

Point.prototype.moveTo = function(obj)
{
    this.x = obj.x;
    this.y = obj.y;
    this.z = obj.z;
};;

Point.prototype.scaleFactor = function(factor)
{
    this.x *= factor;
    this.y *= factor;
    this.z *= factor;
};;

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
};;

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
};;

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
};;

Point.prototype.rotateAxis = function(ang, ux, uy, uz)
{
    var m_11 = Math.cos(ang) + Math.pow(ux, 2) * (1 - Math.cos(ang));
    var m_12 = ux * uy * (1 - Math.cos(ang)) - uz * Math.sin(ang);
    var m_13 = ux * uz * (1 - Math.cos(ang)) + uy * Math.sin(ang);

    var m_21 = uy * ux * (1 - Math.cos(ang)) + uz * (Math.sin(ang));
    var m_22 = Math.cos(ang) + Math.pow(uy, 2) * (1 - Math.cos(ang));
    var m_23 = uy * uz * (1 - Math.cos(ang)) - ux * Math.sin(ang);

    var m_31 = uz * ux * (1 - Math.cos(ang)) - uy * Math.sin(ang);
    var m_32 = uz * uy * (1 - Math.cos(ang)) + ux * Math.sin(ang);
    var m_33 = Math.cos(ang) + Math.pow(uz, 2) * (1 - Math.cos(ang));

    var x_new = this.x * m_11 + this.y * m_21 + this.z * m_31;
    var y_new = this.x * m_12 + this.y * m_22 + this.z * m_32;
    var z_new = this.x * m_13 + this.y * m_23 + this.z * m_33;

    this.x = x_new;
    this.y = y_new;
    this.z = z_new;
};;

Point.prototype.distFromLine = function(slope, intersect)
{
    return (slope * this.x - this.z + intersect) / Math.sqrt(Math.pow(slope,
        2) + 1);
};;

// Given surface parameters t and u, this function returns the distance to that 
// surface location.
Point.prototype.distToParameter = function(t, u)
{
    var coords = BSurface.calc(t, u);
    var x = coords[0];
    var y = coords[1];
    var z = coords[2];
    return Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2) + Math.pow(
        this.z - z, 2));
};;

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

    this.t = min_i / (BSurface.RX - 1);
    this.u = min_j / (BSurface.RY - 1);

    return [min_i, min_j];
};;

Point.prototype.refineProjection = function(permissive)
{
    if (permissive == undefined)
    {
        permissive = false;
    }

    var gap = 1 / (BSurface.RX - 1);

    var iterations = 20;

    var delta_t = 10 * gap / iterations;
    var delta_u = 10 * gap / iterations;

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
        if (t < .15)
        {
            t = .15;
        }
        else if (t > .85)
        {
            t = .85;
        }

        if (u < .15)
        {
            u = .15;
        }
        else if (u > .85)
        {
            u = .85;
        }
    }

    this.t = t;
    this.u = u;
};;

Point.prototype.clone = function(color, size)
{
    var p = new Point(this.x, this.y, this.z);
    p.t = this.t;
    p.u = this.u;
    p.color = color;
    p.size = size;

    return p;
};;

Point.prototype.transform = function(p)
{
    this.moveTo(p);
    this.scaleFactor(zoom);
    this.rotateY(yaw);
    this.rotateX(pitch);
};;

Point.prototype.visible = function()
{
    var visible_x = this.x2d >= 0 && this.x2d < cvs.width;
    var visible_y = this.y2d >= 0 && this.y2d < cvs.height;

    return visible_x && visible_y && this.scale > 0;
};;