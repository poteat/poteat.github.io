var fps = 60;

var cvs = document.getElementById("canvas");
var ctx = cvs.getContext("2d");

var Mouse = new Mouse();

var LReg;

clearInterval(mainloop);
var mainloop = setInterval("main();", 1000 / fps);

init();

// Initializes the LinearReg curve with 4 points, and a sampling rate
// of 100 lines per draw.
function init() {
  var samplingRate = 100;

  var p1 = new Point(100, 300);
  var p2 = new Point(250, 100);
  var p3 = new Point(400, 300);
  var p4 = new Point(300, 400);
  var p5 = new Point(100, 250);
  var p6 = new Point(50, 50);

  var points = [p1, p2, p3, p4, p5, p6];

  LReg = new LinearReg(points, samplingRate);
}

function main() {
  ctx.clearRect(0, 0, cvs.width, cvs.height);

  LReg.draw();
  //	ctx.fillText("10 choose 5 = " + binom(10, 5), 20, 20);
}

// Fast version of binomial coefficient, or "n choose k"
function binom(n, k) {
  var prod = 1;
  for (i = 1; i <= k; i++) {
    prod *= (n + 1 - i) / i;
  }

  return prod;
}

// The LinearReg object is implemented as a set of points.  It is a 'set' in that the order of the points do not matter.
// The output, graphically, is a perfectly straight line of a certain slope and intersect.
function LinearReg(points, samples) {
  this.controlPoint = points; // 'controlPoint' is an array
  this.avgx = 0;
  this.avgy = 0;
  this.alpha = 0;
  this.beta = 0;

  this.fitPoint = new Array(2);
  this.fitPoint[0] = new Point(0, 0, "blue");
  this.fitPoint[1] = new Point(0, 0, "blue");
}

LinearReg.prototype.draw = function() {
  // Draw each control point
  for (var i = 0; i < this.controlPoint.length; i++) {
    this.controlPoint[i].draw();
  }

  this.updateLineParameters();

  // Draw endpoints of line of best fit
  this.fitPoint[0].draw();
  this.fitPoint[1].draw();

  ctx.beginPath();
  ctx.strokeStyle = "black";
  ctx.moveTo(this.fitPoint[0].x, this.fitPoint[0].y);
  ctx.lineTo(this.fitPoint[1].x, this.fitPoint[1].y);
  ctx.stroke();

  // Draw average center
  var p = new Point(this.avgx, this.avgy, "blue");
  p.draw();

  // Print observed linear regression values
  ctx.fillStyle = "blue";
  ctx.fillText("Alpha (Intersect): " + this.alpha, 10, 10);
  ctx.fillText("Beta (Slope): " + this.beta, 10, 25);
};

// Updates line parameters every time:
// stuff initializes
// a point is moved
// a point is removed
// a point is added
LinearReg.prototype.updateLineParameters = function() {
  // Calculate average point.
  var _avgx = 0;
  var _avgy = 0;

  for (var i = 0; i < this.controlPoint.length; i++) {
    _avgx += this.controlPoint[i].x;
    _avgy += this.controlPoint[i].y;
  }

  this.avgx = _avgx / this.controlPoint.length;
  this.avgy = _avgy / this.controlPoint.length;

  // Calculate slope and intersect of simple linear regression.
  var numerator = 0;
  var denom = 0;

  for (var i = 0; i < this.controlPoint.length; i++) {
    numerator +=
      (this.controlPoint[i].x - this.avgx) *
      (this.controlPoint[i].y - this.avgy);
    denom += Math.pow(this.controlPoint[i].x - this.avgx, 2);
  }

  this.beta = numerator / denom; // Intersect
  this.alpha = this.avgy - this.beta * this.avgx; // Slope

  // Calculate the bounding points for the regression drawline.
  var left_y = this.alpha;
  var right_y = cvs.width * this.beta + this.alpha;
  var top_x = -this.alpha / this.beta;
  var bottom_x = (cvs.width - this.alpha) / this.beta;

  var left = left_y >= 0 && left_y <= cvs.width;
  var right = right_y >= 0 && right_y <= cvs.width;
  var top = top_x >= 0 && top_x <= cvs.width;
  var bottom = bottom_x >= 0 && bottom_x <= cvs.width;

  if (top && right) {
    this.fitPoint[0].x = top_x;
    this.fitPoint[0].y = 0;

    this.fitPoint[1].x = cvs.width;
    this.fitPoint[1].y = right_y;
  } else if (top && bottom) {
    this.fitPoint[0].x = top_x;
    this.fitPoint[0].y = 0;

    this.fitPoint[1].x = bottom_x;
    this.fitPoint[1].y = cvs.height;
  } else if (top && left) {
    this.fitPoint[0].x = top_x;
    this.fitPoint[0].y = 0;

    this.fitPoint[1].x = 0;
    this.fitPoint[1].y = left_y;
  } else if (right && bottom) {
    this.fitPoint[0].x = cvs.width;
    this.fitPoint[0].y = right_y;

    this.fitPoint[1].x = bottom_x;
    this.fitPoint[1].y = cvs.height;
  } else if (right && left) {
    this.fitPoint[0].x = cvs.width;
    this.fitPoint[0].y = right_y;

    this.fitPoint[1].x = 0;
    this.fitPoint[1].y = left_y;
  } else if (bottom && left) {
    this.fitPoint[0].x = bottom_x;
    this.fitPoint[0].y = cvs.height;

    this.fitPoint[1].x = 0;
    this.fitPoint[1].y = left_y;
  }
};

// Used by the mouse interactivity code to find the closest
// control point from any coordinates (mouse coordinates)
LinearReg.prototype.closest = function(x, y) {
  var closestID = 0;
  closestDistance = 99999;

  currentDistance = 0;

  for (var i = 0; i < this.controlPoint.length; i++) {
    currentDistance = this.controlPoint[i].dist(x, y);
    if (currentDistance < closestDistance) {
      closestID = i;
      closestDistance = currentDistance;
    }
  }

  return closestID;
};

// Takes a point index as a parameter, and splices that
// point away (It reindexes the point array).
LinearReg.prototype.removePoint = function(pID) {
  this.controlPoint.splice(pID, 1);
};

// Takes a point as a parameter, and adds that to the
// end of the controlPoint array.
LinearReg.prototype.appendPoint = function(p) {
  this.controlPoint.push(p);
};

function Point(x, y, color = "black") {
  this.x = x;
  this.y = y;
  this.color = color;
}

Point.prototype.draw = function() {
  ctx.beginPath();
  ctx.fillStyle = this.color;
  ctx.arc(this.x, this.y, 5, 0, Math.PI * 2, true);
  ctx.fill();
};

Point.prototype.dist = function(x, y) {
  return Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2));
};

Point.prototype.moveTo = function(x, y) {
  this.x = x;
  this.y = y;
};

function Mouse() {
  this.x = 0;
  this.y = 0;
  this.down = false;
  this.inside = false;
  this.rclick = false;
}

Mouse.draw = function() {
  ctx.beginPath();
  ctx.arc(Mouse.x, Mouse.y, 5, 0, Math.PI * 2, true);
  ctx.fill();
};

Mouse.updatePos = function(evt) {
  var rect = cvs.getBoundingClientRect();
  this.x = evt.clientX - rect.left - 1;
  this.y = evt.clientY - rect.top - 1;
};

cvs.addEventListener(
  "mousemove",
  function(evt) {
    Mouse.updatePos(evt);
    if (Mouse.holding) {
      LReg.controlPoint[Mouse.objHeld].moveTo(Mouse.x, Mouse.y);
    }
  },
  false
);

cvs.addEventListener(
  "mousedown",
  function(evt) {
    var cID = LReg.closest(Mouse.x, Mouse.y);

    if (LReg.controlPoint[cID].dist(Mouse.x, Mouse.y) < 20) {
      Mouse.holding = true;
      Mouse.objHeld = cID;
    }

    if (Mouse.holding) {
      LReg.controlPoint[cID].moveTo(Mouse.x, Mouse.y);
    }
  },
  false
);

cvs.addEventListener(
  "mouseleave",
  function(evt) {
    Mouse.holding = false;
    Mouse.objHeld = null;
  },
  false
);

cvs.addEventListener(
  "mouseup",
  function(evt) {
    Mouse.holding = false;
    Mouse.objHeld = null;
  },
  false
);

cvs.addEventListener(
  "dblclick",
  function(evt) {
    var mx = Mouse.x;
    var my = Mouse.y;

    var cID = LReg.closest(mx, my);

    if (LReg.controlPoint[cID].dist(mx, my) < 20) {
      LReg.removePoint(cID);
    } else {
      var p = new Point(mx, my);
      LReg.appendPoint(p);
    }
  },
  false
);
