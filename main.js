import * as THREE from 'three';
import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

/* ─── MOBILE ─────────────────────────────────────────── */
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
              || ('ontouchstart' in window && navigator.maxTouchPoints > 1);
if (isMobile) {
    document.body.style.cssText = 'margin:0;background:#0a0f0a;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;';
    document.body.innerHTML = `<div style="text-align:center;color:#d4c9a8;font-family:'Cinzel',serif;padding:40px;max-width:340px;"><div style="font-size:64px;margin-bottom:24px;">🌲</div><div style="font-size:28px;font-weight:700;letter-spacing:4px;margin-bottom:20px;">UNE FORÊT</div><div style="font-size:14px;letter-spacing:2px;opacity:0.75;line-height:2;">NON DISPONIBLE<br>SUR MOBILE</div></div>`;
    throw new Error('mobile');
}

/* ─── RENDERER ───────────────────────────────────────── */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);

/* ─── SCENE / CAMERA ─────────────────────────────────── */
const scene = new THREE.Scene();
// Fog exponentiel carré : horizon doux à la Firewatch
scene.fog = new THREE.FogExp2(0x7a9e8a, 0.007);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 10, 0);

/* ─── SKYBOX CANVAS ──────────────────────────────────── */
// Gradient 4 stops pour un ciel plus riche (top, mid-sky, horizon, bas)
const SKY_CANVAS = document.createElement('canvas');
SKY_CANVAS.width = 2; SKY_CANVAS.height = 512;
const SKY_CTX = SKY_CANVAS.getContext('2d');
const skyTex = new THREE.CanvasTexture(SKY_CANVAS);
scene.background = skyTex;

// Palette Firewatch — couleurs soigneusement choisies
const SKY = {
    day:    { top:[0.10,0.28,0.65], mid:[0.30,0.55,0.85], hor:[0.65,0.82,0.95], bot:[0.75,0.88,0.97] },
    sunset: { top:[0.05,0.08,0.28], mid:[0.25,0.18,0.35], hor:[0.90,0.45,0.15], bot:[0.98,0.68,0.30] },
    night:  { top:[0.01,0.02,0.08], mid:[0.02,0.04,0.12], hor:[0.04,0.06,0.16], bot:[0.03,0.05,0.14] },
    dawn:   { top:[0.05,0.06,0.20], mid:[0.35,0.18,0.28], hor:[0.92,0.55,0.25], bot:[0.98,0.75,0.45] },
};

function lerp3(a,b,t){ return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]; }
function toCSS(rgb){ return `rgb(${rgb[0]*255|0},${rgb[1]*255|0},${rgb[2]*255|0})`; }
let _top=SKY.day.top.slice(), _mid=SKY.day.mid.slice(), _hor=SKY.day.hor.slice(), _bot=SKY.day.bot.slice();
function setSky(s){ _top=s.top.slice(); _mid=s.mid.slice(); _hor=s.hor.slice(); _bot=s.bot.slice(); }
function lerpSky(a,b,t){
    _top=lerp3(a.top,b.top,t); _mid=lerp3(a.mid,b.mid,t);
    _hor=lerp3(a.hor,b.hor,t); _bot=lerp3(a.bot,b.bot,t);
}
function drawSky(){
    const g=SKY_CTX.createLinearGradient(0,0,0,512);
    g.addColorStop(0, toCSS(_top));
    g.addColorStop(0.38, toCSS(_mid));
    g.addColorStop(0.72, toCSS(_hor));
    g.addColorStop(1,    toCSS(_bot));
    SKY_CTX.fillStyle=g; SKY_CTX.fillRect(0,0,2,512); skyTex.needsUpdate=true;
}

/* ─── LUMIÈRES ───────────────────────────────────────── */
const hemi = new THREE.HemisphereLight(0xddeeff, 0x3d2f1b, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff5e0, 3.0);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(1024);
sun.shadow.camera.left = sun.shadow.camera.bottom = -160;
sun.shadow.camera.right = sun.shadow.camera.top = 160;
sun.shadow.camera.far = 1500;
scene.add(sun);
const moonLight = new THREE.DirectionalLight(0x4466bb, 0);
scene.add(moonLight);

/* ─── SPRITES SOLEIL & LUNE ──────────────────────────── */
function makeCircleSprite(inner,outer){
    const c=document.createElement('canvas'); c.width=c.height=256;
    const ctx=c.getContext('2d');
    const g=ctx.createRadialGradient(128,128,0,128,128,128);
    g.addColorStop(0,inner); g.addColorStop(0.3,outer);
    g.addColorStop(0.7,outer.replace(/[\d.]+\)$/,'0.15)')); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,256,256);
    return new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
}
function makeGlowSprite(color){
    const c=document.createElement('canvas'); c.width=c.height=256;
    const ctx=c.getContext('2d');
    const g=ctx.createRadialGradient(128,128,0,128,128,128);
    g.addColorStop(0,color); g.addColorStop(0.4,color.replace(/[\d.]+\)$/,'0.3)')); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,256,256);
    return new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
}
const sunSprite=makeCircleSprite('rgba(255,255,220,1)','rgba(255,200,50,0.8)');
const sunGlow=makeGlowSprite('rgba(255,160,30,0.6)');
const moonSprite=makeCircleSprite('rgba(230,240,255,1)','rgba(150,170,220,0.7)');
const moonGlow=makeGlowSprite('rgba(80,100,180,0.4)');
sunSprite.scale.setScalar(200); sunGlow.scale.setScalar(500);
moonSprite.scale.setScalar(140); moonGlow.scale.setScalar(360);
scene.add(sunSprite,sunGlow,moonSprite,moonGlow);

/* ─── ÉTOILES ────────────────────────────────────────── */
const STAR_COUNT=1200;
const starPos=new Float32Array(STAR_COUNT*3), starSz=new Float32Array(STAR_COUNT);
for(let i=0;i<STAR_COUNT;i++){
    const th=2*Math.PI*Math.random(), ph=Math.acos(2*Math.random()-1), r=1600;
    starPos[i*3]=r*Math.sin(ph)*Math.cos(th); starPos[i*3+1]=Math.abs(r*Math.cos(ph))+80; starPos[i*3+2]=r*Math.sin(ph)*Math.sin(th);
    starSz[i]=1.5+Math.random()*3.5;
}
const starGeo=new THREE.BufferGeometry();
starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));
starGeo.setAttribute('size',new THREE.BufferAttribute(starSz,1));
const starMat=new THREE.ShaderMaterial({
    uniforms:{uOp:{value:0},uT:{value:0}},
    vertexShader:`attribute float size;uniform float uT;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*(1.+0.3*sin(uT*2.+size*13.7));gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float uOp;void main(){vec2 uv=gl_PointCoord-.5;float d=length(uv);if(d>.5)discard;float b=pow(1.-d*2.,1.5);gl_FragColor=vec4(1.,1.,.95,b*uOp);}`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
});
const starsObj=new THREE.Points(starGeo,starMat);
scene.add(starsObj);

/* ─── MONTAGNES LOINTAINES — style Firewatch ─────────── */
// Plusieurs couches de silhouettes à distances croissantes
// Chaque couche est un anneau de sprites CanvasTexture
const mountainLayers = [];

function makeMountainTexture(opts) {
    // opts: { width, height, peaks, peakH, color, jagged, snowRatio }
    const { width=2048, height=512, peaks=14, peakH=0.65, color, jagged=0.3, snowRatio=0 } = opts;
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const ctx = c.getContext('2d');

    // Génère une ligne de crête aléatoire mais déterministe
    const pts = [];
    const segW = width / (peaks * 2);
    for (let i = 0; i <= peaks * 2; i++) {
        const x = i * segW;
        // alternance pic / vallée avec variation
        const isP = (i % 2 === 1);
        const base = isP ? peakH : (0.05 + Math.random() * 0.15);
        const jitter = (Math.random() - 0.5) * jagged * peakH;
        pts.push({ x, y: Math.max(0.02, Math.min(0.98, base + jitter)) });
    }
    // Ajoute points de bord
    pts.unshift({ x: 0, y: pts[0].y });
    pts.push({ x: width, y: pts[pts.length-1].y });

    // Rempli silhouette
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(pts[0].x, height * (1 - pts[0].y));
    for (let i = 1; i < pts.length; i++) {
        const prev = pts[i-1], cur = pts[i];
        const cpx = (prev.x + cur.x) / 2;
        ctx.bezierCurveTo(cpx, height*(1-prev.y), cpx, height*(1-cur.y), cur.x, height*(1-cur.y));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Neige sur les sommets (couches lointaines)
    if (snowRatio > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        // Gradient vertical blanc en haut
        const sg = ctx.createLinearGradient(0, 0, 0, height * (1 - peakH * snowRatio));
        sg.addColorStop(0, 'rgba(220,230,245,0.85)');
        sg.addColorStop(1, 'rgba(220,230,245,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    return new THREE.CanvasTexture(c);
}

function buildMountainRing(radius, count, yBase, scaleH, texOpts, name) {
    const tex = makeMountainTexture(texOpts);
    const sprites = [];
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.NormalBlending,
            opacity: texOpts.opacity ?? 0.92,
        }));
        // Chaque sprite couvre un arc du cercle
        sp.scale.set(radius * Math.PI * 2 / count * 1.05, scaleH, 1);
        sp.position.set(Math.cos(angle) * radius, yBase, Math.sin(angle) * radius);
        sp._angle = angle;
        sp._radius = radius;
        sp._yBase = yBase;
        scene.add(sp);
        sprites.push(sp);
    }
    mountainLayers.push({ sprites, radius, yBase });
}

// Couche 1 — premier plan montagneux (la plus proche, plus sombre)
buildMountainRing(320, 20, -8, 55, {
    width: 1024, height: 256, peaks: 8, peakH: 0.55, jagged: 0.4, snowRatio: 0,
    color: 'rgba(18,32,18,1)', opacity: 0.88,
}, 'near');

// Couche 2 — montagnes mid (légèrement bleutées)
buildMountainRing(520, 22, -14, 80, {
    width: 1024, height: 256, peaks: 10, peakH: 0.62, jagged: 0.28, snowRatio: 0.15,
    color: 'rgba(28,45,55,1)', opacity: 0.82,
}, 'mid');

// Couche 3 — chaîne lointaine (bleu-gris atmosphérique)
buildMountainRing(780, 24, -20, 110, {
    width: 1024, height: 256, peaks: 12, peakH: 0.70, jagged: 0.20, snowRatio: 0.30,
    color: 'rgba(45,68,85,1)', opacity: 0.72,
}, 'far');

// Couche 4 — horizon montagneux très lointain (quasi silhouette vaporeuse)
buildMountainRing(1100, 28, -28, 140, {
    width: 1024, height: 256, peaks: 14, peakH: 0.75, jagged: 0.14, snowRatio: 0.45,
    color: 'rgba(65,88,105,1)', opacity: 0.55,
}, 'vfar');

// Couleurs de montagne interpolées par heure (atmospheric scattering Firewatch)
const MTN_COLORS = {
    //         L1(near)        L2(mid)          L3(far)          L4(vfar)
    day:    ['#0f2012','#1a2f3a','#2d4458','#425870'],
    sunset: ['#1a0a08','#5a1a08','#7a2510','#8a3a20'],
    night:  ['#050a0e','#0a1018','#101820','#182030'],
    dawn:   ['#100806','#2a1510','#3a2020','#503030'],
};
const _mtnColors = mountainLayers.map(() => new THREE.Color());
let _mtnT = 0; // 0=day,1=sunset,2=night,3=dawn

function updateMountainColors(angle) {
    const PI = Math.PI;
    // Correspondance angle → palette (même logique que le ciel)
    let palA, palB, t;
    if (angle < PI*0.20)      { palA='dawn';   palB='day';    t=angle/(PI*0.20); }
    else if (angle < PI*0.75) { palA='day';    palB='day';    t=0; }
    else if (angle < PI*1.10) { palA='day';    palB='sunset'; t=(angle-PI*0.75)/(PI*0.35); }
    else if (angle < PI*1.40) { palA='sunset'; palB='night';  t=(angle-PI*1.10)/(PI*0.30); }
    else if (angle < PI*1.75) { palA='night';  palB='night';  t=0; }
    else                      { palA='night';  palB='dawn';   t=(angle-PI*1.75)/(PI*0.25); }

    mountainLayers.forEach((layer, li) => {
        const cA = new THREE.Color(MTN_COLORS[palA][li]);
        const cB = new THREE.Color(MTN_COLORS[palB][li]);
        const col = cA.lerp(cB, t);
        layer.sprites.forEach(sp => { sp.material.color.copy(col); });
    });
}

function updateMountainPositions() {
    const cp = camera.position;
    mountainLayers.forEach(layer => {
        layer.sprites.forEach(sp => {
            sp.position.set(
                cp.x + Math.cos(sp._angle) * sp._radius,
                sp._yBase + cp.y * 0.05, // légère parallaxe verticale
                cp.z + Math.sin(sp._angle) * sp._radius
            );
        });
    });
}

/* ─── CYCLE JOUR/NUIT ────────────────────────────────── */
const DAY_DURATION=1200, ORBIT_R=1400;

// Couleurs de brouillard Firewatch
const FOG_COLORS = {
    day:    new THREE.Color(0xc8dff0),  // brume bleue claire
    sunset: new THREE.Color(0xe8895a),  // orange doux, pas rouge cramé
    night:  new THREE.Color(0x04080f),  // nuit quasi noire
    dawn:   new THREE.Color(0xd4956a),  // rose-pêche
};
const _fogCol = new THREE.Color();

function updateDayNight(elapsed){
    const angle=((elapsed/DAY_DURATION)*Math.PI*2)%(Math.PI*2);
    const sinA=Math.sin(angle),sf=Math.max(0,sinA),sfS=sf*sf*(3-2*sf),mf=Math.max(0,-sinA),mfS=mf*mf*(3-2*mf);
    const sunX=Math.cos(angle)*ORBIT_R,sunY=Math.sin(angle)*ORBIT_R;
    sun.position.set(sunX,sunY,ORBIT_R*0.25);
    moonLight.position.set(-sunX,-sunY,ORBIT_R*0.25);
    const cp=camera.position;
    const sd=new THREE.Vector3(sunX,sunY,ORBIT_R*0.25).normalize(),md=sd.clone().negate();
    sunSprite.position.copy(cp).addScaledVector(sd,1350); sunGlow.position.copy(cp).addScaledVector(sd,1340);
    moonSprite.position.copy(cp).addScaledVector(md,1350); moonGlow.position.copy(cp).addScaledVector(md,1340);
    sun.intensity=0.05+sfS*3.0; moonLight.intensity=0.20+mfS*0.5; hemi.intensity=0.30+sfS*0.9;
    sunSprite.material.opacity=Math.pow(sf,0.35); sunGlow.material.opacity=Math.pow(sf,0.5)*0.8;
    moonSprite.material.opacity=Math.pow(mf,0.35); moonGlow.material.opacity=Math.pow(mf,0.5)*0.7;

    // Fog exponentiel — densité varie selon l'heure
    const fogDayDensity   = 0.0045; // ~220u de visibilité
    const fogNightDensity = 0.010;
    const fogSunsetDensity= 0.0065;
    let fogDensity, fogColor;

    const a = angle, PI = Math.PI;
    if(a < PI*0.20) {
        fogDensity = fogSunsetDensity + (fogDayDensity-fogSunsetDensity)*(a/(PI*0.20));
        _fogCol.lerpColors(FOG_COLORS.dawn, FOG_COLORS.day, a/(PI*0.20));
        lerpSky(SKY.dawn,SKY.day,a/(PI*0.20));
    } else if(a < PI*0.75) {
        fogDensity = fogDayDensity;
        _fogCol.copy(FOG_COLORS.day);
        setSky(SKY.day);
    } else if(a < PI*1.10) {
        const t=(a-PI*0.75)/(PI*0.35);
        fogDensity = fogDayDensity + (fogSunsetDensity-fogDayDensity)*t;
        _fogCol.lerpColors(FOG_COLORS.day, FOG_COLORS.sunset, t);
        lerpSky(SKY.day,SKY.sunset,t);
    } else if(a < PI*1.40) {
        const t=(a-PI*1.10)/(PI*0.30);
        fogDensity = fogSunsetDensity + (fogNightDensity-fogSunsetDensity)*t;
        _fogCol.lerpColors(FOG_COLORS.sunset, FOG_COLORS.night, t);
        lerpSky(SKY.sunset,SKY.night,t);
    } else if(a < PI*1.75) {
        fogDensity = fogNightDensity;
        _fogCol.copy(FOG_COLORS.night);
        setSky(SKY.night);
    } else {
        const t=(a-PI*1.75)/(PI*0.25);
        fogDensity = fogNightDensity + (fogSunsetDensity-fogNightDensity)*t;
        _fogCol.lerpColors(FOG_COLORS.night, FOG_COLORS.dawn, t);
        lerpSky(SKY.night,SKY.dawn,t);
    }

    scene.fog.density = fogDensity;
    scene.fog.color.copy(_fogCol);

    starMat.uniforms.uOp.value=Math.max(0,1-sfS*2.0)*0.95;
    starMat.uniforms.uT.value=elapsed;
    starsObj.position.copy(cp);

    // Mise à jour couleurs montagnes
    updateMountainColors(angle);

    drawSky();
}

/* ─── MUSIQUE ────────────────────────────────────────── */
function initMusic(){
    const audio=new Audio('background_sound.mp3'); audio.volume=0.45;
    const play=()=>{ audio.currentTime=0; audio.play().catch(()=>{}); };
    audio.addEventListener('ended',()=>setTimeout(play,120000));
    let started=false;
    const start=()=>{ if(started)return; started=true; play(); document.removeEventListener('click',start); };
    document.addEventListener('click',start);
}
initMusic();

/* ─── SIMPLEX NOISE ──────────────────────────────────── */
const SEED=Math.random()*2147483647|0;
document.getElementById('seed-display').textContent='seed : '+SEED;
function buildPerm(seed){
    const p=new Uint8Array(256); for(let i=0;i<256;i++)p[i]=i; let s=seed;
    for(let i=255;i>0;i--){ s=(s*1664525+1013904223)&0xffffffff; const j=(s>>>24)%(i+1); [p[i],p[j]]=[p[j],p[i]]; }
    const perm=new Uint8Array(512); for(let i=0;i<512;i++)perm[i]=p[i&255]; return perm;
}
const perm=buildPerm(SEED),GRAD=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
function simplex2(xin,yin){
    const F2=0.5*(Math.sqrt(3)-1),G2=(3-Math.sqrt(3))/6;
    const s=(xin+yin)*F2,i=Math.floor(xin+s)|0,j=Math.floor(yin+s)|0,t=(i+j)*G2;
    const x0=xin-(i-t),y0=yin-(j-t),i1=x0>y0?1:0,j1=x0>y0?0:1;
    const x1=x0-i1+G2,y1=y0-j1+G2,x2=x0-1+2*G2,y2=y0-1+2*G2;
    const ii=i&255,jj=j&255,g0=perm[ii+perm[jj]]%8,g1=perm[ii+i1+perm[jj+j1]]%8,g2=perm[ii+1+perm[jj+1]]%8;
    let n0=0,n1=0,n2=0;
    let t0=0.5-x0*x0-y0*y0; if(t0>=0){t0*=t0;n0=t0*t0*(GRAD[g0][0]*x0+GRAD[g0][1]*y0);}
    let t1=0.5-x1*x1-y1*y1; if(t1>=0){t1*=t1;n1=t1*t1*(GRAD[g1][0]*x1+GRAD[g1][1]*y1);}
    let t2=0.5-x2*x2-y2*y2; if(t2>=0){t2*=t2;n2=t2*t2*(GRAD[g2][0]*x2+GRAD[g2][1]*y2);}
    return 70*(n0+n1+n2);
}
function fbm(x,z){ return simplex2(x*0.002,z*0.002)*14+simplex2(x*0.008,z*0.008)*5+simplex2(x*0.025,z*0.025)*1.5; }

/* ─── HEIGHTMAP ──────────────────────────────────────── */
const HSTEP=0.5,hCache=new Map();
function heightAt(wx,wz){
    const kx=Math.round(wx/HSTEP)|0,kz=Math.round(wz/HSTEP)|0,key=kx*100003+kz;
    let h=hCache.get(key); if(h===undefined){h=fbm(wx,wz);hCache.set(key,h);} return h;
}
function findY(wx,wz){
    const x0=Math.floor(wx/HSTEP)*HSTEP,z0=Math.floor(wz/HSTEP)*HSTEP,fu=(wx-x0)/HSTEP,fv=(wz-z0)/HSTEP;
    return heightAt(x0,z0)*(1-fu)*(1-fv)+heightAt(x0+HSTEP,z0)*fu*(1-fv)+heightAt(x0,z0+HSTEP)*(1-fu)*fv+heightAt(x0+HSTEP,z0+HSTEP)*fu*fv;
}
function terrainNormal(wx,wz){
    const d=HSTEP;
    return new THREE.Vector3(findY(wx-d,wz)-findY(wx+d,wz),2*d,findY(wx,wz-d)-findY(wx,wz+d)).normalize();
}

/* ─── MATÉRIAUX ──────────────────────────────────────── */
const MAT={
    trunk:    new THREE.MeshStandardMaterial({color:0x2a1a0e}),
    cone0:    new THREE.MeshStandardMaterial({color:0x0f240f}),
    cone1:    new THREE.MeshStandardMaterial({color:0x163016}),
    cone2:    new THREE.MeshStandardMaterial({color:0x1c3d1c}),
    rock:     new THREE.MeshStandardMaterial({color:0x777777,roughness:1,flatShading:true}),
    ground:   new THREE.MeshStandardMaterial({color:0x243b1d,roughness:1}),
    stem:     new THREE.MeshStandardMaterial({color:0x2d4c1e}),
    grass:    new THREE.MeshStandardMaterial({color:0x3f6b2d}),
    ff:       new THREE.MeshBasicMaterial({color:0xffffaa}),
    mushCap:  new THREE.MeshStandardMaterial({color:0xcc3300}),
    mushCap2: new THREE.MeshStandardMaterial({color:0xaa2200}),
    mushSpot: new THREE.MeshStandardMaterial({color:0xffffff}),
    mushStem: new THREE.MeshStandardMaterial({color:0xe8dcc8}),
    towLog:   new THREE.MeshStandardMaterial({color:0x1e0f06,roughness:1.0}),
    towPlank: new THREE.MeshStandardMaterial({color:0x2c1a0a,roughness:0.95}),
    towRail:  new THREE.MeshStandardMaterial({color:0x170c04,roughness:1.0}),
};
const CONE_MATS=[MAT.cone0,MAT.cone1,MAT.cone2];
const FLOWER_COLORS=[0xff4444,0x4444ff,0xffff55,0xffffff,0xff66cc];
const flowerCache={};
function flowerMat(hex){ if(!flowerCache[hex])flowerCache[hex]=new THREE.MeshStandardMaterial({color:hex,emissive:hex,emissiveIntensity:0.1}); return flowerCache[hex]; }

/* ─── GÉOMÉTRIES PARTAGÉES ───────────────────────────── */
const GEO={
    grass:    new THREE.CylinderGeometry(0.015,0.04,0.5,3),
    ff:       new THREE.SphereGeometry(0.07,4,4),
    stem:     new THREE.CylinderGeometry(0.025,0.035,0.8,5),
    flower:   new THREE.SphereGeometry(0.14,6,6),
    rock:     new THREE.DodecahedronGeometry(1,0),
    mushStem: new THREE.CylinderGeometry(0.1,0.12,0.4,6),
    mushCap:  new THREE.SphereGeometry(0.5,8,5,0,Math.PI*2,0,Math.PI*0.55),
    mushSpot: new THREE.SphereGeometry(0.07,4,4),
    towLogV:  new THREE.CylinderGeometry(0.55,0.65,1,9),
    towLogH:  new THREE.CylinderGeometry(0.16,0.16,1,7),
    towPlank: new THREE.BoxGeometry(1,0.18,0.65),
    towRailH: new THREE.CylinderGeometry(0.07,0.07,1,5),
    towBarV:  new THREE.CylinderGeometry(0.05,0.05,1.15,5),
};

/* ─── GLOBAUX ────────────────────────────────────────── */
const windObjects=[], fireflyData=[], globalColliders=[];

/* ─── TOUR D'OBSERVATION ──────────────────────────────── */
const TOWER_H  = 40;
const PLT_HALF = 2.6;

function chunkHasTower(cx,cz){
    if(cx===0&&cz===0) return true;
    const cellX=Math.floor(cx/5), cellZ=Math.floor(cz/5);
    if(cellX===0&&cellZ===0) return false;
    let h=(cx*374761393+cz*668265263)^0xdeadbeef;
    h=Math.imul(h^(h>>>16),0x45d9f3b); h^=h>>>16;
    const val=(h>>>0)/0xffffffff;
    for(let dx=-4;dx<=4;dx++){
        for(let dz=-4;dz<=4;dz++){
            if(dx===0&&dz===0) continue;
            const nx=cx+dx,nz=cz+dz;
            if(Math.floor(nx/5)!==cellX||Math.floor(nz/5)!==cellZ) continue;
            let h2=(nx*374761393+nz*668265263)^0xdeadbeef;
            h2=Math.imul(h2^(h2>>>16),0x45d9f3b); h2^=h2>>>16;
            if((h2>>>0)/0xffffffff>val) return false;
        }
    }
    return true;
}

function buildTower(wx,wz,grp,lc){
    const gy=findY(wx,wz);
    const tg=new THREE.Group();
    const pillarH=TOWER_H+4;
    const pDef=[
        {ox:-PLT_HALF,oz:-PLT_HALF,rb:0.65,rt:0.55},
        {ox: PLT_HALF,oz:-PLT_HALF,rb:0.62,rt:0.52},
        {ox: PLT_HALF,oz: PLT_HALF,rb:0.68,rt:0.58},
        {ox:-PLT_HALF,oz: PLT_HALF,rb:0.60,rt:0.50},
    ];
    for(const p of pDef){
        const mesh=new THREE.Mesh(new THREE.CylinderGeometry(p.rt,p.rb,pillarH,10),MAT.towLog);
        mesh.position.set(p.ox,pillarH/2-4,p.oz);
        mesh.castShadow=true; tg.add(mesh);
        lc.push({type:'cylinder',x:wx+p.ox,y:gy-4,z:wz+p.oz,r:p.rb+0.15,h:pillarH});
    }
    const beamLen=PLT_HALF*2+0.5;
    for(let y=6;y<TOWER_H-2;y+=7){
        for(const oz of [-PLT_HALF,PLT_HALF]){
            const b=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,beamLen,7),MAT.towLog);
            b.rotation.z=Math.PI/2; b.position.set(0,y,oz); tg.add(b);
        }
        for(const ox of [-PLT_HALF,PLT_HALF]){
            const b=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,beamLen,7),MAT.towLog);
            b.rotation.x=Math.PI/2; b.position.set(ox,y+0.4,0); tg.add(b);
        }
    }
    const LADDER_W=1.2,LADDER_Z=PLT_HALF+0.3;
    const RUNG_COUNT=Math.floor(TOWER_H/0.8),RUNG_SPACING=TOWER_H/RUNG_COUNT;
    const postL=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,TOWER_H+0.5,7),MAT.towLog);
    postL.position.set(-LADDER_W*0.5,TOWER_H*0.5,LADDER_Z); tg.add(postL);
    const postR=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,TOWER_H+0.5,7),MAT.towLog);
    postR.position.set(LADDER_W*0.5,TOWER_H*0.5,LADDER_Z); tg.add(postR);
    for(let i=1;i<=RUNG_COUNT;i++){
        const ry=i*RUNG_SPACING;
        const rung=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,LADDER_W,6),MAT.towLog);
        rung.rotation.z=Math.PI/2; rung.position.set(0,ry,LADDER_Z); tg.add(rung);
    }
    lc.push({type:'ladder',minX:wx-LADDER_W*0.6,maxX:wx+LADDER_W*0.6,minZ:wz+LADDER_Z-0.4,maxZ:wz+LADDER_Z+0.4,bottom:gy,top:gy+TOWER_H-0.2});
    const floorW=PLT_HALF*2+0.15;
    for(let i=0;i<9;i++){
        const t=i/8,pz=-PLT_HALF+t*PLT_HALF*2;
        const pl=new THREE.Mesh(GEO.towPlank,MAT.towPlank);
        pl.scale.set(floorW,1,1); pl.position.set(0,TOWER_H,pz);
        pl.receiveShadow=true; tg.add(pl);
    }
    lc.push({type:'cylinder',x:wx,y:gy+TOWER_H-0.1,z:wz,r:PLT_HALF+0.5,h:0.4});
    for(const oz of [-PLT_HALF*0.5,PLT_HALF*0.5]){
        const sb=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,floorW+0.3,7),MAT.towLog);
        sb.rotation.z=Math.PI/2; sb.position.set(0,TOWER_H-0.28,oz); tg.add(sb);
    }
    const railTop=TOWER_H+1.15,railMid=TOWER_H+0.58;
    const gcSides=[
        [-PLT_HALF-0.1,0,Math.PI/2,floorW],
        [PLT_HALF+0.1,0,Math.PI/2,floorW],
        [0,-PLT_HALF-0.1,0,floorW],
    ];
    for(const [cx,cz,ry,len] of gcSides){
        for(const rh of [railMid,railTop]){
            const r=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,len,5),MAT.towRail);
            r.rotation.set(0,ry,Math.PI/2); r.position.set(cx,rh,cz); tg.add(r);
        }
        const nb=Math.ceil(len/0.62)+1;
        for(let i=0;i<=nb;i++){
            const t2=(i/nb-0.5)*len;
            const bx=ry===0?cx+t2:cx,bz=ry===0?cz:cz+t2;
            const bar=new THREE.Mesh(GEO.towBarV,MAT.towRail);
            bar.position.set(bx,TOWER_H+0.72,bz); tg.add(bar);
        }
        // Mur continu : collider tous les 0.5u pour boucher tout le garde-corps
        const nCol = Math.ceil(len / 0.5) + 1;
        for(let j=0;j<=nCol;j++){
            const offset=(j/nCol - 0.5)*len;
            const colX = ry===0 ? wx+cx+offset : wx+cx;
            const colZ = ry===0 ? wz+cz : wz+cz+offset;
            lc.push({type:'cylinder',x:colX,y:gy+TOWER_H,z:colZ,r:0.30,h:1.5});
        }
    }
    const roofPillarH=5;
    for(const [px,pz] of [[-PLT_HALF,-PLT_HALF],[PLT_HALF,-PLT_HALF],[PLT_HALF,PLT_HALF],[-PLT_HALF,PLT_HALF]]){
        const rp=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,roofPillarH,7),MAT.towLog);
        rp.position.set(px,railTop+roofPillarH/2,pz); tg.add(rp);
    }
    const roofBase=railTop+roofPillarH,roofH=4,roofHalf=PLT_HALF+1.0;
    const roofMesh=new THREE.Mesh(new THREE.ConeGeometry(roofHalf*Math.SQRT2,roofH,4),MAT.towLog);
    roofMesh.rotation.y=Math.PI/4; roofMesh.position.set(0,roofBase+roofH*0.5,0);
    roofMesh.castShadow=true; tg.add(roofMesh);
    tg.position.set(wx,gy,wz); grp.add(tg);
    return {wx,wz,clearR:PLT_HALF+6};
}

/* ─── CHAMPIGNONS ────────────────────────────────────── */
function buildMushroom(wx,wz,gy,r,grp){
    const sc=0.12+r()*0.25,sH=0.45*sc,cR=0.5*sc;
    const sm=new THREE.Mesh(GEO.mushStem,MAT.mushStem);
    sm.scale.set(cR*0.6,sH*2.5,cR*0.6); sm.position.set(wx,gy+sH*0.5,wz); grp.add(sm);
    const cm=new THREE.Mesh(GEO.mushCap,r()>0.3?MAT.mushCap:MAT.mushCap2);
    cm.scale.setScalar(cR*2); cm.position.set(wx,gy+sH+cR*0.05,wz); grp.add(cm);
    for(let s=0,n=3+(r()*3|0);s<n;s++){
        const ang=r()*Math.PI*2,rad=cR*(0.2+r()*0.55);
        const spot=new THREE.Mesh(GEO.mushSpot,MAT.mushSpot);
        spot.scale.setScalar(cR*0.18);
        spot.position.set(wx+Math.cos(ang)*rad,gy+sH+Math.sqrt(Math.max(0,cR*cR-rad*rad))*0.9,wz+Math.sin(ang)*rad);
        grp.add(spot);
    }
}

/* ─── CHUNKS ─────────────────────────────────────────── */
// CHUNK_RADIUS augmenté à 3 pour voir plus loin sans coût excessif
// (les chunks lointains ont moins d'arbres grâce au LOD implicite)
// CHUNK_SEGS doit donner CHUNK_SIZE/CHUNK_SEGS = multiple de HSTEP(0.5)
// 80/16 = 5.0 → multiple de 0.5 ✓  (était 14 → 80/14≈5.71 → coutures !)
const CHUNK_SIZE=80, CHUNK_SEGS=16, CHUNK_RADIUS=3;
const loadedChunks=new Map(), chunkFadeIn=new Map();
function seededRng(seed){
    let s=(seed^0xdeadbeef)|0;
    return ()=>{ s=Math.imul(s^(s>>>16),0x45d9f3b); s=Math.imul(s^(s>>>16),0x45d9f3b); s^=s>>>16; return (s>>>0)/0xffffffff; };
}

function generateChunk(cx,cz){
    const key=cx+','+cz;
    if(loadedChunks.has(key)) return;
    loadedChunks.set(key,null);
    requestAnimationFrame(()=>_buildChunk(cx,cz,key));
}

function _buildChunk(cx,cz,key){
    if(!loadedChunks.has(key)) return;
    const oX=cx*CHUNK_SIZE,oZ=cz*CHUNK_SIZE;
    const r=seededRng(cx*73856093^cz*19349663);
    const grp=new THREE.Group(),lc=[];

    // Distance au centre pour LOD
    const distFromOrigin = Math.sqrt(cx*cx+cz*cz);
    const isLOD = distFromOrigin > 1.5; // chunks lointains = LOD réduit

    /* SOL — grille uniforme pour éviter les coutures entre chunks
       Tous les chunks utilisent CHUNK_SEGS, les chunks LOD simplifient
       seulement les arbres/détails, PAS le terrain. Le pas de grille est
       toujours CHUNK_SIZE/CHUNK_SEGS, donc les bords se partagent
       exactement les mêmes coordonnées monde entre chunks voisins. */
    const GRID = CHUNK_SEGS; // toujours identique, même en LOD
    const STEP = CHUNK_SIZE / GRID;
    const tgeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, GRID, GRID);
    const vp = tgeo.attributes.position.array;
    // PlaneGeometry en XY avant rotation : x = col, y = row (inversé en Z après rotation)
    // On recalcule chaque vertex avec heightAt qui snappe à HSTEP
    for (let i = 0; i < vp.length; i += 3) {
        // vp[i]=x local, vp[i+1]=y local (sera Z monde après rotation)
        const wx = oX + vp[i];
        const wz = oZ - vp[i + 1]; // PlaneGeometry Y → Z monde (rotation.x = -PI/2)
        vp[i + 2] = heightAt(wx, wz); // Z local = hauteur, deviendra Y monde
    }
    tgeo.computeVertexNormals();
    const terr = new THREE.Mesh(tgeo, MAT.ground);
    terr.rotation.x = -Math.PI / 2;
    terr.position.set(oX, 0, oZ);
    terr.receiveShadow = true;
    grp.add(terr);

    /* TOUR */
    let towerInfo=null;
    if(chunkHasTower(cx,cz)){
        let twx,twz;
        if(cx===0&&cz===0){ twx=22; twz=22; }
        else {
            const rng2=seededRng(cx*19349663^cz*73856093);
            twx=oX+(rng2()-0.5)*CHUNK_SIZE*0.5;
            twz=oZ+(rng2()-0.5)*CHUNK_SIZE*0.5;
        }
        towerInfo=buildTower(twx,twz,grp,lc);
    }

    /* POINTS OCCUPÉS */
    const occupied=[];
    if(towerInfo) occupied.push({x:towerInfo.wx,z:towerInfo.wz,r:towerInfo.clearR+5});
    function canPlace(wx,wz,minDist){
        return !occupied.some(o=>{ const dx=wx-o.x,dz=wz-o.z; return dx*dx+dz*dz<(minDist+o.r)*(minDist+o.r); });
    }
    function occupy(wx,wz,rad){ occupied.push({x:wx,z:wz,r:rad}); }

    /* ARBRES — moins dans les chunks LOD */
    const treeN = isLOD ? 4+(r()*4|0) : 7+(r()*7|0);
    const tpts=[];
    for(let i=0;i<treeN;i++){
        let wx,wz,ok=false,tries=0;
        do{
            wx=oX+(r()-0.5)*CHUNK_SIZE*0.85; wz=oZ+(r()-0.5)*CHUNK_SIZE*0.85;
            ok=canPlace(wx,wz,8)&&!tpts.some(p=>{const dx=p[0]-wx,dz=p[1]-wz;return dx*dx+dz*dz<16*16;});
        } while(!ok&&++tries<20);
        if(tries>=20) continue;
        tpts.push([wx,wz]); occupy(wx,wz,8);
        const gy=findY(wx,wz),h=28+r()*18,tr=1.4+r()*1.0,trunkH=h*(0.28+r()*0.08),tgr=new THREE.Group();
        const trunk=new THREE.Mesh(new THREE.CylinderGeometry(tr*0.55,tr*1.4,trunkH+6,9),MAT.trunk);
        trunk.position.y=trunkH/2-3; trunk.castShadow=!isLOD; tgr.add(trunk);
        // Layers réduits en LOD
        const layers = isLOD ? 5+(r()*3|0) : 9+(r()*5|0);
        const foliageH=h-trunkH;
        for(let li=0;li<layers;li++){
            const ratio=li/(layers-1),coneY=trunkH+ratio*foliageH*0.90,radius=tr*4.5*(1-ratio*0.72)+1.5,coneH=(foliageH/layers)*2.2;
            const cone=new THREE.Mesh(new THREE.ConeGeometry(radius,coneH,isLOD?5:8),CONE_MATS[(r()*3)|0]);
            cone.position.y=coneY; tgr.add(cone);
            if(!isLOD) windObjects.push({mesh:cone,phase:r()*10,speed:0.5,amp:0.012});
        }
        tgr.position.set(wx,gy,wz); grp.add(tgr);
        lc.push({type:'cylinder',x:wx,y:gy,z:wz,r:tr*1.7,h:trunkH+6});
    }

    // Contenu détaillé uniquement pour chunks proches
    if(!isLOD){
        /* ROCHERS */
        for(let i=0,n=1+(r()*3|0);i<n;i++){
            let wx,wz,tries=0;
            do{ wx=oX+(r()-0.5)*CHUNK_SIZE*0.88; wz=oZ+(r()-0.5)*CHUNK_SIZE*0.88; } while(!canPlace(wx,wz,3)&&++tries<15);
            if(tries>=15) continue;
            const gy=findY(wx,wz),sx=1.0+r()*2.6,sy=sx*(0.5+r()*0.5),sz=1.0+r()*2.6;
            const rock=new THREE.Mesh(GEO.rock,MAT.rock);
            rock.scale.set(sx,sy,sz); rock.rotation.set((r()-0.5)*0.4,r()*Math.PI*2,(r()-0.5)*0.4);
            rock.position.set(wx,gy+sy*0.35,wz);
            rock.castShadow=rock.receiveShadow=true; grp.add(rock);
            lc.push({type:'sphere',x:wx,y:gy+sy*0.48,z:wz,r:Math.max(sx,sz)*0.9,topY:gy+sy*0.48+sy*0.85});
            occupy(wx,wz,Math.max(sx,sz)*1.2);
        }

        /* FLEURS */
        for(let i=0,n=20+(r()*35|0);i<n;i++){
            let wx,wz,tries=0;
            do{ wx=oX+(r()-0.5)*CHUNK_SIZE*0.9; wz=oZ+(r()-0.5)*CHUNK_SIZE*0.9; } while(!canPlace(wx,wz,1.5)&&++tries<10);
            if(tries>=10) continue;
            const gy=findY(wx,wz);
            const st=new THREE.Mesh(GEO.stem,MAT.stem); st.position.set(wx,gy+0.15,wz); grp.add(st);
            const hd=new THREE.Mesh(GEO.flower,flowerMat(FLOWER_COLORS[(r()*FLOWER_COLORS.length)|0]));
            hd.position.set(wx,gy+0.65,wz); grp.add(hd);
            occupy(wx,wz,0.8);
        }

        /* CHAMPIGNONS */
        for(let i=0,n=1+(r()*4|0);i<n;i++){
            let wx,wz,tries=0;
            do{ wx=oX+(r()-0.5)*CHUNK_SIZE*0.88; wz=oZ+(r()-0.5)*CHUNK_SIZE*0.88; } while(!canPlace(wx,wz,2)&&++tries<15);
            if(tries>=15) continue;
            buildMushroom(wx,wz,findY(wx,wz),r,grp); occupy(wx,wz,1.5);
            if(r()>0.5) for(let c=0,cn=2+(r()*3|0);c<cn;c++){
                const ox=wx+(r()-0.5)*2.5,oz=wz+(r()-0.5)*2.5;
                if(canPlace(ox,oz,1)){ buildMushroom(ox,oz,findY(ox,oz),r,grp); occupy(ox,oz,1); }
            }
        }

        /* LUCIOLES */
        for(let i=0,n=2+(r()*6|0);i<n;i++){
            const wx=oX+(r()-0.5)*CHUNK_SIZE*0.88,wz=oZ+(r()-0.5)*CHUNK_SIZE*0.88;
            const fy=findY(wx,wz)+2+r()*4;
            const m=new THREE.Mesh(GEO.ff,MAT.ff); m.position.set(wx,fy,wz); grp.add(m);
            fireflyData.push({mesh:m,baseY:fy,phase:r()*10,ox:wx,oz:wz});
        }
    }

    /* HERBE — réduite en LOD */
    const gn = isLOD ? 20+(r()*20|0) : 45+(r()*40|0);
    const gm=new THREE.InstancedMesh(GEO.grass,MAT.grass,gn);
    gm.frustumCulled=false;
    const dm=new THREE.Object3D();
    for(let i=0;i<gn;i++){
        const wx=oX+(r()-0.5)*CHUNK_SIZE,wz=oZ+(r()-0.5)*CHUNK_SIZE;
        dm.position.set(wx,findY(wx,wz),wz);
        dm.scale.setScalar(0.5+r()*0.8); dm.rotation.y=r()*Math.PI; dm.updateMatrix();
        gm.setMatrixAt(i,dm.matrix);
    }
    gm.instanceMatrix.needsUpdate=true; grp.add(gm);

    /* FADE-IN */
    grp.traverse(obj=>{
        if(!obj.isMesh) return;
        const mats=Array.isArray(obj.material)?obj.material:[obj.material];
        const cl=mats.map(m=>{ const c=m.clone(); c._bOp=c.opacity??1; c.transparent=true; c.opacity=0; return c; });
        obj.material=Array.isArray(obj.material)?cl:cl[0];
    });

    globalColliders.push(...lc);
    scene.add(grp);
    loadedChunks.set(key,{group:grp,localColliders:lc});
    chunkFadeIn.set(key,{group:grp,alpha:0});
}

function unloadChunk(cx,cz){
    const key=cx+','+cz,data=loadedChunks.get(key);
    if(!data){loadedChunks.delete(key);return;}
    scene.remove(data.group);
    data.group.traverse(obj=>{
        if(!obj.isMesh) return;
        const sharedGeos=Object.values(GEO);
        if(obj.geometry&&!sharedGeos.includes(obj.geometry)) obj.geometry.dispose();
        const mats=Array.isArray(obj.material)?obj.material:[obj.material];
        mats.forEach(m=>{ if(m._bOp!==undefined) m.dispose(); });
    });
    for(const c of data.localColliders){ const idx=globalColliders.indexOf(c); if(idx!==-1)globalColliders.splice(idx,1); }
    data.group.traverse(obj=>{
        const fi=fireflyData.findIndex(f=>f.mesh===obj); if(fi!==-1)fireflyData.splice(fi,1);
        const wi=windObjects.findIndex(w=>w.mesh===obj); if(wi!==-1)windObjects.splice(wi,1);
    });
    loadedChunks.delete(key); chunkFadeIn.delete(key);
}

let lastCX=Infinity,lastCZ=Infinity;
function updateChunks(px,pz){
    const cx=Math.round(px/CHUNK_SIZE),cz=Math.round(pz/CHUNK_SIZE);
    if(cx===lastCX&&cz===lastCZ) return;
    lastCX=cx; lastCZ=cz;
    for(let dx=-CHUNK_RADIUS;dx<=CHUNK_RADIUS;dx++)
        for(let dz=-CHUNK_RADIUS;dz<=CHUNK_RADIUS;dz++)
            generateChunk(cx+dx,cz+dz);
    for(const[key]of loadedChunks){
        const[kcx,kcz]=key.split(',').map(Number);
        if(Math.abs(kcx-cx)>CHUNK_RADIUS+1||Math.abs(kcz-cz)>CHUNK_RADIUS+1) unloadChunk(kcx,kcz);
    }
}

/* ─── PHYSIQUE ───────────────────────────────────────── */
const PLAYER_R=0.4,PLAYER_H=1.8;
function resolveColliders(nx, ny, nz) {
    let onTop = false;
    let isOnLadder = false;
    for (const c of globalColliders) {
        if (c.type === 'ladder') {
            if (nx > c.minX && nx < c.maxX && nz > c.minZ && nz < c.maxZ) {
                const pBot = ny - PLAYER_H;
                if (ny > c.bottom && pBot < c.top) { isOnLadder = true; }
            }
            continue;
        }
        if (c.type === 'cylinder') {
            const dx = nx - c.x, dz = nz - c.z, dXZ = Math.sqrt(dx * dx + dz * dz), cTop = c.y + c.h, pBot = ny - PLAYER_H;
            if (dXZ < c.r + PLAYER_R && ny > c.y && pBot < cTop) {
                if (pBot >= cTop - 0.65) { ny = cTop + PLAYER_H; onTop = true; }
                else { const a = Math.atan2(dz, dx); nx = c.x + Math.cos(a) * (c.r + PLAYER_R); nz = c.z + Math.sin(a) * (c.r + PLAYER_R); }
            }
        } else {
            const dx = nx - c.x, dz = nz - c.z, dxz = Math.sqrt(dx * dx + dz * dz), pBot = ny - PLAYER_H, dy = (ny - PLAYER_H * 0.5) - c.y, dist3 = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist3 < c.r + PLAYER_R && dist3 > 0.001) {
                if (pBot >= c.topY - 0.8 && dy > -0.2) { ny = c.topY + PLAYER_H; onTop = true; }
                else if (dxz > 0.01) { const need = c.r + PLAYER_R * 1.1; if (dxz < need) { nx += (dx / dxz) * (need - dxz); nz += (dz / dxz) * (need - dxz); } }
            }
        }
    }
    return { x: nx, y: ny, z: nz, onTop, isOnLadder };
}

/* ─── CONTROLS ───────────────────────────────────────── */
const controls=new PointerLockControls(camera,document.body);
document.body.addEventListener('click',()=>controls.lock());
const velocity=new THREE.Vector3(),keys={z:false,s:false,q:false,d:false,shift:false};
let jumpVel=0,grounded=true,smoothGroundY=null;
addEventListener('keydown',e=>{
    const k=e.key.toLowerCase(); if(k in keys)keys[k]=true;
    if(e.shiftKey)keys.shift=true;
    if(e.code==='Space'&&grounded){grounded=false;jumpVel=0.32;}
});
addEventListener('keyup',e=>{
    const k=e.key.toLowerCase(); if(k in keys)keys[k]=false;
    if(!e.shiftKey)keys.shift=false;
});
const _fwd=new THREE.Vector3(),_right=new THREE.Vector3();
function updateMovement(dt) {
    const run = keys.shift && (keys.z || keys.s || keys.q || keys.d);
    _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion); _fwd.y = 0; _fwd.normalize();
    _right.set(1, 0, 0).applyQuaternion(camera.quaternion); _right.y = 0; _right.normalize();
    const check = resolveColliders(camera.position.x, camera.position.y, camera.position.z);
    if (check.isOnLadder) {
        velocity.set(0, 0, 0); jumpVel = 0; grounded = true;
        const climbSpeed = 0.18;
        if (keys.z) camera.position.y += climbSpeed;
        if (keys.s) camera.position.y -= climbSpeed;
        if (keys.q) camera.position.addScaledVector(_right, -0.05);
        if (keys.d) camera.position.addScaledVector(_right, 0.05);
        if (keys.s && !keys.z) camera.position.addScaledVector(_fwd, -0.03);
    } else {
        const slope = 1 - Math.abs(terrainNormal(camera.position.x, camera.position.z).y);
        const accel = (run ? 0.065 : 0.032) * (1 - slope * 0.5);
        if (keys.z) velocity.addScaledVector(_fwd, accel);
        if (keys.s) velocity.addScaledVector(_fwd, -accel);
        if (keys.q) velocity.addScaledVector(_right, -accel);
        if (keys.d) velocity.addScaledVector(_right, accel);
        velocity.multiplyScalar(0.88);
        let nx = camera.position.x + velocity.x;
        let ny = camera.position.y;
        let nz = camera.position.z + velocity.z;
        jumpVel = Math.max(jumpVel - 0.016, -1.2);
        ny += jumpVel;
        const moveRes = resolveColliders(nx, ny, nz);
        nx = moveRes.x; ny = moveRes.y; nz = moveRes.z;
        const tgy = findY(nx, nz) + PLAYER_H;
        if (ny <= tgy) {
            if (jumpVel <= 0 && !moveRes.onTop) {
                if (smoothGroundY === null) smoothGroundY = ny;
                smoothGroundY += (tgy - smoothGroundY) * Math.min(1, 0.25 + (1 - slope) * 0.25 + dt * 8);
                ny = Math.max(smoothGroundY, tgy - 0.05);
            } else { ny = tgy; smoothGroundY = ny; }
            if (jumpVel <= 0) { jumpVel = 0; grounded = true; }
        } else if (moveRes.onTop) {
            smoothGroundY = ny;
            if (jumpVel <= 0) { jumpVel = 0; grounded = true; }
        } else { smoothGroundY = null; grounded = false; }
        camera.position.set(nx, ny, nz);
    }
}

/* ─── BOUCLE ─────────────────────────────────────────── */
const clock=new THREE.Clock();
let elapsed=DAY_DURATION*0.25;
updateChunks(0,0);
function animate(){
    requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),0.05);
    elapsed+=dt;
    for(const w of windObjects) w.mesh.rotation.z=Math.sin(elapsed*w.speed+w.phase)*w.amp;
    for(const f of fireflyData){
        f.mesh.position.y=f.baseY+Math.sin(elapsed+f.phase)*0.5;
        f.mesh.position.x+=Math.cos(elapsed*0.3+f.phase)*0.008;
    }
    for(const[key,fd]of chunkFadeIn){
        fd.alpha=Math.min(1,fd.alpha+dt*1.5);
        fd.group.traverse(obj=>{
            if(!obj.isMesh)return;
            const mats=Array.isArray(obj.material)?obj.material:[obj.material];
            for(const m of mats)if(m._bOp!==undefined)m.opacity=fd.alpha*m._bOp;
        });
        if(fd.alpha>=1){
            fd.group.traverse(obj=>{
                if(!obj.isMesh)return;
                const mats=Array.isArray(obj.material)?obj.material:[obj.material];
                for(const m of mats)if(m._bOp!==undefined){m.opacity=m._bOp;m.transparent=m._bOp<1;}
            });
            chunkFadeIn.delete(key);
        }
    }
    updateDayNight(elapsed);
    if(controls.isLocked) updateMovement(dt);
    updateChunks(camera.position.x,camera.position.z);
    // Mise à jour montagnes chaque frame (très léger, juste des positions)
    updateMountainPositions();
    renderer.render(scene,camera);
}
animate();

addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
});
