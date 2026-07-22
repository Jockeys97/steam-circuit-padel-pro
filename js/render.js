import { COURT } from "./data.js?v=20260720-ball-physics-v1";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function drawGear(ctx, x, y, radius, teeth, color, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i += 1) {
    const angle = (Math.PI * i) / teeth;
    const r = i % 2 === 0 ? radius : radius * 0.72;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fill();
  ctx.restore();
}

function drawSteamPuff(ctx, x, y, size, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(200,220,230,0.5)";
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.arc(x + size * 0.8, y - size * 0.4, size * 0.7, 0, Math.PI * 2);
  ctx.arc(x - size * 0.6, y - size * 0.2, size * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCloud(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.beginPath();
  ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
  ctx.arc(x + 23 * scale, y - 10 * scale, 27 * scale, 0, Math.PI * 2);
  ctx.arc(x + 52 * scale, y, 20 * scale, 0, Math.PI * 2);
  ctx.arc(x + 73 * scale, y + 7 * scale, 14 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTree(ctx, x, y, scale, hue) {
  ctx.save();
  ctx.fillStyle = "#7e4b31";
  ctx.fillRect(x - 6 * scale, y, 12 * scale, 55 * scale);
  ctx.fillStyle = hue;
  [[-18, 3, 24], [10, -9, 28], [30, 12, 22], [-5, -22, 27]].forEach(([dx, dy, r]) => {
    ctx.beginPath();
    ctx.arc(x + dx * scale, y + dy * scale, r * scale, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.arc(x - 9 * scale, y - 9 * scale, 10 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpectators(ctx, x, y, width, rows) {
  const colors = ["#ffcf46", "#ff6d70", "#5ee9ff", "#8de06a", "#ffffff"];
  ctx.save();
  for (let row = 0; row < rows; row += 1) {
    const step = 19 - row * 2;
    for (let px = x + 8 + row * 5; px < x + width - 8; px += step) {
      const bob = Math.sin(px * 0.19 + row) * 2;
      ctx.fillStyle = colors[(Math.floor(px / step) + row * 2) % colors.length];
      ctx.beginPath();
      ctx.arc(px, y + row * 14 + bob, 4.5 - row * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(29,62,92,0.58)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - 4, y + row * 14 + 7 + bob);
      ctx.lineTo(px - 6, y + row * 14 + 13 + bob);
      ctx.moveTo(px + 4, y + row * 14 + 7 + bob);
      ctx.lineTo(px + 7, y + row * 14 + 12 + bob);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFloodlight(ctx, x, y, flip = 1) {
  ctx.save();
  ctx.strokeStyle = "#35536e";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y + 122);
  ctx.lineTo(x + flip * 15, y + 20);
  ctx.stroke();
  ctx.fillStyle = "#233e5c";
  roundedRect(ctx, x + flip * 2 - 18, y, 36, 20, 3);
  ctx.fill();
  ctx.fillStyle = "#fff5b0";
  for (let i = 0; i < 3; i += 1) {
    ctx.fillRect(x + flip * 2 - 13 + i * 9, y + 5, 6, 9);
  }
  ctx.restore();
}

function drawLocomotiveDepotBackdrop(ctx, canvas, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#071526");
  sky.addColorStop(0.46, "#1b4d5d");
  sky.addColorStop(0.47, "#5c5b50");
  sky.addColorStop(1, "#37444d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#172c3d";
  ctx.lineWidth = 12;
  for (let x = -42; x < canvas.width + 48; x += 132) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + 62, 265); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 92, 0); ctx.lineTo(x + 35, 265); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(120,201,218,0.25)";
  ctx.lineWidth = 4;
  for (let y = 34; y < 180; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Locomotiva dietro il vetro: rimane ambientazione, non invade il piano di gioco.
  ctx.fillStyle = "#123f46";
  roundedRect(ctx, 321, 58, 318, 38, 8); ctx.fill();
  ctx.fillStyle = "#1c6870";
  roundedRect(ctx, 407, 27, 108, 44, 6); ctx.fill();
  ctx.fillStyle = "#0e2831";
  roundedRect(ctx, 529, 35, 98, 43, 18); ctx.fill();
  ctx.fillStyle = "#d3a44c";
  roundedRect(ctx, 618, 40, 14, 31, 3); ctx.fill();
  ctx.fillStyle = "#17313b";
  roundedRect(ctx, 387, 8, 24, 62, 4); ctx.fill();
  ctx.fillStyle = "rgba(234,245,245,0.72)";
  roundedRect(ctx, 425, 36, 46, 19, 2); ctx.fill();
  [366, 435, 504, 573].forEach((x) => {
    ctx.fillStyle = "#091820";
    ctx.beginPath(); ctx.arc(x, 96, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c99942"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x, 96, 11, 0, Math.PI * 2); ctx.stroke();
  });
  drawSteamPuff(ctx, 400, 18 + Math.sin(time * 1.5) * 5, 20, 0.35);
  drawSteamPuff(ctx, 425, 7 + Math.sin(time * 1.3) * 7, 15, 0.22);

  ctx.strokeStyle = "#1c2732";
  ctx.lineWidth = 8;
  [-1, 1].forEach((side) => {
    ctx.beginPath(); ctx.moveTo(480 + side * 70, 250); ctx.lineTo(480 + side * 420, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(480 + side * 95, 250); ctx.lineTo(480 + side * 455, canvas.height); ctx.stroke();
  });
  [102, 858].forEach((x) => {
    ctx.fillStyle = "#132638";
    roundedRect(ctx, x - 7, 131, 14, 84, 3); ctx.fill();
    ctx.fillStyle = "#f4bd48";
    ctx.beginPath(); ctx.arc(x, 126, 12, 0, Math.PI * 2); ctx.fill();
  });
}

function drawClockworkFactoryBackdrop(ctx, canvas, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#160f31");
  sky.addColorStop(0.45, "#3b2048");
  sky.addColorStop(0.46, "#7b465b");
  sky.addColorStop(1, "#33214b");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#261d36";
  ctx.lineWidth = 18;
  for (let x = 48; x < canvas.width; x += 148) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 38, 276); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(236,170,67,0.45)";
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(480, 135, 137, Math.PI, 0); ctx.stroke();

  ctx.fillStyle = "#d4a64c";
  ctx.beginPath(); ctx.arc(480, 121, 72, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f5d98b";
  ctx.beginPath(); ctx.arc(480, 121, 58, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#472d39";
  ctx.lineWidth = 4;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
    ctx.beginPath();
    ctx.moveTo(480 + Math.cos(angle) * 48, 121 + Math.sin(angle) * 48);
    ctx.lineTo(480 + Math.cos(angle) * 57, 121 + Math.sin(angle) * 57);
    ctx.stroke();
  }
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(480, 121); ctx.lineTo(480 + Math.cos(time * 0.4) * 38, 121 + Math.sin(time * 0.4) * 38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(480, 121); ctx.lineTo(480 + Math.cos(-time * 0.7) * 22, 121 + Math.sin(-time * 0.7) * 22); ctx.stroke();

  drawGear(ctx, 256, 166, 47, 11, "#c68737", time * 0.25);
  drawGear(ctx, 691, 177, 53, 12, "#c68737", -time * 0.21);
  drawGear(ctx, 150, 250, 36, 10, "#b52b65", -time * 0.31);
  drawGear(ctx, 812, 244, 36, 10, "#b52b65", time * 0.31);
  ctx.strokeStyle = "#d2a24a";
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(480, 193); ctx.lineTo(480, 252); ctx.stroke();
  ctx.fillStyle = "#d2a24a";
  ctx.beginPath(); ctx.arc(480 + Math.sin(time * 1.2) * 14, 267, 18, 0, Math.PI * 2); ctx.fill();
  [[95, 113], [860, 111], [194, 84], [764, 84]].forEach(([x, y]) => {
    ctx.fillStyle = "#ff4b9a";
    roundedRect(ctx, x - 8, y - 16, 16, 32, 4); ctx.fill();
    ctx.fillStyle = "rgba(255,221,246,0.72)";
    roundedRect(ctx, x - 4, y - 11, 8, 20, 2); ctx.fill();
  });
}

export function drawArena(ctx, canvas, arena, time) {
  const { palette } = arena;
  const scene = arena.id ?? "officina";
  if (scene === "locomotive") {
    drawLocomotiveDepotBackdrop(ctx, canvas, time);
  } else if (scene === "clockwork") {
    drawClockworkFactoryBackdrop(ctx, canvas, time);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#51c6f4");
    gradient.addColorStop(0.48, "#c8f1ff");
    gradient.addColorStop(0.49, "#f5a277");
    gradient.addColorStop(1, "#e57958");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawCloud(ctx, 84, 62, 0.94);
    drawCloud(ctx, 382, 37, 0.64);
    drawCloud(ctx, 725, 70, 0.92);
    drawTree(ctx, 70, 174, 1.32, "#72b94d");
    drawTree(ctx, 165, 172, 0.94, "#4f9f56");
    drawTree(ctx, 867, 168, 1.16, "#5aa956");
    drawTree(ctx, 786, 177, 0.87, "#86be51");
    drawFloodlight(ctx, 188, 92, 1);
    drawFloodlight(ctx, 769, 95, -1);
    ctx.fillStyle = "#f8d5a9";
    roundedRect(ctx, 694, 128, 190, 103, 5); ctx.fill();
    ctx.fillStyle = "#d46653";
    ctx.beginPath(); ctx.moveTo(680, 130); ctx.lineTo(785, 91); ctx.lineTo(900, 130); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#77c9e5";
    for (let i = 0; i < 4; i += 1) roundedRect(ctx, 711 + i * 38, 151, 25, 42, 2), ctx.fill();
    ctx.fillStyle = "rgba(15,55,89,0.5)";
    roundedRect(ctx, 626, 194, 135, 56, 3); ctx.fill();
    drawSpectators(ctx, 638, 202, 111, 2);
  }

  const topLeft = { x: 210, y: 100 };
  const topRight = { x: 750, y: 100 };
  const bottomLeft = { x: 48, y: canvas.height - 13 };
  const bottomRight = { x: 912, y: canvas.height - 13 };
  const point = (x, y) => {
    const u = (x - COURT.left) / (COURT.right - COURT.left);
    const v = (y - COURT.top) / (COURT.bottom - COURT.top);
    // Put the net slightly deeper in the shot so the player's half reads as spacious.
    const depth = v <= 0.5 ? v * 0.88 : 0.44 + (v - 0.5) * 1.12;
    const lx = topLeft.x + (bottomLeft.x - topLeft.x) * depth;
    const ly = topLeft.y + (bottomLeft.y - topLeft.y) * depth;
    const rx = topRight.x + (bottomRight.x - topRight.x) * depth;
    const ry = topRight.y + (bottomRight.y - topRight.y) * depth;
    return { x: lx + (rx - lx) * u, y: ly + (ry - ly) * u, scale: 0.58 + depth * 0.62 };
  };
  const polygon = (points, fill, stroke, lineWidth = 1) => {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  };

  // The exterior floor and cage first; the court remains the bright focal plane.
  const exteriorFloor = scene === "locomotive" ? "#4f5552" : scene === "clockwork" ? "#4c344d" : "#e78c68";
  const courtFloor = scene === "locomotive" ? "#1579a8" : scene === "clockwork" ? "#314d9b" : "#138fd7";
  const courtStroke = scene === "clockwork" ? "#181c55" : "#184d79";
  polygon([{ x: 0, y: 282 }, { x: 960, y: 282 }, { x: 960, y: canvas.height }, { x: 0, y: canvas.height }], exteriorFloor);
  polygon([topLeft, topRight, bottomRight, bottomLeft], courtFloor, courtStroke, 8);
  polygon([{ x: 100, y: 123 }, topLeft, bottomLeft, { x: 0, y: 537 }], "rgba(173,235,255,0.35)", "#173f63", 6);
  polygon([topRight, { x: 860, y: 123 }, { x: 960, y: 537 }, bottomRight], "rgba(173,235,255,0.35)", "#173f63", 6);

  // Rear glass wall rises behind the far baseline instead of reading as flat court paint.
  const backWallTopY = 35;
  polygon(
    [{ x: topLeft.x, y: backWallTopY }, { x: topRight.x, y: backWallTopY }, topRight, topLeft],
    "rgba(184,235,250,0.2)",
    "#173f63",
    5,
  );
  ctx.strokeStyle = "rgba(29,76,111,0.86)";
  ctx.lineWidth = 3;
  for (let i = 1; i < 6; i += 1) {
    const x = topLeft.x + ((topRight.x - topLeft.x) * i) / 6;
    ctx.beginPath(); ctx.moveTo(x, backWallTopY); ctx.lineTo(x, topLeft.y); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(225,248,255,0.46)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(topLeft.x, backWallTopY + 31);
  ctx.lineTo(topRight.x, backWallTopY + 31);
  ctx.stroke();
  ctx.strokeStyle = "#244d70";
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(topLeft.x, backWallTopY); ctx.lineTo(topRight.x, backWallTopY); ctx.stroke();

  // Court markings and alternating blue panels.
  const serviceTop = COURT.netY - 126;
  const serviceBottom = COURT.netY + 126;
  polygon([point(COURT.left, serviceTop), point(COURT.right, serviceTop), point(COURT.right, COURT.netY), point(COURT.left, COURT.netY)], "rgba(0,55,145,0.17)");
  polygon([point(COURT.left, COURT.netY), point(COURT.right, COURT.netY), point(COURT.right, serviceBottom), point(COURT.left, serviceBottom)], "rgba(0,55,145,0.12)");
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  [serviceTop, serviceBottom].forEach((y) => { const a = point(COURT.left, y); const b = point(COURT.right, y); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); });
  const midTop = point(COURT.left + (COURT.right - COURT.left) / 2, COURT.top);
  const midBottom = point(COURT.left + (COURT.right - COURT.left) / 2, COURT.bottom);
  ctx.moveTo(midTop.x, midTop.y); ctx.lineTo(midBottom.x, midBottom.y);
  ctx.stroke();

  // Tall transparent walls and lateral mesh: recognisable padel enclosure.
  ctx.strokeStyle = "rgba(20,56,84,0.9)";
  ctx.lineWidth = 3;
  for (let i = 0; i <= 9; i += 1) {
    const x = i / 9;
    const topX = topLeft.x + (topRight.x - topLeft.x) * x;
    const bottomX = bottomLeft.x + (bottomRight.x - bottomLeft.x) * x;
    ctx.beginPath(); ctx.moveTo(topX, topLeft.y); ctx.lineTo(bottomX, bottomLeft.y); ctx.stroke();
  }
  for (let i = 1; i < 5; i += 1) {
    const y = i / 5;
    ctx.beginPath();
    ctx.moveTo(topLeft.x + (bottomLeft.x - topLeft.x) * y, topLeft.y + (bottomLeft.y - topLeft.y) * y);
    ctx.lineTo(topRight.x + (bottomRight.x - topRight.x) * y, topRight.y + (bottomRight.y - topRight.y) * y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(topLeft.x, topLeft.y); ctx.lineTo(topRight.x, topRight.y); ctx.stroke();
  const signLabels = scene === "locomotive"
    ? [[95, 290, 102, 29, "RAIL"], [762, 292, 103, 29, "DEPOT"], [122, 412, 84, 27, "TRACK"], [756, 417, 83, 27, "STEAM"]]
    : scene === "clockwork"
      ? []
      : [[95, 290, 102, 29, "PADEL"], [762, 292, 103, 29, "FLOW"], [122, 412, 84, 27, "PRO"], [756, 417, 83, 27, "PLAY"]];
  ctx.fillStyle = "#16486f";
  signLabels.forEach(([x, y, w, h, label]) => {
    roundedRect(ctx, x, y, w, h, 3); ctx.fill();
    ctx.fillStyle = "#f7e165";
    ctx.font = "800 12px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + 19);
    ctx.fillStyle = "#16486f";
  });

  // A full padel net: dark mesh, white tape and substantial padded posts.
  const netLeft = point(COURT.left, COURT.netY);
  const netRight = point(COURT.right, COURT.netY);
  const netBottomLeft = { x: netLeft.x + 3, y: netLeft.y + 43 };
  const netBottomRight = { x: netRight.x - 3, y: netRight.y + 43 };
  polygon([netLeft, netRight, netBottomRight, netBottomLeft], "rgba(8,38,66,0.68)");
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(netLeft.x, netLeft.y);
  ctx.lineTo(netRight.x, netRight.y);
  ctx.lineTo(netBottomRight.x, netBottomRight.y);
  ctx.lineTo(netBottomLeft.x, netBottomLeft.y);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = "rgba(224,245,255,0.52)";
  ctx.lineWidth = 1.2;
  for (let x = netLeft.x - 10; x < netRight.x + 10; x += 12) {
    ctx.beginPath(); ctx.moveTo(x, netLeft.y - 2); ctx.lineTo(x + 4, netBottomLeft.y + 3); ctx.stroke();
  }
  for (let y = netLeft.y + 10; y < netBottomLeft.y; y += 9) {
    ctx.beginPath(); ctx.moveTo(netLeft.x - 3, y); ctx.lineTo(netRight.x + 3, y); ctx.stroke();
  }
  ctx.restore();
  [netLeft, netRight].forEach((post) => {
    ctx.fillStyle = "#244d70";
    roundedRect(ctx, post.x - 9, post.y - 47, 18, 93, 4); ctx.fill();
    ctx.fillStyle = "#6f9fbc";
    roundedRect(ctx, post.x - 4, post.y - 42, 7, 79, 2); ctx.fill();
  });
  ctx.strokeStyle = "#f7fbff";
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(netLeft.x - 5, netLeft.y); ctx.lineTo(netRight.x + 5, netRight.y); ctx.stroke();
  ctx.strokeStyle = "rgba(25,67,100,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(netLeft.x - 4, netLeft.y + 3); ctx.lineTo(netRight.x + 4, netRight.y + 3); ctx.stroke();

  ctx.fillStyle = "rgba(8,40,70,0.76)";
  roundedRect(ctx, 390, 120, 180, 27, 5); ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.font = "900 13px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(scene === "locomotive" ? "LOCOMOTIVE DEPOT" : scene === "clockwork" ? "CLOCKWORK FACTORY" : "PADEL FLOW", 480, 139);

  // Store projection for the sprites drawn after the court.
  ctx.__padelProject = point;
}

export function drawHitZone(ctx, paddle, color) {
  const p = ctx.__padelProject ? ctx.__padelProject(paddle.x, paddle.y) : paddle;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, paddle.w * 0.62 * p.scale, paddle.reach * 0.52 * p.scale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawActiveIndicator(ctx, paddle, tallSprite = false) {
  const p = ctx.__padelProject ? ctx.__padelProject(paddle.x, paddle.y) : paddle;
  ctx.save();
  ctx.strokeStyle = "#fff36a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(p.x, p.y + 34 * p.scale, 30 * p.scale, 0, Math.PI * 2);
  ctx.stroke();
  const labelY = p.y - (tallSprite ? 132 : 73) * p.scale;
  ctx.fillStyle = "#0b2545";
  ctx.strokeStyle = "#fff36a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(p.x - 22 * p.scale, labelY - 13 * p.scale, 44 * p.scale, 20 * p.scale, 6 * p.scale);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff36a";
  ctx.font = `800 ${Math.max(9, 11 * p.scale)}px Nunito, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("TU", p.x, labelY + 1 * p.scale);
  ctx.restore();
}

function drawHairBack(ctx, style, hair, facing) {
  ctx.fillStyle = hair;
  ctx.strokeStyle = hair;
  ctx.lineCap = "round";
  if (style === "long-pony") {
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(-facing * 11, -69);
    ctx.quadraticCurveTo(-facing * 38, -78, -facing * 51, -58);
    ctx.quadraticCurveTo(-facing * 63, -39, -facing * 76, -48);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-facing * 19, -72); ctx.quadraticCurveTo(-facing * 53, -91, -facing * 70, -60);
    ctx.moveTo(-facing * 17, -67); ctx.quadraticCurveTo(-facing * 54, -58, -facing * 69, -39);
    ctx.stroke();
  } else if (style === "curly-pony") {
    [[-20, -76, 12], [-31, -82, 11], [-41, -73, 12], [-35, -61, 10], [-51, -64, 9], [-24, -91, 9]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x * facing, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function drawHairFront(ctx, style, hair, facing) {
  ctx.fillStyle = hair;
  if (style === "spiked") {
    ctx.beginPath();
    ctx.moveTo(-19, -66); ctx.lineTo(-15, -84); ctx.lineTo(-7, -73);
    ctx.lineTo(0, -88); ctx.lineTo(6, -73); ctx.lineTo(16, -84);
    ctx.lineTo(18, -63); ctx.closePath(); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(-3 * facing, -64, style === "curly-pony" ? 19 : 18, Math.PI, Math.PI * 2);
    ctx.fill();
    if (style === "curly-pony") {
      [-14, -5, 6, 15].forEach((x, index) => {
        ctx.beginPath(); ctx.arc(x * facing, -70 - (index % 2) * 4, 7, 0, Math.PI * 2); ctx.fill();
      });
    }
  }
}

export function drawPaddle(ctx, paddle, color, isPlayer, swing, charge = 0, appearance = null, sprite = null) {
  const projected = ctx.__padelProject ? ctx.__padelProject(paddle.x, paddle.y) : { ...paddle, scale: 1 };

  if (sprite?.complete && sprite.naturalWidth > 0) {
    const frameWidth = sprite.naturalWidth / 4;
    const frame = charge > 0.08 ? 2 : swing > 0.08 ? 3 : paddle.motion > 0.12 ? 1 : 0;
    const destWidth = 112 * projected.scale;
    const destHeight = destWidth * (sprite.naturalHeight / frameWidth);
    const feetY = projected.y + 46 * projected.scale;
    const transparentFootMargin = destHeight * 0.085;

    ctx.save();
    ctx.fillStyle = "rgba(5, 28, 55, 0.18)";
    ctx.beginPath();
    ctx.ellipse(projected.x, feetY + projected.scale, 30 * projected.scale, 6 * projected.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(3, 20, 39, 0.42)";
    ctx.beginPath();
    ctx.ellipse(projected.x, feetY, 17 * projected.scale, 3 * projected.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(
      sprite,
      frame * frameWidth,
      0,
      frameWidth,
      sprite.naturalHeight,
      projected.x - destWidth / 2,
      feetY - destHeight + transparentFootMargin,
      destWidth,
      destHeight,
    );
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(projected.x, projected.y);
  ctx.scale(projected.scale * 1.04, projected.scale * 1.04);

  const facing = isPlayer ? 1 : -1;
  const windup = clamp(charge, 0, 1);
  const impact = clamp(swing, 0, 1);
  const followThrough = impact > 0 ? Math.sin((1 - impact) * Math.PI) : 0;
  const swingSide = paddle.swingSide ?? 1;
  const bodyTurn = facing * (-windup * 0.1 + impact * 0.08 + followThrough * 0.07);
  const step = followThrough * 7;
  const visual = appearance?.visual ?? {};
  const skin = visual.skin ?? (isPlayer ? "#d9976e" : "#d68d68");
  const hair = visual.hair ?? (isPlayer ? "#4b2b24" : "#29213c");
  const shorts = visual.secondary ?? (isPlayer ? "#1b4d9c" : "#314362");
  const kit = visual.kit ?? color;
  const accent = visual.accent ?? "#ffd54a";
  const shoeColor = visual.shoes ?? "#173a6d";
  const frame = visual.frame ?? "athletic";
  const bodyWidth = frame === "broad" ? 64 : frame === "slim" ? 48 : 56;
  const limbWidth = frame === "broad" ? 18 : frame === "slim" ? 14 : 16;
  const shoulderX = bodyWidth / 2 - 6;

  ctx.rotate(bodyTurn);

  // Larger cartoon athletes stay readable from the near and far end of the court.
  ctx.fillStyle = "rgba(5, 28, 55, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 42, 39, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = shorts;
  ctx.lineWidth = limbWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-12, 14); ctx.lineTo(-31 - step, 31); ctx.lineTo(-19 - step, 42);
  ctx.moveTo(12, 14); ctx.lineTo(30 + step, 40);
  ctx.stroke();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(-19 - step, 42); ctx.lineTo(-29 - step, 44);
  ctx.moveTo(30 + step, 40); ctx.lineTo(39 + step, 43);
  ctx.stroke();
  ctx.strokeStyle = shoeColor;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-33 - step, 45); ctx.lineTo(-20 - step, 45);
  ctx.moveTo(29 + step, 44); ctx.lineTo(42 + step, 44);
  ctx.stroke();

  ctx.fillStyle = shorts;
  if (frame === "slim") {
    ctx.beginPath();
    ctx.moveTo(-21, 0); ctx.lineTo(21, 0); ctx.lineTo(27, 23); ctx.lineTo(-27, 23); ctx.closePath();
    ctx.fill();
  } else {
    roundedRect(ctx, -bodyWidth * 0.38, 1, bodyWidth * 0.76, 23, 6);
    ctx.fill();
  }

  ctx.fillStyle = kit;
  roundedRect(ctx, -bodyWidth / 2, -34, bodyWidth, 42, frame === "broad" ? 11 : 13);
  ctx.fill();
  ctx.fillStyle = visual.secondary ?? "rgba(255,255,255,0.22)";
  if (visual.kitStyle === "side" || visual.kitStyle === "raglan") {
    ctx.beginPath();
    ctx.moveTo(-bodyWidth / 2, -30); ctx.lineTo(-bodyWidth / 2 + 12, -34); ctx.lineTo(-bodyWidth / 2 + 15, 8); ctx.lineTo(-bodyWidth / 2, 6); ctx.closePath();
    ctx.moveTo(bodyWidth / 2, -30); ctx.lineTo(bodyWidth / 2 - 12, -34); ctx.lineTo(bodyWidth / 2 - 15, 8); ctx.lineTo(bodyWidth / 2, 6); ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundedRect(ctx, -bodyWidth / 2 + 8, -28, 13, 29, 4); ctx.fill();
  }
  if (visual.kitStyle === "diagonal" || !visual.kitStyle) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-bodyWidth / 2 + 2, -18); ctx.lineTo(bodyWidth / 2 - 2, -5);
    ctx.lineTo(bodyWidth / 2 - 2, 3); ctx.lineTo(-bodyWidth / 2 + 2, -10); ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(10,46,91,0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-26, -2); ctx.lineTo(26, -2);
  ctx.stroke();

  ctx.strokeStyle = skin;
  ctx.lineWidth = 11;
  ctx.beginPath();
  const supportHandX = -facing * (43 - impact * 13);
  const supportHandY = -5 - impact * 22;
  const racketHandX = facing * (48 - windup * 57 + impact * 24) - swingSide * followThrough * 45;
  const racketHandY = -48 + windup * 18 - impact * 18 + followThrough * 21;
  ctx.moveTo(-facing * shoulderX, -24); ctx.lineTo(supportHandX, supportHandY);
  ctx.moveTo(facing * shoulderX, -24); ctx.lineTo(racketHandX, racketHandY);
  ctx.stroke();

  drawHairBack(ctx, visual.hairStyle, hair, facing);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(facing * 2, -57, 17, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(facing * 17, -58); ctx.lineTo(facing * 25, -54); ctx.lineTo(facing * 17, -51); ctx.closePath();
  ctx.fill();
  drawHairFront(ctx, visual.hairStyle, hair, facing);
  const headband = Object.prototype.hasOwnProperty.call(visual, "headband") ? visual.headband : (isPlayer ? "#e3f7ff" : "#ffcd3c");
  if (headband) {
    ctx.strokeStyle = headband;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-16, -59); ctx.lineTo(16, -59); ctx.stroke();
  }
  if (visual.beard) {
    ctx.strokeStyle = "rgba(67,37,27,0.72)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(facing * 2, -55, 13, 0.15, Math.PI - 0.15); ctx.stroke();
  }
  ctx.fillStyle = "#20334a";
  ctx.beginPath();
  ctx.arc(facing * 8, -56, 1.9, 0, Math.PI * 2);
  ctx.fill();

  const racketX = racketHandX + facing * (20 + impact * 8) - swingSide * followThrough * 15;
  const racketY = racketHandY - 13 + followThrough * 8;

  if (impact > 0.08) {
    ctx.save();
    ctx.strokeStyle = `rgba(215, 255, 246, ${0.22 + impact * 0.42})`;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(facing * 8, -34, 67, -1.3 + facing * 0.18, 0.45 + followThrough * 0.35);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = "#1b385c";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(racketHandX, racketHandY);
  ctx.lineTo(racketX, racketY + 13);
  ctx.stroke();
  ctx.fillStyle = appearance ? "#f4c73f" : "#12c8e3";
  ctx.strokeStyle = appearance ? "#1b385c" : "#f4c73f";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(racketX, racketY, 20, 27, facing * (0.4 - followThrough * 0.55), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(22, 62, 102, 0.7)";
  for (let row = -1; row <= 1; row += 1) {
    for (let col = -1; col <= 1; col += 1) {
      ctx.beginPath();
      ctx.arc(racketX + col * 9, racketY + row * 9, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawBall(ctx, ball, flash = 0) {
  const projected = ctx.__padelProject ? ctx.__padelProject(ball.x, ball.y) : { ...ball, scale: 1 };
  const visualRadius = Math.max(6.5, ball.r * 0.64);
  ctx.save();
  const lift = (ball.z ?? 0) * projected.scale;

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(projected.x + 3, projected.y + 7, 8 * projected.scale, 4 * projected.scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(projected.x, projected.y - lift);
  const bouncePulse = clamp(ball.bouncePulse ?? 0, 0, 1);
  ctx.scale(
    projected.scale * (1 + bouncePulse * 0.14),
    projected.scale * (1 - bouncePulse * 0.12),
  );

  const ballColor = (ball.netCord ?? 0) > 0 ? "#ffffff" : flash > 0 ? "#fff6a0" : "#d8ff5f";
  ctx.fillStyle = ballColor;
  ctx.beginPath();
  ctx.arc(0, 0, visualRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(9,13,18,0.45)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, visualRadius - 2, -1, 1);
  ctx.stroke();
  if ((ball.netCord ?? 0) > 0) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, ball.netCord)})`;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, 0, visualRadius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  if ((ball.backspin ?? 0) > 0.08) {
    ctx.strokeStyle = "rgba(69, 224, 255, 0.9)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.arc(0, 0, visualRadius + 3, 0.25, Math.PI * 1.75);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawMenuPreview(ctx, canvas, time) {
  // Reuse the full-size arena artwork in the compact menu canvas.
  ctx.save();
  ctx.scale(canvas.width / 960, canvas.height / 620);
  drawArena(ctx, { width: 960, height: 620 }, {
    palette: { floor: "#1a2840", accent: "#00e5ff", gear: "#c89000" },
  }, time);
  ctx.restore();

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.fillStyle = "#d8ff5f";
  ctx.beginPath();
  ctx.arc(cx + Math.sin(time * 1.5) * 80, cy + Math.cos(time * 2) * 40, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "800 22px 'Lilita One', cursive";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("STEAM CIRCUIT", cx, canvas.height - 28);
}
