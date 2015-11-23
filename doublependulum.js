
  // ------------------------------------------------------------
  //  Double Pendulum Simulation - Code Refactor - Nov 2
  //  by Michael Poteat
  // ------------------------------------------------------------
  //
  // Todo:
  // Provide GUI for changing system parameters
  
  // Pendulums which have a second joint mass very larger than the first
  // tend to behave like a ball bouncing inside of a circle
  
  // This is because Lagrangians by default conserve energy, and most of the
  // energy is in the second bob.  So, it magically does what it needs to do
  // to conserve energy and angular momentum, which happens to be bouncing
  // off of the constraint.
  
  // Another way to think about it: The first bob has little mass, so it
  // doesn't affect the second bob.  So the only force on the second bob
  // is gravity.

  var h = 1/60; // framerate
  var g = 9.81*10;

  var DP = new DoublePendulum(0, 0, 10, 10, 1, 1);

  var cvs = document.getElementById('canvas');
  var ctx = cvs.getContext('2d');
  var Mouse = new Mouse();

  setInterval("step();",h*1000);

  // ------------------------------------------------------------
  // Main loop: Invokes integration globally and redraws every step
  // ------------------------------------------------------------
  
  function step()
  {
    var steps_per_frame = 4;
    for (var i = 0; i < steps_per_frame; i++)
    {
        DP.Z = rk8(DP.Z, DP.diff, h/steps_per_frame);
    }
    
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    
    DP.draw();
  }

  // ------------------------------------------------------------
  // Local integration routines: rk4(Z, diff), addMulZ(Z1, m, Z2)
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
  
  function rk5(Z, diff, h)
  {
    var k1 = diff(Z);
    var k2 = diff(addWeightedZ(1,Z,h*1/2,k1));
    var k3 = diff(addWeightedZ(1,Z,h*3/16,k1,h*1/16,k2));
    var k4 = diff(addWeightedZ(1,Z,h*1/2,k3));
    var k5 = diff(addWeightedZ(1,Z,h*-3/16,k2,h*6/16,k3,h*9/16,k4));
    var k6 = diff(addWeightedZ(1,Z,h*1/7,k1,h*4/7,k2,h*6/7,k3,h*-12/7,k4,h*8/7,k5));
    
    Z = addWeightedZ(1,Z,7*h/90,k1,32*h/90,k3,12*h/90,k4,32*h/90,k5,7*h/90,k6);
    
    return Z;
  }
  
  function rk6(Z, diff, h)
  {
    var k1 = diff(Z);
    var k2 = diff(addWeightedZ(1,Z,h*1/4,k1));
    var k3 = diff(addWeightedZ(1,Z,h*3/32,k1,h*9/32,k2));
    var k4 = diff(addWeightedZ(1,Z,h*1932/2197,k1,h*-7200/2197,k2,h*7296/2197,k3));
    var k5 = diff(addWeightedZ(1,Z,h*439/216,k1,h*-8,k2,h*3680/513,k3,h*-845/4104,k4));
    var k6 = diff(addWeightedZ(1,Z,h*-8/27,k1,h*2,k2,h*-3544/2565,k3,h*1859/4104,k4,h*-11/40,k5));
    
    Z = addWeightedZ(1,Z,h*16/135,k1,h*6656/12825,k3,h*28561/56430,k4,h*-9/50,k5,h*2/55,k6);
    
    return Z;
  }
  
  
  // ------------------------------------------------------------
  // Verner's Method of Integration
  // This function is amazing, it allows for really convoluted pendulum
  // parameters without error, such as an end bob of 10x the mass of the first.
  // ------------------------------------------------------------
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
  
  

  // addWeightedZ(m1, k1, m2, k2 ...) = Z+m1*k1+m2*k2...
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
  // Double Pendulum object logic and drawing function.
  // ------------------------------------------------------------
  
  function DoublePendulum(x, y, L1, L2, M1, M2)
  {
    ang1 = 90/180*Math.PI;
    ang2 = 180.001/180*Math.PI;
    this.Z = [x, y, 0, 0, ang1, 0, ang2, 0];
    this.L1 = L1;
    this.L2 = L2;
    this.M1 = M1;
    this.M2 = M2;
  }

  DoublePendulum.prototype.diff = function(Z)
  {
    x = Z[0];
    y = Z[1];
    vx = Z[2];
    vy = Z[3];
    ang1 = Z[4];
    vang1 = Z[5];
    ang2 = Z[6];
    vang2 = Z[7];
    M1 = DP.M1;
    M2 = DP.M2;
    L1 = DP.L1;
    L2 = DP.L2;
    
    ax = 0;
    ay = 0;
  
    // Optimized code using subexpression finding in Mathematica:
    // Experimental`OptimizeExpression[{e1,e2},OptimizationLevel -> 2]

    var b1 = 1/L1;
    var b2 = 2*M1;
    var b3 = ang1; // Non-const
    var b4 = ang2; // Non-const
    var b5 = -b4; // NC
    var b6 = b3+b5; // NC
    var b7 = 2*b6; // NC
    var b8 = Math.cos(b7);
    var b9 = -M2*b8;
    var b10 = b2+M2+b9;
    var b11 = 1/b10;
    var b22 = vang1;
    var b23 = Math.pow(b22,2);
    var b25 = vang2;
    var b26 = Math.pow(b25,2);
    var b32 = 1/L2;
    var b20 = Math.sin(b6);
    var b21 = Math.cos(b6);

    ang1_accel = -b1*b11*(g*(b2+M2)*Math.sin(b3)+g*M2*Math.sin(b3-2*b4)+2*M2*b20*(L1*b21*b23+L2*b26));

    ang2_accel = 2*b32*b11*b20*((M1+M2)*(g*Math.cos(b3)+L1*b23)+L2*M2*b21*b26);

//    ang1_accel = -(g*(2*M1+M2)*Math.sin(ang1)+g*M2*Math.sin(ang1-2*ang2)+2*M2*(Math.pow(vang2,2)*L2+Math.pow(vang1,2)*L1*Math.cos(ang1-ang2))*Math.sin(ang1-ang2)) / (2*L1*(M1+M2-M2*Math.pow(Math.cos(ang1-ang2),2)));
    
//    ang2_accel = ((M1+M2)*(Math.pow(vang1,2)*L1+g*Math.cos(ang1))+Math.pow(vang2,2)*L2*M2*Math.cos(ang1-ang2))*Math.sin(ang1-ang2)/(L2*(M1+M2-M2*Math.pow(Math.cos(ang1-ang2),2)));
    
    return [vx, vy, ax, ay, vang1, ang1_accel, vang2, ang2_accel];
  };

  DoublePendulum.prototype.draw = function()
  {
    x = this.Z[0];
    y = this.Z[1];
    
    ang1 = this.Z[4];
    vang1 = this.Z[5];
    ang2 = this.Z[6];
    vang2 = this.Z[7];
    M1 = DP.M1;
    M2 = DP.M2;
    L1 = DP.L1;
    L2 = DP.L2;   
    
    pivotx_draw = x*10+cvs.width/2;
    pivoty_draw = -y*10+cvs.height/2;
    length1 = this.L1;
    length2 = this.L2;
    ang1 = this.Z[4];
    ang2 = this.Z[6];
    
    // Center pivot dot
    ctx.beginPath();
    ctx.arc(pivotx_draw, pivoty_draw, 5, 0, Math.PI*2, true);
    ctx.fill();

    joint1x = x + Math.sin(ang1)*length1;
    joint1y = y - Math.cos(ang1)*length1;
    
    joint1x_draw = joint1x*10+cvs.width/2;
    joint1y_draw = -joint1y*10+cvs.width/2;
    
    // Joint 1 dot
    ctx.beginPath();
    ctx.arc(joint1x_draw, joint1y_draw, 4, 0, Math.PI*2, true);
    ctx.fill();
    
    joint2x = joint1x + Math.sin(ang2)*length2;
    joint2y = joint1y - Math.cos(ang2)*length2;
    
    joint2x_draw = joint2x*10+cvs.width/2;
    joint2y_draw = -joint2y*10+cvs.width/2;
    
    // End dot
    ctx.beginPath();
    ctx.arc(joint2x_draw, joint2y_draw, 4, 0, Math.PI*2, true);
    ctx.fill();
    
    // Inner circle
    ctx.beginPath();
    ctx.arc(pivotx_draw, pivoty_draw, 10*length1, 0, Math.PI*2, true);
    ctx.stroke();
    
    // Outer circle
    ctx.beginPath();
    ctx.arc(pivotx_draw, pivoty_draw, 10*(length1+length2), 0, Math.PI*2, true);
    ctx.stroke();
    
    // Line connectors
    ctx.beginPath();
    
    ctx.moveTo(pivotx_draw, pivoty_draw);
    ctx.lineTo(joint1x_draw, joint1y_draw);
    ctx.lineTo(joint2x_draw, joint2y_draw);
    
    ctx.stroke(); 
    
    KE = (1/2)*(M1+M2)*Math.pow(L1,2)*Math.pow(vang1,2)+(1/2)*M2*Math.pow(L2,2)*Math.pow(vang2,2)+M2*L1*L2*vang1*vang2*Math.cos(ang1 - ang2);
    ctx.fillText("Kinetic Energy: " + (KE), 5, 15);
    
    PE = g*(L1*M1+(L1+L2)*M2-L1*(M1+M2)*Math.cos(ang1)-L2*M2*Math.cos(ang2));
    ctx.fillText("Potential Energy: " + (PE), 5, 25);
    
    ctx.fillText("Total Energy: " + (KE+PE), 5, 45);
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