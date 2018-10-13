var isPowerOfTwo = require('is-power-of-two');
var setupPass = require('./draw/setup-pass');


var Sort = function(sourceBuffer, getter) {

    var width = sourceBuffer.width;
    var height = sourceBuffer.height;
    var pixels = width * height;
    this.pixels = pixels;

    this.sourceBuffer = sourceBuffer;

    this.buffer = regl.framebuffer({
        depth: false,
        color: regl.texture({
            width: width,
            height: height,
        })
    });

    this.setSortValue = regl({
        frag: `
            precision mediump float;
            uniform sampler2D source;
            uniform vec2 resolution;

            ${ getter }

            void main() {
                vec2 uv = gl_FragCoord.xy / resolution;
                vec4 sample = texture2D(source, uv);
                sample.a = getValue(sample);
                gl_FragColor = sample;
            }
        `,
        uniforms: {
            source: regl.prop('source'),
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            }
        },
        framebuffer: regl.prop('destination')
    });

    this.sort = regl({
        frag: `
            precision mediump float;
            uniform sampler2D source;
            uniform vec2 resolution;
            uniform float offset;
            uniform bool vertical;

            void main() {
                vec2 uv = gl_FragCoord.xy / resolution;

                vec2 uvA = uv;
                vec2 uvB = uv;
                bool isA;

                if (vertical) {
                    isA = mod(gl_FragCoord.y + offset, 2.) < 1.;

                    if (isA) {
                        uvB.y += 1. / resolution.y;
                    } else {
                        uvA.y -= 1. / resolution.y;
                    }
                } else {
                    isA = mod(gl_FragCoord.x + offset, 2.) < 1.;

                    if (isA) {
                        uvB.x += 1. / resolution.x;
                    } else {
                        uvA.x -= 1. / resolution.x;
                    }
                }

                vec4 a = texture2D(source, uvA);
                vec4 b = texture2D(source, uvB);

                if (isA) {
                    gl_FragColor = a.a < b.a ? a : b;
                } else {
                    gl_FragColor = a.a < b.a ? b : a;
                }
            }
        `,
        uniforms: {
            source: regl.prop('source'),
            offset: regl.prop('offset'),
            vertical: regl.prop('vertical'),
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            }
        },
        framebuffer: regl.prop('destination')
    });

    this.result = regl({
        frag: `
            precision mediump float;
            uniform sampler2D source;
            uniform vec2 resolution;

            void main() {
                vec2 uv = gl_FragCoord.xy / resolution;
                vec4 sample = texture2D(source, uv);
                sample.a = 1.;
                gl_FragColor = sample;
            }
        `,
        uniforms: {
            source: regl.prop('source'),
            resolution: function(context) {
                return [context.framebufferWidth, context.framebufferHeight];
            }
        },
        framebuffer: regl.prop('destination')
    });
};

Sort.prototype.process = function(vertical) {

    vertical = !! vertical;

    setupPass(function() {
        this.setSortValue({
            source: this.sourceBuffer,
            destination: this.buffer
        });

        for (var j = 0; j < this.pixels; j++) {
            this.sort({
                source: this.buffer,
                offset: 0,
                vertical: vertical,
                destination: this.sourceBuffer
            });
            this.sort({
                source: this.sourceBuffer,
                offset: 1,
                vertical: vertical,
                destination: this.buffer
            });
        }

        this.result({
            source: this.buffer,
            destination: this.sourceBuffer
        });
    }.bind(this));

    return this.sourceBuffer;
};

module.exports = Sort;
