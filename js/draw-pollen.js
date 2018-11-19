const geometry = require('./geometry/polyhedra');
const mat4 = require('gl-matrix').mat4;
const vec3 = require('gl-matrix').vec3;
const polyhedra = require('polyhedra');
const normals = require('angle-normals');
const subdivide = require('./geometry/subdivide');

var DrawPollen = function(abcUv, detail) {

  var geom = {
      cells: [
        [0, 1, 2]
      ],
      positions: [
        [0, 0, 0],
        [0, 0, 1],
        [1, 0, 0]
      ],
      uvs: abcUv,
  };

  var LODs = [geom];

  while (detail-- > 0) {
    LODs.push(subdivide(LODs[LODs.length - 1]));
  }

  var poly = polyhedra.platonic.Tetrahedron;
  var cells = poly.face.slice();
  var positions = poly.vertex.slice();

  var models = [];
  var iA = [];
  var iB = [];
  var iC = [];

  cells.forEach((cell, i) => {

    var a = positions[cell[0]];
    var b = positions[cell[1]];
    var c = positions[cell[2]];

    var m = vec3.add([], a, b);
    vec3.add(m, m, c);
    vec3.scale(m, m, 1/3);
    
    var ab = vec3.lerp([], a, b, .5);
    var bc = vec3.lerp([], b, c, .5);
    var ca = vec3.lerp([], c, a, .5);

    models.push(this.wythoffTriangle(ab, a, m));
    models.push(this.wythoffTriangle(ab, m, b));

    iA.push(ab); iB.push(a); iC.push(m);
    iA.push(ab); iB.push(m); iC.push(b);

    models.push(this.wythoffTriangle(bc, b, m));
    models.push(this.wythoffTriangle(bc, m, c));

    iA.push(bc); iB.push(b); iC.push(m);
    iA.push(bc); iB.push(m); iC.push(c);

    models.push(this.wythoffTriangle(ca, c, m));
    models.push(this.wythoffTriangle(ca, m, a));

    iA.push(ca); iB.push(c); iC.push(m);
    iA.push(ca); iB.push(m); iC.push(a);

  });

  this.models = models;

  var scale = [];

  var iModelRow0 = [];
  var iModelRow1 = [];
  var iModelRow2 = [];
  var iModelRow3 = [];

  models.forEach(model => {
    iModelRow0.push(model.slice(0, 4));
    iModelRow1.push(model.slice(4, 8));
    iModelRow2.push(model.slice(8, 12));
    iModelRow3.push(model.slice(12, 16));

    mat4.getScaling(scale, model);
  });

  var N = models.length;
  var instances = Array(N).fill().map((_, i) => {
    return i;
  });

  this.drawSphere = regl({
    cull: {
      enable: true,
      face: 'back'
    },
    frag: `
      precision mediump float;
      varying vec2 vuv;
      varying vec3 vnormal;
      //varying float height;
      uniform sampler2D video;
      uniform sampler2D heightMap;
      void main () {
          vec3 tex = texture2D(video, vec2(1) - vuv).rgb;
          // gl_FragColor = vec4(tex, 1);
          // vec3 height = texture2D(heightMap, vec2(1) - vuv).rgb;
          // gl_FragColor = vec4(vec3(height), 1);
          vec3 lPos = normalize(vec3(2,1,0));
          float l = dot(lPos, vnormal) * .5 + .75;
          gl_FragColor = vec4(tex * l, 1);
          // gl_FragColor = vec4(vec3(l), 1);
          // gl_FragColor = vec4(vnormal *.5 + .5, 1);
      }`,
    vert: `
      precision mediump float;
      uniform mat4 proj;
      uniform mat4 model;
      uniform mat4 view;
      uniform vec3 uvScale;
      uniform sampler2D heightMap;
      attribute vec3 position;
      attribute vec2 uv;
      attribute float instance;
      attribute vec4 iModelRow0;
      attribute vec4 iModelRow1;
      attribute vec4 iModelRow2;
      attribute vec4 iModelRow3;
      attribute vec3 iA;
      attribute vec3 iB;
      attribute vec3 iC;
      varying vec2 vuv;
      varying float height;
      varying vec3 vnormal;
      varying mat3 vTBN;

      float getHeight(vec2 uv) {
        float height = texture2D(heightMap, vec2(1) - uv).r;
        height = mix(.1, 1., height);
        return height;
      }

      vec3 getNormalMap(vec2 uv) {
        float scale = .1;
        float eps = .05;
        float xp = getHeight(uv + vec2(eps / uvScale.z,0));
        float xn = getHeight(uv + vec2(-eps / uvScale.z,0));
        float yp = getHeight(uv + vec2(0,eps / uvScale.x));
        float yn = getHeight(uv + vec2(0,-eps / uvScale.x));
        vec3 va = normalize(vec3(scale, 0, xp - xn));
        vec3 vb = normalize(vec3(0, scale, yp - yn));
        vec3 bump = vec3(cross(va, vb));
        return normalize(bump);
      }

      void main () {
        vuv = uv;

        if (mod(instance, 2.) == 0.) {
          vuv.xy = vuv.yx;
        }

        height = getHeight(vuv);
        vec3 normalMap = getNormalMap(vuv);

        vec3 pos = position;

        mat4 iModel = mat4(
          iModelRow0,
          iModelRow1,
          iModelRow2,
          iModelRow3
        );

        vec4 pos4 = vec4(pos, 1);
        pos4 = iModel * pos4;
        pos = normalize(pos4.xyz);

        vec3 center = normalize(mod(instance, 2.) == 0. ? iC : iB);
        vec3 edge = normalize(mod(instance, 2.) == 0. ? iB : iC);
        vec3 origin = normalize(iA);

        vec3 normal = normalize(pos);
        vec3 tangent = cross(pos, iA);
        vec3 bitangent = cross(normal, tangent);

        vec3 N = normalize(vec3(model * vec4(normal, 0)));
        vec3 T = normalize(vec3(model * vec4(tangent, 0)));
        vec3 B = normalize(vec3(model * vec4(bitangent, 0)));


        T = normalize(cross(pos, cross(origin, edge)));
        B = normalize(cross(pos, cross(origin, center)));

        T = normalize(vec3(model * vec4(T, 0)));
        B = normalize(vec3(model * vec4(B, 0)));

        // T = normalize(cross(normal, cross(T, normal)));
        // B = normalize(cross(normal, cross(B, normal)));

        // tangent should be pos -> center

        vTBN = mat3(T, B, N);

        vnormal = vTBN * normalMap;
        // vnormal = normalMap;

        vec3 nm = normalize(vec3(0,0,1));
        if (mod(instance, 2.) == 0.) {
          // nm.x *= -1.;
        }
        // vnormal = nm;
        // vnormal = vTBN * nm;

        // vnormal = N;
        
        pos *= height;
        pos4 = vec4(pos, 1);

        gl_Position = proj * view * model * pos4;
      }`,
    context: {
      model:function(context, props) {
        return props.pollenet.model;
      },
      view: function(context, props) {
        return props.camera.view();
      },
      proj: function(context, props) {
        return props.camera.projection(
          context.viewportWidth,
          context.viewportHeight
        );
      },
      mesh: (context, props) => {
        var model = props.pollenet.model;
        var view = props.camera.view();

        var camPos = mat4.getTranslation([], mat4.invert([], view));
        var modelPos = mat4.getTranslation([], model);
        var dist = vec3.dist(camPos, modelPos);

        var vFOV = Math.PI / 10;
        var vHeight = 2 * Math.tan( vFOV / 2 ) * dist;
        var aspect = context.viewportWidth / context.viewportHeight;

        var fraction = 2 / vHeight;

        var lod = Math.round(fraction * (LODs.length - 1));
        lod = Math.min(lod, LODs.length - 1);

        return LODs[lod];
      }
    },
    attributes: {
      position: regl.context('mesh.positions'),
      uv: regl.context('mesh.uvs'),
      instance: {
        buffer: instances,
        divisor: 1
      },
      iModelRow0: {
        buffer: iModelRow0,
        divisor: 1
      },
      iModelRow1: {
        buffer: iModelRow1,
        divisor: 1
      },
      iModelRow2: {
        buffer: iModelRow2,
        divisor: 1
      },
      iModelRow3: {
        buffer: iModelRow3,
        divisor: 1
      },
      iA: {
        buffer: iA,
        divisor: 1
      },
      iB: {
        buffer: iB,
        divisor: 1
      },
      iC: {
        buffer: iC,
        divisor: 1
      },
    },
    elements: regl.context('mesh.cells'),
    instances: N,
    uniforms: {
      model: regl.context('model'),
      view: regl.context('view'),
      proj: regl.context('proj'),
      video: function(context, props) {
        return props.pollenet.image;
      },
      heightMap: function(context, props) {
        return props.pollenet.height;
      },
      uvScale: scale
    },
    framebuffer: regl.prop('destination')
  });
};

Pollenet.prototype.wythoffTriangle = function(va, vb, vc) {
    var vba = vec3.sub([], vb, va);
    var vca = vec3.sub([], vc, va);

    var n = vec3.normalize([], vba);
    var t = vec3.cross([], vba, vca);
    vec3.normalize(t, t);
    var b = vec3.cross([], t, n);

    var translation = va;
    var mT = mat4.fromTranslation([], translation);
    var mR = [
      n[0], t[0], b[0], 0,
      n[1], t[1], b[1], 0,
      n[2], t[2], b[2], 0,
      0, 0, 0, 1
    ];
    mat4.invert(mR, mR);
    var model = mat4.multiply([], mT, mR);

    var scale = [vec3.length(vba), 1, vec3.length(vca)];
    mat4.scale(model, model, scale);

    return model;
};

Pollenet.prototype.draw = function(conf) {
  this.drawSphere(conf);
};

module.exports = Pollenet;