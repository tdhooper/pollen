var isPowerOfTwo = require('is-power-of-two');
var setupPass = require('./draw/setup-pass');


var Quantize = function(sourceBuffer, buckets) {

    if ( ! isPowerOfTwo(buckets)) {
        throw Error('buckets must be a power of 2');
    }

    var width = sourceBuffer.width;
    var height = sourceBuffer.height;
    var pixels = width * height;
    this.pixels = pixels;
    this.buckets = buckets;

    this.bucketsBuffers = [0,0].map(function() {
        return regl.framebuffer({
            depth: false,
            color: regl.texture({
                width: pixels,
                height: buckets,
            })
        });
    });

    this.dimensionsBuffer = regl.framebuffer({
        depth: false,
        color: regl.texture({
            width: 1,
            height: buckets,
        })
    });

    this.boundriesBuffer = regl.framebuffer({
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
                    gl_FragColor = vec4(0);
                    return;
                }
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

    this.findLargestDimension = regl({
        frag: `
            precision mediump float;
            uniform sampler2D buckets;
            uniform vec2 bucketsSize;
            uniform vec2 resolution;

            void main() {
                vec2 xy = gl_FragCoord.xy;
                vec2 uv = vec2(0, xy.y) / bucketsSize;
                vec4 sample = texture2D(buckets, uv);
                vec3 minValues = sample.rgb;
                vec3 maxValues = sample.rgb;

                for (float i = 1.; i < ${ pixels }.; i++) {
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

    this.setSortValue = regl({
        frag: `
            precision mediump float;
            uniform sampler2D buckets;
            uniform sampler2D dimensions;
            uniform vec2 resolution;

            void main() {
                vec2 uv = gl_FragCoord.xy / resolution;

                vec2 dimUv = vec2(0, uv.y);
                float dim = texture2D(dimensions, dimUv).r;
                vec4 sample = texture2D(buckets, uv);
                float value;

                if (dim == 0./2.) {
                    value = sample.r;
                } else if (dim == 1./2.) {
                    value = sample.g;
                } else {
                    value = sample.b;
                }

                sample.a = value;
                gl_FragColor = sample;
            }
        `,
        uniforms: {
            buckets: regl.prop('buckets'),
            dimensions: regl.prop('dimensions'),
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            }
        },
        framebuffer: regl.prop('destination')
    });

    this.sortBuckets = regl({
        frag: `
            precision mediump float;
            uniform sampler2D buckets;
            uniform sampler2D limits;
            uniform vec2 resolution;
            uniform float offset;

            void main() {
                vec2 uv = gl_FragCoord.xy / resolution;
                float limit = texture2D(limits, vec2(0, uv.y)).r;

                vec2 uvA = uv;
                vec2 uvB = uv;

                bool isA = mod(gl_FragCoord.x + offset, 2.) < 1.;

                if (isA) {
                    uvB.x += 1. / resolution.x;
                } else {
                    uvA.x -= 1. / resolution.x;
                }

                if (uvB.x > limit) {
                    gl_FragColor = texture2D(buckets, uv);
                    return;
                }

                vec4 a = texture2D(buckets, uvA);
                vec4 b = texture2D(buckets, uvB);

                if (isA) {
                    gl_FragColor = a.a < b.a ? a : b;
                } else {
                    gl_FragColor = a.a < b.a ? b : a;
                }
            }
        `,
        uniforms: {
            buckets: regl.prop('buckets'),
            limits: regl.prop('limits'),
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            },
            offset: regl.prop('offset')
        },
        framebuffer: regl.prop('destination')
    });

    this.findBoundries = regl({
        frag: `
            precision mediump float;
            uniform sampler2D buckets;
            uniform vec2 bucketsSize;
            uniform sampler2D dimensions;
            uniform vec2 resolution;
            uniform float offset;

            void main() {
                vec2 uv = gl_FragCoord.xy / resolution;
                vec2 minmax = texture2D(dimensions, uv).gb;
                float boundry = mix(minmax.x, minmax.y, .5);

                for (float i = 0.; i < ${ pixels }.; i++) {
                    uv.x = i / bucketsSize.x;
                    if (texture2D(buckets, uv).a > boundry) {
                        gl_FragColor = vec4(vec3(uv.x), 1);
                        return;
                    }
                }

                gl_FragColor = vec4(0,0,0,1);
            }
        `,
        uniforms: {
            buckets: regl.prop('buckets'),
            bucketsSize: [pixels, buckets],
            dimensions: regl.prop('dimensions'),
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            }
        },
        framebuffer: regl.prop('destination')
    });

    this.splitBuckets = regl({
        frag: `
            precision mediump float;
            uniform sampler2D buckets;
            uniform sampler2D boundries;
            uniform vec2 resolution;
            uniform float step;

            void main() {

                if (gl_FragCoord.y > pow(2., step + 1.)) {
                    discard;
                }

                vec2 uv = gl_FragCoord.xy / resolution;

                vec2 bucketUv = vec2(
                    gl_FragCoord.x,
                    mod(gl_FragCoord.y, pow(2., step))
                ) / resolution;

                bool isChild = uv != bucketUv;

                vec2 boundryUv = vec2(0, bucketUv.y);
                float boundry = texture2D(boundries, boundryUv).r;

                if (isChild) {
                    bucketUv.x += boundry;
                    if (bucketUv.x > 1.) {
                        gl_FragColor = vec4(0);
                        return;
                    }
                } else if (bucketUv.x > boundry) {
                    gl_FragColor = vec4(0);
                    return;
                }

                vec4 sample = texture2D(buckets, bucketUv);
                gl_FragColor = vec4(sample.rgb, 1);
            }
        `,
        uniforms: {
            buckets: regl.prop('buckets'),
            boundries: regl.prop('boundries'),
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            },
            step: regl.prop('step')
        },
        framebuffer: regl.prop('destination')
    });


    this.findBucketLimits = regl({
        frag: `
            precision mediump float;
            uniform sampler2D buckets;
            uniform vec2 bucketsSize;
            uniform vec2 resolution;

            void main() {
                vec2 uv = gl_FragCoord.xy / resolution;

                for (float i = 0.; i < ${ pixels }.; i++) {
                    uv.x = i / bucketsSize.x;
                    if (texture2D(buckets, uv).a == 0.) {
                        gl_FragColor = vec4(vec3(
                            (i - 1.) / bucketsSize.x
                        ), 1);
                        return;
                    }
                }

                gl_FragColor = vec4(1);
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


    this.debugPass = regl({
        frag: `
            precision mediump float;
            uniform sampler2D source;
            uniform vec2 resolution;

            void main() {
                vec2 uv = vec2(gl_FragCoord.xy / resolution.xy);
                gl_FragColor = vec4(texture2D(source, uv).rgb, 1.);
                //gl_FragColor = texture2D(source, uv);
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
        this.writeSourceIntoBucket({
            destination: this.bucketsBuffers[0]
        });

        for (var i = 0; i < Math.log2(this.buckets); i++) {

            this.findBucketLimits({
                buckets: this.bucketsBuffers[0],
                destination: this.boundriesBuffer
            });

            this.findLargestDimension({
                buckets: this.bucketsBuffers[0],
                destination: this.dimensionsBuffer
            });

            this.setSortValue({
                buckets: this.bucketsBuffers[0],
                dimensions: this.dimensionsBuffer,
                destination: this.bucketsBuffers[1]
            });

            for (var j = 0; j < this.pixels; j++) {
                this.sortBuckets({
                    buckets: this.bucketsBuffers[1],
                    limits: this.boundriesBuffer,
                    offset: 0,
                    destination: this.bucketsBuffers[0]
                });
                this.sortBuckets({
                    buckets: this.bucketsBuffers[0],
                    limits: this.boundriesBuffer,
                    offset: 1,
                    destination: this.bucketsBuffers[1]
                });
            }

            this.findBoundries({
                buckets: this.bucketsBuffers[1],
                dimensions: this.dimensionsBuffer,
                destination: this.boundriesBuffer
            });

            
            this.splitBuckets({
                buckets: this.bucketsBuffers[1],
                boundries: this.boundriesBuffer,
                step: i,
                destination: this.bucketsBuffers[0]
            });

        }

    }.bind(this));

    this.debugPass({
        source: this.bucketsBuffers[0],
        destination: this.bucketsBuffers[1]
    });
    // return this.boundriesBuffer;
    return this.bucketsBuffers[1];
};

module.exports = Quantize;
