const cvs = document.getElementById("canvas");
const ctx = cvs.getContext("2d");

let F = {
  model: (Z, t) => {
    let p = P.closest(I.points, { x: Z[0], y: Z[1] });
    let ang = B.angle(p.t);
    return [
      Math.cos(ang) * Math.sqrt(Math.abs(1 - Z[1])),
      Math.sin(ang) * Math.sqrt(Math.abs(1 - Z[1]))
    ];
  },

  addWeightedZ: function() {
    let Z = [];

    for (let i = 0; i < arguments[1].length; i++) {
      Z[i] = 0;
    }

    for (i = 0; i < arguments.length; i += 2) {
      let m = arguments[i];
      let k = arguments[i + 1];
      for (let j = 0; j < arguments[1].length; j++) {
        Z[j] += m * k[j];
      }
    }

    return Z;
  },

  step: (Z, h) => {
    let k1 = F.model(Z);
    let k2 = F.model(F.addWeightedZ(1, Z, h / 2, k1));
    let k3 = F.model(F.addWeightedZ(1, Z, h / 2, k2));
    let k4 = F.model(F.addWeightedZ(1, Z, h, k3));

    return F.addWeightedZ(1, Z, h / 6, k1, h / 3, k2, h / 3, k3, h / 6, k4);
  },

  evaluate: h => {
    let Z = [0, 0.98];
    let t = 0;
    let end = { x: 1, y: 0 };
    do {
      Z = F.step(Z, h);
      t += h;
    } while (P.d({ x: Z[0], y: Z[1] }, end) > 0.05 && t < 20);

    return { t: t, Z: Z };
  }
};

let B = {
  controlPoints: [],

  binomial: (n, k) => {
    let x = 1;
    for (let i = 1; i <= k; i++) {
      x *= (n + 1 - i) / i;
    }
    return x;
  },

  calc: t => {
    let n = B.controlPoints.length - 1;
    let x = 0,
      y = 0;
    for (let i = 0; i <= n; i++) {
      delta = B.binomial(n, i) * (1 - t) ** (n - i) * t ** i;
      x += delta * B.controlPoints[i].x;
      y += delta * B.controlPoints[i].y;
    }
    return { x: x, y: y };
  },

  elevate: () => {
    if (B.controlPoints.length >= 2) {
      lerp = (a, b, t) => {
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      };

      let newControl = [B.controlPoints[0]];
      let n = B.controlPoints.length;

      for (let i = 1; i < n; i++) {
        let t = (n - i) / n;
        let p = lerp(B.controlPoints[i - 1], B.controlPoints[i], t);
        newControl.push(p);
      }

      newControl.push(B.controlPoints[B.controlPoints.length - 1]);

      B.controlPoints = newControl;
    }
  },

  angle: t => {
    let a = B.calc(t);
    let b = B.calc(t + 0.00001);

    return Math.atan2(b.y - a.y, b.x - a.x);
  },

  toDegree: x => {
    return (x * 180) / Math.PI;
  }
};

let P = {
  d: (a, b) => {
    return ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) ** 0.5;
  },

  copy: (a, b) => {
    a.x = b.x;
    a.y = b.y;
  },

  draw: p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI);
    ctx.fill();
    g = I.toGrid(p);
    ctx.fillText(
      "(" + +g.x.toFixed(3) + ", " + +g.y.toFixed(3) + ")",
      p.x + 10 * (g.x < 0.5 ? 1 : -7),
      p.y + 10 * (g.y < 0.5 ? 2 : -1)
    );
  },

  closest: (set, p) => {
    return _.minBy(set, a => {
      return P.d(a, p);
    });
  }
};

let M = {
  held: undefined,
  x: undefined,
  y: undefined,

  pos: evt => {
    const rect = cvs.getBoundingClientRect();
    M.x = evt.clientX - rect.left;
    M.y = evt.clientY - rect.top;
    return { x: M.x, y: M.y };
  },

  draw: () => {
    if (M.x != undefined && M.y != undefined) {
      let m = { x: M.x, y: M.y };
      let mg = I.toGrid(m);

      let pg = P.closest(I.points, mg);
      let p = I.toCanvas(pg);

      if (P.d(m, p) < 100) {
        ctx.strokeStyle = "grey";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
        ctx.strokeStyle = "black";

        ctx.fillText(
          "" +
            Math.round(pg.t * 100) +
            "%, " +
            Math.round(B.toDegree(B.angle(pg.t))) +
            "°",
          m.x + 3,
          m.y - 3
        );
      }
    }
  }
};

let I = {
  margin: 50,
  points: [],
  numPoints: 200,

  toCanvas: p => {
    return {
      x: p.x * (cvs.width - 2 * I.margin) + I.margin,
      y: -p.y * (cvs.height - 2 * I.margin) + cvs.height - I.margin
    };
  },

  toGrid: p => {
    return {
      x: (p.x - I.margin) / (cvs.width - 2 * I.margin),
      y: -(p.y - cvs.height + I.margin) / (cvs.height - 2 * I.margin)
    };
  },

  generateInterpolatedPath: () => {
    I.points = [];

    if (B.controlPoints.length < 2) {
      B.controlPoints = P;
    }

    for (let i = 0; i < I.numPoints; i++) {
      let t = i / I.numPoints;
      let p = B.calc(t);
      p.t = t;
      I.points.push(p);
    }
  },

  drawPath: _points => {
    ctx.beginPath();
    if (_points.length) {
      ctx.beginPath();
      let p_prev = undefined;
      for (p of _points) {
        g = I.toCanvas(p);
        if (p_prev) {
          ctx.lineTo(g.x, g.y);
        } else {
          ctx.moveTo(g.x, g.y);
        }
        p_prev = p;
      }
      ctx.stroke();
    }
  },

  draw: () => {
    ctx.strokeStyle = "grey";
    I.drawPath(B.controlPoints);
    ctx.strokeStyle = "black";

    I.drawPath(I.points);

    for (let p of B.controlPoints) {
      P.draw(I.toCanvas(p));
    }
  }
};

B.controlPoints = [{ x: 0, y: 1 }, { x: 0.2, y: 0.2 }, { x: 1, y: 0 }];

setInterval(() => {
  ctx.clearRect(0, 0, cvs.width, cvs.height);

  ctx.beginPath();
  ctx.moveTo(I.margin, I.margin);
  ctx.lineTo(I.margin, cvs.height - I.margin);
  ctx.lineTo(cvs.width - I.margin, cvs.height - I.margin);
  ctx.stroke();

  I.generateInterpolatedPath();
  I.draw();

  M.draw();

  let foo = F.evaluate(0.01);
  console.log("t: " + foo.t + "   Z: " + foo.Z);
}, 1000 / 60);

cvs.addEventListener("mousedown", evt => {
  let m = I.toGrid(M.pos(evt));

  let c = P.closest(B.controlPoints, m);

  if (P.d(c, m) <= 0.03) {
    M.held = c;
  }
});

cvs.addEventListener("dblclick", evt => {
  B.elevate();
});

cvs.addEventListener("mousemove", evt => {
  M.pos(evt);
  if (M.held) {
    P.copy(M.held, I.toGrid(M.pos(evt)));
  }
});

cvs.addEventListener("mouseup", evt => {
  M.held = undefined;
});

cvs.addEventListener("mouseout", evt => {
  M.x = undefined;
  M.y = undefined;
});
