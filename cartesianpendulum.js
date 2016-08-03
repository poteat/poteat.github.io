
  // ------------------------------------------------------------
  //  Single Pendulum Simulation - Code Refactor - Nov 21
  //  by Michael Poteat
  // ------------------------------------------------------------

  var h = 1/60; // framerate
  var g = 9.81*10;

  // FPS reporting variables
  var filterStrength = 20;
  var frameTime = 0, lastLoop = new Date, thisLoop;

  //  function Pendulum(x, y, ang, vang, L, M)
  var P = new Pendulum(0, 0, 90, 45, 10, 1);

  var cvs = document.getElementById('canvas');
  var ctx = cvs.getContext('2d');
  var Mouse = new Mouse();

  setInterval("step();",h*1000);

  // ------------------------------------------------------------
  // Main loop: Invokes integration globally and redraws every step
  // ------------------------------------------------------------
  
  var fpsOut = document.getElementById('fps');
  setInterval(function(){
    fpsOut.innerHTML = (1000/frameTime).toFixed(1) + " fps";
  },1000);

  function step()
  {    
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    var steps_per_frame = 10;
    for (var i = 0; i < steps_per_frame; i++)
    {
        P.Z = rk8(P.Z, P.diff, h/steps_per_frame);
        P.normalize();
    }
    
    P.draw();

    // Report how long this took
    var thisFrameTime = (thisLoop=new Date) - lastLoop;
    frameTime+= (thisFrameTime - frameTime) / filterStrength;
    lastLoop = thisLoop;
  }

  // ------------------------------------------------------------
  // Local integration routines: rk4(Z, diff), addWeightedZ
  // ------------------------------------------------------------
  
  function rk4(Z, diff, h)
  { 
    var k1 = diff(Z);
    var k2 = diff(addWeightedZ(1,Z,h/2,k1));
    var k3 = diff(addWeightedZ(1,Z,h/2,k2));
    var k4 = diff(addWeightedZ(1,Z,h,k3));
    
    Z = addWeightedZ(1,Z,h/6,k1,h/3,k2,h/3,k3,h/6,k4);
    
    return Z;
  }

  // addWeightedZ(m1, k1, m2, k2 ...) = m1*k1+m2*k2...
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
  
  // ------------------------------------------------------------
  // Single Pendulum object logic and drawing function.
  // ------------------------------------------------------------
  
  function Pendulum(x, y, ang, vang, L, M)
  {
    var ang = ang/180*Math.PI;

    var px = L*Math.sin(ang);
    var py = -L*Math.cos(ang);

    var pvx = -vang*Math.cos(ang);
    var pvy = vang*Math.sin(ang);

    this.Z = [px, py, pvx, pvy];
    this.x = x;
    this.y = y;
    this.L = L;
    this.M = M;
  }

  Pendulum.prototype.normalize = function()
  {
    var x = this.Z[0];
    var y = this.Z[1];
    var vx = this.Z[2];
    var vy = this.Z[3];
    var L = P.L;

    var ang = Math.atan2(x, -y);

    var x = L*Math.sin(ang);
    var y = -L*Math.cos(ang);

    this.Z = [x, y, vx, vy];
  }
  
  Pendulum.prototype.diff = function(Z)
  {
    var x = Z[0];
    var y = Z[1];
    var vx = Z[2];
    var vy = Z[3];
    var L = P.L;

    var d = Math.hypot(x, y);

    /*
    var x = d/L;
    var y = d/L;

    Z[0] /= d/L;
    Z[1] /= d/L;*/

    var ang = Math.atan2(x, -y);
    v = Math.hypot(vx, vy);

    var ax = 0;
    var ay = 0;

    ax += -(1/2)*g*Math.sin(2*ang) - Math.pow(v,2)/L*Math.sin(ang)
    ay += g*Math.pow(Math.cos(ang),2) + Math.pow(v,2)/L*Math.cos(ang) - g;
    
    return [vx, vy, ax, ay];
  };
  
  Pendulum.prototype.draw = function()
  {
    x = this.x;
    y = this.y;
    L = this.L;
    M = this.M;
    px = this.Z[0];
    py = this.Z[1];
    pvx = this.Z[2];
    pvy = this.Z[3];
    
    pivotx_draw = x*10+cvs.width/2;
    pivoty_draw = -y*10+cvs.height/2;
    
    bobx_draw = px*10+cvs.width/2;
    boby_draw = -py*10+cvs.width/2;
    
    ctx.beginPath();
    ctx.arc(pivotx_draw, pivoty_draw, 4, 0, Math.PI*2, true);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(bobx_draw, boby_draw, 4, 0, Math.PI*2, true);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(pivotx_draw, pivoty_draw);
    ctx.lineTo(bobx_draw, boby_draw);
    ctx.stroke();

    ang = Math.atan2(px, -py);
    v = Math.hypot(pvx, pvy);

    KE = (1/2)*M*Math.pow(v, 2);
    PE = M*g*(py+this.L);
  
    ctx.fillText("Angle: " + (Math.atan2(px,-py)/Math.PI*180).toFixed(0), 5, 15);
    ctx.fillText("Length: " + Math.hypot(px, py), 5, 25);

    ctx.fillText("Kinetic: " + KE, 5, 45);
    ctx.fillText("Potential: " + PE, 5, 55);

    ctx.fillText("Energy: " + (KE+PE), 5, 75);


  /*
    KE = 0;
    PE = 0;

    ctx.fillText("Position: (" + px + ", " + py + ")", 5, 15);
    ctx.fillText("Velocity: (" + pvx + ", " + pvy + ")", 5, 25);
    
    ctx.fillText("Energy: " + (KE + PE), 5, 45);

    ctx.fillText("FPS: " + (1000/frameTime).toFixed(1), 5, 65)

    */
  };

  // ------------------------------------------------------------
  // Mouse handling logic and DOM hooks
  // ------------------------------------------------------------

  function Mouse()
  {
    this.x = 0;
    this.y = 0;
    this.gridx = 0;
    this.gridy = 0;
    this.down = false;
    this.inside = false;
    this.rclick = false;
  }
  
  Mouse.draw = function(evt)
  {
    ctx.beginPath();
    ctx.arc(Mouse.x, Mouse.y, 30, 0, Math.PI*2, true);
    ctx.fill();
  };
  
  Mouse.updatePos = function(evt)
  {
    var rect = cvs.getBoundingClientRect();
    this.x = evt.clientX - rect.left - 1;
    this.y = evt.clientY - rect.top - 1;
    this.gridx = (this.x-cvs.width/2)/10;
    this.gridy = -(this.y-cvs.height/2)/10;
  };

  cvs.addEventListener('mousemove', function(evt)
  {
    Mouse.updatePos(evt);
  }, false);
  
  cvs.addEventListener('mousedown', function(evt)
  {
    Mouse.down = true;
  }, false);
  
  cvs.addEventListener('mouseup', function(evt)
  {
    Mouse.down = false;
  }, false);


























    function rk8(Z, diff, h)
  {
    var k1 = diff(Z);
    var k2 = diff(addWeightedZ(1,Z,h*a21,k1));
    var k3 = diff(addWeightedZ(1,Z,h*a31,k1,h*a32,k2));
    var k4 = diff(addWeightedZ(1,Z,h*a41,k1,h*a42,k2,h*a43,k3));
    var k5 = diff(addWeightedZ(1,Z,h*a51,k1,h*a53,k3,h*a54,k4));
    var k6 = diff(addWeightedZ(1,Z,h*a61,k1,h*a63,k3,h*a64,k4,h*a65,k5));
    var k7 = diff(addWeightedZ(1,Z,h*a71,k1,h*a73,k3,h*a74,k4,h*a75,k5,h*a76,k6));
    var k8 = diff(addWeightedZ(1,Z,h*a81,k1,h*a85,k5,h*a86,k6,h*a87,k7));
    var k9 = diff(addWeightedZ(1,Z,h*a91,k1,h*a95,k5,h*a96,k6,h*a97,k7,h*a98,k8));
    var k10 = diff(addWeightedZ(1,Z,h*a10_1,k1,h*a10_5,k5,h*a10_6,k6,h*a10_7,k7,h*a10_8,k8,h*a10_9,k9));
    var k11 = diff(addWeightedZ(1,Z,h*a11_5,k5,h*a11_6,k6,h*a11_7,k7,h*a11_8,k8,h*a11_9,k9,h*a11_10,k10));
    
    Z = addWeightedZ(1,Z,h*b1,k1,h*b8,k8,h*b9,k9,h*b8,k10,h*b1,k11);
    
    return Z;
  }
  
  // ------------------------------------------------------------
  // Verner's Method:  Constants
  // ------------------------------------------------------------
  
  var sqrt21 = Math.sqrt(21);

  var  c1 = 1.0 / 2.0;    
  var  c2 = (7.0 + sqrt21 ) / 14.0;
  var  c3 = (7.0 - sqrt21 ) / 14.0;

  var  a21 =  1.0 / 2.0;
  var  a31 =  1.0 / 4.0;
  var  a32 =  1.0 / 4.0;
  var  a41 =  1.0 / 7.0;
  var  a42 = -(7.0 + 3.0 * sqrt21) / 98.0;
  var  a43 =  (21.0 + 5.0 * sqrt21) / 49.0;
  var  a51 =  (11.0 + sqrt21) / 84.0;
  var  a53 =  (18.0 + 4.0 * sqrt21) / 63.0;
  var  a54 =  (21.0 - sqrt21) / 252.0;
  var  a61 =  (5.0 + sqrt21) / 48.0;
  var  a63 =  (9.0 + sqrt21) / 36.0;
  var  a64 =  (-231.0 + 14.0 * sqrt21) / 360.0;
  var  a65 =  (63.0 - 7.0 * sqrt21) / 80.0;
  var  a71 =  (10.0 - sqrt21) / 42.0;
  var  a73 =  (-432.0 + 92.0 * sqrt21) / 315.0;
  var  a74 =  (633.0 - 145.0 * sqrt21) / 90.0;
  var  a75 =  (-504.0 + 115.0 * sqrt21) / 70.0;
  var  a76 =  (63.0 - 13.0 * sqrt21) / 35.0;
  var  a81 =  1.0 / 14.0;
  var  a85 =  (14.0 - 3.0 * sqrt21) / 126.0;
  var  a86 =  (13.0 - 3.0 * sqrt21) / 63.0;
  var  a87 =  1.0 / 9.0;
  var  a91 =  1.0 / 32.0;
  var  a95 =  (91.0 - 21.0 * sqrt21) / 576.0;
  var  a96 =  11.0 / 72.0;
  var  a97 = -(385.0 + 75.0 * sqrt21) / 1152.0;
  var  a98 =  (63.0 + 13.0 * sqrt21) / 128.0;
  var  a10_1 =  1.0 / 14.0;
  var  a10_5 =  1.0 / 9.0;
  var  a10_6 = -(733.0 + 147.0 * sqrt21) / 2205.0;
  var  a10_7 =  (515.0 + 111.0 * sqrt21) / 504.0;
  var  a10_8 = -(51.0 + 11.0 * sqrt21) / 56.0;
  var  a10_9 =  (132.0 + 28.0 * sqrt21) / 245.0;
  var  a11_5 = (-42.0 + 7.0 * sqrt21) / 18.0;
  var  a11_6 = (-18.0 + 28.0 * sqrt21) / 45.0;
  var  a11_7 = -(273.0 + 53.0 * sqrt21) / 72.0;
  var  a11_8 =  (301.0 + 53.0 * sqrt21) / 72.0;
  var  a11_9 =  (28.0 - 28.0 * sqrt21) / 45.0;
  var  a11_10 = (49.0 - 7.0 * sqrt21) / 18.0;

  var   b1  = 9.0 / 180.0;
  var   b8  = 49.0 / 180.0;
  var   b9  = 64.0 / 180.0;