


var cvs = document.getElementById('canvas');
var ctx = cvs.getContext('2d');
var h = 1/60;

setInterval("main();",h*1000);

function init()
{
    Gravity = new Gravity(100);
    AirResistance = new AirResistance(.001);

    var id_A = createMassObject(200, 100, 0, 0, 1);

    var id_B = createMassObject(150, 100, 0, 0, 1);

    var id_C = createMassObject(100, 100, 0, 0, 1);

    var id_D = createMassObject(50, 100, 0, 0, 1);

    var id_E = createMassObject(0, 100, 0, 200, 10);

    Masses[id_B].hookForce(Gravity);
    Masses[id_C].hookForce(Gravity);
    Masses[id_D].hookForce(Gravity);
    Masses[id_E].hookForce(Gravity);
//    Masses[id_B].hookForce(AirResistance);

    var spring_id = createSpringObject(1000, 50, 10, id_A, id_B);

    var spring_id2 = createSpringObject(1000, 50, 10, id_B, id_C);

    var spring_id3 = createSpringObject(1000, 50, 10, id_C, id_D);

    var spring_id4 = createSpringObject(1000, 50, 10, id_D, id_E);

 //   Masses[id_A].hookForce(Springs[spring_id]);
    Masses[id_B].hookForce(Springs[spring_id]);
    Masses[id_B].hookForce(Springs[spring_id2]);

    Masses[id_C].hookForce(Springs[spring_id2]);
    Masses[id_C].hookForce(Springs[spring_id3]);

    Masses[id_D].hookForce(Springs[spring_id3]);
    Masses[id_D].hookForce(Springs[spring_id4]);

    Masses[id_E].hookForce(Springs[spring_id4]);



    setInterval("main();",h*1000);
}

function main()
{
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    
    for (var i = 0; i < Masses.length; i++)
    {
        var steps = 10;
        for (var j = 0; j < steps; j++)
        {
            rk4(Masses[i], h/steps);
        }

        Masses[i].draw();
    }

    for (var i = 0; i < Springs.length; i++)
    {
        Springs[i].draw();
    }
}








/* rk4()...
    This function takes in a state, a state equation, a timestep, and returns its approximation of the next
    state after that timestep h.  Since it is a fourth-order approximation, timesteps may be quite large,
    depending on the stiffness of the underlying state equation.
*/
function rk4(Mass, h)
{ 
    var Z = Mass.Z;

    var k1 = Mass.diff(Z);
    var k2 = Mass.diff(addWeightedZ(1,Z,h/2,k1));
    var k3 = Mass.diff(addWeightedZ(1,Z,h/2,k2));
    var k4 = Mass.diff(addWeightedZ(1,Z,h,k3));
    
    Z = addWeightedZ(1,Z,h/6,k1,h/3,k2,h/3,k3,h/6,k4);
    
    Mass.Z = Z;
}

/* addWeightedZ()...
    This function takes in a parameter list of multipliers and state vectors, then does a weighted summation
    of all of the vectors.  Syntax: addWeightedZ(m1, k1, m2, k2 ...) = m1*k1+m2*k2...
*/
function addWeightedZ()
{
    var Z = [];
    
    for (var i = 0; i < arguments[1].length; i++)
    {
        Z[i] = 0;
    }
    
    for (i = 0; i < arguments.length; i+=2)
    {
        var m = arguments[i];
        var k = arguments[i+1];
        for (var j = 0; j < arguments[1].length; j++)
        {
            Z[j] += m*k[j];
        }
    }
    
    return Z;
}









/* Mass object...
    Every mass has a 4-tuple state vector, Z, comprising its position and velocity.

    As well, it has an array of external forces (Objects) that act upon it.  These are used to compute
    the "State Equation" diff.  For a given Z, it returns Z', the state's derivative with respect to time.

    As well, it has the immutable property of mass, a non-negative real number.
*/

var Masses = [];

function createMassObject(x, y, vx, vy, mass)
{
    var id = Masses.length;
    Masses.push(new Mass(x, y, vx, vy, mass, id));

    return id;
}

function Mass(x, y, vx, vy, mass, id)
{
    this.Z = [x, y, vx, vy];
    this.F = [];
    this.mass = mass;
    this.id = id;
}

Mass.prototype.hookForce = function(Force)
{
    this.F.push(Force);
};

Mass.prototype.diff = function(Z)
{
    var x = this.Z[0];
    var y = this.Z[1];
    var vx = this.Z[2];
    var vy = this.Z[3];

    var m = this.mass;

    var ax = 0;
    var ay = 0;

    var f = [0, 0];

    for (i = 0; i < this.F.length; i++)
    {
        f = this.F[i].getForce(this);

        ax += f[0];
        ay += f[1];
    }

    return [vx, vy, ax/m, ay/m];
};

Mass.prototype.draw = function()
{
    ctx.beginPath();
    ctx.arc(this.Z[0], this.Z[1], 5, 0, Math.PI*2, true);
    ctx.fill();
};

Mass.prototype.KE = function()
{
    var vx = this.Z[0];
    var vy = this.Z[1];

    var v = hypot(vx, vy);

    return (1/2)*this.m*Math.pow(v,2);
};





var Springs = [];

function createSpringObject(k, l, d, A_id, B_id)
{
    var id = Springs.length;
    Springs.push(new Spring(k, l, d, A_id, B_id, id));

    return id;
}

function Spring(k, l, d, A_id, B_id, id)
{
    this.k = k;
    this.l = l;
    this.d = d;
    this.A = A_id;
    this.B = B_id;

    this.id = id;
}

Spring.prototype.getForce = function(MassObj)
{
    var dist = Math.hypot(Masses[this.A].Z[0] - Masses[this.B].Z[0], Masses[this.A].Z[1] - Masses[this.B].Z[1]) - this.l;
    var ang = Math.atan2(Masses[this.B].Z[1] - Masses[this.A].Z[1], Masses[this.B].Z[0] - Masses[this.A].Z[0]);

    var ax = 0;
    var ay = 0;




    // Velocity damping
    var vx = MassObj.Z[2];
    var vy = MassObj.Z[3];

    var v = Math.hypot(vx, vy);
    var v_ang = Math.atan2(vy, vx);

    var v_wrt_spring = v*Math.cos(ang - v_ang);




    if (MassObj.id == this.A)
    {
        ax = this.k*dist*Math.cos(ang);
        ay = this.k*dist*Math.sin(ang);
    }
    else if (MassObj.id == this.B)
    {
        ax = this.k*dist*Math.cos(ang + Math.PI);
        ay = this.k*dist*Math.sin(ang + Math.PI);
    }


    // Velocity damping
    var vx = MassObj.Z[2];
    var vy = MassObj.Z[3];

    var v = Math.hypot(vx, vy);
    var v_ang = Math.atan2(vy, vx);

    var v_wrt_spring = v*Math.cos(ang - v_ang);

    ax += this.d*v_wrt_spring*Math.cos(ang + Math.PI);
    ay += this.d*v_wrt_spring*Math.sin(ang + Math.PI);




    return [ax, ay];

//    return [ax, ay];
};

Spring.prototype.PE = function()
{

};

Spring.prototype.draw = function()
{
    ctx.beginPath();
      ctx.moveTo(Masses[this.A].Z[0], Masses[this.A].Z[1]);
      ctx.lineTo(Masses[this.B].Z[0], Masses[this.B].Z[1]);
    ctx.stroke();
};








/* Air Resistance object...
    The air resistance object is a singleton that is hooked to various Masses that are affected by air resistance
    (drag).  This applies a counter-acceleration opposite of its velocity, proportional to its velocity squared.
*/
function AirResistance(k)
{
    this.k = k;
}

AirResistance.prototype.getForce = function(MassObj)
{
    var vx = MassObj.Z[2];
    var vy = MassObj.Z[3];

    var v = Math.hypot(vx, vy);
    var v_ang = Math.atan2(vy, vx);

    var ax = this.k*Math.pow(v, 2)*Math.cos(v_ang + Math.PI);
    var ay = this.k*Math.pow(v, 2)*Math.sin(v_ang + Math.PI);

    return [ax, ay];
};







/* Gravity object...
    The gravity object is a singleton that is hooked to various Masses that are under the influence of gravity.

    This force is a function of one Mass object (specifically, that object's mass).  To make clear, 'Gravity'
    refers to simple downwards uniform acceleration, not Newtonian universal gravitation.
*/
function Gravity(g)
{
    this.g = g;
}

Gravity.prototype.getForce = function(MassObj)
{
    return [0, this.g*MassObj.mass];
};









init();