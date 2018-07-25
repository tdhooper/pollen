var isPowerOfTwo = require('is-power-of-two');
var setupPass = require('./draw/setup-pass');


var Quantize = function(sourceBuffer, buckets) {

    if ( ! isPowerOfTwo(buckets)) {
        throw Error('buckets must be a power of 2');
    }

    var width = sourceBuffer.width;
    var height = sourceBuffer.height;

    this.bucketsBuffers = [0,0].map(function() {
        return regl.framebuffer({
            depth: false,
            color: regl.texture({
                width: width * height,
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
};

Quantize.prototype.process = function() {

    setupPass(function() {
        this.writeSourceIntoBucket({
            destination: this.bucketsBuffers[0]
        });
    }.bind(this));

    return this.bucketsBuffers[0];
};

module.exports = Quantize;
