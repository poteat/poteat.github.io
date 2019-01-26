var fps = 60;

var cvs = document.getElementById("canvas");
var ctx = cvs.getContext("2d");

var Mouse = new Mouse();

var QBCurve = new QuadraticBezier(100, 300, 250, 100, 400, 300);

clearInterval(mainloop);
var mainloop = setInterval("main();", 1000 / fps);

function main() {
  ctx.clearRect(0, 0, cvs.width, cvs.height);

  QBCurve.draw();
}

function QuadraticBezier(x1, y1, x2, y2, x3, y3) {
  this.controlPoint = [];
  this.numOfcontrolPoint = 0;

  this.controlPoint[0] = new Point(x1, y1);
  this.controlPoint[1] = new Point(x2, y2);
  this.controlPoint[2] = new Point(x3, y3);
  this.numOfcontrolPoint = 3;

  this.samples = 100;
  this.arcLength = new Array(this.samples);
}

QuadraticBezier.prototype.draw = function() {
  for (var i = 0; i < this.numOfcontrolPoint; i++) {
    this.controlPoint[i].draw();
  }

  ctx.beginPath();
  ctx.moveTo(this.controlPoint[0].x, this.controlPoint[0].y);

  var p = new Point(this.controlPoint[0].x, this.controlPoint[0].y);
  var p_old = new Point(0, 0);
  var totalLength = 0;

  for (var i = 1; i <= this.samples; i++) {
    p_old.x = p.x;
    p_old.y = p.y;

    this.calc(i / this.samples, p);

    totalLength += p.dist(p_old.x, p_old.y);
    this.arcLength[i] = totalLength;

    ctx.lineTo(p.x, p.y);
  }

  ctx.stroke();

  var n = 7; // # of t parameter ticks

  for (var i = 1; i <= n; i++) {
    this.drawTick(i / (n + 1), 5, p);
  }

  var P = new Point(40, 40);
  var P_old = P;

  ctx.fillText("Arc Length: " + this.arcLength[100], 20, 20);
};

QuadraticBezier.prototype.calc = function(t, p) {
  p.x =
    Math.pow(1 - t, 2) * this.controlPoint[0].x +
    2 * t * (1 - t) * this.controlPoint[1].x +
    Math.pow(t, 2) * this.controlPoint[2].x;
  p.y =
    Math.pow(1 - t, 2) * this.controlPoint[0].y +
    2 * t * (1 - t) * this.controlPoint[1].y +
    Math.pow(t, 2) * this.controlPoint[2].y;
};

QuadraticBezier.prototype.drawTick = function(t, l, p) {
  this.calc(t, p);

  var A = this.controlPoint[0].x;
  var B = this.controlPoint[0].y;
  var C = this.controlPoint[1].x;
  var D = this.controlPoint[1].y;
  var E = this.controlPoint[2].x;
  var F = this.controlPoint[2].y;
  var S = t;

  var x =
    p.x -
    (-l /
      (2 *
        Math.sqrt(
          Math.pow(-A + C + t * (A - 2 * C + E), 2) +
            Math.pow(-B + D + t * (B - 2 * D + F), 2)
        ))) *
      (t * (2 * B - 4 * D + 2 * F) + (2 * D - 2 * B));
  var y =
    p.y +
    (-l /
      (2 *
        Math.sqrt(
          Math.pow(-A + C + t * (A - 2 * C + E), 2) +
            Math.pow(-B + D + t * (B - 2 * D + F), 2)
        ))) *
      (t * (2 * A - 4 * C + 2 * E) + (2 * C - 2 * A));

  var x2 =
    p.x -
    (l /
      (2 *
        Math.sqrt(
          Math.pow(-A + C + t * (A - 2 * C + E), 2) +
            Math.pow(-B + D + t * (B - 2 * D + F), 2)
        ))) *
      (t * (2 * B - 4 * D + 2 * F) + (2 * D - 2 * B));
  var y2 =
    p.y +
    (l /
      (2 *
        Math.sqrt(
          Math.pow(-A + C + t * (A - 2 * C + E), 2) +
            Math.pow(-B + D + t * (B - 2 * D + F), 2)
        ))) *
      (t * (2 * A - 4 * C + 2 * E) + (2 * C - 2 * A));

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

QuadraticBezier.prototype.closest = function(x, y) {
  var closestID = 0;
  closestDistance = 99999;

  currentDistance = 0;

  for (var i = 0; i < this.numOfcontrolPoint; i++) {
    currentDistance = this.controlPoint[i].dist(x, y);
    if (currentDistance < closestDistance) {
      closestID = i;
      closestDistance = currentDistance;
    }
  }

  return closestID;
};

function Point(x, y) {
  this.x = x;
  this.y = y;
}

Point.prototype.draw = function() {
  ctx.beginPath();
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
      QBCurve.controlPoint[Mouse.objHeld].moveTo(Mouse.x, Mouse.y);
    }
  },
  false
);

cvs.addEventListener(
  "mousedown",
  function(evt) {
    var cID = QBCurve.closest(Mouse.x, Mouse.y);

    if (QBCurve.controlPoint[cID].dist(Mouse.x, Mouse.y) < 20) {
      Mouse.holding = true;
      Mouse.objHeld = cID;
    }

    if (Mouse.holding) {
      QBCurve.controlPoint[cID].moveTo(Mouse.x, Mouse.y);
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
