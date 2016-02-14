
  // ------------------------------------------------------------
  //  Single Pendulum Simulation - Code Refactor - Nov 21
  //  by Michael Poteat
  // ------------------------------------------------------------

  var h = 2; // framerate
  var g = 9.81*10;

  // FPS reporting variables
  var filterStrength = 20;
  var frameTime = 0, lastLoop = new Date, thisLoop;

  //  function Pendulum(x, y, px, py, pvx, pvy, L, M)
  var P = new Pendulum(0, 0, 10, 0, 0, 0, 5, 1);

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

    var steps_per_frame = 1;
    for (var i = 0; i < steps_per_frame; i++)
    {
        P.Z = rk4(P.Z, P.diff, h/steps_per_frame);
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
  
  function Pendulum(x, y, px, py, pvx, pvy, L, M)
  {
    this.Z = [px, py, pvx, pvy];
    this.x = x;
    this.y = y;
    this.L = L;
    this.M = M;
  }
  
  Pendulum.prototype.diff = function(Z)
  {
    x = Z[0];
    y = Z[1];
    vx = Z[2];
    vy = Z[3];
    L = P.L;

    num = y*(g*L+Math.sqrt(1+Math.pow(x,2)/Math.pow(y,2))*(Math.pow(vx,2)+Math.pow(vy,2)));
    denom = (L*(Math.pow(x,2)+Math.pow(y,2)));
    accel = num/denom;

    ax = accel*x;
    ay = accel*y-g;

    console.log(denom);

    ctx.fillText("Accel: (" + ax + ", " + ay + ")", 5, 35);
    
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
    
//    KE = (1/2)*M*Math.pow(L,2)*Math.pow(vang,2);
//    PE = M*g*L*(1-Math.cos(ang));
  
    KE = 0;
    PE = 0;

    ctx.fillText("Position: (" + px + ", " + py + ")", 5, 15);
    ctx.fillText("Velocity: (" + pvx + ", " + pvy + ")", 5, 25);
    
    ctx.fillText("Energy: " + (KE + PE), 5, 45);

    ctx.fillText("FPS: " + (1000/frameTime).toFixed(1), 5, 65)
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