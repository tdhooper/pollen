var isPowerOfTwo = require('is-power-of-two');
var setupPass = require('./draw/setup-pass');


var Quantize = function(sourceBuffer, buckets) {

    if ( ! isPowerOfTwo(buckets)) {
        throw Error('buckets must be a power of 2');
    }

    var width = sourceBuffer.width;
    var height = sourceBuffer.height;
    var pixels = width * height;

    this.bucketsBuffers = [0,0].map(function() {
        return regl.framebuffer({
            depth: false,
            color: regl.texture({
                width: pixels,
                height: buckets,
            })
        });
    });

    this.dimensionBuffer = regl.framebuffer({
        depth: false,
        color: regl.texture({
            width: 1,
            height: buckets,
        })
    });

    this.boundryBuffer = regl.framebuffer({
        depth: false,
        color: regl.texture({
            width: 1,
            height: buckets,
        })
    });

    this.resultBuffer = regl.framebuffer({
        depth: false,
        color: regl.texture({
            width: 1,
            height: buckets,
        })
    });

    this.writeSourceIntoBucket = regl({
        frag: `
            precision mediump float;
            uniform sampler2D source;
            uniform vec2 sourceSize;
            uniform vec2 resolution;

            void main() {
                vec2 xy = gl_FragCoord.xy;
                if (xy.y > 1.) {
                    discard;
                }
                vec2 sourceUv = vec2(
                    mod(xy.x, sourceSize.x) / sourceSize.x,
                    floor(xy.x / sourceSize.x) / (sourceSize.y - 1.)
                );
                gl_FragColor = texture2D(source, sourceUv);
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

    this.findLargestDimension = regl({
        frag: `
            precision mediump float;
            uniform sampler2D buckets;
            uniform vec2 bucketsSize;
            uniform vec2 resolution;

            void main() {
                vec2 xy = gl_FragCoord.xy;
                vec3 minValues, maxValues;
                vec4 sample;
                vec2 uv;

                for (float i = 0.; i < ${ pixels }.; i++) {
                    uv = vec2(i, xy.y) / bucketsSize;
                    sample = texture2D(buckets, uv);
                    if (sample.a != 0.) {
                        minValues = min(minValues, sample.rgb);
                        maxValues = max(maxValues, sample.rgb);
                    }
                }

                vec3 range = vec3(
                    distance(minValues.r, maxValues.r),
                    distance(minValues.g, maxValues.g),
                    distance(minValues.b, maxValues.b)
                );

                if (range.r < range.g && range.r < range.b) {
                    gl_FragColor = vec4(0./2., minValues.r, maxValues.r, 1);
                } else if (range.g < range.r && range.g < range.b) {
                    gl_FragColor = vec4(1./2., minValues.g, maxValues.g, 1);
                } else {
                    gl_FragColor = vec4(2./2., minValues.b, maxValues.b, 1);
                }
            }
        `,
        uniforms: {
            buckets: regl.prop('buckets'),
            bucketsSize: [pixels, buckets],
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            }
        },
        framebuffer: regl.prop('destination')
    });
};

Quantize.prototype.process = function() {

    setupPass(function() {
        this.writeSourceIntoBucket({
            destination: this.bucketsBuffers[0]
        });
        this.findLargestDimension({
            buckets: this.bucketsBuffers[0],
            destination: this.dimensionBuffer
        });
    }.bind(this));

    return this.dimensionBuffer;
};

module.exports = Quantize;
