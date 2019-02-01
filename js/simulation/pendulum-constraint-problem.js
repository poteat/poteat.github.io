let cvs = document.getElementById("canvas");
let ctx = cvs.getContext("2d");
let fps = 60;
let particles = [];
let origin = [canvas.width / 2, canvas.height / 2];
let L;

let U = (min, max) => {
  return Math.random() * (max - min) + min;
};

let vzero = () => {
  return [0, 0];
};

let vadd = (a, ...vec) => {
  let sum = a;
  for (v of vec) {
    a[0] += v[0];
    a[1] += v[1];
  }
  return sum;
};

let vsub = (a, b) => {
  return [a[0] - b[0], a[1] - b[1]];
};

let vneg = a => {
  return [-a[0], -a[1]];
};

let vmul = (a, b) => {
  return [a * b[0], a * b[1]];
};

let vdot = (a, b) => {
  return a[0] * b[0] + a[1] * b[1];
};

let vmag = a => {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
};

let vsqmag = a => {
  return a[0] * a[0] + a[1] * a[1];
};

let vnorm = a => {
  let len = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
  return [a[0] / len, a[1] / len];
};

let vang = a => {
  return Math.atan2(a[1], a[0]);
};

let vproj = (a, b) => {
  let bnorm = vnorm(b);
  return vmul(vdot(a, bnorm), bnorm);
};

let vrejt = (a, b) => {
  return vsub(a, vproj(a, b));
};

let model = particles => {
  let forces = [];
  let end = particles.length - 1;

  for (let i = 0; i <= end; i++) {
    let p = particles[i];
    let po = particles[i - 1];
    let pn = particles[i + 1];

    let pv = [p[2], p[3]];
    let pov = i != 0 ? [po[2], po[3]] : vzero();
    let d = vsub(i != 0 ? po : origin, p);

    // Centripetal force required to keep us orbiting our parent
    let relvel = i != 0 ? vrejt(vsub(pov, pv), d) : pv;
    p.ct = vmul(vsqmag(relvel) / vmag(d), vnorm(d));

    // We must propogate our centripetal force downwards
    p.ctdown = i != end ? vneg(vproj(p.ct, vsub(p, pn))) : vzero();

    // Apply counterforce to parent's centripetal force
    p.ctup = i != 0 ? vneg(po.ctdown) : vzero();
  }

  for (let i = 0; i <= end; i++) {
    let p = particles[i];
    let po = particles[i - 1];
    let pn = particles[i + 1];

    let pv = [p[2], p[3]];
    let pov = i != 0 ? [po[2], po[3]] : vzero();
    let d = vsub(i != 0 ? po : origin, p);

    // Apply counterforce from child to parent
    p.ctfix = i != end ? vneg(pn.ct) : vzero();

    p.a = vmul(1 / p.m, vadd(p.ct));

    forces.push([p[2], p[3], p.a[0], p.a[1]]);
  }

  return forces;
};

/*
let model = particles => {
  let forces = [];
  let mul = 1;
  let g = [0, 10];
  let end = particles.length - 1;
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    let po = particles[i - 1];
    let pn = particles[i + 1];
    let v = [];

    v[0] = p[2];
    v[1] = p[3];

    let pv = [p[2], p[3]];
    let pov = i != 0 ? [po[2], po[3]] : vzero();

    let d = vsub(i != 0 ? po : origin, p);
    let sqvel = vsqmag(vsub(pv, pov));
    p.centri = vmul(sqvel / vmag(d), vnorm(d));
    let pnc = i != end ? pn.c : vzero();
    let pncentri = i != end ? pn.centri : vzero();

    let f = vsub(vsub(g, pncentri), pnc);

    p.c = vmul(vdot(g, d), vmul(-1 / vsqmag(d), d));
    p.a = vmul(mul / p.m, vadd(vadd(g, p.c), p.centri));

    v[2] = p.a[0];
    v[3] = p.a[1];

    forces.push(v);
  }
  return forces;
};*/

let euler = particles => {
  let h = 0.001;
  let forces = model(particles);
  for (let i in particles) {
    let p = particles[i];
    let f = forces[i];

    for (let j = 0; j < p.length; j++) {
      p[j] += h * f[j];
    }
  }
  return particles;
};

let init = (n, particles) => {
  let pos = [cvs.width / 2, cvs.height / 2];
  let avgAng = (-45 / 180) * Math.PI;
  let spreadAng = (30 / 180) * Math.PI;
  let velMin = 1;
  let velMax = 5;
  L = (0.8 * cvs.width) / 2 / n;

  particles = [];
  for (let i = 0; i < n; i++) {
    let p = [];

    let r = U(-spreadAng, spreadAng);

    pos = vadd(pos, vmul(L, [Math.cos(r), Math.sin(r)]));
    let vel = vmul(U(velMin, velMax), [-Math.sin(r), Math.cos(r)]);

    if (i != 0) {
      vel = [particles[i - 1][2], particles[i - 1][3]];
    }

    p[0] = pos[0];
    p[1] = pos[1];
    p[2] = vel[0];
    p[3] = vel[1];
    p.m = 1;

    particles.push(p);
  }
  return particles;
};

let fix = particles => {
  for (let i in particles) {
    let p = particles[i];
    let po = particles[i - 1];
    p.angle = vang(vsub(p, i != 0 ? po : origin));
  }

  let pos = [cvs.width / 2, cvs.height / 2];
  for (let i in particles) {
    let p = particles[i];
    pos = vadd(vmul(L, [Math.cos(p.angle), Math.sin(p.angle)]), pos);
    p[0] = pos[0];
    p[1] = pos[1];
  }
  return particles;
};

let draw = particles => {
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillRect(0, 0, cvs.width, cvs.height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
  ctx.strokeWidth = 1;

  ctx.beginPath();
  ctx.arc(cvs.width / 2, cvs.height / 2, 2, 0, 2 * Math.PI);
  ctx.fill();

  let forceDisplayMul = 3;

  for (let p of particles) {
    ctx.beginPath();
    ctx.arc(Math.round(p[0]), Math.round(p[1]), 2, 0, 2 * Math.PI);
    ctx.fill();

    /*
    ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
    ctx.beginPath();
    ctx.moveTo(Math.round(p[0]), Math.round(p[1]));
    fline = vadd(p, vmul(forceDisplayMul, p.a));
    ctx.lineTo(Math.round(fline[0]), Math.round(fline[1]));
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.moveTo(Math.round(p[0]), Math.round(p[1]));
    fline = vadd(p, vmul(forceDisplayMul, p.ct));
    ctx.lineTo(Math.round(fline[0]), Math.round(fline[1]));
    ctx.stroke();*/
  }

  ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
  ctx.beginPath();
  ctx.moveTo(cvs.width / 2, cvs.height / 2);
  for (let p of particles) {
    ctx.lineTo(Math.round(p[0]), Math.round(p[1]));
  }
  ctx.stroke();
};

ctx.fillStyle = "rgba(247, 247, 247, 1)";
ctx.fillRect(0, 0, cvs.width, cvs.height);

particles = init(2, particles);
particles = euler(particles);
console.log(particles);
setInterval(() => {
  //particles = fix(particles);
  draw(particles);
  for (let i = 0; i < 100; i++) particles = euler(particles);
}, 1000 / fps);
