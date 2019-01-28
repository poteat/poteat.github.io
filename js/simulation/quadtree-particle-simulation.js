let cvs = document.getElementById("canvas");
let ctx = cvs.getContext("2d");
let fps = 60;
let particles = [];
let quad = [];
let QX = 10;
let QY = 10;

let U = (min, max) => {
  return Math.random() * (max - min) + min;
};

let nearby = (p, f) => {
  let sx = [p.xi - 1, p.xi, p.xi + 1];
  let sy = [p.yi - 1, p.yi, p.yi + 1];
  for (let i in sx) {
    let s = sx[i];
    sx[i] = s < 0 ? s + QX : s % QX;
  }
  for (let i in sy) {
    let s = sy[i];
    sy[i] = s < 0 ? s + QY : s % QY;
  }

  for (let xi of sx) {
    for (let yi of sy) {
      for (let po of quad[xi][yi]) {
        let dx = p[0] - po[0];
        let dy = p[1] - po[1];

        dx = dx > cvs.width / 2 ? dx - cvs.width : dx;
        dx = dx < -cvs.width / 2 ? dx + cvs.width : dx;

        dy = dy > cvs.height / 2 ? dy - cvs.height : dy;
        dy = dy < -cvs.height / 2 ? dy + cvs.height : dy;

        f(po, dx, dy);
      }
    }
  }
};

let model = particles => {
  let forces = [];
  let mul = 0.001;
  let drag = 0.1;
  let noise = 9;
  for (let p of particles) {
    let v = [];
    v[0] = p[2];
    v[1] = p[3];

    let ax = 0;
    let ay = 0;

    nearby(p, (po, dx, dy) => {
      ax += dx * mul;
      ay += dy * mul;
    });

    v[2] = ax - p[2] * drag + U(-1, 1) * noise;
    v[3] = ay - p[3] * drag + U(-1, 1) * noise;

    forces.push(v);
  }
  return forces;
};

let euler = particles => {
  let h = 0.1;
  let forces = model(particles);
  for (let i in particles) {
    let p = particles[i];
    let f = forces[i];

    for (let j in p) {
      p[j] += h * f[j];
    }
  }
  return particles;
};

let init = (n, particles) => {
  particles = [];
  for (let i = 0; i < n; i++) {
    let p = [];
    p[0] = U(0, cvs.width);
    p[1] = U(0, cvs.height);
    p[2] = U(-2, 2);
    p[3] = U(-2, 2);
    particles.push(p);
  }
  return particles;
};

let fix = particles => {
  for (let p of particles) {
    p[0] %= cvs.width;
    p[1] %= cvs.height;
    p[0] = p[0] < 0 ? p[0] + cvs.width : p[0];
    p[1] = p[1] < 0 ? p[1] + cvs.height : p[1];
  }
  return particles;
};

let sort = particles => {
  quad = [];
  for (let i = 0; i < QX; i++) {
    quad[i] = [];
    for (let j = 0; j < QY; j++) {
      quad[i][j] = [];
    }
  }

  for (let p of particles) {
    p.xi = Math.floor(p[0] / (cvs.width / QX));
    p.yi = Math.floor(p[1] / (cvs.height / QY));
    quad[p.xi][p.yi].push(p);
  }
  return particles;
};

let draw = particles => {
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillRect(0, 0, cvs.width, cvs.height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
  ctx.strokeWidth = 1;
  for (let p of particles) {
    ctx.beginPath();
    ctx.arc(Math.round(p[0]), Math.round(p[1]), 1, 0, 2 * Math.PI);
    ctx.fill();

    nearby(p, (po, dx, dy) => {
      if (dx * dx + dy * dy < 100) {
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(p[0] - dx, p[1] - dy);
        ctx.stroke();
      }
    });
  }
};

ctx.fillStyle = "rgba(247, 247, 247, 1)";
ctx.fillRect(0, 0, cvs.width, cvs.height);

particles = init(1000, particles);
setInterval(() => {
  particles = fix(particles);
  particles = sort(particles);
  draw(particles);
  particles = euler(particles);
}, 1000 / fps);
