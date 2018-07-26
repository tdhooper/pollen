var isPowerOfTwo = require('is-power-of-two');
var setupPass = require('./draw/setup-pass');


var SwapBuffer = function(buffers) {
    this.index = 0;
    this.buffers = buffers;
};

SwapBuffer.prototype.next = function() {
    this.index = (this.index + 1) % this.buffers.length;
    return this.current();
};

SwapBuffer.prototype.current = function() {
    return this.buffers[this.index];
};


var Quantize = function(sourceBuffer, buckets) {

    var width = sourceBuffer.width;
    var height = sourceBuffer.height;
    var pixelCount = width * height;
    this.pixelCount = pixelCount;

    var meanCount = buckets;
    this.meanCount = meanCount;

    this.pixelsBuffers = new SwapBuffer(
        [0,0].map(function() {
            return regl.framebuffer({
                depth: false,
                color: regl.texture({
                    width: pixelCount,
                    height: 1,
                })
            });
        })
    );

    this.meansBuffer = regl.framebuffer({
        depth: false,
        color: regl.texture({
            width: meanCount,
            height: 1,
        })
    });

    this.writeSourceIntoPixels = regl({
        frag: `
            precision mediump float;
            uniform sampler2D source;
            uniform vec2 sourceSize;
            uniform vec2 resolution;

            void main() {
                vec2 xy = gl_FragCoord.xy;
                vec2 sourceUv = vec2(
                    mod(xy.x, sourceSize.x) / sourceSize.x,
                    floor(xy.x / sourceSize.x) / (sourceSize.y - 1.)
                );
                vec4 sample = texture2D(source, sourceUv);
                gl_FragColor = sample;
            }
        `,
        uniforms: {
            source: sourceBuffer,
            sourceSize: [width, height],
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            }
        },
        framebuffer: regl.prop('destination')
    });

    this.pickInitialMeans = regl({
        frag: `
            precision mediump float;
            uniform sampler2D pixels;
            uniform float pixelCount;
            uniform vec2 resolution;

            void main() {
                vec2 uv = gl_FragCoord.xy / resolution.xy;
                vec4 pixel = texture2D(pixels, uv);
                gl_FragColor = pixel;
            }
        `,
        uniforms: {
            pixels: regl.prop('pixels'),
            pixelCount: pixelCount,
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            }
        },
        framebuffer: regl.prop('destination')
    });

    this.assignMeansToPixels = regl({
        frag: `
            precision mediump float;
            uniform sampler2D pixels;
            uniform sampler2D means;
            uniform float meanCount;
            uniform vec2 resolution;

            void main() {
                vec2 uv = gl_FragCoord.xy / resolution.xy;
                vec4 pixel = texture2D(pixels, uv);

                vec2 meanUv;
                vec4 mean;
                float dist;
                float minDist = -1.;
                float closestMeanId;

                for (float i = 0.; i < ${ meanCount }.; i++) {
                    meanUv = vec2((i + .5) / meanCount, 0);
                    mean = texture2D(means, meanUv);
                    dist = distance(pixel.rgb, mean.rgb);
                    if (minDist == -1. || dist < minDist) {
                        minDist = dist;
                        closestMeanId = i / (meanCount - 1.);
                    }
                }

                pixel.a = closestMeanId;
                gl_FragColor = pixel;
            }
        `,
        uniforms: {
            pixels: regl.prop('pixels'),
            means: regl.prop('means'),
            meanCount: meanCount,
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            }
        },
        framebuffer: regl.prop('destination')
    });

    this.setMeansAsCentroids = regl({
        frag: `
            precision mediump float;
            uniform sampler2D pixels;
            uniform float pixelCount;
            uniform vec2 resolution;

            float round(float a) {
                return floor(a + 0.5);
            }

            void main() {
                float meanId = round(gl_FragCoord.x - .5) / (resolution.x - 1.);
                vec4 pixel;
                vec3 samples;
                float sampleCount;
                vec2 uv;

                for (float i = 0.; i < ${ pixelCount }.; i++) {
                    uv = vec2(i, 0) / pixelCount;
                    pixel = texture2D(pixels, uv);
                    if (distance(pixel.a, meanId) < .1) {
                        samples += pixel.rgb;
                        sampleCount += 1.;
                    }
                }

                samples /= sampleCount;
                gl_FragColor = vec4(samples, 1);
            }
        `,
        uniforms: {
            pixels: regl.prop('pixels'),
            pixelCount: pixelCount,
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            }
        },
        framebuffer: regl.prop('destination')
    });


    this.debugPass = regl({
        frag: `
            precision mediump float;
            uniform sampler2D source;
            uniform vec2 resolution;

            float round(float a) {
                return floor(a + 0.5);
            }

            void main() {
                vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
                vec4 sample = texture2D(source, uv);
                gl_FragColor = vec4(vec3(sample.a), 1);
                // float i = round(gl_FragCoord.x - .5);
                // float f = mod(i, 2.) == 0. ? 0. : 1.;
                // i /= resolution.x - 1.;
                // gl_FragColor = vec4(vec3(i, f, 0), 1);
                // // gl_FragColor = vec4(vec3(texture2D(source, uv).a), 1.);
                // //gl_FragColor = texture2D(source, uv);
            }
        `,
        uniforms: {
            source: regl.prop('source'),
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            },
        },
        framebuffer: regl.prop('destination')
    });
};

Quantize.prototype.process = function() {

    setupPass(function() {

        this.writeSourceIntoPixels({
            destination: this.pixelsBuffers.current()
        });

        this.pickInitialMeans({
            pixels: this.pixelsBuffers.current(),
            destination: this.meansBuffer
        });

        for (var i = 0; i < 10; i++) {
            this.assignMeansToPixels({
                means: this.meansBuffer,
                pixels: this.pixelsBuffers.current(),
                destination: this.pixelsBuffers.next()
            });

            this.setMeansAsCentroids({
                pixels: this.pixelsBuffers.current(),
                destination: this.meansBuffer
            });
        }
    }.bind(this));

    return this.meansBuffer;
};

module.exports = Quantize;
