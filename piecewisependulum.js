
  fps = 1/60; // framerate
  var steps_per_frame = 10;

  var g = 9.81*10;

  // ang1, vang1, ang2, vang2, ang3, vang3, x, y, L1, L2, L3, M1, M2, M3
  var TP = new TriplePendulum(90, 0, 180, 0, 90, 0, 0, 0, 0, 0, 5, 5, 5, 5, 1, 1, 1, 1);

  var circlebounds = false;
  var cherrytracer = false;
  var connections = true;
  var paused = false;

  var cvs = document.getElementById('canvas');
  var ctx = cvs.getContext('2d');

  var cvs_tracer = document.getElementById('tracer');
  var ctx_tracer = cvs_tracer.getContext('2d');

  var Mouse = new Mouse();


  // FPS reporting variables
  var filterStrength = 20;
  var frameTime = 0, lastLoop = new Date, thisLoop;
  var fpsOut = document.getElementById('fps');
  setInterval(function(){
    fpsOut.innerHTML = (1000/frameTime).toFixed(1) + " fps";
  },1000);

  var steploop = setInterval("step();",fps*1000);

  function reinitialize()
  {
    var ang1 = Number(document.getElementById("ang1").value);
    var vang1 = Number(document.getElementById("vang1").value);
    var ang2 = Number(document.getElementById("ang2").value);
    var vang2 = Number(document.getElementById("vang2").value);
    var ang3 = Number(document.getElementById("ang3").value);
    var vang3 = Number(document.getElementById("vang3").value);

    var L1 = Number(document.getElementById("L1").value);
    var L2 = Number(document.getElementById("L2").value);
    var L3 = Number(document.getElementById("L3").value);
    var M1 = Number(document.getElementById("M1").value);
    var M2 = Number(document.getElementById("M2").value);
    var M3 = Number(document.getElementById("M3").value);

    g = Number(document.getElementById("g").value);
    fps = 1/Number(document.getElementById("fps_in").value);
    steps_per_frame = Number(document.getElementById("steps").value);

    TP = new TriplePendulum(ang1, vang1, ang2, vang2, ang3, vang3, 0, 0, L1, L2, L3, M1, M2, M3);
    ctx_tracer.clearRect(0, 0, cvs_tracer.width, cvs_tracer.height);

    clearInterval(steploop);
    steploop = setInterval("step();",fps*1000);
  }

  // ------------------------------------------------------------
  // Main loop: Invokes integration globally and redraws every step
  // ------------------------------------------------------------
  
  function step()
  {
    if (!paused)
    {
      for (var i = 0; i < steps_per_frame; i++)
      {
          TP.Z = rk8(TP.Z, TP.diff, fps/steps_per_frame);
      }
    }
    
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    TP.draw();

    ctx_tracer.globalAlpha=0.05;
    ctx_tracer.fillStyle = "lightgrey";
    ctx_tracer.fillRect(0,0,cvs_tracer.width,cvs_tracer.height);
    ctx_tracer.globalAlpha=1;
    ctx_tracer.fillStyle = "#DD0000";

    // Report how long this took
    var thisFrameTime = (thisLoop=new Date) - lastLoop;
    frameTime+= (thisFrameTime - frameTime) / filterStrength;
    lastLoop = thisLoop;
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
  // Triple Pendulum object logic and drawing function.
  // ------------------------------------------------------------
  
  function TriplePendulum(ang1, vang1, ang2, vang2, ang3, vang3, ang4, vang4, x, y, L1, L2, L3, L4, M1, M2, M3, M4)
  {
    ang1 = ang1/180*Math.PI;
    ang2 = ang2/180*Math.PI;
    ang3 = ang3/180*Math.PI;
    ang4 = ang4/180*Math.PI;
    this.Z = [ang1, vang1, ang2, vang2, ang3, vang3, ang4, vang4];
    this.x = x;
    this.y = y;
    this.L1 = L1;
    this.L2 = L2;
    this.L3 = L3;
    this.L4 = L4;
    this.M1 = M1;
    this.M2 = M2;
    this.M3 = M3;
    this.M4 = M4;
  }

  TriplePendulum.prototype.diff = function(Z)
  {
    ang1 = Z[0];
    vang1 = Z[1];
    ang2 = Z[2];
    vang2 = Z[3];
    ang3 = Z[4];
    vang3 = Z[5];
    ang4 = Z[6];
    vang4 = Z[7];
    M1 = TP.M1;
    M2 = TP.M2;
    M3 = TP.M3;
    M4 = TP.M4;
    L1 = TP.L1;
    L2 = TP.L2;
    L3 = TP.L3;
    L4 = TP.L4;
  
    // Optimized code using subexpression finding in Mathematica:
    // Experimental`OptimizeExpression[{e1,e2},OptimizationLevel -> 2]

    var b1 = 1/L1;
    var b2 = 2*M1;
    var b3 = b2+M2;
    var b4 = M2*b3;
    var b5 = M1+M2;
    var b6 = b5*M3;
    var b7 = M2+M3;
    var b8 = ang1;
    var b9 = ang2;
    var b10 = -b9;
    var b11 = b8+b10;
    var b12 = 2*b11;
    var b13 = Math.cos(b12);
    var b14 = -M2*b7*b13;
    var b15 = ang3;
    var b16 = -b15;
    var b18 = b9+b16;
    var b19 = 2*b18;
    var b20 = Math.cos(b19);
    var b21 = -M1*M3*b20;
    var b22 = b4+b6+b14+b21;
    var b23 = 1/b22;
    var b37 = vang1;
    var b38 = Math.pow(b37,2);
    var b40 = vang2;
    var b42 = Math.pow(b40,2);
    var b47 = vang3;
    var b48 = Math.pow(b47,2);
    var b54 = 1/L2;
    var b25 = 2*M2;
    var b35 = Math.sin(b11);
    var b56 = 2*M2*b5;
    var b57 = M1+b25;
    var b58 = b57*M3;
    var b59 = b56+b58;
    var b60 = b59*b35;
    var b61 = -2*b15;
    var b62 = b8+b9+b61;
    var b63 = Math.sin(b62);
    var b64 = -M1*M3*b63;
    var b65 = b60+b64;
    var b83 = 1/L3;
    var b77 = Math.sin(b18);
    var b36 = Math.cos(b11);
    var b55 = Math.cos(b8);
    var b43 = L2*b42;
    var b46 = Math.cos(b18);
    var b49 = L3*M3*b46*b48;

    ang1_accel = firstAcceleration(ang1, ang2, ang3, vang1, vang2, vang3, M1, M2, M3, L1, L2, L3);

    ang2_accel = middleAcceleration(ang1, ang2, ang3, vang1, vang2, vang3, M1, M2, M3, L1, L2, L3);

    ang3_accel = middleAcceleration(ang2, ang3, ang4, vang2, vang3, vang4, M2, M3, M4, L2, L3, L4);

    ang4_accel = lastAcceleration(ang2, ang3, ang4, vang2, vang3, vang4, M2, M3, M4, L2, L3, L4);

    return [vang1, ang1_accel, vang2, ang2_accel, vang3, ang3_accel, vang4, ang4_accel];
  };

  function firstAcceleration(ang1, ang2, ang3, vang1, vang2, vang3, M1, M2, M3, L1, L2, L3)
  {
    var b1 = 1/L1;
    var b2 = 2*M1;
    var b3 = b2+M2;
    var b4 = M2*b3;
    var b5 = M1+M2;
    var b6 = b5*M3;
    var b7 = M2+M3;
    var b8 = ang1;
    var b9 = ang2;
    var b10 = -b9;
    var b11 = b8+b10;
    var b12 = 2*b11;
    var b13 = Math.cos(b12);
    var b14 = -M2*b7*b13;
    var b15 = ang3;
    var b16 = -b15;
    var b18 = b9+b16;
    var b19 = 2*b18;
    var b20 = Math.cos(b19);
    var b21 = -M1*M3*b20;
    var b22 = b4+b6+b14+b21;
    var b23 = 1/b22;
    var b37 = vang1;
    var b38 = Math.pow(b37,2);
    var b40 = vang2;
    var b42 = Math.pow(b40,2);
    var b47 = vang3;
    var b48 = Math.pow(b47,2);
    var b54 = 1/L2;
    var b25 = 2*M2;
    var b35 = Math.sin(b11);
    var b56 = 2*M2*b5;
    var b57 = M1+b25;
    var b58 = b57*M3;
    var b59 = b56+b58;
    var b60 = b59*b35;
    var b61 = -2*b15;
    var b62 = b8+b9+b61;
    var b63 = Math.sin(b62);
    var b64 = -M1*M3*b63;
    var b65 = b60+b64;
    var b83 = 1/L3;
    var b77 = Math.sin(b18);
    var b36 = Math.cos(b11);
    var b55 = Math.cos(b8);
    var b43 = L2*b42;
    var b46 = Math.cos(b18);
    var b49 = L3*M3*b46*b48;

    return -b1*b23*(g*(M2*b7+M1*(b25+M3)+b21)*Math.sin(b8)+g*M2*b7*Math.sin(b8-2*b9)+2*M2*b35*(b7*(L1*b36*b38+b43)+b49));
  }

  function middleAcceleration(ang1, ang2, ang3, vang1, vang2, vang3, M1, M2, M3, L1, L2, L3)
  {
    var b1 = 1/L1;
    var b2 = 2*M1;
    var b3 = b2+M2;
    var b4 = M2*b3;
    var b5 = M1+M2;
    var b6 = b5*M3;
    var b7 = M2+M3;
    var b8 = ang1;
    var b9 = ang2;
    var b10 = -b9;
    var b11 = b8+b10;
    var b12 = 2*b11;
    var b13 = Math.cos(b12);
    var b14 = -M2*b7*b13;
    var b15 = ang3;
    var b16 = -b15;
    var b18 = b9+b16;
    var b19 = 2*b18;
    var b20 = Math.cos(b19);
    var b21 = -M1*M3*b20;
    var b22 = b4+b6+b14+b21;
    var b23 = 1/b22;
    var b37 = vang1;
    var b38 = Math.pow(b37,2);
    var b40 = vang2;
    var b42 = Math.pow(b40,2);
    var b47 = vang3;
    var b48 = Math.pow(b47,2);
    var b54 = 1/L2;
    var b25 = 2*M2;
    var b35 = Math.sin(b11);
    var b56 = 2*M2*b5;
    var b57 = M1+b25;
    var b58 = b57*M3;
    var b59 = b56+b58;
    var b60 = b59*b35;
    var b61 = -2*b15;
    var b62 = b8+b9+b61;
    var b63 = Math.sin(b62);
    var b64 = -M1*M3*b63;
    var b65 = b60+b64;
    var b83 = 1/L3;
    var b77 = Math.sin(b18);
    var b36 = Math.cos(b11);
    var b55 = Math.cos(b8);
    var b43 = L2*b42;
    var b46 = Math.cos(b18);
    var b49 = L3*M3*b46*b48;

    return b54*b23*(g*b55*b65+L1*b65*b38+L2*(M2*b7*Math.sin(b12)-M1*M3*Math.sin(b19))*b42+2*L3*M3*(M2*Math.cos(b8+b16)*b35-M1*b77)*b48);
  }

  function lastAcceleration(ang1, ang2, ang3, vang1, vang2, vang3, M1, M2, M3, L1, L2, L3)
  {
    var b1 = 1/L1;
    var b2 = 2*M1;
    var b3 = b2+M2;
    var b4 = M2*b3;
    var b5 = M1+M2;
    var b6 = b5*M3;
    var b7 = M2+M3;
    var b8 = ang1;
    var b9 = ang2;
    var b10 = -b9;
    var b11 = b8+b10;
    var b12 = 2*b11;
    var b13 = Math.cos(b12);
    var b14 = -M2*b7*b13;
    var b15 = ang3;
    var b16 = -b15;
    var b18 = b9+b16;
    var b19 = 2*b18;
    var b20 = Math.cos(b19);
    var b21 = -M1*M3*b20;
    var b22 = b4+b6+b14+b21;
    var b23 = 1/b22;
    var b37 = vang1;
    var b38 = Math.pow(b37,2);
    var b40 = vang2;
    var b42 = Math.pow(b40,2);
    var b47 = vang3;
    var b48 = Math.pow(b47,2);
    var b54 = 1/L2;
    var b25 = 2*M2;
    var b35 = Math.sin(b11);
    var b56 = 2*M2*b5;
    var b57 = M1+b25;
    var b58 = b57*M3;
    var b59 = b56+b58;
    var b60 = b59*b35;
    var b61 = -2*b15;
    var b62 = b8+b9+b61;
    var b63 = Math.sin(b62);
    var b64 = -M1*M3*b63;
    var b65 = b60+b64;
    var b83 = 1/L3;
    var b77 = Math.sin(b18);
    var b36 = Math.cos(b11);
    var b55 = Math.cos(b8);
    var b43 = L2*b42;
    var b46 = Math.cos(b18);
    var b49 = L3*M3*b46*b48;

    return 2*b83*M1*b23*b77*(b7*(b36*(g*b55+L1*b38)+b43)+b49);
  }

  TriplePendulum.prototype.draw = function()
  {
    var x = this.x;
    var y = this.y;
    
    var ang1 = this.Z[0];
    var vang1 = this.Z[1];
    var ang2 = this.Z[2];
    var vang2 = this.Z[3];
    var ang3 = this.Z[4];
    var vang3 = this.Z[5];
    var ang4 = this.Z[6];
    var vang4 = this.Z[7];
    var M1 = TP.M1;
    var M2 = TP.M2;
    var M3 = TP.M3;
    var M4 = TP.M4;
    var L1 = TP.L1;
    var L2 = TP.L2;
    var L3 = TP.L3;
    var L4 = TP.L4;
    
    var pivotx_draw = x*10+cvs.width/2;
    var pivoty_draw = -y*10+cvs.height/2;
    var length1 = this.L1;
    var length2 = this.L2;
    var length3 = this.L3;
    var length4 = this.L4;
    
    // Drawing stuff:

    var joint1x = x + Math.sin(ang1)*length1;
    var joint1y = y - Math.cos(ang1)*length1;
    
    var joint1x_draw = joint1x*10+cvs.width/2;
    var joint1y_draw = -joint1y*10+cvs.width/2;

    var joint2x = joint1x + Math.sin(ang2)*length2;
    var joint2y = joint1y - Math.cos(ang2)*length2;
    
    var joint2x_draw = joint2x*10+cvs.width/2;
    var joint2y_draw = -joint2y*10+cvs.width/2;

    var joint3x = joint2x + Math.sin(ang3)*length3;
    var joint3y = joint2y - Math.cos(ang3)*length3;
    
    var joint3x_draw = joint3x*10+cvs.width/2;
    var joint3y_draw = -joint3y*10+cvs.width/2;

    var joint4x = joint3x + Math.sin(ang4)*length4;
    var joint4y = joint3y - Math.cos(ang4)*length4;
    
    var joint4x_draw = joint4x*10+cvs.width/2;
    var joint4y_draw = -joint4y*10+cvs.width/2;

    if (connections)
    {
      // Center pivot dot
      ctx.beginPath();
      ctx.arc(pivotx_draw, pivoty_draw, 5, 0, Math.PI*2, true);
      ctx.fill();
      
      // Joint 1 dot
      ctx.beginPath();
      ctx.arc(joint1x_draw, joint1y_draw, 4, 0, Math.PI*2, true);
      ctx.fill();

      // Joint 2 dot
      ctx.beginPath();
      ctx.arc(joint2x_draw, joint2y_draw, 4, 0, Math.PI*2, true);
      ctx.fill();

      // Joint 3 dot
      ctx.beginPath();
      ctx.arc(joint3x_draw, joint3y_draw, 4, 0, Math.PI*2, true);
      ctx.fill();

      // Line connectors
      ctx.beginPath();
      
      ctx.moveTo(pivotx_draw, pivoty_draw);
      ctx.lineTo(joint1x_draw, joint1y_draw);
      ctx.lineTo(joint2x_draw, joint2y_draw);
      ctx.lineTo(joint3x_draw, joint3y_draw);
      ctx.lineTo(joint4x_draw, joint4y_draw);
      
      ctx.stroke(); 
    }
    
    // End dot
    ctx.beginPath();
    ctx.arc(joint4x_draw, joint4y_draw, 4, 0, Math.PI*2, true);
    ctx.fill();

    if (cherrytracer)
    {
      ctx_tracer.beginPath();
      ctx_tracer.arc(joint4x_draw, joint4y_draw, 4, 0, Math.PI*2, true);
      ctx_tracer.fill();
    }

    if (circlebounds)
    {
      // Inner circle
      ctx.beginPath();
      ctx.arc(pivotx_draw, pivoty_draw, 10*length1, 0, Math.PI*2, true);
      ctx.stroke();

      // Middle circle
      ctx.beginPath();
      ctx.arc(pivotx_draw, pivoty_draw, 10*(length1+length2), 0, Math.PI*2, true);
      ctx.stroke();

      // Outer circle
      ctx.beginPath();
      ctx.arc(pivotx_draw, pivoty_draw, 10*(length1+length2+length3), 0, Math.PI*2, true);
      ctx.stroke();
    }
    
    var b24 = Math.pow(L1,2);
    var b27 = vang1;
    var b28 = Math.pow(b27,2);
    var b30 = Math.pow(L2,2);
    var b32 = vang2;
    var b33 = Math.pow(b32,2);
    var b66 = Math.pow(L3,2);
    var b52 = vang3;
    var b67 = Math.pow(b52,2);
    var b31 = M2+M3;
    var b39 = ang2;
    var b69 = ang1;
    var b44 = ang3;
    var b45 = -b44;
    var b26 = M1+M2+M3;

    var KE = 1/2*(b24*b26*b28+b30*b31*b33+2*L2*L3*M3*Math.cos(b39+b45)*b32*b52+b66*M3*b67+2*L1*b27*(L2*b31*Math.cos(b69-b39)*b32+L3*M3*Math.cos(b69+b45)*b52));
    var PE = g*(L2*M2+(L2+L3)*M3+L1*b26-L1*b26*Math.cos(b69)-L2*b31*Math.cos(b39)-L3*M3*Math.cos(b44));

    ctx.fillText("Kinetic Energy: " + (KE), 5, 15);
    
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