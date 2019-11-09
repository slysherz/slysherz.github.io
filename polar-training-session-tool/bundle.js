(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const {
    buildSession,
    describeSession,
    encodeSession,
    parse,
    SyntaxError
} = require('./polar-training')

const trainNameID = document.getElementById('train-name')
const textareaID = document.getElementById('input-box')
const outputID = document.getElementById('output')
const downloadButtonID = document.getElementById('download-button')

function countLines(str) {
    return str.split(/\r\n|\r|\n/).length
}

/******************************
 * RESPOND TO DOWNLOAD BUTTON *
 ******************************/

// Function to download data to a file
function download(data, filename, type) {
    var file = new Blob([data], { type: type });

    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement('a'),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

function saveTrain() {
    const input = textareaID.value
    const sessionName = trainNameID.value
    const data = encodeSession(buildSession(parse(input), sessionName))

    download(data, `${sessionName}.BPB`, 'binary')
}

downloadButtonID.onclick = saveTrain


/***********************************
 * RESPOND TO NEW DESCRIPTION TEXT *
 ***********************************/

function updateMessage() {
    let result = 'something went wrong'

    try {
        const input = textareaID.value
        const parsed = parse(input)
        const train = buildSession(parsed, trainNameID.value)

        try {
            result = describeSession(train.exerciseTarget[0].phases.phase, trainNameID.value)
        } catch (_) {
            result = 'Failed to generate session description. It should still work, though.'
        }

        downloadButtonID.disabled = false

    } catch (error) {
        if (error instanceof SyntaxError) {
            result = `Error at line ${error.location.start.line}, column ${error.location.start.column}:\n${error.message}`
        }

        console.log(error)
        downloadButtonID.disabled = true
    }

    outputID.textContent = '' + result
}

// Set training session name to current date
trainNameID.defaultValue = new Date().toISOString().slice(0, 10)

// Change tab key to work like in a text editor
textareaID.onkeydown = function (e) {
    if (e.keyCode === 9 || e.which === 9) {
        e.preventDefault();
        var s = this.selectionStart;
        this.value = this.value.substring(0, this.selectionStart) + "\t" + this.value.substring(this.selectionEnd);
        this.selectionEnd = s + 1;
    }
}

// Show output when there's user input
textareaID.addEventListener('input', updateMessage)
trainNameID.addEventListener('input', updateMessage)

// Show the output for the default training session
updateMessage()


/********************
 * EXAMPLES SECTION *
 ********************/

// We dynamically generate HTML code for these usage examples:
const usageExamples = [
    {
        title: 'Multiple phases',
        blocks: [
            `10' warmup + 60' R1`,
            `
10' warmup
60' R1
            `
        ]
    },
    {
        title: 'Repeatition blocks',
        blocks: [
            `6x(1' R2 + 30'' R0)`,
            `
6x( 1' R2
    30'' R0)
            `
        ]
    },
    {
        title: 'Repetition inside repetition',
        blocks: [
            `
3x(
    6x( 1'30'' R2
        30'' R0)
    5' R0)
            `
        ]
    },
    {
        title: 'Repetitions skipping last phase',
        details: 'We want to skip the last 1\' R0 phase because it\'s followed\nby a 5\' R0 phase: we use the / symbol for that.',
        blocks: [
            `
3x( 
    6x( 1' R2
        / 1' R0)
    5' R0)
            `,
            `
3x( 
    6x(1' R2 / 1' R0)
    5' R0)
            `
        ]
    },
    {
        title: 'Complete examples',
        blocks: [
            `
10' warmup R1
4x( 4' R3
    2' rec R0)
3x( 6' R2
    2' rec R0)
4x( 4' R3
    / 2' rec R0)
10' R1            
            `,
            `
10' warmup
2x(
	4x(	
		5'45'' R2
		15'' R4
		/ 2' R0)
	/ 5' R0)
10' R1
            `
        ]
    }
]

const usageExamplesID =  document.getElementById('usage-examples')
let output = ''
for (const example of usageExamples) {
    output += `<h4>${example.title}</h4>`

    if (example.details) {
        output += `<p>${example.details}</p>`
    }

    const blocks = example.blocks.map(b => b.trim())
    const lines = blocks.reduce((l, t) => Math.max(l, countLines(t)), 1)

    for (const block of blocks) {
        output += `
        <textarea rows='${lines}' cols='25' readonly spellcheck='false'>${block}</textarea>`
    }
}

usageExamplesID.innerHTML = output

/** END **/
},{"./polar-training":23}],2:[function(require,module,exports){
"use strict";
module.exports = asPromise;

/**
 * Callback as used by {@link util.asPromise}.
 * @typedef asPromiseCallback
 * @type {function}
 * @param {Error|null} error Error, if any
 * @param {...*} params Additional arguments
 * @returns {undefined}
 */

/**
 * Returns a promise from a node-style callback function.
 * @memberof util
 * @param {asPromiseCallback} fn Function to call
 * @param {*} ctx Function context
 * @param {...*} params Function arguments
 * @returns {Promise<*>} Promisified function
 */
function asPromise(fn, ctx/*, varargs */) {
    var params  = new Array(arguments.length - 1),
        offset  = 0,
        index   = 2,
        pending = true;
    while (index < arguments.length)
        params[offset++] = arguments[index++];
    return new Promise(function executor(resolve, reject) {
        params[offset] = function callback(err/*, varargs */) {
            if (pending) {
                pending = false;
                if (err)
                    reject(err);
                else {
                    var params = new Array(arguments.length - 1),
                        offset = 0;
                    while (offset < params.length)
                        params[offset++] = arguments[offset];
                    resolve.apply(null, params);
                }
            }
        };
        try {
            fn.apply(ctx || null, params);
        } catch (err) {
            if (pending) {
                pending = false;
                reject(err);
            }
        }
    });
}

},{}],3:[function(require,module,exports){
"use strict";

/**
 * A minimal base64 implementation for number arrays.
 * @memberof util
 * @namespace
 */
var base64 = exports;

/**
 * Calculates the byte length of a base64 encoded string.
 * @param {string} string Base64 encoded string
 * @returns {number} Byte length
 */
base64.length = function length(string) {
    var p = string.length;
    if (!p)
        return 0;
    var n = 0;
    while (--p % 4 > 1 && string.charAt(p) === "=")
        ++n;
    return Math.ceil(string.length * 3) / 4 - n;
};

// Base64 encoding table
var b64 = new Array(64);

// Base64 decoding table
var s64 = new Array(123);

// 65..90, 97..122, 48..57, 43, 47
for (var i = 0; i < 64;)
    s64[b64[i] = i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i - 59 | 43] = i++;

/**
 * Encodes a buffer to a base64 encoded string.
 * @param {Uint8Array} buffer Source buffer
 * @param {number} start Source start
 * @param {number} end Source end
 * @returns {string} Base64 encoded string
 */
base64.encode = function encode(buffer, start, end) {
    var parts = null,
        chunk = [];
    var i = 0, // output index
        j = 0, // goto index
        t;     // temporary
    while (start < end) {
        var b = buffer[start++];
        switch (j) {
            case 0:
                chunk[i++] = b64[b >> 2];
                t = (b & 3) << 4;
                j = 1;
                break;
            case 1:
                chunk[i++] = b64[t | b >> 4];
                t = (b & 15) << 2;
                j = 2;
                break;
            case 2:
                chunk[i++] = b64[t | b >> 6];
                chunk[i++] = b64[b & 63];
                j = 0;
                break;
        }
        if (i > 8191) {
            (parts || (parts = [])).push(String.fromCharCode.apply(String, chunk));
            i = 0;
        }
    }
    if (j) {
        chunk[i++] = b64[t];
        chunk[i++] = 61;
        if (j === 1)
            chunk[i++] = 61;
    }
    if (parts) {
        if (i)
            parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)));
        return parts.join("");
    }
    return String.fromCharCode.apply(String, chunk.slice(0, i));
};

var invalidEncoding = "invalid encoding";

/**
 * Decodes a base64 encoded string to a buffer.
 * @param {string} string Source string
 * @param {Uint8Array} buffer Destination buffer
 * @param {number} offset Destination offset
 * @returns {number} Number of bytes written
 * @throws {Error} If encoding is invalid
 */
base64.decode = function decode(string, buffer, offset) {
    var start = offset;
    var j = 0, // goto index
        t;     // temporary
    for (var i = 0; i < string.length;) {
        var c = string.charCodeAt(i++);
        if (c === 61 && j > 1)
            break;
        if ((c = s64[c]) === undefined)
            throw Error(invalidEncoding);
        switch (j) {
            case 0:
                t = c;
                j = 1;
                break;
            case 1:
                buffer[offset++] = t << 2 | (c & 48) >> 4;
                t = c;
                j = 2;
                break;
            case 2:
                buffer[offset++] = (t & 15) << 4 | (c & 60) >> 2;
                t = c;
                j = 3;
                break;
            case 3:
                buffer[offset++] = (t & 3) << 6 | c;
                j = 0;
                break;
        }
    }
    if (j === 1)
        throw Error(invalidEncoding);
    return offset - start;
};

/**
 * Tests if the specified string appears to be base64 encoded.
 * @param {string} string String to test
 * @returns {boolean} `true` if probably base64 encoded, otherwise false
 */
base64.test = function test(string) {
    return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(string);
};

},{}],4:[function(require,module,exports){
"use strict";
module.exports = EventEmitter;

/**
 * Constructs a new event emitter instance.
 * @classdesc A minimal event emitter.
 * @memberof util
 * @constructor
 */
function EventEmitter() {

    /**
     * Registered listeners.
     * @type {Object.<string,*>}
     * @private
     */
    this._listeners = {};
}

/**
 * Registers an event listener.
 * @param {string} evt Event name
 * @param {function} fn Listener
 * @param {*} [ctx] Listener context
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.on = function on(evt, fn, ctx) {
    (this._listeners[evt] || (this._listeners[evt] = [])).push({
        fn  : fn,
        ctx : ctx || this
    });
    return this;
};

/**
 * Removes an event listener or any matching listeners if arguments are omitted.
 * @param {string} [evt] Event name. Removes all listeners if omitted.
 * @param {function} [fn] Listener to remove. Removes all listeners of `evt` if omitted.
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.off = function off(evt, fn) {
    if (evt === undefined)
        this._listeners = {};
    else {
        if (fn === undefined)
            this._listeners[evt] = [];
        else {
            var listeners = this._listeners[evt];
            for (var i = 0; i < listeners.length;)
                if (listeners[i].fn === fn)
                    listeners.splice(i, 1);
                else
                    ++i;
        }
    }
    return this;
};

/**
 * Emits an event by calling its listeners with the specified arguments.
 * @param {string} evt Event name
 * @param {...*} args Arguments
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.emit = function emit(evt) {
    var listeners = this._listeners[evt];
    if (listeners) {
        var args = [],
            i = 1;
        for (; i < arguments.length;)
            args.push(arguments[i++]);
        for (i = 0; i < listeners.length;)
            listeners[i].fn.apply(listeners[i++].ctx, args);
    }
    return this;
};

},{}],5:[function(require,module,exports){
"use strict";

module.exports = factory(factory);

/**
 * Reads / writes floats / doubles from / to buffers.
 * @name util.float
 * @namespace
 */

/**
 * Writes a 32 bit float to a buffer using little endian byte order.
 * @name util.float.writeFloatLE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Writes a 32 bit float to a buffer using big endian byte order.
 * @name util.float.writeFloatBE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Reads a 32 bit float from a buffer using little endian byte order.
 * @name util.float.readFloatLE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Reads a 32 bit float from a buffer using big endian byte order.
 * @name util.float.readFloatBE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Writes a 64 bit double to a buffer using little endian byte order.
 * @name util.float.writeDoubleLE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Writes a 64 bit double to a buffer using big endian byte order.
 * @name util.float.writeDoubleBE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Reads a 64 bit double from a buffer using little endian byte order.
 * @name util.float.readDoubleLE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Reads a 64 bit double from a buffer using big endian byte order.
 * @name util.float.readDoubleBE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

// Factory function for the purpose of node-based testing in modified global environments
function factory(exports) {

    // float: typed array
    if (typeof Float32Array !== "undefined") (function() {

        var f32 = new Float32Array([ -0 ]),
            f8b = new Uint8Array(f32.buffer),
            le  = f8b[3] === 128;

        function writeFloat_f32_cpy(val, buf, pos) {
            f32[0] = val;
            buf[pos    ] = f8b[0];
            buf[pos + 1] = f8b[1];
            buf[pos + 2] = f8b[2];
            buf[pos + 3] = f8b[3];
        }

        function writeFloat_f32_rev(val, buf, pos) {
            f32[0] = val;
            buf[pos    ] = f8b[3];
            buf[pos + 1] = f8b[2];
            buf[pos + 2] = f8b[1];
            buf[pos + 3] = f8b[0];
        }

        /* istanbul ignore next */
        exports.writeFloatLE = le ? writeFloat_f32_cpy : writeFloat_f32_rev;
        /* istanbul ignore next */
        exports.writeFloatBE = le ? writeFloat_f32_rev : writeFloat_f32_cpy;

        function readFloat_f32_cpy(buf, pos) {
            f8b[0] = buf[pos    ];
            f8b[1] = buf[pos + 1];
            f8b[2] = buf[pos + 2];
            f8b[3] = buf[pos + 3];
            return f32[0];
        }

        function readFloat_f32_rev(buf, pos) {
            f8b[3] = buf[pos    ];
            f8b[2] = buf[pos + 1];
            f8b[1] = buf[pos + 2];
            f8b[0] = buf[pos + 3];
            return f32[0];
        }

        /* istanbul ignore next */
        exports.readFloatLE = le ? readFloat_f32_cpy : readFloat_f32_rev;
        /* istanbul ignore next */
        exports.readFloatBE = le ? readFloat_f32_rev : readFloat_f32_cpy;

    // float: ieee754
    })(); else (function() {

        function writeFloat_ieee754(writeUint, val, buf, pos) {
            var sign = val < 0 ? 1 : 0;
            if (sign)
                val = -val;
            if (val === 0)
                writeUint(1 / val > 0 ? /* positive */ 0 : /* negative 0 */ 2147483648, buf, pos);
            else if (isNaN(val))
                writeUint(2143289344, buf, pos);
            else if (val > 3.4028234663852886e+38) // +-Infinity
                writeUint((sign << 31 | 2139095040) >>> 0, buf, pos);
            else if (val < 1.1754943508222875e-38) // denormal
                writeUint((sign << 31 | Math.round(val / 1.401298464324817e-45)) >>> 0, buf, pos);
            else {
                var exponent = Math.floor(Math.log(val) / Math.LN2),
                    mantissa = Math.round(val * Math.pow(2, -exponent) * 8388608) & 8388607;
                writeUint((sign << 31 | exponent + 127 << 23 | mantissa) >>> 0, buf, pos);
            }
        }

        exports.writeFloatLE = writeFloat_ieee754.bind(null, writeUintLE);
        exports.writeFloatBE = writeFloat_ieee754.bind(null, writeUintBE);

        function readFloat_ieee754(readUint, buf, pos) {
            var uint = readUint(buf, pos),
                sign = (uint >> 31) * 2 + 1,
                exponent = uint >>> 23 & 255,
                mantissa = uint & 8388607;
            return exponent === 255
                ? mantissa
                ? NaN
                : sign * Infinity
                : exponent === 0 // denormal
                ? sign * 1.401298464324817e-45 * mantissa
                : sign * Math.pow(2, exponent - 150) * (mantissa + 8388608);
        }

        exports.readFloatLE = readFloat_ieee754.bind(null, readUintLE);
        exports.readFloatBE = readFloat_ieee754.bind(null, readUintBE);

    })();

    // double: typed array
    if (typeof Float64Array !== "undefined") (function() {

        var f64 = new Float64Array([-0]),
            f8b = new Uint8Array(f64.buffer),
            le  = f8b[7] === 128;

        function writeDouble_f64_cpy(val, buf, pos) {
            f64[0] = val;
            buf[pos    ] = f8b[0];
            buf[pos + 1] = f8b[1];
            buf[pos + 2] = f8b[2];
            buf[pos + 3] = f8b[3];
            buf[pos + 4] = f8b[4];
            buf[pos + 5] = f8b[5];
            buf[pos + 6] = f8b[6];
            buf[pos + 7] = f8b[7];
        }

        function writeDouble_f64_rev(val, buf, pos) {
            f64[0] = val;
            buf[pos    ] = f8b[7];
            buf[pos + 1] = f8b[6];
            buf[pos + 2] = f8b[5];
            buf[pos + 3] = f8b[4];
            buf[pos + 4] = f8b[3];
            buf[pos + 5] = f8b[2];
            buf[pos + 6] = f8b[1];
            buf[pos + 7] = f8b[0];
        }

        /* istanbul ignore next */
        exports.writeDoubleLE = le ? writeDouble_f64_cpy : writeDouble_f64_rev;
        /* istanbul ignore next */
        exports.writeDoubleBE = le ? writeDouble_f64_rev : writeDouble_f64_cpy;

        function readDouble_f64_cpy(buf, pos) {
            f8b[0] = buf[pos    ];
            f8b[1] = buf[pos + 1];
            f8b[2] = buf[pos + 2];
            f8b[3] = buf[pos + 3];
            f8b[4] = buf[pos + 4];
            f8b[5] = buf[pos + 5];
            f8b[6] = buf[pos + 6];
            f8b[7] = buf[pos + 7];
            return f64[0];
        }

        function readDouble_f64_rev(buf, pos) {
            f8b[7] = buf[pos    ];
            f8b[6] = buf[pos + 1];
            f8b[5] = buf[pos + 2];
            f8b[4] = buf[pos + 3];
            f8b[3] = buf[pos + 4];
            f8b[2] = buf[pos + 5];
            f8b[1] = buf[pos + 6];
            f8b[0] = buf[pos + 7];
            return f64[0];
        }

        /* istanbul ignore next */
        exports.readDoubleLE = le ? readDouble_f64_cpy : readDouble_f64_rev;
        /* istanbul ignore next */
        exports.readDoubleBE = le ? readDouble_f64_rev : readDouble_f64_cpy;

    // double: ieee754
    })(); else (function() {

        function writeDouble_ieee754(writeUint, off0, off1, val, buf, pos) {
            var sign = val < 0 ? 1 : 0;
            if (sign)
                val = -val;
            if (val === 0) {
                writeUint(0, buf, pos + off0);
                writeUint(1 / val > 0 ? /* positive */ 0 : /* negative 0 */ 2147483648, buf, pos + off1);
            } else if (isNaN(val)) {
                writeUint(0, buf, pos + off0);
                writeUint(2146959360, buf, pos + off1);
            } else if (val > 1.7976931348623157e+308) { // +-Infinity
                writeUint(0, buf, pos + off0);
                writeUint((sign << 31 | 2146435072) >>> 0, buf, pos + off1);
            } else {
                var mantissa;
                if (val < 2.2250738585072014e-308) { // denormal
                    mantissa = val / 5e-324;
                    writeUint(mantissa >>> 0, buf, pos + off0);
                    writeUint((sign << 31 | mantissa / 4294967296) >>> 0, buf, pos + off1);
                } else {
                    var exponent = Math.floor(Math.log(val) / Math.LN2);
                    if (exponent === 1024)
                        exponent = 1023;
                    mantissa = val * Math.pow(2, -exponent);
                    writeUint(mantissa * 4503599627370496 >>> 0, buf, pos + off0);
                    writeUint((sign << 31 | exponent + 1023 << 20 | mantissa * 1048576 & 1048575) >>> 0, buf, pos + off1);
                }
            }
        }

        exports.writeDoubleLE = writeDouble_ieee754.bind(null, writeUintLE, 0, 4);
        exports.writeDoubleBE = writeDouble_ieee754.bind(null, writeUintBE, 4, 0);

        function readDouble_ieee754(readUint, off0, off1, buf, pos) {
            var lo = readUint(buf, pos + off0),
                hi = readUint(buf, pos + off1);
            var sign = (hi >> 31) * 2 + 1,
                exponent = hi >>> 20 & 2047,
                mantissa = 4294967296 * (hi & 1048575) + lo;
            return exponent === 2047
                ? mantissa
                ? NaN
                : sign * Infinity
                : exponent === 0 // denormal
                ? sign * 5e-324 * mantissa
                : sign * Math.pow(2, exponent - 1075) * (mantissa + 4503599627370496);
        }

        exports.readDoubleLE = readDouble_ieee754.bind(null, readUintLE, 0, 4);
        exports.readDoubleBE = readDouble_ieee754.bind(null, readUintBE, 4, 0);

    })();

    return exports;
}

// uint helpers

function writeUintLE(val, buf, pos) {
    buf[pos    ] =  val        & 255;
    buf[pos + 1] =  val >>> 8  & 255;
    buf[pos + 2] =  val >>> 16 & 255;
    buf[pos + 3] =  val >>> 24;
}

function writeUintBE(val, buf, pos) {
    buf[pos    ] =  val >>> 24;
    buf[pos + 1] =  val >>> 16 & 255;
    buf[pos + 2] =  val >>> 8  & 255;
    buf[pos + 3] =  val        & 255;
}

function readUintLE(buf, pos) {
    return (buf[pos    ]
          | buf[pos + 1] << 8
          | buf[pos + 2] << 16
          | buf[pos + 3] << 24) >>> 0;
}

function readUintBE(buf, pos) {
    return (buf[pos    ] << 24
          | buf[pos + 1] << 16
          | buf[pos + 2] << 8
          | buf[pos + 3]) >>> 0;
}

},{}],6:[function(require,module,exports){
"use strict";
module.exports = inquire;

/**
 * Requires a module only if available.
 * @memberof util
 * @param {string} moduleName Module to require
 * @returns {?Object} Required module if available and not empty, otherwise `null`
 */
function inquire(moduleName) {
    try {
        var mod = eval("quire".replace(/^/,"re"))(moduleName); // eslint-disable-line no-eval
        if (mod && (mod.length || Object.keys(mod).length))
            return mod;
    } catch (e) {} // eslint-disable-line no-empty
    return null;
}

},{}],7:[function(require,module,exports){
"use strict";
module.exports = pool;

/**
 * An allocator as used by {@link util.pool}.
 * @typedef PoolAllocator
 * @type {function}
 * @param {number} size Buffer size
 * @returns {Uint8Array} Buffer
 */

/**
 * A slicer as used by {@link util.pool}.
 * @typedef PoolSlicer
 * @type {function}
 * @param {number} start Start offset
 * @param {number} end End offset
 * @returns {Uint8Array} Buffer slice
 * @this {Uint8Array}
 */

/**
 * A general purpose buffer pool.
 * @memberof util
 * @function
 * @param {PoolAllocator} alloc Allocator
 * @param {PoolSlicer} slice Slicer
 * @param {number} [size=8192] Slab size
 * @returns {PoolAllocator} Pooled allocator
 */
function pool(alloc, slice, size) {
    var SIZE   = size || 8192;
    var MAX    = SIZE >>> 1;
    var slab   = null;
    var offset = SIZE;
    return function pool_alloc(size) {
        if (size < 1 || size > MAX)
            return alloc(size);
        if (offset + size > SIZE) {
            slab = alloc(SIZE);
            offset = 0;
        }
        var buf = slice.call(slab, offset, offset += size);
        if (offset & 7) // align to 32 bit
            offset = (offset | 7) + 1;
        return buf;
    };
}

},{}],8:[function(require,module,exports){
"use strict";

/**
 * A minimal UTF8 implementation for number arrays.
 * @memberof util
 * @namespace
 */
var utf8 = exports;

/**
 * Calculates the UTF8 byte length of a string.
 * @param {string} string String
 * @returns {number} Byte length
 */
utf8.length = function utf8_length(string) {
    var len = 0,
        c = 0;
    for (var i = 0; i < string.length; ++i) {
        c = string.charCodeAt(i);
        if (c < 128)
            len += 1;
        else if (c < 2048)
            len += 2;
        else if ((c & 0xFC00) === 0xD800 && (string.charCodeAt(i + 1) & 0xFC00) === 0xDC00) {
            ++i;
            len += 4;
        } else
            len += 3;
    }
    return len;
};

/**
 * Reads UTF8 bytes as a string.
 * @param {Uint8Array} buffer Source buffer
 * @param {number} start Source start
 * @param {number} end Source end
 * @returns {string} String read
 */
utf8.read = function utf8_read(buffer, start, end) {
    var len = end - start;
    if (len < 1)
        return "";
    var parts = null,
        chunk = [],
        i = 0, // char offset
        t;     // temporary
    while (start < end) {
        t = buffer[start++];
        if (t < 128)
            chunk[i++] = t;
        else if (t > 191 && t < 224)
            chunk[i++] = (t & 31) << 6 | buffer[start++] & 63;
        else if (t > 239 && t < 365) {
            t = ((t & 7) << 18 | (buffer[start++] & 63) << 12 | (buffer[start++] & 63) << 6 | buffer[start++] & 63) - 0x10000;
            chunk[i++] = 0xD800 + (t >> 10);
            chunk[i++] = 0xDC00 + (t & 1023);
        } else
            chunk[i++] = (t & 15) << 12 | (buffer[start++] & 63) << 6 | buffer[start++] & 63;
        if (i > 8191) {
            (parts || (parts = [])).push(String.fromCharCode.apply(String, chunk));
            i = 0;
        }
    }
    if (parts) {
        if (i)
            parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)));
        return parts.join("");
    }
    return String.fromCharCode.apply(String, chunk.slice(0, i));
};

/**
 * Writes a string as UTF8 bytes.
 * @param {string} string Source string
 * @param {Uint8Array} buffer Destination buffer
 * @param {number} offset Destination offset
 * @returns {number} Bytes written
 */
utf8.write = function utf8_write(string, buffer, offset) {
    var start = offset,
        c1, // character 1
        c2; // character 2
    for (var i = 0; i < string.length; ++i) {
        c1 = string.charCodeAt(i);
        if (c1 < 128) {
            buffer[offset++] = c1;
        } else if (c1 < 2048) {
            buffer[offset++] = c1 >> 6       | 192;
            buffer[offset++] = c1       & 63 | 128;
        } else if ((c1 & 0xFC00) === 0xD800 && ((c2 = string.charCodeAt(i + 1)) & 0xFC00) === 0xDC00) {
            c1 = 0x10000 + ((c1 & 0x03FF) << 10) + (c2 & 0x03FF);
            ++i;
            buffer[offset++] = c1 >> 18      | 240;
            buffer[offset++] = c1 >> 12 & 63 | 128;
            buffer[offset++] = c1 >> 6  & 63 | 128;
            buffer[offset++] = c1       & 63 | 128;
        } else {
            buffer[offset++] = c1 >> 12      | 224;
            buffer[offset++] = c1 >> 6  & 63 | 128;
            buffer[offset++] = c1       & 63 | 128;
        }
    }
    return offset - start;
};

},{}],9:[function(require,module,exports){
// minimal library entry point.

"use strict";
module.exports = require("./src/index-minimal");

},{"./src/index-minimal":10}],10:[function(require,module,exports){
"use strict";
var protobuf = exports;

/**
 * Build type, one of `"full"`, `"light"` or `"minimal"`.
 * @name build
 * @type {string}
 * @const
 */
protobuf.build = "minimal";

// Serialization
protobuf.Writer       = require("./writer");
protobuf.BufferWriter = require("./writer_buffer");
protobuf.Reader       = require("./reader");
protobuf.BufferReader = require("./reader_buffer");

// Utility
protobuf.util         = require("./util/minimal");
protobuf.rpc          = require("./rpc");
protobuf.roots        = require("./roots");
protobuf.configure    = configure;

/* istanbul ignore next */
/**
 * Reconfigures the library according to the environment.
 * @returns {undefined}
 */
function configure() {
    protobuf.Reader._configure(protobuf.BufferReader);
    protobuf.util._configure();
}

// Set up buffer utility according to the environment
protobuf.Writer._configure(protobuf.BufferWriter);
configure();

},{"./reader":11,"./reader_buffer":12,"./roots":13,"./rpc":14,"./util/minimal":17,"./writer":18,"./writer_buffer":19}],11:[function(require,module,exports){
"use strict";
module.exports = Reader;

var util      = require("./util/minimal");

var BufferReader; // cyclic

var LongBits  = util.LongBits,
    utf8      = util.utf8;

/* istanbul ignore next */
function indexOutOfRange(reader, writeLength) {
    return RangeError("index out of range: " + reader.pos + " + " + (writeLength || 1) + " > " + reader.len);
}

/**
 * Constructs a new reader instance using the specified buffer.
 * @classdesc Wire format reader using `Uint8Array` if available, otherwise `Array`.
 * @constructor
 * @param {Uint8Array} buffer Buffer to read from
 */
function Reader(buffer) {

    /**
     * Read buffer.
     * @type {Uint8Array}
     */
    this.buf = buffer;

    /**
     * Read buffer position.
     * @type {number}
     */
    this.pos = 0;

    /**
     * Read buffer length.
     * @type {number}
     */
    this.len = buffer.length;
}

var create_array = typeof Uint8Array !== "undefined"
    ? function create_typed_array(buffer) {
        if (buffer instanceof Uint8Array || Array.isArray(buffer))
            return new Reader(buffer);
        throw Error("illegal buffer");
    }
    /* istanbul ignore next */
    : function create_array(buffer) {
        if (Array.isArray(buffer))
            return new Reader(buffer);
        throw Error("illegal buffer");
    };

/**
 * Creates a new reader using the specified buffer.
 * @function
 * @param {Uint8Array|Buffer} buffer Buffer to read from
 * @returns {Reader|BufferReader} A {@link BufferReader} if `buffer` is a Buffer, otherwise a {@link Reader}
 * @throws {Error} If `buffer` is not a valid buffer
 */
Reader.create = util.Buffer
    ? function create_buffer_setup(buffer) {
        return (Reader.create = function create_buffer(buffer) {
            return util.Buffer.isBuffer(buffer)
                ? new BufferReader(buffer)
                /* istanbul ignore next */
                : create_array(buffer);
        })(buffer);
    }
    /* istanbul ignore next */
    : create_array;

Reader.prototype._slice = util.Array.prototype.subarray || /* istanbul ignore next */ util.Array.prototype.slice;

/**
 * Reads a varint as an unsigned 32 bit value.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.uint32 = (function read_uint32_setup() {
    var value = 4294967295; // optimizer type-hint, tends to deopt otherwise (?!)
    return function read_uint32() {
        value = (         this.buf[this.pos] & 127       ) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) <<  7) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 14) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 21) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] &  15) << 28) >>> 0; if (this.buf[this.pos++] < 128) return value;

        /* istanbul ignore if */
        if ((this.pos += 5) > this.len) {
            this.pos = this.len;
            throw indexOutOfRange(this, 10);
        }
        return value;
    };
})();

/**
 * Reads a varint as a signed 32 bit value.
 * @returns {number} Value read
 */
Reader.prototype.int32 = function read_int32() {
    return this.uint32() | 0;
};

/**
 * Reads a zig-zag encoded varint as a signed 32 bit value.
 * @returns {number} Value read
 */
Reader.prototype.sint32 = function read_sint32() {
    var value = this.uint32();
    return value >>> 1 ^ -(value & 1) | 0;
};

/* eslint-disable no-invalid-this */

function readLongVarint() {
    // tends to deopt with local vars for octet etc.
    var bits = new LongBits(0, 0);
    var i = 0;
    if (this.len - this.pos > 4) { // fast route (lo)
        for (; i < 4; ++i) {
            // 1st..4th
            bits.lo = (bits.lo | (this.buf[this.pos] & 127) << i * 7) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
        // 5th
        bits.lo = (bits.lo | (this.buf[this.pos] & 127) << 28) >>> 0;
        bits.hi = (bits.hi | (this.buf[this.pos] & 127) >>  4) >>> 0;
        if (this.buf[this.pos++] < 128)
            return bits;
        i = 0;
    } else {
        for (; i < 3; ++i) {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
            // 1st..3th
            bits.lo = (bits.lo | (this.buf[this.pos] & 127) << i * 7) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
        // 4th
        bits.lo = (bits.lo | (this.buf[this.pos++] & 127) << i * 7) >>> 0;
        return bits;
    }
    if (this.len - this.pos > 4) { // fast route (hi)
        for (; i < 5; ++i) {
            // 6th..10th
            bits.hi = (bits.hi | (this.buf[this.pos] & 127) << i * 7 + 3) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
    } else {
        for (; i < 5; ++i) {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
            // 6th..10th
            bits.hi = (bits.hi | (this.buf[this.pos] & 127) << i * 7 + 3) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
    }
    /* istanbul ignore next */
    throw Error("invalid varint encoding");
}

/* eslint-enable no-invalid-this */

/**
 * Reads a varint as a signed 64 bit value.
 * @name Reader#int64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a varint as an unsigned 64 bit value.
 * @name Reader#uint64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a zig-zag encoded varint as a signed 64 bit value.
 * @name Reader#sint64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a varint as a boolean.
 * @returns {boolean} Value read
 */
Reader.prototype.bool = function read_bool() {
    return this.uint32() !== 0;
};

function readFixed32_end(buf, end) { // note that this uses `end`, not `pos`
    return (buf[end - 4]
          | buf[end - 3] << 8
          | buf[end - 2] << 16
          | buf[end - 1] << 24) >>> 0;
}

/**
 * Reads fixed 32 bits as an unsigned 32 bit integer.
 * @returns {number} Value read
 */
Reader.prototype.fixed32 = function read_fixed32() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    return readFixed32_end(this.buf, this.pos += 4);
};

/**
 * Reads fixed 32 bits as a signed 32 bit integer.
 * @returns {number} Value read
 */
Reader.prototype.sfixed32 = function read_sfixed32() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    return readFixed32_end(this.buf, this.pos += 4) | 0;
};

/* eslint-disable no-invalid-this */

function readFixed64(/* this: Reader */) {

    /* istanbul ignore if */
    if (this.pos + 8 > this.len)
        throw indexOutOfRange(this, 8);

    return new LongBits(readFixed32_end(this.buf, this.pos += 4), readFixed32_end(this.buf, this.pos += 4));
}

/* eslint-enable no-invalid-this */

/**
 * Reads fixed 64 bits.
 * @name Reader#fixed64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads zig-zag encoded fixed 64 bits.
 * @name Reader#sfixed64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a float (32 bit) as a number.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.float = function read_float() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    var value = util.float.readFloatLE(this.buf, this.pos);
    this.pos += 4;
    return value;
};

/**
 * Reads a double (64 bit float) as a number.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.double = function read_double() {

    /* istanbul ignore if */
    if (this.pos + 8 > this.len)
        throw indexOutOfRange(this, 4);

    var value = util.float.readDoubleLE(this.buf, this.pos);
    this.pos += 8;
    return value;
};

/**
 * Reads a sequence of bytes preceeded by its length as a varint.
 * @returns {Uint8Array} Value read
 */
Reader.prototype.bytes = function read_bytes() {
    var length = this.uint32(),
        start  = this.pos,
        end    = this.pos + length;

    /* istanbul ignore if */
    if (end > this.len)
        throw indexOutOfRange(this, length);

    this.pos += length;
    if (Array.isArray(this.buf)) // plain array
        return this.buf.slice(start, end);
    return start === end // fix for IE 10/Win8 and others' subarray returning array of size 1
        ? new this.buf.constructor(0)
        : this._slice.call(this.buf, start, end);
};

/**
 * Reads a string preceeded by its byte length as a varint.
 * @returns {string} Value read
 */
Reader.prototype.string = function read_string() {
    var bytes = this.bytes();
    return utf8.read(bytes, 0, bytes.length);
};

/**
 * Skips the specified number of bytes if specified, otherwise skips a varint.
 * @param {number} [length] Length if known, otherwise a varint is assumed
 * @returns {Reader} `this`
 */
Reader.prototype.skip = function skip(length) {
    if (typeof length === "number") {
        /* istanbul ignore if */
        if (this.pos + length > this.len)
            throw indexOutOfRange(this, length);
        this.pos += length;
    } else {
        do {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
        } while (this.buf[this.pos++] & 128);
    }
    return this;
};

/**
 * Skips the next element of the specified wire type.
 * @param {number} wireType Wire type received
 * @returns {Reader} `this`
 */
Reader.prototype.skipType = function(wireType) {
    switch (wireType) {
        case 0:
            this.skip();
            break;
        case 1:
            this.skip(8);
            break;
        case 2:
            this.skip(this.uint32());
            break;
        case 3:
            while ((wireType = this.uint32() & 7) !== 4) {
                this.skipType(wireType);
            }
            break;
        case 5:
            this.skip(4);
            break;

        /* istanbul ignore next */
        default:
            throw Error("invalid wire type " + wireType + " at offset " + this.pos);
    }
    return this;
};

Reader._configure = function(BufferReader_) {
    BufferReader = BufferReader_;

    var fn = util.Long ? "toLong" : /* istanbul ignore next */ "toNumber";
    util.merge(Reader.prototype, {

        int64: function read_int64() {
            return readLongVarint.call(this)[fn](false);
        },

        uint64: function read_uint64() {
            return readLongVarint.call(this)[fn](true);
        },

        sint64: function read_sint64() {
            return readLongVarint.call(this).zzDecode()[fn](false);
        },

        fixed64: function read_fixed64() {
            return readFixed64.call(this)[fn](true);
        },

        sfixed64: function read_sfixed64() {
            return readFixed64.call(this)[fn](false);
        }

    });
};

},{"./util/minimal":17}],12:[function(require,module,exports){
"use strict";
module.exports = BufferReader;

// extends Reader
var Reader = require("./reader");
(BufferReader.prototype = Object.create(Reader.prototype)).constructor = BufferReader;

var util = require("./util/minimal");

/**
 * Constructs a new buffer reader instance.
 * @classdesc Wire format reader using node buffers.
 * @extends Reader
 * @constructor
 * @param {Buffer} buffer Buffer to read from
 */
function BufferReader(buffer) {
    Reader.call(this, buffer);

    /**
     * Read buffer.
     * @name BufferReader#buf
     * @type {Buffer}
     */
}

/* istanbul ignore else */
if (util.Buffer)
    BufferReader.prototype._slice = util.Buffer.prototype.slice;

/**
 * @override
 */
BufferReader.prototype.string = function read_string_buffer() {
    var len = this.uint32(); // modifies pos
    return this.buf.utf8Slice(this.pos, this.pos = Math.min(this.pos + len, this.len));
};

/**
 * Reads a sequence of bytes preceeded by its length as a varint.
 * @name BufferReader#bytes
 * @function
 * @returns {Buffer} Value read
 */

},{"./reader":11,"./util/minimal":17}],13:[function(require,module,exports){
"use strict";
module.exports = {};

/**
 * Named roots.
 * This is where pbjs stores generated structures (the option `-r, --root` specifies a name).
 * Can also be used manually to make roots available accross modules.
 * @name roots
 * @type {Object.<string,Root>}
 * @example
 * // pbjs -r myroot -o compiled.js ...
 *
 * // in another module:
 * require("./compiled.js");
 *
 * // in any subsequent module:
 * var root = protobuf.roots["myroot"];
 */

},{}],14:[function(require,module,exports){
"use strict";

/**
 * Streaming RPC helpers.
 * @namespace
 */
var rpc = exports;

/**
 * RPC implementation passed to {@link Service#create} performing a service request on network level, i.e. by utilizing http requests or websockets.
 * @typedef RPCImpl
 * @type {function}
 * @param {Method|rpc.ServiceMethod<Message<{}>,Message<{}>>} method Reflected or static method being called
 * @param {Uint8Array} requestData Request data
 * @param {RPCImplCallback} callback Callback function
 * @returns {undefined}
 * @example
 * function rpcImpl(method, requestData, callback) {
 *     if (protobuf.util.lcFirst(method.name) !== "myMethod") // compatible with static code
 *         throw Error("no such method");
 *     asynchronouslyObtainAResponse(requestData, function(err, responseData) {
 *         callback(err, responseData);
 *     });
 * }
 */

/**
 * Node-style callback as used by {@link RPCImpl}.
 * @typedef RPCImplCallback
 * @type {function}
 * @param {Error|null} error Error, if any, otherwise `null`
 * @param {Uint8Array|null} [response] Response data or `null` to signal end of stream, if there hasn't been an error
 * @returns {undefined}
 */

rpc.Service = require("./rpc/service");

},{"./rpc/service":15}],15:[function(require,module,exports){
"use strict";
module.exports = Service;

var util = require("../util/minimal");

// Extends EventEmitter
(Service.prototype = Object.create(util.EventEmitter.prototype)).constructor = Service;

/**
 * A service method callback as used by {@link rpc.ServiceMethod|ServiceMethod}.
 *
 * Differs from {@link RPCImplCallback} in that it is an actual callback of a service method which may not return `response = null`.
 * @typedef rpc.ServiceMethodCallback
 * @template TRes extends Message<TRes>
 * @type {function}
 * @param {Error|null} error Error, if any
 * @param {TRes} [response] Response message
 * @returns {undefined}
 */

/**
 * A service method part of a {@link rpc.Service} as created by {@link Service.create}.
 * @typedef rpc.ServiceMethod
 * @template TReq extends Message<TReq>
 * @template TRes extends Message<TRes>
 * @type {function}
 * @param {TReq|Properties<TReq>} request Request message or plain object
 * @param {rpc.ServiceMethodCallback<TRes>} [callback] Node-style callback called with the error, if any, and the response message
 * @returns {Promise<Message<TRes>>} Promise if `callback` has been omitted, otherwise `undefined`
 */

/**
 * Constructs a new RPC service instance.
 * @classdesc An RPC service as returned by {@link Service#create}.
 * @exports rpc.Service
 * @extends util.EventEmitter
 * @constructor
 * @param {RPCImpl} rpcImpl RPC implementation
 * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
 * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
 */
function Service(rpcImpl, requestDelimited, responseDelimited) {

    if (typeof rpcImpl !== "function")
        throw TypeError("rpcImpl must be a function");

    util.EventEmitter.call(this);

    /**
     * RPC implementation. Becomes `null` once the service is ended.
     * @type {RPCImpl|null}
     */
    this.rpcImpl = rpcImpl;

    /**
     * Whether requests are length-delimited.
     * @type {boolean}
     */
    this.requestDelimited = Boolean(requestDelimited);

    /**
     * Whether responses are length-delimited.
     * @type {boolean}
     */
    this.responseDelimited = Boolean(responseDelimited);
}

/**
 * Calls a service method through {@link rpc.Service#rpcImpl|rpcImpl}.
 * @param {Method|rpc.ServiceMethod<TReq,TRes>} method Reflected or static method
 * @param {Constructor<TReq>} requestCtor Request constructor
 * @param {Constructor<TRes>} responseCtor Response constructor
 * @param {TReq|Properties<TReq>} request Request message or plain object
 * @param {rpc.ServiceMethodCallback<TRes>} callback Service callback
 * @returns {undefined}
 * @template TReq extends Message<TReq>
 * @template TRes extends Message<TRes>
 */
Service.prototype.rpcCall = function rpcCall(method, requestCtor, responseCtor, request, callback) {

    if (!request)
        throw TypeError("request must be specified");

    var self = this;
    if (!callback)
        return util.asPromise(rpcCall, self, method, requestCtor, responseCtor, request);

    if (!self.rpcImpl) {
        setTimeout(function() { callback(Error("already ended")); }, 0);
        return undefined;
    }

    try {
        return self.rpcImpl(
            method,
            requestCtor[self.requestDelimited ? "encodeDelimited" : "encode"](request).finish(),
            function rpcCallback(err, response) {

                if (err) {
                    self.emit("error", err, method);
                    return callback(err);
                }

                if (response === null) {
                    self.end(/* endedByRPC */ true);
                    return undefined;
                }

                if (!(response instanceof responseCtor)) {
                    try {
                        response = responseCtor[self.responseDelimited ? "decodeDelimited" : "decode"](response);
                    } catch (err) {
                        self.emit("error", err, method);
                        return callback(err);
                    }
                }

                self.emit("data", response, method);
                return callback(null, response);
            }
        );
    } catch (err) {
        self.emit("error", err, method);
        setTimeout(function() { callback(err); }, 0);
        return undefined;
    }
};

/**
 * Ends this service and emits the `end` event.
 * @param {boolean} [endedByRPC=false] Whether the service has been ended by the RPC implementation.
 * @returns {rpc.Service} `this`
 */
Service.prototype.end = function end(endedByRPC) {
    if (this.rpcImpl) {
        if (!endedByRPC) // signal end to rpcImpl
            this.rpcImpl(null, null, null);
        this.rpcImpl = null;
        this.emit("end").off();
    }
    return this;
};

},{"../util/minimal":17}],16:[function(require,module,exports){
"use strict";
module.exports = LongBits;

var util = require("../util/minimal");

/**
 * Constructs new long bits.
 * @classdesc Helper class for working with the low and high bits of a 64 bit value.
 * @memberof util
 * @constructor
 * @param {number} lo Low 32 bits, unsigned
 * @param {number} hi High 32 bits, unsigned
 */
function LongBits(lo, hi) {

    // note that the casts below are theoretically unnecessary as of today, but older statically
    // generated converter code might still call the ctor with signed 32bits. kept for compat.

    /**
     * Low bits.
     * @type {number}
     */
    this.lo = lo >>> 0;

    /**
     * High bits.
     * @type {number}
     */
    this.hi = hi >>> 0;
}

/**
 * Zero bits.
 * @memberof util.LongBits
 * @type {util.LongBits}
 */
var zero = LongBits.zero = new LongBits(0, 0);

zero.toNumber = function() { return 0; };
zero.zzEncode = zero.zzDecode = function() { return this; };
zero.length = function() { return 1; };

/**
 * Zero hash.
 * @memberof util.LongBits
 * @type {string}
 */
var zeroHash = LongBits.zeroHash = "\0\0\0\0\0\0\0\0";

/**
 * Constructs new long bits from the specified number.
 * @param {number} value Value
 * @returns {util.LongBits} Instance
 */
LongBits.fromNumber = function fromNumber(value) {
    if (value === 0)
        return zero;
    var sign = value < 0;
    if (sign)
        value = -value;
    var lo = value >>> 0,
        hi = (value - lo) / 4294967296 >>> 0;
    if (sign) {
        hi = ~hi >>> 0;
        lo = ~lo >>> 0;
        if (++lo > 4294967295) {
            lo = 0;
            if (++hi > 4294967295)
                hi = 0;
        }
    }
    return new LongBits(lo, hi);
};

/**
 * Constructs new long bits from a number, long or string.
 * @param {Long|number|string} value Value
 * @returns {util.LongBits} Instance
 */
LongBits.from = function from(value) {
    if (typeof value === "number")
        return LongBits.fromNumber(value);
    if (util.isString(value)) {
        /* istanbul ignore else */
        if (util.Long)
            value = util.Long.fromString(value);
        else
            return LongBits.fromNumber(parseInt(value, 10));
    }
    return value.low || value.high ? new LongBits(value.low >>> 0, value.high >>> 0) : zero;
};

/**
 * Converts this long bits to a possibly unsafe JavaScript number.
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {number} Possibly unsafe number
 */
LongBits.prototype.toNumber = function toNumber(unsigned) {
    if (!unsigned && this.hi >>> 31) {
        var lo = ~this.lo + 1 >>> 0,
            hi = ~this.hi     >>> 0;
        if (!lo)
            hi = hi + 1 >>> 0;
        return -(lo + hi * 4294967296);
    }
    return this.lo + this.hi * 4294967296;
};

/**
 * Converts this long bits to a long.
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {Long} Long
 */
LongBits.prototype.toLong = function toLong(unsigned) {
    return util.Long
        ? new util.Long(this.lo | 0, this.hi | 0, Boolean(unsigned))
        /* istanbul ignore next */
        : { low: this.lo | 0, high: this.hi | 0, unsigned: Boolean(unsigned) };
};

var charCodeAt = String.prototype.charCodeAt;

/**
 * Constructs new long bits from the specified 8 characters long hash.
 * @param {string} hash Hash
 * @returns {util.LongBits} Bits
 */
LongBits.fromHash = function fromHash(hash) {
    if (hash === zeroHash)
        return zero;
    return new LongBits(
        ( charCodeAt.call(hash, 0)
        | charCodeAt.call(hash, 1) << 8
        | charCodeAt.call(hash, 2) << 16
        | charCodeAt.call(hash, 3) << 24) >>> 0
    ,
        ( charCodeAt.call(hash, 4)
        | charCodeAt.call(hash, 5) << 8
        | charCodeAt.call(hash, 6) << 16
        | charCodeAt.call(hash, 7) << 24) >>> 0
    );
};

/**
 * Converts this long bits to a 8 characters long hash.
 * @returns {string} Hash
 */
LongBits.prototype.toHash = function toHash() {
    return String.fromCharCode(
        this.lo        & 255,
        this.lo >>> 8  & 255,
        this.lo >>> 16 & 255,
        this.lo >>> 24      ,
        this.hi        & 255,
        this.hi >>> 8  & 255,
        this.hi >>> 16 & 255,
        this.hi >>> 24
    );
};

/**
 * Zig-zag encodes this long bits.
 * @returns {util.LongBits} `this`
 */
LongBits.prototype.zzEncode = function zzEncode() {
    var mask =   this.hi >> 31;
    this.hi  = ((this.hi << 1 | this.lo >>> 31) ^ mask) >>> 0;
    this.lo  = ( this.lo << 1                   ^ mask) >>> 0;
    return this;
};

/**
 * Zig-zag decodes this long bits.
 * @returns {util.LongBits} `this`
 */
LongBits.prototype.zzDecode = function zzDecode() {
    var mask = -(this.lo & 1);
    this.lo  = ((this.lo >>> 1 | this.hi << 31) ^ mask) >>> 0;
    this.hi  = ( this.hi >>> 1                  ^ mask) >>> 0;
    return this;
};

/**
 * Calculates the length of this longbits when encoded as a varint.
 * @returns {number} Length
 */
LongBits.prototype.length = function length() {
    var part0 =  this.lo,
        part1 = (this.lo >>> 28 | this.hi << 4) >>> 0,
        part2 =  this.hi >>> 24;
    return part2 === 0
         ? part1 === 0
           ? part0 < 16384
             ? part0 < 128 ? 1 : 2
             : part0 < 2097152 ? 3 : 4
           : part1 < 16384
             ? part1 < 128 ? 5 : 6
             : part1 < 2097152 ? 7 : 8
         : part2 < 128 ? 9 : 10;
};

},{"../util/minimal":17}],17:[function(require,module,exports){
(function (global){
"use strict";
var util = exports;

// used to return a Promise where callback is omitted
util.asPromise = require("@protobufjs/aspromise");

// converts to / from base64 encoded strings
util.base64 = require("@protobufjs/base64");

// base class of rpc.Service
util.EventEmitter = require("@protobufjs/eventemitter");

// float handling accross browsers
util.float = require("@protobufjs/float");

// requires modules optionally and hides the call from bundlers
util.inquire = require("@protobufjs/inquire");

// converts to / from utf8 encoded strings
util.utf8 = require("@protobufjs/utf8");

// provides a node-like buffer pool in the browser
util.pool = require("@protobufjs/pool");

// utility to work with the low and high bits of a 64 bit value
util.LongBits = require("./longbits");

// global object reference
util.global = typeof window !== "undefined" && window
           || typeof global !== "undefined" && global
           || typeof self   !== "undefined" && self
           || this; // eslint-disable-line no-invalid-this

/**
 * An immuable empty array.
 * @memberof util
 * @type {Array.<*>}
 * @const
 */
util.emptyArray = Object.freeze ? Object.freeze([]) : /* istanbul ignore next */ []; // used on prototypes

/**
 * An immutable empty object.
 * @type {Object}
 * @const
 */
util.emptyObject = Object.freeze ? Object.freeze({}) : /* istanbul ignore next */ {}; // used on prototypes

/**
 * Whether running within node or not.
 * @memberof util
 * @type {boolean}
 * @const
 */
util.isNode = Boolean(util.global.process && util.global.process.versions && util.global.process.versions.node);

/**
 * Tests if the specified value is an integer.
 * @function
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is an integer
 */
util.isInteger = Number.isInteger || /* istanbul ignore next */ function isInteger(value) {
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
};

/**
 * Tests if the specified value is a string.
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is a string
 */
util.isString = function isString(value) {
    return typeof value === "string" || value instanceof String;
};

/**
 * Tests if the specified value is a non-null object.
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is a non-null object
 */
util.isObject = function isObject(value) {
    return value && typeof value === "object";
};

/**
 * Checks if a property on a message is considered to be present.
 * This is an alias of {@link util.isSet}.
 * @function
 * @param {Object} obj Plain object or message instance
 * @param {string} prop Property name
 * @returns {boolean} `true` if considered to be present, otherwise `false`
 */
util.isset =

/**
 * Checks if a property on a message is considered to be present.
 * @param {Object} obj Plain object or message instance
 * @param {string} prop Property name
 * @returns {boolean} `true` if considered to be present, otherwise `false`
 */
util.isSet = function isSet(obj, prop) {
    var value = obj[prop];
    if (value != null && obj.hasOwnProperty(prop)) // eslint-disable-line eqeqeq, no-prototype-builtins
        return typeof value !== "object" || (Array.isArray(value) ? value.length : Object.keys(value).length) > 0;
    return false;
};

/**
 * Any compatible Buffer instance.
 * This is a minimal stand-alone definition of a Buffer instance. The actual type is that exported by node's typings.
 * @interface Buffer
 * @extends Uint8Array
 */

/**
 * Node's Buffer class if available.
 * @type {Constructor<Buffer>}
 */
util.Buffer = (function() {
    try {
        var Buffer = util.inquire("buffer").Buffer;
        // refuse to use non-node buffers if not explicitly assigned (perf reasons):
        return Buffer.prototype.utf8Write ? Buffer : /* istanbul ignore next */ null;
    } catch (e) {
        /* istanbul ignore next */
        return null;
    }
})();

// Internal alias of or polyfull for Buffer.from.
util._Buffer_from = null;

// Internal alias of or polyfill for Buffer.allocUnsafe.
util._Buffer_allocUnsafe = null;

/**
 * Creates a new buffer of whatever type supported by the environment.
 * @param {number|number[]} [sizeOrArray=0] Buffer size or number array
 * @returns {Uint8Array|Buffer} Buffer
 */
util.newBuffer = function newBuffer(sizeOrArray) {
    /* istanbul ignore next */
    return typeof sizeOrArray === "number"
        ? util.Buffer
            ? util._Buffer_allocUnsafe(sizeOrArray)
            : new util.Array(sizeOrArray)
        : util.Buffer
            ? util._Buffer_from(sizeOrArray)
            : typeof Uint8Array === "undefined"
                ? sizeOrArray
                : new Uint8Array(sizeOrArray);
};

/**
 * Array implementation used in the browser. `Uint8Array` if supported, otherwise `Array`.
 * @type {Constructor<Uint8Array>}
 */
util.Array = typeof Uint8Array !== "undefined" ? Uint8Array /* istanbul ignore next */ : Array;

/**
 * Any compatible Long instance.
 * This is a minimal stand-alone definition of a Long instance. The actual type is that exported by long.js.
 * @interface Long
 * @property {number} low Low bits
 * @property {number} high High bits
 * @property {boolean} unsigned Whether unsigned or not
 */

/**
 * Long.js's Long class if available.
 * @type {Constructor<Long>}
 */
util.Long = /* istanbul ignore next */ util.global.dcodeIO && /* istanbul ignore next */ util.global.dcodeIO.Long
         || /* istanbul ignore next */ util.global.Long
         || util.inquire("long");

/**
 * Regular expression used to verify 2 bit (`bool`) map keys.
 * @type {RegExp}
 * @const
 */
util.key2Re = /^true|false|0|1$/;

/**
 * Regular expression used to verify 32 bit (`int32` etc.) map keys.
 * @type {RegExp}
 * @const
 */
util.key32Re = /^-?(?:0|[1-9][0-9]*)$/;

/**
 * Regular expression used to verify 64 bit (`int64` etc.) map keys.
 * @type {RegExp}
 * @const
 */
util.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/;

/**
 * Converts a number or long to an 8 characters long hash string.
 * @param {Long|number} value Value to convert
 * @returns {string} Hash
 */
util.longToHash = function longToHash(value) {
    return value
        ? util.LongBits.from(value).toHash()
        : util.LongBits.zeroHash;
};

/**
 * Converts an 8 characters long hash string to a long or number.
 * @param {string} hash Hash
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {Long|number} Original value
 */
util.longFromHash = function longFromHash(hash, unsigned) {
    var bits = util.LongBits.fromHash(hash);
    if (util.Long)
        return util.Long.fromBits(bits.lo, bits.hi, unsigned);
    return bits.toNumber(Boolean(unsigned));
};

/**
 * Merges the properties of the source object into the destination object.
 * @memberof util
 * @param {Object.<string,*>} dst Destination object
 * @param {Object.<string,*>} src Source object
 * @param {boolean} [ifNotSet=false] Merges only if the key is not already set
 * @returns {Object.<string,*>} Destination object
 */
function merge(dst, src, ifNotSet) { // used by converters
    for (var keys = Object.keys(src), i = 0; i < keys.length; ++i)
        if (dst[keys[i]] === undefined || !ifNotSet)
            dst[keys[i]] = src[keys[i]];
    return dst;
}

util.merge = merge;

/**
 * Converts the first character of a string to lower case.
 * @param {string} str String to convert
 * @returns {string} Converted string
 */
util.lcFirst = function lcFirst(str) {
    return str.charAt(0).toLowerCase() + str.substring(1);
};

/**
 * Creates a custom error constructor.
 * @memberof util
 * @param {string} name Error name
 * @returns {Constructor<Error>} Custom error constructor
 */
function newError(name) {

    function CustomError(message, properties) {

        if (!(this instanceof CustomError))
            return new CustomError(message, properties);

        // Error.call(this, message);
        // ^ just returns a new error instance because the ctor can be called as a function

        Object.defineProperty(this, "message", { get: function() { return message; } });

        /* istanbul ignore next */
        if (Error.captureStackTrace) // node
            Error.captureStackTrace(this, CustomError);
        else
            Object.defineProperty(this, "stack", { value: (new Error()).stack || "" });

        if (properties)
            merge(this, properties);
    }

    (CustomError.prototype = Object.create(Error.prototype)).constructor = CustomError;

    Object.defineProperty(CustomError.prototype, "name", { get: function() { return name; } });

    CustomError.prototype.toString = function toString() {
        return this.name + ": " + this.message;
    };

    return CustomError;
}

util.newError = newError;

/**
 * Constructs a new protocol error.
 * @classdesc Error subclass indicating a protocol specifc error.
 * @memberof util
 * @extends Error
 * @template T extends Message<T>
 * @constructor
 * @param {string} message Error message
 * @param {Object.<string,*>} [properties] Additional properties
 * @example
 * try {
 *     MyMessage.decode(someBuffer); // throws if required fields are missing
 * } catch (e) {
 *     if (e instanceof ProtocolError && e.instance)
 *         console.log("decoded so far: " + JSON.stringify(e.instance));
 * }
 */
util.ProtocolError = newError("ProtocolError");

/**
 * So far decoded message instance.
 * @name util.ProtocolError#instance
 * @type {Message<T>}
 */

/**
 * A OneOf getter as returned by {@link util.oneOfGetter}.
 * @typedef OneOfGetter
 * @type {function}
 * @returns {string|undefined} Set field name, if any
 */

/**
 * Builds a getter for a oneof's present field name.
 * @param {string[]} fieldNames Field names
 * @returns {OneOfGetter} Unbound getter
 */
util.oneOfGetter = function getOneOf(fieldNames) {
    var fieldMap = {};
    for (var i = 0; i < fieldNames.length; ++i)
        fieldMap[fieldNames[i]] = 1;

    /**
     * @returns {string|undefined} Set field name, if any
     * @this Object
     * @ignore
     */
    return function() { // eslint-disable-line consistent-return
        for (var keys = Object.keys(this), i = keys.length - 1; i > -1; --i)
            if (fieldMap[keys[i]] === 1 && this[keys[i]] !== undefined && this[keys[i]] !== null)
                return keys[i];
    };
};

/**
 * A OneOf setter as returned by {@link util.oneOfSetter}.
 * @typedef OneOfSetter
 * @type {function}
 * @param {string|undefined} value Field name
 * @returns {undefined}
 */

/**
 * Builds a setter for a oneof's present field name.
 * @param {string[]} fieldNames Field names
 * @returns {OneOfSetter} Unbound setter
 */
util.oneOfSetter = function setOneOf(fieldNames) {

    /**
     * @param {string} name Field name
     * @returns {undefined}
     * @this Object
     * @ignore
     */
    return function(name) {
        for (var i = 0; i < fieldNames.length; ++i)
            if (fieldNames[i] !== name)
                delete this[fieldNames[i]];
    };
};

/**
 * Default conversion options used for {@link Message#toJSON} implementations.
 *
 * These options are close to proto3's JSON mapping with the exception that internal types like Any are handled just like messages. More precisely:
 *
 * - Longs become strings
 * - Enums become string keys
 * - Bytes become base64 encoded strings
 * - (Sub-)Messages become plain objects
 * - Maps become plain objects with all string keys
 * - Repeated fields become arrays
 * - NaN and Infinity for float and double fields become strings
 *
 * @type {IConversionOptions}
 * @see https://developers.google.com/protocol-buffers/docs/proto3?hl=en#json
 */
util.toJSONOptions = {
    longs: String,
    enums: String,
    bytes: String,
    json: true
};

// Sets up buffer utility according to the environment (called in index-minimal)
util._configure = function() {
    var Buffer = util.Buffer;
    /* istanbul ignore if */
    if (!Buffer) {
        util._Buffer_from = util._Buffer_allocUnsafe = null;
        return;
    }
    // because node 4.x buffers are incompatible & immutable
    // see: https://github.com/dcodeIO/protobuf.js/pull/665
    util._Buffer_from = Buffer.from !== Uint8Array.from && Buffer.from ||
        /* istanbul ignore next */
        function Buffer_from(value, encoding) {
            return new Buffer(value, encoding);
        };
    util._Buffer_allocUnsafe = Buffer.allocUnsafe ||
        /* istanbul ignore next */
        function Buffer_allocUnsafe(size) {
            return new Buffer(size);
        };
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./longbits":16,"@protobufjs/aspromise":2,"@protobufjs/base64":3,"@protobufjs/eventemitter":4,"@protobufjs/float":5,"@protobufjs/inquire":6,"@protobufjs/pool":7,"@protobufjs/utf8":8}],18:[function(require,module,exports){
"use strict";
module.exports = Writer;

var util      = require("./util/minimal");

var BufferWriter; // cyclic

var LongBits  = util.LongBits,
    base64    = util.base64,
    utf8      = util.utf8;

/**
 * Constructs a new writer operation instance.
 * @classdesc Scheduled writer operation.
 * @constructor
 * @param {function(*, Uint8Array, number)} fn Function to call
 * @param {number} len Value byte length
 * @param {*} val Value to write
 * @ignore
 */
function Op(fn, len, val) {

    /**
     * Function to call.
     * @type {function(Uint8Array, number, *)}
     */
    this.fn = fn;

    /**
     * Value byte length.
     * @type {number}
     */
    this.len = len;

    /**
     * Next operation.
     * @type {Writer.Op|undefined}
     */
    this.next = undefined;

    /**
     * Value to write.
     * @type {*}
     */
    this.val = val; // type varies
}

/* istanbul ignore next */
function noop() {} // eslint-disable-line no-empty-function

/**
 * Constructs a new writer state instance.
 * @classdesc Copied writer state.
 * @memberof Writer
 * @constructor
 * @param {Writer} writer Writer to copy state from
 * @ignore
 */
function State(writer) {

    /**
     * Current head.
     * @type {Writer.Op}
     */
    this.head = writer.head;

    /**
     * Current tail.
     * @type {Writer.Op}
     */
    this.tail = writer.tail;

    /**
     * Current buffer length.
     * @type {number}
     */
    this.len = writer.len;

    /**
     * Next state.
     * @type {State|null}
     */
    this.next = writer.states;
}

/**
 * Constructs a new writer instance.
 * @classdesc Wire format writer using `Uint8Array` if available, otherwise `Array`.
 * @constructor
 */
function Writer() {

    /**
     * Current length.
     * @type {number}
     */
    this.len = 0;

    /**
     * Operations head.
     * @type {Object}
     */
    this.head = new Op(noop, 0, 0);

    /**
     * Operations tail
     * @type {Object}
     */
    this.tail = this.head;

    /**
     * Linked forked states.
     * @type {Object|null}
     */
    this.states = null;

    // When a value is written, the writer calculates its byte length and puts it into a linked
    // list of operations to perform when finish() is called. This both allows us to allocate
    // buffers of the exact required size and reduces the amount of work we have to do compared
    // to first calculating over objects and then encoding over objects. In our case, the encoding
    // part is just a linked list walk calling operations with already prepared values.
}

/**
 * Creates a new writer.
 * @function
 * @returns {BufferWriter|Writer} A {@link BufferWriter} when Buffers are supported, otherwise a {@link Writer}
 */
Writer.create = util.Buffer
    ? function create_buffer_setup() {
        return (Writer.create = function create_buffer() {
            return new BufferWriter();
        })();
    }
    /* istanbul ignore next */
    : function create_array() {
        return new Writer();
    };

/**
 * Allocates a buffer of the specified size.
 * @param {number} size Buffer size
 * @returns {Uint8Array} Buffer
 */
Writer.alloc = function alloc(size) {
    return new util.Array(size);
};

// Use Uint8Array buffer pool in the browser, just like node does with buffers
/* istanbul ignore else */
if (util.Array !== Array)
    Writer.alloc = util.pool(Writer.alloc, util.Array.prototype.subarray);

/**
 * Pushes a new operation to the queue.
 * @param {function(Uint8Array, number, *)} fn Function to call
 * @param {number} len Value byte length
 * @param {number} val Value to write
 * @returns {Writer} `this`
 * @private
 */
Writer.prototype._push = function push(fn, len, val) {
    this.tail = this.tail.next = new Op(fn, len, val);
    this.len += len;
    return this;
};

function writeByte(val, buf, pos) {
    buf[pos] = val & 255;
}

function writeVarint32(val, buf, pos) {
    while (val > 127) {
        buf[pos++] = val & 127 | 128;
        val >>>= 7;
    }
    buf[pos] = val;
}

/**
 * Constructs a new varint writer operation instance.
 * @classdesc Scheduled varint writer operation.
 * @extends Op
 * @constructor
 * @param {number} len Value byte length
 * @param {number} val Value to write
 * @ignore
 */
function VarintOp(len, val) {
    this.len = len;
    this.next = undefined;
    this.val = val;
}

VarintOp.prototype = Object.create(Op.prototype);
VarintOp.prototype.fn = writeVarint32;

/**
 * Writes an unsigned 32 bit value as a varint.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.uint32 = function write_uint32(value) {
    // here, the call to this.push has been inlined and a varint specific Op subclass is used.
    // uint32 is by far the most frequently used operation and benefits significantly from this.
    this.len += (this.tail = this.tail.next = new VarintOp(
        (value = value >>> 0)
                < 128       ? 1
        : value < 16384     ? 2
        : value < 2097152   ? 3
        : value < 268435456 ? 4
        :                     5,
    value)).len;
    return this;
};

/**
 * Writes a signed 32 bit value as a varint.
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.int32 = function write_int32(value) {
    return value < 0
        ? this._push(writeVarint64, 10, LongBits.fromNumber(value)) // 10 bytes per spec
        : this.uint32(value);
};

/**
 * Writes a 32 bit value as a varint, zig-zag encoded.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.sint32 = function write_sint32(value) {
    return this.uint32((value << 1 ^ value >> 31) >>> 0);
};

function writeVarint64(val, buf, pos) {
    while (val.hi) {
        buf[pos++] = val.lo & 127 | 128;
        val.lo = (val.lo >>> 7 | val.hi << 25) >>> 0;
        val.hi >>>= 7;
    }
    while (val.lo > 127) {
        buf[pos++] = val.lo & 127 | 128;
        val.lo = val.lo >>> 7;
    }
    buf[pos++] = val.lo;
}

/**
 * Writes an unsigned 64 bit value as a varint.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.uint64 = function write_uint64(value) {
    var bits = LongBits.from(value);
    return this._push(writeVarint64, bits.length(), bits);
};

/**
 * Writes a signed 64 bit value as a varint.
 * @function
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.int64 = Writer.prototype.uint64;

/**
 * Writes a signed 64 bit value as a varint, zig-zag encoded.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.sint64 = function write_sint64(value) {
    var bits = LongBits.from(value).zzEncode();
    return this._push(writeVarint64, bits.length(), bits);
};

/**
 * Writes a boolish value as a varint.
 * @param {boolean} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.bool = function write_bool(value) {
    return this._push(writeByte, 1, value ? 1 : 0);
};

function writeFixed32(val, buf, pos) {
    buf[pos    ] =  val         & 255;
    buf[pos + 1] =  val >>> 8   & 255;
    buf[pos + 2] =  val >>> 16  & 255;
    buf[pos + 3] =  val >>> 24;
}

/**
 * Writes an unsigned 32 bit value as fixed 32 bits.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.fixed32 = function write_fixed32(value) {
    return this._push(writeFixed32, 4, value >>> 0);
};

/**
 * Writes a signed 32 bit value as fixed 32 bits.
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.sfixed32 = Writer.prototype.fixed32;

/**
 * Writes an unsigned 64 bit value as fixed 64 bits.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.fixed64 = function write_fixed64(value) {
    var bits = LongBits.from(value);
    return this._push(writeFixed32, 4, bits.lo)._push(writeFixed32, 4, bits.hi);
};

/**
 * Writes a signed 64 bit value as fixed 64 bits.
 * @function
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.sfixed64 = Writer.prototype.fixed64;

/**
 * Writes a float (32 bit).
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.float = function write_float(value) {
    return this._push(util.float.writeFloatLE, 4, value);
};

/**
 * Writes a double (64 bit float).
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.double = function write_double(value) {
    return this._push(util.float.writeDoubleLE, 8, value);
};

var writeBytes = util.Array.prototype.set
    ? function writeBytes_set(val, buf, pos) {
        buf.set(val, pos); // also works for plain array values
    }
    /* istanbul ignore next */
    : function writeBytes_for(val, buf, pos) {
        for (var i = 0; i < val.length; ++i)
            buf[pos + i] = val[i];
    };

/**
 * Writes a sequence of bytes.
 * @param {Uint8Array|string} value Buffer or base64 encoded string to write
 * @returns {Writer} `this`
 */
Writer.prototype.bytes = function write_bytes(value) {
    var len = value.length >>> 0;
    if (!len)
        return this._push(writeByte, 1, 0);
    if (util.isString(value)) {
        var buf = Writer.alloc(len = base64.length(value));
        base64.decode(value, buf, 0);
        value = buf;
    }
    return this.uint32(len)._push(writeBytes, len, value);
};

/**
 * Writes a string.
 * @param {string} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.string = function write_string(value) {
    var len = utf8.length(value);
    return len
        ? this.uint32(len)._push(utf8.write, len, value)
        : this._push(writeByte, 1, 0);
};

/**
 * Forks this writer's state by pushing it to a stack.
 * Calling {@link Writer#reset|reset} or {@link Writer#ldelim|ldelim} resets the writer to the previous state.
 * @returns {Writer} `this`
 */
Writer.prototype.fork = function fork() {
    this.states = new State(this);
    this.head = this.tail = new Op(noop, 0, 0);
    this.len = 0;
    return this;
};

/**
 * Resets this instance to the last state.
 * @returns {Writer} `this`
 */
Writer.prototype.reset = function reset() {
    if (this.states) {
        this.head   = this.states.head;
        this.tail   = this.states.tail;
        this.len    = this.states.len;
        this.states = this.states.next;
    } else {
        this.head = this.tail = new Op(noop, 0, 0);
        this.len  = 0;
    }
    return this;
};

/**
 * Resets to the last state and appends the fork state's current write length as a varint followed by its operations.
 * @returns {Writer} `this`
 */
Writer.prototype.ldelim = function ldelim() {
    var head = this.head,
        tail = this.tail,
        len  = this.len;
    this.reset().uint32(len);
    if (len) {
        this.tail.next = head.next; // skip noop
        this.tail = tail;
        this.len += len;
    }
    return this;
};

/**
 * Finishes the write operation.
 * @returns {Uint8Array} Finished buffer
 */
Writer.prototype.finish = function finish() {
    var head = this.head.next, // skip noop
        buf  = this.constructor.alloc(this.len),
        pos  = 0;
    while (head) {
        head.fn(head.val, buf, pos);
        pos += head.len;
        head = head.next;
    }
    // this.head = this.tail = null;
    return buf;
};

Writer._configure = function(BufferWriter_) {
    BufferWriter = BufferWriter_;
};

},{"./util/minimal":17}],19:[function(require,module,exports){
"use strict";
module.exports = BufferWriter;

// extends Writer
var Writer = require("./writer");
(BufferWriter.prototype = Object.create(Writer.prototype)).constructor = BufferWriter;

var util = require("./util/minimal");

var Buffer = util.Buffer;

/**
 * Constructs a new buffer writer instance.
 * @classdesc Wire format writer using node buffers.
 * @extends Writer
 * @constructor
 */
function BufferWriter() {
    Writer.call(this);
}

/**
 * Allocates a buffer of the specified size.
 * @param {number} size Buffer size
 * @returns {Buffer} Buffer
 */
BufferWriter.alloc = function alloc_buffer(size) {
    return (BufferWriter.alloc = util._Buffer_allocUnsafe)(size);
};

var writeBytesBuffer = Buffer && Buffer.prototype instanceof Uint8Array && Buffer.prototype.set.name === "set"
    ? function writeBytesBuffer_set(val, buf, pos) {
        buf.set(val, pos); // faster than copy (requires node >= 4 where Buffers extend Uint8Array and set is properly inherited)
                           // also works for plain array values
    }
    /* istanbul ignore next */
    : function writeBytesBuffer_copy(val, buf, pos) {
        if (val.copy) // Buffer values
            val.copy(buf, pos, 0, val.length);
        else for (var i = 0; i < val.length;) // plain array values
            buf[pos++] = val[i++];
    };

/**
 * @override
 */
BufferWriter.prototype.bytes = function write_bytes_buffer(value) {
    if (util.isString(value))
        value = util._Buffer_from(value, "base64");
    var len = value.length >>> 0;
    this.uint32(len);
    if (len)
        this._push(writeBytesBuffer, len, value);
    return this;
};

function writeStringBuffer(val, buf, pos) {
    if (val.length < 40) // plain js is faster for short strings (probably due to redundant assertions)
        util.utf8.write(val, buf, pos);
    else
        buf.utf8Write(val, pos);
}

/**
 * @override
 */
BufferWriter.prototype.string = function write_string_buffer(value) {
    var len = Buffer.byteLength(value);
    this.uint32(len);
    if (len)
        this._push(writeStringBuffer, len, value);
    return this;
};


/**
 * Finishes the write operation.
 * @name BufferWriter#finish
 * @function
 * @returns {Buffer} Finished buffer
 */

},{"./util/minimal":17,"./writer":18}],20:[function(require,module,exports){
/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function(global, factory) { /* global define, require, module */

    /* AMD */ if (typeof define === 'function' && define.amd)
        define(["protobufjs/minimal"], factory);

    /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports)
        module.exports = factory(require("protobufjs/minimal"));

})(this, function($protobuf) {
    "use strict";

    var $Writer = $protobuf.Writer, $util = $protobuf.util;
    
    var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});
    
    $root.polar_data = (function() {
    
        var polar_data = {};
    
        polar_data.PbActivityMetMinGoal = (function() {
    
            function PbActivityMetMinGoal(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbActivityMetMinGoal.prototype.goal = 0;
            PbActivityMetMinGoal.prototype.activityCutoffThreshold = 0;
    
            PbActivityMetMinGoal.create = function create(properties) {
                return new PbActivityMetMinGoal(properties);
            };
    
            PbActivityMetMinGoal.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.goal);
                if (m.activityCutoffThreshold != null && m.hasOwnProperty("activityCutoffThreshold"))
                    w.uint32(21).float(m.activityCutoffThreshold);
                return w;
            };
    
            PbActivityMetMinGoal.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.goal !== "number")
                    return "goal: number expected";
                if (m.activityCutoffThreshold != null && m.hasOwnProperty("activityCutoffThreshold")) {
                    if (typeof m.activityCutoffThreshold !== "number")
                        return "activityCutoffThreshold: number expected";
                }
                return null;
            };
    
            return PbActivityMetMinGoal;
        })();
    
        polar_data.PbPolarBalanceGoal = (function() {
    
            function PbPolarBalanceGoal(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPolarBalanceGoal.prototype.startDate = null;
            PbPolarBalanceGoal.prototype.targetWeight = 0;
            PbPolarBalanceGoal.prototype.goalDurationInWeeks = 0;
            PbPolarBalanceGoal.prototype.fractionOfActivity = 0;
    
            PbPolarBalanceGoal.create = function create(properties) {
                return new PbPolarBalanceGoal(properties);
            };
    
            PbPolarBalanceGoal.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDate.encode(m.startDate, w.uint32(10).fork()).ldelim();
                if (m.targetWeight != null && m.hasOwnProperty("targetWeight"))
                    w.uint32(21).float(m.targetWeight);
                if (m.goalDurationInWeeks != null && m.hasOwnProperty("goalDurationInWeeks"))
                    w.uint32(24).uint32(m.goalDurationInWeeks);
                if (m.fractionOfActivity != null && m.hasOwnProperty("fractionOfActivity"))
                    w.uint32(37).float(m.fractionOfActivity);
                return w;
            };
    
            PbPolarBalanceGoal.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDate.verify(m.startDate);
                    if (e)
                        return "startDate." + e;
                }
                if (m.targetWeight != null && m.hasOwnProperty("targetWeight")) {
                    if (typeof m.targetWeight !== "number")
                        return "targetWeight: number expected";
                }
                if (m.goalDurationInWeeks != null && m.hasOwnProperty("goalDurationInWeeks")) {
                    if (!$util.isInteger(m.goalDurationInWeeks))
                        return "goalDurationInWeeks: integer expected";
                }
                if (m.fractionOfActivity != null && m.hasOwnProperty("fractionOfActivity")) {
                    if (typeof m.fractionOfActivity !== "number")
                        return "fractionOfActivity: number expected";
                }
                return null;
            };
    
            return PbPolarBalanceGoal;
        })();
    
        polar_data.PbDailyActivityGoal = (function() {
    
            function PbDailyActivityGoal(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbDailyActivityGoal.prototype.goalType = 1;
            PbDailyActivityGoal.prototype.activityMetminGoal = null;
            PbDailyActivityGoal.prototype.lastModified = null;
            PbDailyActivityGoal.prototype.polarBalanceGoal = null;
    
            PbDailyActivityGoal.create = function create(properties) {
                return new PbDailyActivityGoal(properties);
            };
    
            PbDailyActivityGoal.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.activityMetminGoal != null && m.hasOwnProperty("activityMetminGoal"))
                    $root.polar_data.PbActivityMetMinGoal.encode(m.activityMetminGoal, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                if (m.goalType != null && m.hasOwnProperty("goalType"))
                    w.uint32(24).int32(m.goalType);
                if (m.polarBalanceGoal != null && m.hasOwnProperty("polarBalanceGoal"))
                    $root.polar_data.PbPolarBalanceGoal.encode(m.polarBalanceGoal, w.uint32(34).fork()).ldelim();
                return w;
            };
    
            PbDailyActivityGoal.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.goalType != null && m.hasOwnProperty("goalType")) {
                    switch (m.goalType) {
                    default:
                        return "goalType: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                }
                if (m.activityMetminGoal != null && m.hasOwnProperty("activityMetminGoal")) {
                    {
                        var e = $root.polar_data.PbActivityMetMinGoal.verify(m.activityMetminGoal);
                        if (e)
                            return "activityMetminGoal." + e;
                    }
                }
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                if (m.polarBalanceGoal != null && m.hasOwnProperty("polarBalanceGoal")) {
                    {
                        var e = $root.polar_data.PbPolarBalanceGoal.verify(m.polarBalanceGoal);
                        if (e)
                            return "polarBalanceGoal." + e;
                    }
                }
                return null;
            };
    
            PbDailyActivityGoal.PbActivityGoalType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "ACTIVITY_GOAL_DAILY_ACTIVITY"] = 1;
                values[valuesById[2] = "ACTIVITY_GOAL_WEIGHT_LOSS"] = 2;
                values[valuesById[3] = "ACTIVITY_GOAL_WEIGHT_MAINTAIN"] = 3;
                return values;
            })();
    
            return PbDailyActivityGoal;
        })();
    
        polar_data.PbSportInfo = (function() {
    
            function PbSportInfo(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSportInfo.prototype.factor = 0;
            PbSportInfo.prototype.timeStamp = null;
            PbSportInfo.prototype.sportProfileId = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
            PbSportInfo.create = function create(properties) {
                return new PbSportInfo(properties);
            };
    
            PbSportInfo.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.factor);
                $root.polar_types.PbLocalDateTime.encode(m.timeStamp, w.uint32(18).fork()).ldelim();
                if (m.sportProfileId != null && m.hasOwnProperty("sportProfileId"))
                    w.uint32(24).uint64(m.sportProfileId);
                return w;
            };
    
            PbSportInfo.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.factor !== "number")
                    return "factor: number expected";
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.timeStamp);
                    if (e)
                        return "timeStamp." + e;
                }
                if (m.sportProfileId != null && m.hasOwnProperty("sportProfileId")) {
                    if (!$util.isInteger(m.sportProfileId) && !(m.sportProfileId && $util.isInteger(m.sportProfileId.low) && $util.isInteger(m.sportProfileId.high)))
                        return "sportProfileId: integer|Long expected";
                }
                return null;
            };
    
            return PbSportInfo;
        })();
    
        polar_data.PbActivityInfo = (function() {
    
            function PbActivityInfo(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbActivityInfo.prototype.value = 1;
            PbActivityInfo.prototype.timeStamp = null;
            PbActivityInfo.prototype.factor = 0;
    
            PbActivityInfo.create = function create(properties) {
                return new PbActivityInfo(properties);
            };
    
            PbActivityInfo.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.value);
                $root.polar_types.PbLocalDateTime.encode(m.timeStamp, w.uint32(18).fork()).ldelim();
                if (m.factor != null && m.hasOwnProperty("factor"))
                    w.uint32(29).float(m.factor);
                return w;
            };
    
            PbActivityInfo.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.value) {
                default:
                    return "value: enum value expected";
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                case 8:
                    break;
                }
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.timeStamp);
                    if (e)
                        return "timeStamp." + e;
                }
                if (m.factor != null && m.hasOwnProperty("factor")) {
                    if (typeof m.factor !== "number")
                        return "factor: number expected";
                }
                return null;
            };
    
            PbActivityInfo.ActivityClass = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "SLEEP"] = 1;
                values[valuesById[2] = "SEDENTARY"] = 2;
                values[valuesById[3] = "LIGHT"] = 3;
                values[valuesById[4] = "CONTINUOUS_MODERATE"] = 4;
                values[valuesById[5] = "INTERMITTENT_MODERATE"] = 5;
                values[valuesById[6] = "CONTINUOUS_VIGOROUS"] = 6;
                values[valuesById[7] = "INTERMITTENT_VIGOROUS"] = 7;
                values[valuesById[8] = "NON_WEAR"] = 8;
                return values;
            })();
    
            return PbActivityInfo;
        })();
    
        polar_data.PbInActivityTriggerInfo = (function() {
    
            function PbInActivityTriggerInfo(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbInActivityTriggerInfo.prototype.timeStamp = null;
    
            PbInActivityTriggerInfo.create = function create(properties) {
                return new PbInActivityTriggerInfo(properties);
            };
    
            PbInActivityTriggerInfo.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLocalDateTime.encode(m.timeStamp, w.uint32(10).fork()).ldelim();
                return w;
            };
    
            PbInActivityTriggerInfo.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.timeStamp);
                    if (e)
                        return "timeStamp." + e;
                }
                return null;
            };
    
            return PbInActivityTriggerInfo;
        })();
    
        polar_data.PbInActivityNonWearTriggerInfo = (function() {
    
            function PbInActivityNonWearTriggerInfo(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbInActivityNonWearTriggerInfo.prototype.startTimeStamp = null;
            PbInActivityNonWearTriggerInfo.prototype.endTimeStamp = null;
    
            PbInActivityNonWearTriggerInfo.create = function create(properties) {
                return new PbInActivityNonWearTriggerInfo(properties);
            };
    
            PbInActivityNonWearTriggerInfo.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLocalDateTime.encode(m.startTimeStamp, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbLocalDateTime.encode(m.endTimeStamp, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbInActivityNonWearTriggerInfo.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.startTimeStamp);
                    if (e)
                        return "startTimeStamp." + e;
                }
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.endTimeStamp);
                    if (e)
                        return "endTimeStamp." + e;
                }
                return null;
            };
    
            return PbInActivityNonWearTriggerInfo;
        })();
    
        polar_data.PbActivitySamples = (function() {
    
            function PbActivitySamples(p) {
                this.metSamples = [];
                this.stepsSamples = [];
                this.sportInfo = [];
                this.activityInfo = [];
                this.inactivityTrigger = [];
                this.inactivityNonWearTrigger = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbActivitySamples.prototype.startTime = null;
            PbActivitySamples.prototype.metRecordingInterval = null;
            PbActivitySamples.prototype.stepsRecordingInterval = null;
            PbActivitySamples.prototype.metSamples = $util.emptyArray;
            PbActivitySamples.prototype.stepsSamples = $util.emptyArray;
            PbActivitySamples.prototype.sportInfo = $util.emptyArray;
            PbActivitySamples.prototype.activityInfo = $util.emptyArray;
            PbActivitySamples.prototype.inactivityTrigger = $util.emptyArray;
            PbActivitySamples.prototype.inactivityNonWearTrigger = $util.emptyArray;
    
            PbActivitySamples.create = function create(properties) {
                return new PbActivitySamples(properties);
            };
    
            PbActivitySamples.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLocalDateTime.encode(m.startTime, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.metRecordingInterval, w.uint32(18).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.stepsRecordingInterval, w.uint32(26).fork()).ldelim();
                if (m.metSamples != null && m.metSamples.length) {
                    for (var i = 0; i < m.metSamples.length; ++i)
                        w.uint32(37).float(m.metSamples[i]);
                }
                if (m.stepsSamples != null && m.stepsSamples.length) {
                    w.uint32(42).fork();
                    for (var i = 0; i < m.stepsSamples.length; ++i)
                        w.uint32(m.stepsSamples[i]);
                    w.ldelim();
                }
                if (m.sportInfo != null && m.sportInfo.length) {
                    for (var i = 0; i < m.sportInfo.length; ++i)
                        $root.polar_data.PbSportInfo.encode(m.sportInfo[i], w.uint32(50).fork()).ldelim();
                }
                if (m.activityInfo != null && m.activityInfo.length) {
                    for (var i = 0; i < m.activityInfo.length; ++i)
                        $root.polar_data.PbActivityInfo.encode(m.activityInfo[i], w.uint32(58).fork()).ldelim();
                }
                if (m.inactivityTrigger != null && m.inactivityTrigger.length) {
                    for (var i = 0; i < m.inactivityTrigger.length; ++i)
                        $root.polar_data.PbInActivityTriggerInfo.encode(m.inactivityTrigger[i], w.uint32(66).fork()).ldelim();
                }
                if (m.inactivityNonWearTrigger != null && m.inactivityNonWearTrigger.length) {
                    for (var i = 0; i < m.inactivityNonWearTrigger.length; ++i)
                        $root.polar_data.PbInActivityNonWearTriggerInfo.encode(m.inactivityNonWearTrigger[i], w.uint32(74).fork()).ldelim();
                }
                return w;
            };
    
            PbActivitySamples.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.startTime);
                    if (e)
                        return "startTime." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.metRecordingInterval);
                    if (e)
                        return "metRecordingInterval." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.stepsRecordingInterval);
                    if (e)
                        return "stepsRecordingInterval." + e;
                }
                if (m.metSamples != null && m.hasOwnProperty("metSamples")) {
                    if (!Array.isArray(m.metSamples))
                        return "metSamples: array expected";
                    for (var i = 0; i < m.metSamples.length; ++i) {
                        if (typeof m.metSamples[i] !== "number")
                            return "metSamples: number[] expected";
                    }
                }
                if (m.stepsSamples != null && m.hasOwnProperty("stepsSamples")) {
                    if (!Array.isArray(m.stepsSamples))
                        return "stepsSamples: array expected";
                    for (var i = 0; i < m.stepsSamples.length; ++i) {
                        if (!$util.isInteger(m.stepsSamples[i]))
                            return "stepsSamples: integer[] expected";
                    }
                }
                if (m.sportInfo != null && m.hasOwnProperty("sportInfo")) {
                    if (!Array.isArray(m.sportInfo))
                        return "sportInfo: array expected";
                    for (var i = 0; i < m.sportInfo.length; ++i) {
                        {
                            var e = $root.polar_data.PbSportInfo.verify(m.sportInfo[i]);
                            if (e)
                                return "sportInfo." + e;
                        }
                    }
                }
                if (m.activityInfo != null && m.hasOwnProperty("activityInfo")) {
                    if (!Array.isArray(m.activityInfo))
                        return "activityInfo: array expected";
                    for (var i = 0; i < m.activityInfo.length; ++i) {
                        {
                            var e = $root.polar_data.PbActivityInfo.verify(m.activityInfo[i]);
                            if (e)
                                return "activityInfo." + e;
                        }
                    }
                }
                if (m.inactivityTrigger != null && m.hasOwnProperty("inactivityTrigger")) {
                    if (!Array.isArray(m.inactivityTrigger))
                        return "inactivityTrigger: array expected";
                    for (var i = 0; i < m.inactivityTrigger.length; ++i) {
                        {
                            var e = $root.polar_data.PbInActivityTriggerInfo.verify(m.inactivityTrigger[i]);
                            if (e)
                                return "inactivityTrigger." + e;
                        }
                    }
                }
                if (m.inactivityNonWearTrigger != null && m.hasOwnProperty("inactivityNonWearTrigger")) {
                    if (!Array.isArray(m.inactivityNonWearTrigger))
                        return "inactivityNonWearTrigger: array expected";
                    for (var i = 0; i < m.inactivityNonWearTrigger.length; ++i) {
                        {
                            var e = $root.polar_data.PbInActivityNonWearTriggerInfo.verify(m.inactivityNonWearTrigger[i]);
                            if (e)
                                return "inactivityNonWearTrigger." + e;
                        }
                    }
                }
                return null;
            };
    
            return PbActivitySamples;
        })();
    
        polar_data.PbDeviceManufacturerType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "MANUFACTURER_POLAR"] = 1;
            values[valuesById[2] = "MANUFACTURER_OTHER"] = 2;
            return values;
        })();
    
        polar_data.PbBleUuid = (function() {
    
            function PbBleUuid(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbBleUuid.prototype.uuid = $util.newBuffer([]);
    
            PbBleUuid.create = function create(properties) {
                return new PbBleUuid(properties);
            };
    
            PbBleUuid.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).bytes(m.uuid);
                return w;
            };
    
            PbBleUuid.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!(m.uuid && typeof m.uuid.length === "number" || $util.isString(m.uuid)))
                    return "uuid: buffer expected";
                return null;
            };
    
            return PbBleUuid;
        })();
    
        polar_data.PbBleCharacteristic = (function() {
    
            function PbBleCharacteristic(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbBleCharacteristic.prototype.handle = 0;
            PbBleCharacteristic.prototype.type = null;
    
            PbBleCharacteristic.create = function create(properties) {
                return new PbBleCharacteristic(properties);
            };
    
            PbBleCharacteristic.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.handle);
                $root.polar_data.PbBleUuid.encode(m.type, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbBleCharacteristic.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.handle))
                    return "handle: integer expected";
                {
                    var e = $root.polar_data.PbBleUuid.verify(m.type);
                    if (e)
                        return "type." + e;
                }
                return null;
            };
    
            return PbBleCharacteristic;
        })();
    
        polar_data.PbBleService = (function() {
    
            function PbBleService(p) {
                this.characteristics = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbBleService.prototype.serviceUuid = null;
            PbBleService.prototype.characteristics = $util.emptyArray;
    
            PbBleService.create = function create(properties) {
                return new PbBleService(properties);
            };
    
            PbBleService.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_data.PbBleUuid.encode(m.serviceUuid, w.uint32(10).fork()).ldelim();
                if (m.characteristics != null && m.characteristics.length) {
                    for (var i = 0; i < m.characteristics.length; ++i)
                        $root.polar_data.PbBleCharacteristic.encode(m.characteristics[i], w.uint32(18).fork()).ldelim();
                }
                return w;
            };
    
            PbBleService.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_data.PbBleUuid.verify(m.serviceUuid);
                    if (e)
                        return "serviceUuid." + e;
                }
                if (m.characteristics != null && m.hasOwnProperty("characteristics")) {
                    if (!Array.isArray(m.characteristics))
                        return "characteristics: array expected";
                    for (var i = 0; i < m.characteristics.length; ++i) {
                        {
                            var e = $root.polar_data.PbBleCharacteristic.verify(m.characteristics[i]);
                            if (e)
                                return "characteristics." + e;
                        }
                    }
                }
                return null;
            };
    
            return PbBleService;
        })();
    
        polar_data.PbBleUser = (function() {
    
            function PbBleUser(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbBleUser.prototype.userIndex = 0;
            PbBleUser.prototype.deviceUserIndex = 0;
            PbBleUser.prototype.consent = 0;
    
            PbBleUser.create = function create(properties) {
                return new PbBleUser(properties);
            };
    
            PbBleUser.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.userIndex);
                w.uint32(16).uint32(m.deviceUserIndex);
                if (m.consent != null && m.hasOwnProperty("consent"))
                    w.uint32(24).uint32(m.consent);
                return w;
            };
    
            PbBleUser.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.userIndex))
                    return "userIndex: integer expected";
                if (!$util.isInteger(m.deviceUserIndex))
                    return "deviceUserIndex: integer expected";
                if (m.consent != null && m.hasOwnProperty("consent")) {
                    if (!$util.isInteger(m.consent))
                        return "consent: integer expected";
                }
                return null;
            };
    
            return PbBleUser;
        })();
    
        polar_data.PbBleDevice = (function() {
    
            function PbBleDevice(p) {
                this.availableFeatures = [];
                this.services = [];
                this.userData = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbBleDevice.prototype.paired = null;
            PbBleDevice.prototype.lastModified = null;
            PbBleDevice.prototype.manufacturer = 1;
            PbBleDevice.prototype.deletedTimeStamp = null;
            PbBleDevice.prototype.mac = null;
            PbBleDevice.prototype.deviceId = "";
            PbBleDevice.prototype.name = "";
            PbBleDevice.prototype.batteryLevel = 0;
            PbBleDevice.prototype.manufacturerName = "";
            PbBleDevice.prototype.modelName = "";
            PbBleDevice.prototype.peerLtk = $util.newBuffer([]);
            PbBleDevice.prototype.peerIrk = $util.newBuffer([]);
            PbBleDevice.prototype.peerCsrk = $util.newBuffer([]);
            PbBleDevice.prototype.availableFeatures = $util.emptyArray;
            PbBleDevice.prototype.services = $util.emptyArray;
            PbBleDevice.prototype.peerRand = $util.newBuffer([]);
            PbBleDevice.prototype.peerEdiv = 0;
            PbBleDevice.prototype.encrKeySize = 0;
            PbBleDevice.prototype.distributedKeys = 0;
            PbBleDevice.prototype.authenticated = false;
            PbBleDevice.prototype.sensorLocation = 0;
            PbBleDevice.prototype.softwareVersion = "";
            PbBleDevice.prototype.secondarySoftwareVersion = "";
            PbBleDevice.prototype.serialNumber = "";
            PbBleDevice.prototype.localLtk = $util.newBuffer([]);
            PbBleDevice.prototype.localRand = $util.newBuffer([]);
            PbBleDevice.prototype.localEdiv = 0;
            PbBleDevice.prototype.userData = $util.emptyArray;
    
            PbBleDevice.create = function create(properties) {
                return new PbBleDevice(properties);
            };
    
            PbBleDevice.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbSystemDateTime.encode(m.paired, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                w.uint32(24).int32(m.manufacturer);
                if (m.deletedTimeStamp != null && m.hasOwnProperty("deletedTimeStamp"))
                    $root.polar_types.PbSystemDateTime.encode(m.deletedTimeStamp, w.uint32(42).fork()).ldelim();
                if (m.mac != null && m.hasOwnProperty("mac"))
                    $root.polar_types.PbBleMac.encode(m.mac, w.uint32(50).fork()).ldelim();
                if (m.deviceId != null && m.hasOwnProperty("deviceId"))
                    w.uint32(58).string(m.deviceId);
                if (m.name != null && m.hasOwnProperty("name"))
                    w.uint32(66).string(m.name);
                if (m.batteryLevel != null && m.hasOwnProperty("batteryLevel"))
                    w.uint32(72).uint32(m.batteryLevel);
                if (m.manufacturerName != null && m.hasOwnProperty("manufacturerName"))
                    w.uint32(82).string(m.manufacturerName);
                if (m.modelName != null && m.hasOwnProperty("modelName"))
                    w.uint32(90).string(m.modelName);
                if (m.peerLtk != null && m.hasOwnProperty("peerLtk"))
                    w.uint32(98).bytes(m.peerLtk);
                if (m.peerIrk != null && m.hasOwnProperty("peerIrk"))
                    w.uint32(106).bytes(m.peerIrk);
                if (m.peerCsrk != null && m.hasOwnProperty("peerCsrk"))
                    w.uint32(114).bytes(m.peerCsrk);
                if (m.availableFeatures != null && m.availableFeatures.length) {
                    for (var i = 0; i < m.availableFeatures.length; ++i)
                        w.uint32(120).int32(m.availableFeatures[i]);
                }
                if (m.services != null && m.services.length) {
                    for (var i = 0; i < m.services.length; ++i)
                        $root.polar_data.PbBleService.encode(m.services[i], w.uint32(130).fork()).ldelim();
                }
                if (m.peerRand != null && m.hasOwnProperty("peerRand"))
                    w.uint32(138).bytes(m.peerRand);
                if (m.peerEdiv != null && m.hasOwnProperty("peerEdiv"))
                    w.uint32(144).uint32(m.peerEdiv);
                if (m.encrKeySize != null && m.hasOwnProperty("encrKeySize"))
                    w.uint32(152).uint32(m.encrKeySize);
                if (m.distributedKeys != null && m.hasOwnProperty("distributedKeys"))
                    w.uint32(160).uint32(m.distributedKeys);
                if (m.authenticated != null && m.hasOwnProperty("authenticated"))
                    w.uint32(168).bool(m.authenticated);
                if (m.sensorLocation != null && m.hasOwnProperty("sensorLocation"))
                    w.uint32(176).int32(m.sensorLocation);
                if (m.softwareVersion != null && m.hasOwnProperty("softwareVersion"))
                    w.uint32(186).string(m.softwareVersion);
                if (m.secondarySoftwareVersion != null && m.hasOwnProperty("secondarySoftwareVersion"))
                    w.uint32(194).string(m.secondarySoftwareVersion);
                if (m.serialNumber != null && m.hasOwnProperty("serialNumber"))
                    w.uint32(202).string(m.serialNumber);
                if (m.localLtk != null && m.hasOwnProperty("localLtk"))
                    w.uint32(210).bytes(m.localLtk);
                if (m.localRand != null && m.hasOwnProperty("localRand"))
                    w.uint32(218).bytes(m.localRand);
                if (m.localEdiv != null && m.hasOwnProperty("localEdiv"))
                    w.uint32(224).uint32(m.localEdiv);
                if (m.userData != null && m.userData.length) {
                    for (var i = 0; i < m.userData.length; ++i)
                        $root.polar_data.PbBleUser.encode(m.userData[i], w.uint32(234).fork()).ldelim();
                }
                return w;
            };
    
            PbBleDevice.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.paired);
                    if (e)
                        return "paired." + e;
                }
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                switch (m.manufacturer) {
                default:
                    return "manufacturer: enum value expected";
                case 1:
                case 2:
                    break;
                }
                if (m.deletedTimeStamp != null && m.hasOwnProperty("deletedTimeStamp")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.deletedTimeStamp);
                        if (e)
                            return "deletedTimeStamp." + e;
                    }
                }
                if (m.mac != null && m.hasOwnProperty("mac")) {
                    {
                        var e = $root.polar_types.PbBleMac.verify(m.mac);
                        if (e)
                            return "mac." + e;
                    }
                }
                if (m.deviceId != null && m.hasOwnProperty("deviceId")) {
                    if (!$util.isString(m.deviceId))
                        return "deviceId: string expected";
                }
                if (m.name != null && m.hasOwnProperty("name")) {
                    if (!$util.isString(m.name))
                        return "name: string expected";
                }
                if (m.batteryLevel != null && m.hasOwnProperty("batteryLevel")) {
                    if (!$util.isInteger(m.batteryLevel))
                        return "batteryLevel: integer expected";
                }
                if (m.manufacturerName != null && m.hasOwnProperty("manufacturerName")) {
                    if (!$util.isString(m.manufacturerName))
                        return "manufacturerName: string expected";
                }
                if (m.modelName != null && m.hasOwnProperty("modelName")) {
                    if (!$util.isString(m.modelName))
                        return "modelName: string expected";
                }
                if (m.peerLtk != null && m.hasOwnProperty("peerLtk")) {
                    if (!(m.peerLtk && typeof m.peerLtk.length === "number" || $util.isString(m.peerLtk)))
                        return "peerLtk: buffer expected";
                }
                if (m.peerIrk != null && m.hasOwnProperty("peerIrk")) {
                    if (!(m.peerIrk && typeof m.peerIrk.length === "number" || $util.isString(m.peerIrk)))
                        return "peerIrk: buffer expected";
                }
                if (m.peerCsrk != null && m.hasOwnProperty("peerCsrk")) {
                    if (!(m.peerCsrk && typeof m.peerCsrk.length === "number" || $util.isString(m.peerCsrk)))
                        return "peerCsrk: buffer expected";
                }
                if (m.availableFeatures != null && m.hasOwnProperty("availableFeatures")) {
                    if (!Array.isArray(m.availableFeatures))
                        return "availableFeatures: array expected";
                    for (var i = 0; i < m.availableFeatures.length; ++i) {
                        switch (m.availableFeatures[i]) {
                        default:
                            return "availableFeatures: enum value[] expected";
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                        case 5:
                        case 6:
                        case 7:
                        case 8:
                        case 9:
                        case 10:
                        case 11:
                        case 12:
                        case 13:
                        case 14:
                        case 15:
                        case 16:
                        case 17:
                        case 18:
                        case 19:
                        case 20:
                        case 21:
                        case 22:
                        case 23:
                        case 24:
                        case 25:
                        case 26:
                        case 27:
                        case 28:
                        case 29:
                            break;
                        }
                    }
                }
                if (m.services != null && m.hasOwnProperty("services")) {
                    if (!Array.isArray(m.services))
                        return "services: array expected";
                    for (var i = 0; i < m.services.length; ++i) {
                        {
                            var e = $root.polar_data.PbBleService.verify(m.services[i]);
                            if (e)
                                return "services." + e;
                        }
                    }
                }
                if (m.peerRand != null && m.hasOwnProperty("peerRand")) {
                    if (!(m.peerRand && typeof m.peerRand.length === "number" || $util.isString(m.peerRand)))
                        return "peerRand: buffer expected";
                }
                if (m.peerEdiv != null && m.hasOwnProperty("peerEdiv")) {
                    if (!$util.isInteger(m.peerEdiv))
                        return "peerEdiv: integer expected";
                }
                if (m.encrKeySize != null && m.hasOwnProperty("encrKeySize")) {
                    if (!$util.isInteger(m.encrKeySize))
                        return "encrKeySize: integer expected";
                }
                if (m.distributedKeys != null && m.hasOwnProperty("distributedKeys")) {
                    if (!$util.isInteger(m.distributedKeys))
                        return "distributedKeys: integer expected";
                }
                if (m.authenticated != null && m.hasOwnProperty("authenticated")) {
                    if (typeof m.authenticated !== "boolean")
                        return "authenticated: boolean expected";
                }
                if (m.sensorLocation != null && m.hasOwnProperty("sensorLocation")) {
                    switch (m.sensorLocation) {
                    default:
                        return "sensorLocation: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                    case 8:
                    case 9:
                    case 10:
                    case 11:
                    case 12:
                    case 13:
                    case 14:
                        break;
                    }
                }
                if (m.softwareVersion != null && m.hasOwnProperty("softwareVersion")) {
                    if (!$util.isString(m.softwareVersion))
                        return "softwareVersion: string expected";
                }
                if (m.secondarySoftwareVersion != null && m.hasOwnProperty("secondarySoftwareVersion")) {
                    if (!$util.isString(m.secondarySoftwareVersion))
                        return "secondarySoftwareVersion: string expected";
                }
                if (m.serialNumber != null && m.hasOwnProperty("serialNumber")) {
                    if (!$util.isString(m.serialNumber))
                        return "serialNumber: string expected";
                }
                if (m.localLtk != null && m.hasOwnProperty("localLtk")) {
                    if (!(m.localLtk && typeof m.localLtk.length === "number" || $util.isString(m.localLtk)))
                        return "localLtk: buffer expected";
                }
                if (m.localRand != null && m.hasOwnProperty("localRand")) {
                    if (!(m.localRand && typeof m.localRand.length === "number" || $util.isString(m.localRand)))
                        return "localRand: buffer expected";
                }
                if (m.localEdiv != null && m.hasOwnProperty("localEdiv")) {
                    if (!$util.isInteger(m.localEdiv))
                        return "localEdiv: integer expected";
                }
                if (m.userData != null && m.hasOwnProperty("userData")) {
                    if (!Array.isArray(m.userData))
                        return "userData: array expected";
                    for (var i = 0; i < m.userData.length; ++i) {
                        {
                            var e = $root.polar_data.PbBleUser.verify(m.userData[i]);
                            if (e)
                                return "userData." + e;
                        }
                    }
                }
                return null;
            };
    
            PbBleDevice.PbBleKeyType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "BLE_PEER_ENCRYPTION_KEY"] = 1;
                values[valuesById[2] = "BLE_PEER_IDENTIFICATION_KEY"] = 2;
                values[valuesById[4] = "BLE_PEER_SIGNING_KEY"] = 4;
                values[valuesById[8] = "BLE_LOCAL_ENCRYPTION_KEY"] = 8;
                values[valuesById[16] = "BLE_LOCAL_IDENTIFICATION_KEY"] = 16;
                values[valuesById[32] = "BLE_LOCAL_SIGNING_KEY"] = 32;
                return values;
            })();
    
            PbBleDevice.PbSensorLocation = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "SENSOR_LOCATION_OTHER"] = 0;
                values[valuesById[1] = "SENSOR_LOCATION_TOP_OF_SHOE"] = 1;
                values[valuesById[2] = "SENSOR_LOCATION_IN_SHOE"] = 2;
                values[valuesById[3] = "SENSOR_LOCATION_HIP"] = 3;
                values[valuesById[4] = "SENSOR_LOCATION_FRONT_WHEEL"] = 4;
                values[valuesById[5] = "SENSOR_LOCATION_LEFT_CRANK"] = 5;
                values[valuesById[6] = "SENSOR_LOCATION_RIGHT_CRANK"] = 6;
                values[valuesById[7] = "SENSOR_LOCATION_LEFT_PEDAL"] = 7;
                values[valuesById[8] = "SENSOR_LOCATION_RIGHT_PEDAL"] = 8;
                values[valuesById[9] = "SENSOR_LOCATION_FRONT_HUB"] = 9;
                values[valuesById[10] = "SENSOR_LOCATION_REAR_DROPOUT"] = 10;
                values[valuesById[11] = "SENSOR_LOCATION_CHAINSTAY"] = 11;
                values[valuesById[12] = "SENSOR_LOCATION_REAR_WHEEL"] = 12;
                values[valuesById[13] = "SENSOR_LOCATION_REAR_HUB"] = 13;
                values[valuesById[14] = "SENSOR_LOCATION_CHEST"] = 14;
                return values;
            })();
    
            return PbBleDevice;
        })();
    
        polar_data.PbActivityGoalSummary = (function() {
    
            function PbActivityGoalSummary(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbActivityGoalSummary.prototype.activityGoal = 0;
            PbActivityGoalSummary.prototype.achievedActivity = 0;
            PbActivityGoalSummary.prototype.timeToGoUp = null;
            PbActivityGoalSummary.prototype.timeToGoWalk = null;
            PbActivityGoalSummary.prototype.timeToGoJog = null;
    
            PbActivityGoalSummary.create = function create(properties) {
                return new PbActivityGoalSummary(properties);
            };
    
            PbActivityGoalSummary.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.activityGoal);
                w.uint32(21).float(m.achievedActivity);
                if (m.timeToGoUp != null && m.hasOwnProperty("timeToGoUp"))
                    $root.polar_types.PbDuration.encode(m.timeToGoUp, w.uint32(26).fork()).ldelim();
                if (m.timeToGoWalk != null && m.hasOwnProperty("timeToGoWalk"))
                    $root.polar_types.PbDuration.encode(m.timeToGoWalk, w.uint32(34).fork()).ldelim();
                if (m.timeToGoJog != null && m.hasOwnProperty("timeToGoJog"))
                    $root.polar_types.PbDuration.encode(m.timeToGoJog, w.uint32(42).fork()).ldelim();
                return w;
            };
    
            PbActivityGoalSummary.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.activityGoal !== "number")
                    return "activityGoal: number expected";
                if (typeof m.achievedActivity !== "number")
                    return "achievedActivity: number expected";
                if (m.timeToGoUp != null && m.hasOwnProperty("timeToGoUp")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.timeToGoUp);
                        if (e)
                            return "timeToGoUp." + e;
                    }
                }
                if (m.timeToGoWalk != null && m.hasOwnProperty("timeToGoWalk")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.timeToGoWalk);
                        if (e)
                            return "timeToGoWalk." + e;
                    }
                }
                if (m.timeToGoJog != null && m.hasOwnProperty("timeToGoJog")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.timeToGoJog);
                        if (e)
                            return "timeToGoJog." + e;
                    }
                }
                return null;
            };
    
            return PbActivityGoalSummary;
        })();
    
        polar_data.PbActivityClassTimes = (function() {
    
            function PbActivityClassTimes(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbActivityClassTimes.prototype.timeNonWear = null;
            PbActivityClassTimes.prototype.timeSleep = null;
            PbActivityClassTimes.prototype.timeSedentary = null;
            PbActivityClassTimes.prototype.timeLightActivity = null;
            PbActivityClassTimes.prototype.timeContinuousModerate = null;
            PbActivityClassTimes.prototype.timeIntermittentModerate = null;
            PbActivityClassTimes.prototype.timeContinuousVigorous = null;
            PbActivityClassTimes.prototype.timeIntermittentVigorous = null;
    
            PbActivityClassTimes.create = function create(properties) {
                return new PbActivityClassTimes(properties);
            };
    
            PbActivityClassTimes.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDuration.encode(m.timeNonWear, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.timeSleep, w.uint32(18).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.timeSedentary, w.uint32(26).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.timeLightActivity, w.uint32(34).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.timeContinuousModerate, w.uint32(42).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.timeIntermittentModerate, w.uint32(50).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.timeContinuousVigorous, w.uint32(58).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.timeIntermittentVigorous, w.uint32(66).fork()).ldelim();
                return w;
            };
    
            PbActivityClassTimes.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.timeNonWear);
                    if (e)
                        return "timeNonWear." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.timeSleep);
                    if (e)
                        return "timeSleep." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.timeSedentary);
                    if (e)
                        return "timeSedentary." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.timeLightActivity);
                    if (e)
                        return "timeLightActivity." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.timeContinuousModerate);
                    if (e)
                        return "timeContinuousModerate." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.timeIntermittentModerate);
                    if (e)
                        return "timeIntermittentModerate." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.timeContinuousVigorous);
                    if (e)
                        return "timeContinuousVigorous." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.timeIntermittentVigorous);
                    if (e)
                        return "timeIntermittentVigorous." + e;
                }
                return null;
            };
    
            return PbActivityClassTimes;
        })();
    
        polar_data.PbDailySummary = (function() {
    
            function PbDailySummary(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbDailySummary.prototype.date = null;
            PbDailySummary.prototype.steps = 0;
            PbDailySummary.prototype.activityCalories = 0;
            PbDailySummary.prototype.trainingCalories = 0;
            PbDailySummary.prototype.bmrCalories = 0;
            PbDailySummary.prototype.activityGoalSummary = null;
            PbDailySummary.prototype.activityClassTimes = null;
            PbDailySummary.prototype.activityDistance = 0;
    
            PbDailySummary.create = function create(properties) {
                return new PbDailySummary(properties);
            };
    
            PbDailySummary.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDate.encode(m.date, w.uint32(10).fork()).ldelim();
                if (m.steps != null && m.hasOwnProperty("steps"))
                    w.uint32(16).uint32(m.steps);
                if (m.activityCalories != null && m.hasOwnProperty("activityCalories"))
                    w.uint32(24).uint32(m.activityCalories);
                if (m.trainingCalories != null && m.hasOwnProperty("trainingCalories"))
                    w.uint32(32).uint32(m.trainingCalories);
                if (m.bmrCalories != null && m.hasOwnProperty("bmrCalories"))
                    w.uint32(40).uint32(m.bmrCalories);
                if (m.activityGoalSummary != null && m.hasOwnProperty("activityGoalSummary"))
                    $root.polar_data.PbActivityGoalSummary.encode(m.activityGoalSummary, w.uint32(50).fork()).ldelim();
                if (m.activityClassTimes != null && m.hasOwnProperty("activityClassTimes"))
                    $root.polar_data.PbActivityClassTimes.encode(m.activityClassTimes, w.uint32(58).fork()).ldelim();
                if (m.activityDistance != null && m.hasOwnProperty("activityDistance"))
                    w.uint32(69).float(m.activityDistance);
                return w;
            };
    
            PbDailySummary.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDate.verify(m.date);
                    if (e)
                        return "date." + e;
                }
                if (m.steps != null && m.hasOwnProperty("steps")) {
                    if (!$util.isInteger(m.steps))
                        return "steps: integer expected";
                }
                if (m.activityCalories != null && m.hasOwnProperty("activityCalories")) {
                    if (!$util.isInteger(m.activityCalories))
                        return "activityCalories: integer expected";
                }
                if (m.trainingCalories != null && m.hasOwnProperty("trainingCalories")) {
                    if (!$util.isInteger(m.trainingCalories))
                        return "trainingCalories: integer expected";
                }
                if (m.bmrCalories != null && m.hasOwnProperty("bmrCalories")) {
                    if (!$util.isInteger(m.bmrCalories))
                        return "bmrCalories: integer expected";
                }
                if (m.activityGoalSummary != null && m.hasOwnProperty("activityGoalSummary")) {
                    {
                        var e = $root.polar_data.PbActivityGoalSummary.verify(m.activityGoalSummary);
                        if (e)
                            return "activityGoalSummary." + e;
                    }
                }
                if (m.activityClassTimes != null && m.hasOwnProperty("activityClassTimes")) {
                    {
                        var e = $root.polar_data.PbActivityClassTimes.verify(m.activityClassTimes);
                        if (e)
                            return "activityClassTimes." + e;
                    }
                }
                if (m.activityDistance != null && m.hasOwnProperty("activityDistance")) {
                    if (typeof m.activityDistance !== "number")
                        return "activityDistance: number expected";
                }
                return null;
            };
    
            return PbDailySummary;
        })();
    
        polar_data.PbVersion = (function() {
    
            function PbVersion(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbVersion.prototype.major = 0;
            PbVersion.prototype.minor = 0;
            PbVersion.prototype.patch = 0;
            PbVersion.prototype.specifier = "";
    
            PbVersion.create = function create(properties) {
                return new PbVersion(properties);
            };
    
            PbVersion.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.major);
                w.uint32(16).uint32(m.minor);
                w.uint32(24).uint32(m.patch);
                if (m.specifier != null && m.hasOwnProperty("specifier"))
                    w.uint32(34).string(m.specifier);
                return w;
            };
    
            PbVersion.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.major))
                    return "major: integer expected";
                if (!$util.isInteger(m.minor))
                    return "minor: integer expected";
                if (!$util.isInteger(m.patch))
                    return "patch: integer expected";
                if (m.specifier != null && m.hasOwnProperty("specifier")) {
                    if (!$util.isString(m.specifier))
                        return "specifier: string expected";
                }
                return null;
            };
    
            return PbVersion;
        })();
    
        polar_data.PbDeviceInfo = (function() {
    
            function PbDeviceInfo(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbDeviceInfo.prototype.bootloaderVersion = null;
            PbDeviceInfo.prototype.platformVersion = null;
            PbDeviceInfo.prototype.deviceVersion = null;
            PbDeviceInfo.prototype.svnRev = 0;
            PbDeviceInfo.prototype.electricalSerialNumber = "";
            PbDeviceInfo.prototype.deviceID = "";
            PbDeviceInfo.prototype.modelName = "";
            PbDeviceInfo.prototype.hardwareCode = "";
            PbDeviceInfo.prototype.productColor = "";
            PbDeviceInfo.prototype.productDesign = "";
            PbDeviceInfo.prototype.systemId = "";
    
            PbDeviceInfo.create = function create(properties) {
                return new PbDeviceInfo(properties);
            };
    
            PbDeviceInfo.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.bootloaderVersion != null && m.hasOwnProperty("bootloaderVersion"))
                    $root.polar_data.PbVersion.encode(m.bootloaderVersion, w.uint32(10).fork()).ldelim();
                if (m.platformVersion != null && m.hasOwnProperty("platformVersion"))
                    $root.polar_data.PbVersion.encode(m.platformVersion, w.uint32(18).fork()).ldelim();
                if (m.deviceVersion != null && m.hasOwnProperty("deviceVersion"))
                    $root.polar_data.PbVersion.encode(m.deviceVersion, w.uint32(26).fork()).ldelim();
                if (m.svnRev != null && m.hasOwnProperty("svnRev"))
                    w.uint32(32).uint32(m.svnRev);
                if (m.electricalSerialNumber != null && m.hasOwnProperty("electricalSerialNumber"))
                    w.uint32(42).string(m.electricalSerialNumber);
                if (m.deviceID != null && m.hasOwnProperty("deviceID"))
                    w.uint32(50).string(m.deviceID);
                if (m.modelName != null && m.hasOwnProperty("modelName"))
                    w.uint32(58).string(m.modelName);
                if (m.hardwareCode != null && m.hasOwnProperty("hardwareCode"))
                    w.uint32(66).string(m.hardwareCode);
                if (m.productColor != null && m.hasOwnProperty("productColor"))
                    w.uint32(74).string(m.productColor);
                if (m.productDesign != null && m.hasOwnProperty("productDesign"))
                    w.uint32(82).string(m.productDesign);
                if (m.systemId != null && m.hasOwnProperty("systemId"))
                    w.uint32(90).string(m.systemId);
                return w;
            };
    
            PbDeviceInfo.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.bootloaderVersion != null && m.hasOwnProperty("bootloaderVersion")) {
                    {
                        var e = $root.polar_data.PbVersion.verify(m.bootloaderVersion);
                        if (e)
                            return "bootloaderVersion." + e;
                    }
                }
                if (m.platformVersion != null && m.hasOwnProperty("platformVersion")) {
                    {
                        var e = $root.polar_data.PbVersion.verify(m.platformVersion);
                        if (e)
                            return "platformVersion." + e;
                    }
                }
                if (m.deviceVersion != null && m.hasOwnProperty("deviceVersion")) {
                    {
                        var e = $root.polar_data.PbVersion.verify(m.deviceVersion);
                        if (e)
                            return "deviceVersion." + e;
                    }
                }
                if (m.svnRev != null && m.hasOwnProperty("svnRev")) {
                    if (!$util.isInteger(m.svnRev))
                        return "svnRev: integer expected";
                }
                if (m.electricalSerialNumber != null && m.hasOwnProperty("electricalSerialNumber")) {
                    if (!$util.isString(m.electricalSerialNumber))
                        return "electricalSerialNumber: string expected";
                }
                if (m.deviceID != null && m.hasOwnProperty("deviceID")) {
                    if (!$util.isString(m.deviceID))
                        return "deviceID: string expected";
                }
                if (m.modelName != null && m.hasOwnProperty("modelName")) {
                    if (!$util.isString(m.modelName))
                        return "modelName: string expected";
                }
                if (m.hardwareCode != null && m.hasOwnProperty("hardwareCode")) {
                    if (!$util.isString(m.hardwareCode))
                        return "hardwareCode: string expected";
                }
                if (m.productColor != null && m.hasOwnProperty("productColor")) {
                    if (!$util.isString(m.productColor))
                        return "productColor: string expected";
                }
                if (m.productDesign != null && m.hasOwnProperty("productDesign")) {
                    if (!$util.isString(m.productDesign))
                        return "productDesign: string expected";
                }
                if (m.systemId != null && m.hasOwnProperty("systemId")) {
                    if (!$util.isString(m.systemId))
                        return "systemId: string expected";
                }
                return null;
            };
    
            return PbDeviceInfo;
        })();
    
        polar_data.PbConstraintViolation = (function() {
    
            function PbConstraintViolation(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbConstraintViolation.prototype.valueName = "";
            PbConstraintViolation.prototype.violationReason = "";
    
            PbConstraintViolation.create = function create(properties) {
                return new PbConstraintViolation(properties);
            };
    
            PbConstraintViolation.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).string(m.valueName);
                w.uint32(18).string(m.violationReason);
                return w;
            };
    
            PbConstraintViolation.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isString(m.valueName))
                    return "valueName: string expected";
                if (!$util.isString(m.violationReason))
                    return "violationReason: string expected";
                return null;
            };
    
            return PbConstraintViolation;
        })();
    
        polar_data.PbErrors = (function() {
    
            function PbErrors(p) {
                this.violations = [];
                this.errors = [];
                this.stackTrace = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbErrors.prototype.message = "";
            PbErrors.prototype.violations = $util.emptyArray;
            PbErrors.prototype.errors = $util.emptyArray;
            PbErrors.prototype.stackTrace = $util.emptyArray;
    
            PbErrors.create = function create(properties) {
                return new PbErrors(properties);
            };
    
            PbErrors.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).string(m.message);
                if (m.violations != null && m.violations.length) {
                    for (var i = 0; i < m.violations.length; ++i)
                        $root.polar_data.PbConstraintViolation.encode(m.violations[i], w.uint32(18).fork()).ldelim();
                }
                if (m.errors != null && m.errors.length) {
                    for (var i = 0; i < m.errors.length; ++i)
                        w.uint32(26).string(m.errors[i]);
                }
                if (m.stackTrace != null && m.stackTrace.length) {
                    for (var i = 0; i < m.stackTrace.length; ++i)
                        w.uint32(34).string(m.stackTrace[i]);
                }
                return w;
            };
    
            PbErrors.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isString(m.message))
                    return "message: string expected";
                if (m.violations != null && m.hasOwnProperty("violations")) {
                    if (!Array.isArray(m.violations))
                        return "violations: array expected";
                    for (var i = 0; i < m.violations.length; ++i) {
                        {
                            var e = $root.polar_data.PbConstraintViolation.verify(m.violations[i]);
                            if (e)
                                return "violations." + e;
                        }
                    }
                }
                if (m.errors != null && m.hasOwnProperty("errors")) {
                    if (!Array.isArray(m.errors))
                        return "errors: array expected";
                    for (var i = 0; i < m.errors.length; ++i) {
                        if (!$util.isString(m.errors[i]))
                            return "errors: string[] expected";
                    }
                }
                if (m.stackTrace != null && m.hasOwnProperty("stackTrace")) {
                    if (!Array.isArray(m.stackTrace))
                        return "stackTrace: array expected";
                    for (var i = 0; i < m.stackTrace.length; ++i) {
                        if (!$util.isString(m.stackTrace[i]))
                            return "stackTrace: string[] expected";
                    }
                }
                return null;
            };
    
            return PbErrors;
        })();
    
        polar_data.PbExerciseCounters = (function() {
    
            function PbExerciseCounters(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbExerciseCounters.prototype.sprintCount = 0;
    
            PbExerciseCounters.create = function create(properties) {
                return new PbExerciseCounters(properties);
            };
    
            PbExerciseCounters.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.sprintCount != null && m.hasOwnProperty("sprintCount"))
                    w.uint32(8).uint32(m.sprintCount);
                return w;
            };
    
            PbExerciseCounters.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.sprintCount != null && m.hasOwnProperty("sprintCount")) {
                    if (!$util.isInteger(m.sprintCount))
                        return "sprintCount: integer expected";
                }
                return null;
            };
    
            return PbExerciseCounters;
        })();
    
        polar_data.PbExerciseBase = (function() {
    
            function PbExerciseBase(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbExerciseBase.prototype.start = null;
            PbExerciseBase.prototype.duration = null;
            PbExerciseBase.prototype.sport = null;
            PbExerciseBase.prototype.distance = 0;
            PbExerciseBase.prototype.calories = 0;
            PbExerciseBase.prototype.trainingLoad = null;
            PbExerciseBase.prototype.runningIndex = null;
            PbExerciseBase.prototype.ascent = 0;
            PbExerciseBase.prototype.descent = 0;
            PbExerciseBase.prototype.latitude = 0;
            PbExerciseBase.prototype.longitude = 0;
            PbExerciseBase.prototype.place = "";
            PbExerciseBase.prototype.exerciseCounters = null;
            PbExerciseBase.prototype.speedCalibrationOffset = 0;
            PbExerciseBase.prototype.walkingDistance = 0;
            PbExerciseBase.prototype.walkingDuration = null;
    
            PbExerciseBase.create = function create(properties) {
                return new PbExerciseBase(properties);
            };
    
            PbExerciseBase.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLocalDateTime.encode(m.start, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.duration, w.uint32(18).fork()).ldelim();
                $root.polar_types.PbSportIdentifier.encode(m.sport, w.uint32(26).fork()).ldelim();
                if (m.distance != null && m.hasOwnProperty("distance"))
                    w.uint32(37).float(m.distance);
                if (m.calories != null && m.hasOwnProperty("calories"))
                    w.uint32(40).uint32(m.calories);
                if (m.trainingLoad != null && m.hasOwnProperty("trainingLoad"))
                    $root.polar_types.PbTrainingLoad.encode(m.trainingLoad, w.uint32(50).fork()).ldelim();
                if (m.runningIndex != null && m.hasOwnProperty("runningIndex"))
                    $root.polar_types.PbRunningIndex.encode(m.runningIndex, w.uint32(74).fork()).ldelim();
                if (m.ascent != null && m.hasOwnProperty("ascent"))
                    w.uint32(85).float(m.ascent);
                if (m.descent != null && m.hasOwnProperty("descent"))
                    w.uint32(93).float(m.descent);
                if (m.latitude != null && m.hasOwnProperty("latitude"))
                    w.uint32(97).double(m.latitude);
                if (m.longitude != null && m.hasOwnProperty("longitude"))
                    w.uint32(105).double(m.longitude);
                if (m.place != null && m.hasOwnProperty("place"))
                    w.uint32(114).string(m.place);
                if (m.exerciseCounters != null && m.hasOwnProperty("exerciseCounters"))
                    $root.polar_data.PbExerciseCounters.encode(m.exerciseCounters, w.uint32(130).fork()).ldelim();
                if (m.speedCalibrationOffset != null && m.hasOwnProperty("speedCalibrationOffset"))
                    w.uint32(141).float(m.speedCalibrationOffset);
                if (m.walkingDistance != null && m.hasOwnProperty("walkingDistance"))
                    w.uint32(149).float(m.walkingDistance);
                if (m.walkingDuration != null && m.hasOwnProperty("walkingDuration"))
                    $root.polar_types.PbDuration.encode(m.walkingDuration, w.uint32(154).fork()).ldelim();
                return w;
            };
    
            PbExerciseBase.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.start);
                    if (e)
                        return "start." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.duration);
                    if (e)
                        return "duration." + e;
                }
                {
                    var e = $root.polar_types.PbSportIdentifier.verify(m.sport);
                    if (e)
                        return "sport." + e;
                }
                if (m.distance != null && m.hasOwnProperty("distance")) {
                    if (typeof m.distance !== "number")
                        return "distance: number expected";
                }
                if (m.calories != null && m.hasOwnProperty("calories")) {
                    if (!$util.isInteger(m.calories))
                        return "calories: integer expected";
                }
                if (m.trainingLoad != null && m.hasOwnProperty("trainingLoad")) {
                    {
                        var e = $root.polar_types.PbTrainingLoad.verify(m.trainingLoad);
                        if (e)
                            return "trainingLoad." + e;
                    }
                }
                if (m.runningIndex != null && m.hasOwnProperty("runningIndex")) {
                    {
                        var e = $root.polar_types.PbRunningIndex.verify(m.runningIndex);
                        if (e)
                            return "runningIndex." + e;
                    }
                }
                if (m.ascent != null && m.hasOwnProperty("ascent")) {
                    if (typeof m.ascent !== "number")
                        return "ascent: number expected";
                }
                if (m.descent != null && m.hasOwnProperty("descent")) {
                    if (typeof m.descent !== "number")
                        return "descent: number expected";
                }
                if (m.latitude != null && m.hasOwnProperty("latitude")) {
                    if (typeof m.latitude !== "number")
                        return "latitude: number expected";
                }
                if (m.longitude != null && m.hasOwnProperty("longitude")) {
                    if (typeof m.longitude !== "number")
                        return "longitude: number expected";
                }
                if (m.place != null && m.hasOwnProperty("place")) {
                    if (!$util.isString(m.place))
                        return "place: string expected";
                }
                if (m.exerciseCounters != null && m.hasOwnProperty("exerciseCounters")) {
                    {
                        var e = $root.polar_data.PbExerciseCounters.verify(m.exerciseCounters);
                        if (e)
                            return "exerciseCounters." + e;
                    }
                }
                if (m.speedCalibrationOffset != null && m.hasOwnProperty("speedCalibrationOffset")) {
                    if (typeof m.speedCalibrationOffset !== "number")
                        return "speedCalibrationOffset: number expected";
                }
                if (m.walkingDistance != null && m.hasOwnProperty("walkingDistance")) {
                    if (typeof m.walkingDistance !== "number")
                        return "walkingDistance: number expected";
                }
                if (m.walkingDuration != null && m.hasOwnProperty("walkingDuration")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.walkingDuration);
                        if (e)
                            return "walkingDuration." + e;
                    }
                }
                return null;
            };
    
            return PbExerciseBase;
        })();
    
        polar_data.PbLapHeader = (function() {
    
            function PbLapHeader(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapHeader.prototype.splitTime = null;
            PbLapHeader.prototype.duration = null;
            PbLapHeader.prototype.distance = 0;
            PbLapHeader.prototype.ascent = 0;
            PbLapHeader.prototype.descent = 0;
            PbLapHeader.prototype.autolapType = 1;
    
            PbLapHeader.create = function create(properties) {
                return new PbLapHeader(properties);
            };
    
            PbLapHeader.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDuration.encode(m.splitTime, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.duration, w.uint32(18).fork()).ldelim();
                if (m.distance != null && m.hasOwnProperty("distance"))
                    w.uint32(29).float(m.distance);
                if (m.ascent != null && m.hasOwnProperty("ascent"))
                    w.uint32(37).float(m.ascent);
                if (m.descent != null && m.hasOwnProperty("descent"))
                    w.uint32(45).float(m.descent);
                if (m.autolapType != null && m.hasOwnProperty("autolapType"))
                    w.uint32(48).int32(m.autolapType);
                return w;
            };
    
            PbLapHeader.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.splitTime);
                    if (e)
                        return "splitTime." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.duration);
                    if (e)
                        return "duration." + e;
                }
                if (m.distance != null && m.hasOwnProperty("distance")) {
                    if (typeof m.distance !== "number")
                        return "distance: number expected";
                }
                if (m.ascent != null && m.hasOwnProperty("ascent")) {
                    if (typeof m.ascent !== "number")
                        return "ascent: number expected";
                }
                if (m.descent != null && m.hasOwnProperty("descent")) {
                    if (typeof m.descent !== "number")
                        return "descent: number expected";
                }
                if (m.autolapType != null && m.hasOwnProperty("autolapType")) {
                    switch (m.autolapType) {
                    default:
                        return "autolapType: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                }
                return null;
            };
    
            PbLapHeader.PbAutolapType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "AUTOLAP_TYPE_DISTANCE"] = 1;
                values[valuesById[2] = "AUTOLAP_TYPE_DURATION"] = 2;
                values[valuesById[3] = "AUTOLAP_TYPE_LOCATION"] = 3;
                return values;
            })();
    
            return PbLapHeader;
        })();
    
        polar_data.PbLapSwimmingStatistics = (function() {
    
            function PbLapSwimmingStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapSwimmingStatistics.prototype.lapStrokes = 0;
            PbLapSwimmingStatistics.prototype.poolCount = 0;
            PbLapSwimmingStatistics.prototype.avgDurationOfPool = 0;
    
            PbLapSwimmingStatistics.create = function create(properties) {
                return new PbLapSwimmingStatistics(properties);
            };
    
            PbLapSwimmingStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.lapStrokes != null && m.hasOwnProperty("lapStrokes"))
                    w.uint32(8).uint32(m.lapStrokes);
                if (m.poolCount != null && m.hasOwnProperty("poolCount"))
                    w.uint32(16).uint32(m.poolCount);
                if (m.avgDurationOfPool != null && m.hasOwnProperty("avgDurationOfPool"))
                    w.uint32(29).float(m.avgDurationOfPool);
                return w;
            };
    
            PbLapSwimmingStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.lapStrokes != null && m.hasOwnProperty("lapStrokes")) {
                    if (!$util.isInteger(m.lapStrokes))
                        return "lapStrokes: integer expected";
                }
                if (m.poolCount != null && m.hasOwnProperty("poolCount")) {
                    if (!$util.isInteger(m.poolCount))
                        return "poolCount: integer expected";
                }
                if (m.avgDurationOfPool != null && m.hasOwnProperty("avgDurationOfPool")) {
                    if (typeof m.avgDurationOfPool !== "number")
                        return "avgDurationOfPool: number expected";
                }
                return null;
            };
    
            return PbLapSwimmingStatistics;
        })();
    
        polar_data.PbLapHeartRateStatistics = (function() {
    
            function PbLapHeartRateStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapHeartRateStatistics.prototype.average = 0;
            PbLapHeartRateStatistics.prototype.maximum = 0;
            PbLapHeartRateStatistics.prototype.minimum = 0;
    
            PbLapHeartRateStatistics.create = function create(properties) {
                return new PbLapHeartRateStatistics(properties);
            };
    
            PbLapHeartRateStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).uint32(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(16).uint32(m.maximum);
                if (m.minimum != null && m.hasOwnProperty("minimum"))
                    w.uint32(24).uint32(m.minimum);
                return w;
            };
    
            PbLapHeartRateStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (!$util.isInteger(m.maximum))
                        return "maximum: integer expected";
                }
                if (m.minimum != null && m.hasOwnProperty("minimum")) {
                    if (!$util.isInteger(m.minimum))
                        return "minimum: integer expected";
                }
                return null;
            };
    
            return PbLapHeartRateStatistics;
        })();
    
        polar_data.PbLapSpeedStatistics = (function() {
    
            function PbLapSpeedStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapSpeedStatistics.prototype.average = 0;
            PbLapSpeedStatistics.prototype.maximum = 0;
    
            PbLapSpeedStatistics.create = function create(properties) {
                return new PbLapSpeedStatistics(properties);
            };
    
            PbLapSpeedStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(13).float(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(21).float(m.maximum);
                return w;
            };
    
            PbLapSpeedStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (typeof m.average !== "number")
                        return "average: number expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (typeof m.maximum !== "number")
                        return "maximum: number expected";
                }
                return null;
            };
    
            return PbLapSpeedStatistics;
        })();
    
        polar_data.PbLapCadenceStatistics = (function() {
    
            function PbLapCadenceStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapCadenceStatistics.prototype.average = 0;
            PbLapCadenceStatistics.prototype.maximum = 0;
    
            PbLapCadenceStatistics.create = function create(properties) {
                return new PbLapCadenceStatistics(properties);
            };
    
            PbLapCadenceStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).uint32(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(16).uint32(m.maximum);
                return w;
            };
    
            PbLapCadenceStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (!$util.isInteger(m.maximum))
                        return "maximum: integer expected";
                }
                return null;
            };
    
            return PbLapCadenceStatistics;
        })();
    
        polar_data.PbLapPowerStatistics = (function() {
    
            function PbLapPowerStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapPowerStatistics.prototype.average = 0;
            PbLapPowerStatistics.prototype.maximum = 0;
    
            PbLapPowerStatistics.create = function create(properties) {
                return new PbLapPowerStatistics(properties);
            };
    
            PbLapPowerStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).int32(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(16).int32(m.maximum);
                return w;
            };
    
            PbLapPowerStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (!$util.isInteger(m.maximum))
                        return "maximum: integer expected";
                }
                return null;
            };
    
            return PbLapPowerStatistics;
        })();
    
        polar_data.PbLapLRBalanceStatistics = (function() {
    
            function PbLapLRBalanceStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapLRBalanceStatistics.prototype.average = 0;
    
            PbLapLRBalanceStatistics.create = function create(properties) {
                return new PbLapLRBalanceStatistics(properties);
            };
    
            PbLapLRBalanceStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(13).float(m.average);
                return w;
            };
    
            PbLapLRBalanceStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (typeof m.average !== "number")
                        return "average: number expected";
                }
                return null;
            };
    
            return PbLapLRBalanceStatistics;
        })();
    
        polar_data.PbLapPedalingIndexStatistics = (function() {
    
            function PbLapPedalingIndexStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapPedalingIndexStatistics.prototype.average = 0;
    
            PbLapPedalingIndexStatistics.create = function create(properties) {
                return new PbLapPedalingIndexStatistics(properties);
            };
    
            PbLapPedalingIndexStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).uint32(m.average);
                return w;
            };
    
            PbLapPedalingIndexStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                return null;
            };
    
            return PbLapPedalingIndexStatistics;
        })();
    
        polar_data.PbLapPedalingEfficiencyStatistics = (function() {
    
            function PbLapPedalingEfficiencyStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapPedalingEfficiencyStatistics.prototype.average = 0;
    
            PbLapPedalingEfficiencyStatistics.create = function create(properties) {
                return new PbLapPedalingEfficiencyStatistics(properties);
            };
    
            PbLapPedalingEfficiencyStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).uint32(m.average);
                return w;
            };
    
            PbLapPedalingEfficiencyStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                return null;
            };
    
            return PbLapPedalingEfficiencyStatistics;
        })();
    
        polar_data.PbLapInclineStatistics = (function() {
    
            function PbLapInclineStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapInclineStatistics.prototype.max = 0;
    
            PbLapInclineStatistics.create = function create(properties) {
                return new PbLapInclineStatistics(properties);
            };
    
            PbLapInclineStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.max != null && m.hasOwnProperty("max"))
                    w.uint32(13).float(m.max);
                return w;
            };
    
            PbLapInclineStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.max != null && m.hasOwnProperty("max")) {
                    if (typeof m.max !== "number")
                        return "max: number expected";
                }
                return null;
            };
    
            return PbLapInclineStatistics;
        })();
    
        polar_data.PbLapStrideLengthStatistics = (function() {
    
            function PbLapStrideLengthStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapStrideLengthStatistics.prototype.average = 0;
    
            PbLapStrideLengthStatistics.create = function create(properties) {
                return new PbLapStrideLengthStatistics(properties);
            };
    
            PbLapStrideLengthStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).uint32(m.average);
                return w;
            };
    
            PbLapStrideLengthStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                return null;
            };
    
            return PbLapStrideLengthStatistics;
        })();
    
        polar_data.PbLapStatistics = (function() {
    
            function PbLapStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapStatistics.prototype.heartRate = null;
            PbLapStatistics.prototype.speed = null;
            PbLapStatistics.prototype.cadence = null;
            PbLapStatistics.prototype.power = null;
            PbLapStatistics.prototype.OBSOLETEPedalingIndex = null;
            PbLapStatistics.prototype.incline = null;
            PbLapStatistics.prototype.strideLength = null;
            PbLapStatistics.prototype.swimmingStatistics = null;
            PbLapStatistics.prototype.leftRightBalance = null;
    
            PbLapStatistics.create = function create(properties) {
                return new PbLapStatistics(properties);
            };
    
            PbLapStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.heartRate != null && m.hasOwnProperty("heartRate"))
                    $root.polar_data.PbLapHeartRateStatistics.encode(m.heartRate, w.uint32(10).fork()).ldelim();
                if (m.speed != null && m.hasOwnProperty("speed"))
                    $root.polar_data.PbLapSpeedStatistics.encode(m.speed, w.uint32(18).fork()).ldelim();
                if (m.cadence != null && m.hasOwnProperty("cadence"))
                    $root.polar_data.PbLapCadenceStatistics.encode(m.cadence, w.uint32(26).fork()).ldelim();
                if (m.power != null && m.hasOwnProperty("power"))
                    $root.polar_data.PbLapPowerStatistics.encode(m.power, w.uint32(34).fork()).ldelim();
                if (m.OBSOLETEPedalingIndex != null && m.hasOwnProperty("OBSOLETEPedalingIndex"))
                    $root.polar_data.PbLapPedalingIndexStatistics.encode(m.OBSOLETEPedalingIndex, w.uint32(42).fork()).ldelim();
                if (m.incline != null && m.hasOwnProperty("incline"))
                    $root.polar_data.PbLapInclineStatistics.encode(m.incline, w.uint32(50).fork()).ldelim();
                if (m.strideLength != null && m.hasOwnProperty("strideLength"))
                    $root.polar_data.PbLapStrideLengthStatistics.encode(m.strideLength, w.uint32(58).fork()).ldelim();
                if (m.swimmingStatistics != null && m.hasOwnProperty("swimmingStatistics"))
                    $root.polar_data.PbLapSwimmingStatistics.encode(m.swimmingStatistics, w.uint32(66).fork()).ldelim();
                if (m.leftRightBalance != null && m.hasOwnProperty("leftRightBalance"))
                    $root.polar_data.PbLapLRBalanceStatistics.encode(m.leftRightBalance, w.uint32(74).fork()).ldelim();
                return w;
            };
    
            PbLapStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.heartRate != null && m.hasOwnProperty("heartRate")) {
                    {
                        var e = $root.polar_data.PbLapHeartRateStatistics.verify(m.heartRate);
                        if (e)
                            return "heartRate." + e;
                    }
                }
                if (m.speed != null && m.hasOwnProperty("speed")) {
                    {
                        var e = $root.polar_data.PbLapSpeedStatistics.verify(m.speed);
                        if (e)
                            return "speed." + e;
                    }
                }
                if (m.cadence != null && m.hasOwnProperty("cadence")) {
                    {
                        var e = $root.polar_data.PbLapCadenceStatistics.verify(m.cadence);
                        if (e)
                            return "cadence." + e;
                    }
                }
                if (m.power != null && m.hasOwnProperty("power")) {
                    {
                        var e = $root.polar_data.PbLapPowerStatistics.verify(m.power);
                        if (e)
                            return "power." + e;
                    }
                }
                if (m.OBSOLETEPedalingIndex != null && m.hasOwnProperty("OBSOLETEPedalingIndex")) {
                    {
                        var e = $root.polar_data.PbLapPedalingIndexStatistics.verify(m.OBSOLETEPedalingIndex);
                        if (e)
                            return "OBSOLETEPedalingIndex." + e;
                    }
                }
                if (m.incline != null && m.hasOwnProperty("incline")) {
                    {
                        var e = $root.polar_data.PbLapInclineStatistics.verify(m.incline);
                        if (e)
                            return "incline." + e;
                    }
                }
                if (m.strideLength != null && m.hasOwnProperty("strideLength")) {
                    {
                        var e = $root.polar_data.PbLapStrideLengthStatistics.verify(m.strideLength);
                        if (e)
                            return "strideLength." + e;
                    }
                }
                if (m.swimmingStatistics != null && m.hasOwnProperty("swimmingStatistics")) {
                    {
                        var e = $root.polar_data.PbLapSwimmingStatistics.verify(m.swimmingStatistics);
                        if (e)
                            return "swimmingStatistics." + e;
                    }
                }
                if (m.leftRightBalance != null && m.hasOwnProperty("leftRightBalance")) {
                    {
                        var e = $root.polar_data.PbLapLRBalanceStatistics.verify(m.leftRightBalance);
                        if (e)
                            return "leftRightBalance." + e;
                    }
                }
                return null;
            };
    
            return PbLapStatistics;
        })();
    
        polar_data.PbLap = (function() {
    
            function PbLap(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLap.prototype.header = null;
            PbLap.prototype.statistics = null;
    
            PbLap.create = function create(properties) {
                return new PbLap(properties);
            };
    
            PbLap.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_data.PbLapHeader.encode(m.header, w.uint32(10).fork()).ldelim();
                if (m.statistics != null && m.hasOwnProperty("statistics"))
                    $root.polar_data.PbLapStatistics.encode(m.statistics, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbLap.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_data.PbLapHeader.verify(m.header);
                    if (e)
                        return "header." + e;
                }
                if (m.statistics != null && m.hasOwnProperty("statistics")) {
                    {
                        var e = $root.polar_data.PbLapStatistics.verify(m.statistics);
                        if (e)
                            return "statistics." + e;
                    }
                }
                return null;
            };
    
            return PbLap;
        })();
    
        polar_data.PbLapSummary = (function() {
    
            function PbLapSummary(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLapSummary.prototype.bestLapDuration = null;
            PbLapSummary.prototype.averageLapDuration = null;
    
            PbLapSummary.create = function create(properties) {
                return new PbLapSummary(properties);
            };
    
            PbLapSummary.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.bestLapDuration != null && m.hasOwnProperty("bestLapDuration"))
                    $root.polar_types.PbDuration.encode(m.bestLapDuration, w.uint32(10).fork()).ldelim();
                if (m.averageLapDuration != null && m.hasOwnProperty("averageLapDuration"))
                    $root.polar_types.PbDuration.encode(m.averageLapDuration, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbLapSummary.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.bestLapDuration != null && m.hasOwnProperty("bestLapDuration")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.bestLapDuration);
                        if (e)
                            return "bestLapDuration." + e;
                    }
                }
                if (m.averageLapDuration != null && m.hasOwnProperty("averageLapDuration")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.averageLapDuration);
                        if (e)
                            return "averageLapDuration." + e;
                    }
                }
                return null;
            };
    
            return PbLapSummary;
        })();
    
        polar_data.PbLaps = (function() {
    
            function PbLaps(p) {
                this.laps = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLaps.prototype.laps = $util.emptyArray;
            PbLaps.prototype.summary = null;
    
            PbLaps.create = function create(properties) {
                return new PbLaps(properties);
            };
    
            PbLaps.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.laps != null && m.laps.length) {
                    for (var i = 0; i < m.laps.length; ++i)
                        $root.polar_data.PbLap.encode(m.laps[i], w.uint32(10).fork()).ldelim();
                }
                if (m.summary != null && m.hasOwnProperty("summary"))
                    $root.polar_data.PbLapSummary.encode(m.summary, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbLaps.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.laps != null && m.hasOwnProperty("laps")) {
                    if (!Array.isArray(m.laps))
                        return "laps: array expected";
                    for (var i = 0; i < m.laps.length; ++i) {
                        {
                            var e = $root.polar_data.PbLap.verify(m.laps[i]);
                            if (e)
                                return "laps." + e;
                        }
                    }
                }
                if (m.summary != null && m.hasOwnProperty("summary")) {
                    {
                        var e = $root.polar_data.PbLapSummary.verify(m.summary);
                        if (e)
                            return "summary." + e;
                    }
                }
                return null;
            };
    
            return PbLaps;
        })();
    
        polar_data.PbAutoLaps = (function() {
    
            function PbAutoLaps(p) {
                this.autoLaps = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbAutoLaps.prototype.autoLaps = $util.emptyArray;
            PbAutoLaps.prototype.summary = null;
    
            PbAutoLaps.create = function create(properties) {
                return new PbAutoLaps(properties);
            };
    
            PbAutoLaps.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.autoLaps != null && m.autoLaps.length) {
                    for (var i = 0; i < m.autoLaps.length; ++i)
                        $root.polar_data.PbLap.encode(m.autoLaps[i], w.uint32(10).fork()).ldelim();
                }
                if (m.summary != null && m.hasOwnProperty("summary"))
                    $root.polar_data.PbLapSummary.encode(m.summary, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbAutoLaps.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.autoLaps != null && m.hasOwnProperty("autoLaps")) {
                    if (!Array.isArray(m.autoLaps))
                        return "autoLaps: array expected";
                    for (var i = 0; i < m.autoLaps.length; ++i) {
                        {
                            var e = $root.polar_data.PbLap.verify(m.autoLaps[i]);
                            if (e)
                                return "autoLaps." + e;
                        }
                    }
                }
                if (m.summary != null && m.hasOwnProperty("summary")) {
                    {
                        var e = $root.polar_data.PbLapSummary.verify(m.summary);
                        if (e)
                            return "summary." + e;
                    }
                }
                return null;
            };
    
            return PbAutoLaps;
        })();
    
        polar_data.PbPhaseGoal = (function() {
    
            function PbPhaseGoal(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPhaseGoal.prototype.goalType = 0;
            PbPhaseGoal.prototype.duration = null;
            PbPhaseGoal.prototype.distance = 0;
            PbPhaseGoal.prototype.heartRate = 0;
    
            PbPhaseGoal.create = function create(properties) {
                return new PbPhaseGoal(properties);
            };
    
            PbPhaseGoal.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.goalType);
                if (m.duration != null && m.hasOwnProperty("duration"))
                    $root.polar_types.PbDuration.encode(m.duration, w.uint32(18).fork()).ldelim();
                if (m.distance != null && m.hasOwnProperty("distance"))
                    w.uint32(29).float(m.distance);
                if (m.heartRate != null && m.hasOwnProperty("heartRate"))
                    w.uint32(32).uint32(m.heartRate);
                return w;
            };
    
            PbPhaseGoal.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.goalType) {
                default:
                    return "goalType: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                    break;
                }
                if (m.duration != null && m.hasOwnProperty("duration")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.duration);
                        if (e)
                            return "duration." + e;
                    }
                }
                if (m.distance != null && m.hasOwnProperty("distance")) {
                    if (typeof m.distance !== "number")
                        return "distance: number expected";
                }
                if (m.heartRate != null && m.hasOwnProperty("heartRate")) {
                    if (!$util.isInteger(m.heartRate))
                        return "heartRate: integer expected";
                }
                return null;
            };
    
            PbPhaseGoal.PhaseGoalType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "PHASE_GOAL_OFF"] = 0;
                values[valuesById[1] = "PHASE_GOAL_TIME"] = 1;
                values[valuesById[2] = "PHASE_GOAL_DISTANCE"] = 2;
                values[valuesById[3] = "PHASE_GOAL_INCREASING_HR"] = 3;
                values[valuesById[4] = "PHASE_GOAL_DECREASING_HR"] = 4;
                values[valuesById[5] = "PHASE_GOAL_RACE_PACE"] = 5;
                return values;
            })();
    
            return PbPhaseGoal;
        })();
    
        polar_data.PbPhaseIntensity = (function() {
    
            function PbPhaseIntensity(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPhaseIntensity.prototype.intensityType = 0;
            PbPhaseIntensity.prototype.heartRateZone = null;
            PbPhaseIntensity.prototype.speedZone = null;
            PbPhaseIntensity.prototype.powerZone = null;
    
            PbPhaseIntensity.create = function create(properties) {
                return new PbPhaseIntensity(properties);
            };
    
            PbPhaseIntensity.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.intensityType);
                if (m.heartRateZone != null && m.hasOwnProperty("heartRateZone"))
                    $root.polar_data.PbPhaseIntensity.IntensityZone.encode(m.heartRateZone, w.uint32(18).fork()).ldelim();
                if (m.speedZone != null && m.hasOwnProperty("speedZone"))
                    $root.polar_data.PbPhaseIntensity.IntensityZone.encode(m.speedZone, w.uint32(26).fork()).ldelim();
                if (m.powerZone != null && m.hasOwnProperty("powerZone"))
                    $root.polar_data.PbPhaseIntensity.IntensityZone.encode(m.powerZone, w.uint32(34).fork()).ldelim();
                return w;
            };
    
            PbPhaseIntensity.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.intensityType) {
                default:
                    return "intensityType: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                    break;
                }
                if (m.heartRateZone != null && m.hasOwnProperty("heartRateZone")) {
                    {
                        var e = $root.polar_data.PbPhaseIntensity.IntensityZone.verify(m.heartRateZone);
                        if (e)
                            return "heartRateZone." + e;
                    }
                }
                if (m.speedZone != null && m.hasOwnProperty("speedZone")) {
                    {
                        var e = $root.polar_data.PbPhaseIntensity.IntensityZone.verify(m.speedZone);
                        if (e)
                            return "speedZone." + e;
                    }
                }
                if (m.powerZone != null && m.hasOwnProperty("powerZone")) {
                    {
                        var e = $root.polar_data.PbPhaseIntensity.IntensityZone.verify(m.powerZone);
                        if (e)
                            return "powerZone." + e;
                    }
                }
                return null;
            };
    
            PbPhaseIntensity.PhaseIntensityType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "PHASE_INTENSITY_FREE"] = 0;
                values[valuesById[1] = "PHASE_INTENSITY_SPORTZONE"] = 1;
                values[valuesById[2] = "PHASE_INTENSITY_SPEED_ZONE"] = 2;
                values[valuesById[3] = "PHASE_INTENSITY_POWER_ZONE"] = 3;
                return values;
            })();
    
            PbPhaseIntensity.IntensityZone = (function() {
    
                function IntensityZone(p) {
                    if (p)
                        for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                            if (p[ks[i]] != null)
                                this[ks[i]] = p[ks[i]];
                }
    
                IntensityZone.prototype.lower = 0;
                IntensityZone.prototype.upper = 0;
    
                IntensityZone.create = function create(properties) {
                    return new IntensityZone(properties);
                };
    
                IntensityZone.encode = function encode(m, w) {
                    if (!w)
                        w = $Writer.create();
                    w.uint32(8).uint32(m.lower);
                    w.uint32(16).uint32(m.upper);
                    return w;
                };
    
                IntensityZone.verify = function verify(m) {
                    if (typeof m !== "object" || m === null)
                        return "object expected";
                    if (!$util.isInteger(m.lower))
                        return "lower: integer expected";
                    if (!$util.isInteger(m.upper))
                        return "upper: integer expected";
                    return null;
                };
    
                return IntensityZone;
            })();
    
            return PbPhaseIntensity;
        })();
    
        polar_data.PbPhase = (function() {
    
            function PbPhase(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPhase.prototype.name = null;
            PbPhase.prototype.change = 0;
            PbPhase.prototype.goal = null;
            PbPhase.prototype.intensity = null;
            PbPhase.prototype.repeatCount = 0;
            PbPhase.prototype.jumpIndex = 0;
    
            PbPhase.create = function create(properties) {
                return new PbPhase(properties);
            };
    
            PbPhase.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbOneLineText.encode(m.name, w.uint32(10).fork()).ldelim();
                w.uint32(16).int32(m.change);
                $root.polar_data.PbPhaseGoal.encode(m.goal, w.uint32(26).fork()).ldelim();
                $root.polar_data.PbPhaseIntensity.encode(m.intensity, w.uint32(34).fork()).ldelim();
                if (m.repeatCount != null && m.hasOwnProperty("repeatCount"))
                    w.uint32(40).uint32(m.repeatCount);
                if (m.jumpIndex != null && m.hasOwnProperty("jumpIndex"))
                    w.uint32(48).uint32(m.jumpIndex);
                return w;
            };
    
            PbPhase.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbOneLineText.verify(m.name);
                    if (e)
                        return "name." + e;
                }
                switch (m.change) {
                default:
                    return "change: enum value expected";
                case 0:
                case 1:
                    break;
                }
                {
                    var e = $root.polar_data.PbPhaseGoal.verify(m.goal);
                    if (e)
                        return "goal." + e;
                }
                {
                    var e = $root.polar_data.PbPhaseIntensity.verify(m.intensity);
                    if (e)
                        return "intensity." + e;
                }
                if (m.repeatCount != null && m.hasOwnProperty("repeatCount")) {
                    if (!$util.isInteger(m.repeatCount))
                        return "repeatCount: integer expected";
                }
                if (m.jumpIndex != null && m.hasOwnProperty("jumpIndex")) {
                    if (!$util.isInteger(m.jumpIndex))
                        return "jumpIndex: integer expected";
                }
                return null;
            };
    
            PbPhase.PbPhaseChangeType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "CHANGE_MANUAL"] = 0;
                values[valuesById[1] = "CHANGE_AUTOMATIC"] = 1;
                return values;
            })();
    
            return PbPhase;
        })();
    
        polar_data.PbPhases = (function() {
    
            function PbPhases(p) {
                this.phase = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPhases.prototype.phase = $util.emptyArray;
    
            PbPhases.create = function create(properties) {
                return new PbPhases(properties);
            };
    
            PbPhases.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.phase != null && m.phase.length) {
                    for (var i = 0; i < m.phase.length; ++i)
                        $root.polar_data.PbPhase.encode(m.phase[i], w.uint32(10).fork()).ldelim();
                }
                return w;
            };
    
            PbPhases.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.phase != null && m.hasOwnProperty("phase")) {
                    if (!Array.isArray(m.phase))
                        return "phase: array expected";
                    for (var i = 0; i < m.phase.length; ++i) {
                        {
                            var e = $root.polar_data.PbPhase.verify(m.phase[i]);
                            if (e)
                                return "phase." + e;
                        }
                    }
                }
                return null;
            };
    
            return PbPhases;
        })();
    
        polar_data.PbPhaseHeartRateStatistics = (function() {
    
            function PbPhaseHeartRateStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPhaseHeartRateStatistics.prototype.average = 0;
            PbPhaseHeartRateStatistics.prototype.maximum = 0;
    
            PbPhaseHeartRateStatistics.create = function create(properties) {
                return new PbPhaseHeartRateStatistics(properties);
            };
    
            PbPhaseHeartRateStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).uint32(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(16).uint32(m.maximum);
                return w;
            };
    
            PbPhaseHeartRateStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (!$util.isInteger(m.maximum))
                        return "maximum: integer expected";
                }
                return null;
            };
    
            return PbPhaseHeartRateStatistics;
        })();
    
        polar_data.PbPhaseStrideLengthStatistics = (function() {
    
            function PbPhaseStrideLengthStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPhaseStrideLengthStatistics.prototype.average = 0;
    
            PbPhaseStrideLengthStatistics.create = function create(properties) {
                return new PbPhaseStrideLengthStatistics(properties);
            };
    
            PbPhaseStrideLengthStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).uint32(m.average);
                return w;
            };
    
            PbPhaseStrideLengthStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                return null;
            };
    
            return PbPhaseStrideLengthStatistics;
        })();
    
        polar_data.PbPhaseRepetition = (function() {
    
            function PbPhaseRepetition(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPhaseRepetition.prototype.index = 0;
            PbPhaseRepetition.prototype.splitTime = null;
            PbPhaseRepetition.prototype.duration = null;
            PbPhaseRepetition.prototype.phaseFinished = false;
            PbPhaseRepetition.prototype.splitDistance = 0;
            PbPhaseRepetition.prototype.distance = 0;
            PbPhaseRepetition.prototype.inTargetZone = null;
            PbPhaseRepetition.prototype.heartRate = null;
            PbPhaseRepetition.prototype.speed = null;
            PbPhaseRepetition.prototype.cadence = null;
            PbPhaseRepetition.prototype.power = null;
            PbPhaseRepetition.prototype.leftRightBalance = null;
            PbPhaseRepetition.prototype.strideLength = null;
            PbPhaseRepetition.prototype.strokeCount = 0;
            PbPhaseRepetition.prototype.averageSwolf = 0;
            PbPhaseRepetition.prototype.strokesPerMin = 0;
            PbPhaseRepetition.prototype.ascent = 0;
            PbPhaseRepetition.prototype.descent = 0;
    
            PbPhaseRepetition.create = function create(properties) {
                return new PbPhaseRepetition(properties);
            };
    
            PbPhaseRepetition.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.index);
                $root.polar_types.PbDuration.encode(m.splitTime, w.uint32(18).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.duration, w.uint32(26).fork()).ldelim();
                if (m.phaseFinished != null && m.hasOwnProperty("phaseFinished"))
                    w.uint32(32).bool(m.phaseFinished);
                if (m.splitDistance != null && m.hasOwnProperty("splitDistance"))
                    w.uint32(45).float(m.splitDistance);
                if (m.distance != null && m.hasOwnProperty("distance"))
                    w.uint32(53).float(m.distance);
                if (m.inTargetZone != null && m.hasOwnProperty("inTargetZone"))
                    $root.polar_types.PbDuration.encode(m.inTargetZone, w.uint32(58).fork()).ldelim();
                if (m.heartRate != null && m.hasOwnProperty("heartRate"))
                    $root.polar_data.PbPhaseHeartRateStatistics.encode(m.heartRate, w.uint32(66).fork()).ldelim();
                if (m.speed != null && m.hasOwnProperty("speed"))
                    $root.polar_data.PbSpeedStatistics.encode(m.speed, w.uint32(74).fork()).ldelim();
                if (m.cadence != null && m.hasOwnProperty("cadence"))
                    $root.polar_data.PbCadenceStatistics.encode(m.cadence, w.uint32(82).fork()).ldelim();
                if (m.power != null && m.hasOwnProperty("power"))
                    $root.polar_data.PbPowerStatistics.encode(m.power, w.uint32(90).fork()).ldelim();
                if (m.leftRightBalance != null && m.hasOwnProperty("leftRightBalance"))
                    $root.polar_data.PbLRBalanceStatistics.encode(m.leftRightBalance, w.uint32(98).fork()).ldelim();
                if (m.strideLength != null && m.hasOwnProperty("strideLength"))
                    $root.polar_data.PbPhaseStrideLengthStatistics.encode(m.strideLength, w.uint32(106).fork()).ldelim();
                if (m.strokeCount != null && m.hasOwnProperty("strokeCount"))
                    w.uint32(112).uint32(m.strokeCount);
                if (m.averageSwolf != null && m.hasOwnProperty("averageSwolf"))
                    w.uint32(125).float(m.averageSwolf);
                if (m.strokesPerMin != null && m.hasOwnProperty("strokesPerMin"))
                    w.uint32(128).uint32(m.strokesPerMin);
                if (m.ascent != null && m.hasOwnProperty("ascent"))
                    w.uint32(141).float(m.ascent);
                if (m.descent != null && m.hasOwnProperty("descent"))
                    w.uint32(149).float(m.descent);
                return w;
            };
    
            PbPhaseRepetition.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.index))
                    return "index: integer expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.splitTime);
                    if (e)
                        return "splitTime." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.duration);
                    if (e)
                        return "duration." + e;
                }
                if (m.phaseFinished != null && m.hasOwnProperty("phaseFinished")) {
                    if (typeof m.phaseFinished !== "boolean")
                        return "phaseFinished: boolean expected";
                }
                if (m.splitDistance != null && m.hasOwnProperty("splitDistance")) {
                    if (typeof m.splitDistance !== "number")
                        return "splitDistance: number expected";
                }
                if (m.distance != null && m.hasOwnProperty("distance")) {
                    if (typeof m.distance !== "number")
                        return "distance: number expected";
                }
                if (m.inTargetZone != null && m.hasOwnProperty("inTargetZone")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.inTargetZone);
                        if (e)
                            return "inTargetZone." + e;
                    }
                }
                if (m.heartRate != null && m.hasOwnProperty("heartRate")) {
                    {
                        var e = $root.polar_data.PbPhaseHeartRateStatistics.verify(m.heartRate);
                        if (e)
                            return "heartRate." + e;
                    }
                }
                if (m.speed != null && m.hasOwnProperty("speed")) {
                    {
                        var e = $root.polar_data.PbSpeedStatistics.verify(m.speed);
                        if (e)
                            return "speed." + e;
                    }
                }
                if (m.cadence != null && m.hasOwnProperty("cadence")) {
                    {
                        var e = $root.polar_data.PbCadenceStatistics.verify(m.cadence);
                        if (e)
                            return "cadence." + e;
                    }
                }
                if (m.power != null && m.hasOwnProperty("power")) {
                    {
                        var e = $root.polar_data.PbPowerStatistics.verify(m.power);
                        if (e)
                            return "power." + e;
                    }
                }
                if (m.leftRightBalance != null && m.hasOwnProperty("leftRightBalance")) {
                    {
                        var e = $root.polar_data.PbLRBalanceStatistics.verify(m.leftRightBalance);
                        if (e)
                            return "leftRightBalance." + e;
                    }
                }
                if (m.strideLength != null && m.hasOwnProperty("strideLength")) {
                    {
                        var e = $root.polar_data.PbPhaseStrideLengthStatistics.verify(m.strideLength);
                        if (e)
                            return "strideLength." + e;
                    }
                }
                if (m.strokeCount != null && m.hasOwnProperty("strokeCount")) {
                    if (!$util.isInteger(m.strokeCount))
                        return "strokeCount: integer expected";
                }
                if (m.averageSwolf != null && m.hasOwnProperty("averageSwolf")) {
                    if (typeof m.averageSwolf !== "number")
                        return "averageSwolf: number expected";
                }
                if (m.strokesPerMin != null && m.hasOwnProperty("strokesPerMin")) {
                    if (!$util.isInteger(m.strokesPerMin))
                        return "strokesPerMin: integer expected";
                }
                if (m.ascent != null && m.hasOwnProperty("ascent")) {
                    if (typeof m.ascent !== "number")
                        return "ascent: number expected";
                }
                if (m.descent != null && m.hasOwnProperty("descent")) {
                    if (typeof m.descent !== "number")
                        return "descent: number expected";
                }
                return null;
            };
    
            return PbPhaseRepetition;
        })();
    
        polar_data.PbPhaseRepetitions = (function() {
    
            function PbPhaseRepetitions(p) {
                this.phase = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPhaseRepetitions.prototype.phase = $util.emptyArray;
    
            PbPhaseRepetitions.create = function create(properties) {
                return new PbPhaseRepetitions(properties);
            };
    
            PbPhaseRepetitions.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.phase != null && m.phase.length) {
                    for (var i = 0; i < m.phase.length; ++i)
                        $root.polar_data.PbPhaseRepetition.encode(m.phase[i], w.uint32(10).fork()).ldelim();
                }
                return w;
            };
    
            PbPhaseRepetitions.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.phase != null && m.hasOwnProperty("phase")) {
                    if (!Array.isArray(m.phase))
                        return "phase: array expected";
                    for (var i = 0; i < m.phase.length; ++i) {
                        {
                            var e = $root.polar_data.PbPhaseRepetition.verify(m.phase[i]);
                            if (e)
                                return "phase." + e;
                        }
                    }
                }
                return null;
            };
    
            return PbPhaseRepetitions;
        })();
    
        polar_data.PbSwimmingStyleStatistics = (function() {
    
            function PbSwimmingStyleStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSwimmingStyleStatistics.prototype.distance = 0;
            PbSwimmingStyleStatistics.prototype.strokeCount = 0;
            PbSwimmingStyleStatistics.prototype.swimmingTimeTotal = null;
            PbSwimmingStyleStatistics.prototype.averageHeartrate = 0;
            PbSwimmingStyleStatistics.prototype.maximumHeartrate = 0;
            PbSwimmingStyleStatistics.prototype.averageSwolf = 0;
            PbSwimmingStyleStatistics.prototype.poolTimeMin = null;
    
            PbSwimmingStyleStatistics.create = function create(properties) {
                return new PbSwimmingStyleStatistics(properties);
            };
    
            PbSwimmingStyleStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.distance);
                w.uint32(16).uint32(m.strokeCount);
                if (m.swimmingTimeTotal != null && m.hasOwnProperty("swimmingTimeTotal"))
                    $root.polar_types.PbDuration.encode(m.swimmingTimeTotal, w.uint32(26).fork()).ldelim();
                if (m.averageHeartrate != null && m.hasOwnProperty("averageHeartrate"))
                    w.uint32(32).uint32(m.averageHeartrate);
                if (m.maximumHeartrate != null && m.hasOwnProperty("maximumHeartrate"))
                    w.uint32(40).uint32(m.maximumHeartrate);
                if (m.averageSwolf != null && m.hasOwnProperty("averageSwolf"))
                    w.uint32(53).float(m.averageSwolf);
                if (m.poolTimeMin != null && m.hasOwnProperty("poolTimeMin"))
                    $root.polar_types.PbDuration.encode(m.poolTimeMin, w.uint32(58).fork()).ldelim();
                return w;
            };
    
            PbSwimmingStyleStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.distance !== "number")
                    return "distance: number expected";
                if (!$util.isInteger(m.strokeCount))
                    return "strokeCount: integer expected";
                if (m.swimmingTimeTotal != null && m.hasOwnProperty("swimmingTimeTotal")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.swimmingTimeTotal);
                        if (e)
                            return "swimmingTimeTotal." + e;
                    }
                }
                if (m.averageHeartrate != null && m.hasOwnProperty("averageHeartrate")) {
                    if (!$util.isInteger(m.averageHeartrate))
                        return "averageHeartrate: integer expected";
                }
                if (m.maximumHeartrate != null && m.hasOwnProperty("maximumHeartrate")) {
                    if (!$util.isInteger(m.maximumHeartrate))
                        return "maximumHeartrate: integer expected";
                }
                if (m.averageSwolf != null && m.hasOwnProperty("averageSwolf")) {
                    if (typeof m.averageSwolf !== "number")
                        return "averageSwolf: number expected";
                }
                if (m.poolTimeMin != null && m.hasOwnProperty("poolTimeMin")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.poolTimeMin);
                        if (e)
                            return "poolTimeMin." + e;
                    }
                }
                return null;
            };
    
            return PbSwimmingStyleStatistics;
        })();
    
        polar_data.PbSwimmingStatistics = (function() {
    
            function PbSwimmingStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSwimmingStatistics.prototype.swimmingDistance = 0;
            PbSwimmingStatistics.prototype.freestyleStatistics = null;
            PbSwimmingStatistics.prototype.backstrokeStatistics = null;
            PbSwimmingStatistics.prototype.breaststrokeStatistics = null;
            PbSwimmingStatistics.prototype.butterflyStatistics = null;
            PbSwimmingStatistics.prototype.totalStrokeCount = 0;
            PbSwimmingStatistics.prototype.numberOfPoolsSwimmed = 0;
            PbSwimmingStatistics.prototype.swimmingPool = null;
    
            PbSwimmingStatistics.create = function create(properties) {
                return new PbSwimmingStatistics(properties);
            };
    
            PbSwimmingStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.swimmingDistance);
                if (m.freestyleStatistics != null && m.hasOwnProperty("freestyleStatistics"))
                    $root.polar_data.PbSwimmingStyleStatistics.encode(m.freestyleStatistics, w.uint32(18).fork()).ldelim();
                if (m.backstrokeStatistics != null && m.hasOwnProperty("backstrokeStatistics"))
                    $root.polar_data.PbSwimmingStyleStatistics.encode(m.backstrokeStatistics, w.uint32(26).fork()).ldelim();
                if (m.breaststrokeStatistics != null && m.hasOwnProperty("breaststrokeStatistics"))
                    $root.polar_data.PbSwimmingStyleStatistics.encode(m.breaststrokeStatistics, w.uint32(34).fork()).ldelim();
                if (m.butterflyStatistics != null && m.hasOwnProperty("butterflyStatistics"))
                    $root.polar_data.PbSwimmingStyleStatistics.encode(m.butterflyStatistics, w.uint32(42).fork()).ldelim();
                if (m.totalStrokeCount != null && m.hasOwnProperty("totalStrokeCount"))
                    w.uint32(48).uint32(m.totalStrokeCount);
                if (m.numberOfPoolsSwimmed != null && m.hasOwnProperty("numberOfPoolsSwimmed"))
                    w.uint32(56).uint32(m.numberOfPoolsSwimmed);
                if (m.swimmingPool != null && m.hasOwnProperty("swimmingPool"))
                    $root.polar_types.PbSwimmingPoolInfo.encode(m.swimmingPool, w.uint32(66).fork()).ldelim();
                return w;
            };
    
            PbSwimmingStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.swimmingDistance !== "number")
                    return "swimmingDistance: number expected";
                if (m.freestyleStatistics != null && m.hasOwnProperty("freestyleStatistics")) {
                    {
                        var e = $root.polar_data.PbSwimmingStyleStatistics.verify(m.freestyleStatistics);
                        if (e)
                            return "freestyleStatistics." + e;
                    }
                }
                if (m.backstrokeStatistics != null && m.hasOwnProperty("backstrokeStatistics")) {
                    {
                        var e = $root.polar_data.PbSwimmingStyleStatistics.verify(m.backstrokeStatistics);
                        if (e)
                            return "backstrokeStatistics." + e;
                    }
                }
                if (m.breaststrokeStatistics != null && m.hasOwnProperty("breaststrokeStatistics")) {
                    {
                        var e = $root.polar_data.PbSwimmingStyleStatistics.verify(m.breaststrokeStatistics);
                        if (e)
                            return "breaststrokeStatistics." + e;
                    }
                }
                if (m.butterflyStatistics != null && m.hasOwnProperty("butterflyStatistics")) {
                    {
                        var e = $root.polar_data.PbSwimmingStyleStatistics.verify(m.butterflyStatistics);
                        if (e)
                            return "butterflyStatistics." + e;
                    }
                }
                if (m.totalStrokeCount != null && m.hasOwnProperty("totalStrokeCount")) {
                    if (!$util.isInteger(m.totalStrokeCount))
                        return "totalStrokeCount: integer expected";
                }
                if (m.numberOfPoolsSwimmed != null && m.hasOwnProperty("numberOfPoolsSwimmed")) {
                    if (!$util.isInteger(m.numberOfPoolsSwimmed))
                        return "numberOfPoolsSwimmed: integer expected";
                }
                if (m.swimmingPool != null && m.hasOwnProperty("swimmingPool")) {
                    {
                        var e = $root.polar_types.PbSwimmingPoolInfo.verify(m.swimmingPool);
                        if (e)
                            return "swimmingPool." + e;
                    }
                }
                return null;
            };
    
            return PbSwimmingStatistics;
        })();
    
        polar_data.PbHeartRateStatistics = (function() {
    
            function PbHeartRateStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbHeartRateStatistics.prototype.minimum = 0;
            PbHeartRateStatistics.prototype.average = 0;
            PbHeartRateStatistics.prototype.maximum = 0;
    
            PbHeartRateStatistics.create = function create(properties) {
                return new PbHeartRateStatistics(properties);
            };
    
            PbHeartRateStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.minimum != null && m.hasOwnProperty("minimum"))
                    w.uint32(8).uint32(m.minimum);
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(16).uint32(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(24).uint32(m.maximum);
                return w;
            };
    
            PbHeartRateStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.minimum != null && m.hasOwnProperty("minimum")) {
                    if (!$util.isInteger(m.minimum))
                        return "minimum: integer expected";
                }
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (!$util.isInteger(m.maximum))
                        return "maximum: integer expected";
                }
                return null;
            };
    
            return PbHeartRateStatistics;
        })();
    
        polar_data.PbSpeedStatistics = (function() {
    
            function PbSpeedStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSpeedStatistics.prototype.average = 0;
            PbSpeedStatistics.prototype.maximum = 0;
    
            PbSpeedStatistics.create = function create(properties) {
                return new PbSpeedStatistics(properties);
            };
    
            PbSpeedStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(13).float(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(21).float(m.maximum);
                return w;
            };
    
            PbSpeedStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (typeof m.average !== "number")
                        return "average: number expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (typeof m.maximum !== "number")
                        return "maximum: number expected";
                }
                return null;
            };
    
            return PbSpeedStatistics;
        })();
    
        polar_data.PbCadenceStatistics = (function() {
    
            function PbCadenceStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbCadenceStatistics.prototype.average = 0;
            PbCadenceStatistics.prototype.maximum = 0;
    
            PbCadenceStatistics.create = function create(properties) {
                return new PbCadenceStatistics(properties);
            };
    
            PbCadenceStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).uint32(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(16).uint32(m.maximum);
                return w;
            };
    
            PbCadenceStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (!$util.isInteger(m.maximum))
                        return "maximum: integer expected";
                }
                return null;
            };
    
            return PbCadenceStatistics;
        })();
    
        polar_data.PbAltitudeStatistics = (function() {
    
            function PbAltitudeStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbAltitudeStatistics.prototype.minimum = 0;
            PbAltitudeStatistics.prototype.average = 0;
            PbAltitudeStatistics.prototype.maximum = 0;
    
            PbAltitudeStatistics.create = function create(properties) {
                return new PbAltitudeStatistics(properties);
            };
    
            PbAltitudeStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.minimum != null && m.hasOwnProperty("minimum"))
                    w.uint32(13).float(m.minimum);
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(21).float(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(29).float(m.maximum);
                return w;
            };
    
            PbAltitudeStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.minimum != null && m.hasOwnProperty("minimum")) {
                    if (typeof m.minimum !== "number")
                        return "minimum: number expected";
                }
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (typeof m.average !== "number")
                        return "average: number expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (typeof m.maximum !== "number")
                        return "maximum: number expected";
                }
                return null;
            };
    
            return PbAltitudeStatistics;
        })();
    
        polar_data.PbPowerStatistics = (function() {
    
            function PbPowerStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPowerStatistics.prototype.average = 0;
            PbPowerStatistics.prototype.maximum = 0;
    
            PbPowerStatistics.create = function create(properties) {
                return new PbPowerStatistics(properties);
            };
    
            PbPowerStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).int32(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(16).int32(m.maximum);
                return w;
            };
    
            PbPowerStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (!$util.isInteger(m.maximum))
                        return "maximum: integer expected";
                }
                return null;
            };
    
            return PbPowerStatistics;
        })();
    
        polar_data.PbCyclingEfficiencyStatistics = (function() {
    
            function PbCyclingEfficiencyStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbCyclingEfficiencyStatistics.prototype.average = 0;
    
            PbCyclingEfficiencyStatistics.create = function create(properties) {
                return new PbCyclingEfficiencyStatistics(properties);
            };
    
            PbCyclingEfficiencyStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).uint32(m.average);
                return w;
            };
    
            PbCyclingEfficiencyStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                return null;
            };
    
            return PbCyclingEfficiencyStatistics;
        })();
    
        polar_data.PbPedalingEfficiencyStatistics = (function() {
    
            function PbPedalingEfficiencyStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPedalingEfficiencyStatistics.prototype.average = 0;
    
            PbPedalingEfficiencyStatistics.create = function create(properties) {
                return new PbPedalingEfficiencyStatistics(properties);
            };
    
            PbPedalingEfficiencyStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).uint32(m.average);
                return w;
            };
    
            PbPedalingEfficiencyStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                return null;
            };
    
            return PbPedalingEfficiencyStatistics;
        })();
    
        polar_data.PbLRBalanceStatistics = (function() {
    
            function PbLRBalanceStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLRBalanceStatistics.prototype.average = 0;
    
            PbLRBalanceStatistics.create = function create(properties) {
                return new PbLRBalanceStatistics(properties);
            };
    
            PbLRBalanceStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(13).float(m.average);
                return w;
            };
    
            PbLRBalanceStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (typeof m.average !== "number")
                        return "average: number expected";
                }
                return null;
            };
    
            return PbLRBalanceStatistics;
        })();
    
        polar_data.PbTemperatureStatistics = (function() {
    
            function PbTemperatureStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTemperatureStatistics.prototype.minimum = 0;
            PbTemperatureStatistics.prototype.average = 0;
            PbTemperatureStatistics.prototype.maximum = 0;
    
            PbTemperatureStatistics.create = function create(properties) {
                return new PbTemperatureStatistics(properties);
            };
    
            PbTemperatureStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.minimum != null && m.hasOwnProperty("minimum"))
                    w.uint32(13).float(m.minimum);
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(21).float(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(29).float(m.maximum);
                return w;
            };
    
            PbTemperatureStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.minimum != null && m.hasOwnProperty("minimum")) {
                    if (typeof m.minimum !== "number")
                        return "minimum: number expected";
                }
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (typeof m.average !== "number")
                        return "average: number expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (typeof m.maximum !== "number")
                        return "maximum: number expected";
                }
                return null;
            };
    
            return PbTemperatureStatistics;
        })();
    
        polar_data.PbStrideLengthStatistics = (function() {
    
            function PbStrideLengthStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbStrideLengthStatistics.prototype.average = 0;
            PbStrideLengthStatistics.prototype.maximum = 0;
    
            PbStrideLengthStatistics.create = function create(properties) {
                return new PbStrideLengthStatistics(properties);
            };
    
            PbStrideLengthStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).uint32(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(16).uint32(m.maximum);
                return w;
            };
    
            PbStrideLengthStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (!$util.isInteger(m.maximum))
                        return "maximum: integer expected";
                }
                return null;
            };
    
            return PbStrideLengthStatistics;
        })();
    
        polar_data.PbInclineStatistics = (function() {
    
            function PbInclineStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbInclineStatistics.prototype.average = 0;
            PbInclineStatistics.prototype.maximum = 0;
    
            PbInclineStatistics.create = function create(properties) {
                return new PbInclineStatistics(properties);
            };
    
            PbInclineStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(13).float(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(21).float(m.maximum);
                return w;
            };
    
            PbInclineStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (typeof m.average !== "number")
                        return "average: number expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (typeof m.maximum !== "number")
                        return "maximum: number expected";
                }
                return null;
            };
    
            return PbInclineStatistics;
        })();
    
        polar_data.PbDeclineStatistics = (function() {
    
            function PbDeclineStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbDeclineStatistics.prototype.average = 0;
            PbDeclineStatistics.prototype.maximum = 0;
    
            PbDeclineStatistics.create = function create(properties) {
                return new PbDeclineStatistics(properties);
            };
    
            PbDeclineStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(13).float(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(21).float(m.maximum);
                return w;
            };
    
            PbDeclineStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (typeof m.average !== "number")
                        return "average: number expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (typeof m.maximum !== "number")
                        return "maximum: number expected";
                }
                return null;
            };
    
            return PbDeclineStatistics;
        })();
    
        polar_data.PbActivityStatistics = (function() {
    
            function PbActivityStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbActivityStatistics.prototype.average = 0;
    
            PbActivityStatistics.create = function create(properties) {
                return new PbActivityStatistics(properties);
            };
    
            PbActivityStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(13).float(m.average);
                return w;
            };
    
            PbActivityStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (typeof m.average !== "number")
                        return "average: number expected";
                }
                return null;
            };
    
            return PbActivityStatistics;
        })();
    
        polar_data.PbExerciseStatistics = (function() {
    
            function PbExerciseStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbExerciseStatistics.prototype.heartRate = null;
            PbExerciseStatistics.prototype.speed = null;
            PbExerciseStatistics.prototype.cadence = null;
            PbExerciseStatistics.prototype.altitude = null;
            PbExerciseStatistics.prototype.power = null;
            PbExerciseStatistics.prototype.leftRightBalance = null;
            PbExerciseStatistics.prototype.temperature = null;
            PbExerciseStatistics.prototype.activity = null;
            PbExerciseStatistics.prototype.strideLength = null;
            PbExerciseStatistics.prototype.incline = null;
            PbExerciseStatistics.prototype.decline = null;
            PbExerciseStatistics.prototype.swimming = null;
    
            PbExerciseStatistics.create = function create(properties) {
                return new PbExerciseStatistics(properties);
            };
    
            PbExerciseStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.heartRate != null && m.hasOwnProperty("heartRate"))
                    $root.polar_data.PbHeartRateStatistics.encode(m.heartRate, w.uint32(10).fork()).ldelim();
                if (m.speed != null && m.hasOwnProperty("speed"))
                    $root.polar_data.PbSpeedStatistics.encode(m.speed, w.uint32(18).fork()).ldelim();
                if (m.cadence != null && m.hasOwnProperty("cadence"))
                    $root.polar_data.PbCadenceStatistics.encode(m.cadence, w.uint32(26).fork()).ldelim();
                if (m.altitude != null && m.hasOwnProperty("altitude"))
                    $root.polar_data.PbAltitudeStatistics.encode(m.altitude, w.uint32(34).fork()).ldelim();
                if (m.power != null && m.hasOwnProperty("power"))
                    $root.polar_data.PbPowerStatistics.encode(m.power, w.uint32(42).fork()).ldelim();
                if (m.leftRightBalance != null && m.hasOwnProperty("leftRightBalance"))
                    $root.polar_data.PbLRBalanceStatistics.encode(m.leftRightBalance, w.uint32(50).fork()).ldelim();
                if (m.temperature != null && m.hasOwnProperty("temperature"))
                    $root.polar_data.PbTemperatureStatistics.encode(m.temperature, w.uint32(58).fork()).ldelim();
                if (m.activity != null && m.hasOwnProperty("activity"))
                    $root.polar_data.PbActivityStatistics.encode(m.activity, w.uint32(66).fork()).ldelim();
                if (m.strideLength != null && m.hasOwnProperty("strideLength"))
                    $root.polar_data.PbStrideLengthStatistics.encode(m.strideLength, w.uint32(74).fork()).ldelim();
                if (m.incline != null && m.hasOwnProperty("incline"))
                    $root.polar_data.PbInclineStatistics.encode(m.incline, w.uint32(82).fork()).ldelim();
                if (m.decline != null && m.hasOwnProperty("decline"))
                    $root.polar_data.PbDeclineStatistics.encode(m.decline, w.uint32(90).fork()).ldelim();
                if (m.swimming != null && m.hasOwnProperty("swimming"))
                    $root.polar_data.PbSwimmingStatistics.encode(m.swimming, w.uint32(98).fork()).ldelim();
                return w;
            };
    
            PbExerciseStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.heartRate != null && m.hasOwnProperty("heartRate")) {
                    {
                        var e = $root.polar_data.PbHeartRateStatistics.verify(m.heartRate);
                        if (e)
                            return "heartRate." + e;
                    }
                }
                if (m.speed != null && m.hasOwnProperty("speed")) {
                    {
                        var e = $root.polar_data.PbSpeedStatistics.verify(m.speed);
                        if (e)
                            return "speed." + e;
                    }
                }
                if (m.cadence != null && m.hasOwnProperty("cadence")) {
                    {
                        var e = $root.polar_data.PbCadenceStatistics.verify(m.cadence);
                        if (e)
                            return "cadence." + e;
                    }
                }
                if (m.altitude != null && m.hasOwnProperty("altitude")) {
                    {
                        var e = $root.polar_data.PbAltitudeStatistics.verify(m.altitude);
                        if (e)
                            return "altitude." + e;
                    }
                }
                if (m.power != null && m.hasOwnProperty("power")) {
                    {
                        var e = $root.polar_data.PbPowerStatistics.verify(m.power);
                        if (e)
                            return "power." + e;
                    }
                }
                if (m.leftRightBalance != null && m.hasOwnProperty("leftRightBalance")) {
                    {
                        var e = $root.polar_data.PbLRBalanceStatistics.verify(m.leftRightBalance);
                        if (e)
                            return "leftRightBalance." + e;
                    }
                }
                if (m.temperature != null && m.hasOwnProperty("temperature")) {
                    {
                        var e = $root.polar_data.PbTemperatureStatistics.verify(m.temperature);
                        if (e)
                            return "temperature." + e;
                    }
                }
                if (m.activity != null && m.hasOwnProperty("activity")) {
                    {
                        var e = $root.polar_data.PbActivityStatistics.verify(m.activity);
                        if (e)
                            return "activity." + e;
                    }
                }
                if (m.strideLength != null && m.hasOwnProperty("strideLength")) {
                    {
                        var e = $root.polar_data.PbStrideLengthStatistics.verify(m.strideLength);
                        if (e)
                            return "strideLength." + e;
                    }
                }
                if (m.incline != null && m.hasOwnProperty("incline")) {
                    {
                        var e = $root.polar_data.PbInclineStatistics.verify(m.incline);
                        if (e)
                            return "incline." + e;
                    }
                }
                if (m.decline != null && m.hasOwnProperty("decline")) {
                    {
                        var e = $root.polar_data.PbDeclineStatistics.verify(m.decline);
                        if (e)
                            return "decline." + e;
                    }
                }
                if (m.swimming != null && m.hasOwnProperty("swimming")) {
                    {
                        var e = $root.polar_data.PbSwimmingStatistics.verify(m.swimming);
                        if (e)
                            return "swimming." + e;
                    }
                }
                return null;
            };
    
            return PbExerciseStatistics;
        })();
    
        polar_data.PbExerciseRouteSamples = (function() {
    
            function PbExerciseRouteSamples(p) {
                this.duration = [];
                this.latitude = [];
                this.longitude = [];
                this.gpsAltitude = [];
                this.satelliteAmount = [];
                this.OBSOLETEFix = [];
                this.OBSOLETEGpsOffline = [];
                this.OBSOLETEGpsDateTime = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbExerciseRouteSamples.prototype.duration = $util.emptyArray;
            PbExerciseRouteSamples.prototype.latitude = $util.emptyArray;
            PbExerciseRouteSamples.prototype.longitude = $util.emptyArray;
            PbExerciseRouteSamples.prototype.gpsAltitude = $util.emptyArray;
            PbExerciseRouteSamples.prototype.satelliteAmount = $util.emptyArray;
            PbExerciseRouteSamples.prototype.OBSOLETEFix = $util.emptyArray;
            PbExerciseRouteSamples.prototype.OBSOLETEGpsOffline = $util.emptyArray;
            PbExerciseRouteSamples.prototype.OBSOLETEGpsDateTime = $util.emptyArray;
            PbExerciseRouteSamples.prototype.firstLocationTime = null;
    
            PbExerciseRouteSamples.create = function create(properties) {
                return new PbExerciseRouteSamples(properties);
            };
    
            PbExerciseRouteSamples.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.duration != null && m.duration.length) {
                    w.uint32(10).fork();
                    for (var i = 0; i < m.duration.length; ++i)
                        w.uint32(m.duration[i]);
                    w.ldelim();
                }
                if (m.latitude != null && m.latitude.length) {
                    w.uint32(18).fork();
                    for (var i = 0; i < m.latitude.length; ++i)
                        w.double(m.latitude[i]);
                    w.ldelim();
                }
                if (m.longitude != null && m.longitude.length) {
                    w.uint32(26).fork();
                    for (var i = 0; i < m.longitude.length; ++i)
                        w.double(m.longitude[i]);
                    w.ldelim();
                }
                if (m.gpsAltitude != null && m.gpsAltitude.length) {
                    w.uint32(34).fork();
                    for (var i = 0; i < m.gpsAltitude.length; ++i)
                        w.sint32(m.gpsAltitude[i]);
                    w.ldelim();
                }
                if (m.satelliteAmount != null && m.satelliteAmount.length) {
                    w.uint32(42).fork();
                    for (var i = 0; i < m.satelliteAmount.length; ++i)
                        w.uint32(m.satelliteAmount[i]);
                    w.ldelim();
                }
                if (m.OBSOLETEFix != null && m.OBSOLETEFix.length) {
                    w.uint32(50).fork();
                    for (var i = 0; i < m.OBSOLETEFix.length; ++i)
                        w.bool(m.OBSOLETEFix[i]);
                    w.ldelim();
                }
                if (m.OBSOLETEGpsOffline != null && m.OBSOLETEGpsOffline.length) {
                    for (var i = 0; i < m.OBSOLETEGpsOffline.length; ++i)
                        $root.polar_types.PbSensorOffline.encode(m.OBSOLETEGpsOffline[i], w.uint32(58).fork()).ldelim();
                }
                if (m.OBSOLETEGpsDateTime != null && m.OBSOLETEGpsDateTime.length) {
                    for (var i = 0; i < m.OBSOLETEGpsDateTime.length; ++i)
                        $root.polar_types.PbSystemDateTime.encode(m.OBSOLETEGpsDateTime[i], w.uint32(66).fork()).ldelim();
                }
                if (m.firstLocationTime != null && m.hasOwnProperty("firstLocationTime"))
                    $root.polar_types.PbSystemDateTime.encode(m.firstLocationTime, w.uint32(74).fork()).ldelim();
                return w;
            };
    
            PbExerciseRouteSamples.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.duration != null && m.hasOwnProperty("duration")) {
                    if (!Array.isArray(m.duration))
                        return "duration: array expected";
                    for (var i = 0; i < m.duration.length; ++i) {
                        if (!$util.isInteger(m.duration[i]))
                            return "duration: integer[] expected";
                    }
                }
                if (m.latitude != null && m.hasOwnProperty("latitude")) {
                    if (!Array.isArray(m.latitude))
                        return "latitude: array expected";
                    for (var i = 0; i < m.latitude.length; ++i) {
                        if (typeof m.latitude[i] !== "number")
                            return "latitude: number[] expected";
                    }
                }
                if (m.longitude != null && m.hasOwnProperty("longitude")) {
                    if (!Array.isArray(m.longitude))
                        return "longitude: array expected";
                    for (var i = 0; i < m.longitude.length; ++i) {
                        if (typeof m.longitude[i] !== "number")
                            return "longitude: number[] expected";
                    }
                }
                if (m.gpsAltitude != null && m.hasOwnProperty("gpsAltitude")) {
                    if (!Array.isArray(m.gpsAltitude))
                        return "gpsAltitude: array expected";
                    for (var i = 0; i < m.gpsAltitude.length; ++i) {
                        if (!$util.isInteger(m.gpsAltitude[i]))
                            return "gpsAltitude: integer[] expected";
                    }
                }
                if (m.satelliteAmount != null && m.hasOwnProperty("satelliteAmount")) {
                    if (!Array.isArray(m.satelliteAmount))
                        return "satelliteAmount: array expected";
                    for (var i = 0; i < m.satelliteAmount.length; ++i) {
                        if (!$util.isInteger(m.satelliteAmount[i]))
                            return "satelliteAmount: integer[] expected";
                    }
                }
                if (m.OBSOLETEFix != null && m.hasOwnProperty("OBSOLETEFix")) {
                    if (!Array.isArray(m.OBSOLETEFix))
                        return "OBSOLETEFix: array expected";
                    for (var i = 0; i < m.OBSOLETEFix.length; ++i) {
                        if (typeof m.OBSOLETEFix[i] !== "boolean")
                            return "OBSOLETEFix: boolean[] expected";
                    }
                }
                if (m.OBSOLETEGpsOffline != null && m.hasOwnProperty("OBSOLETEGpsOffline")) {
                    if (!Array.isArray(m.OBSOLETEGpsOffline))
                        return "OBSOLETEGpsOffline: array expected";
                    for (var i = 0; i < m.OBSOLETEGpsOffline.length; ++i) {
                        {
                            var e = $root.polar_types.PbSensorOffline.verify(m.OBSOLETEGpsOffline[i]);
                            if (e)
                                return "OBSOLETEGpsOffline." + e;
                        }
                    }
                }
                if (m.OBSOLETEGpsDateTime != null && m.hasOwnProperty("OBSOLETEGpsDateTime")) {
                    if (!Array.isArray(m.OBSOLETEGpsDateTime))
                        return "OBSOLETEGpsDateTime: array expected";
                    for (var i = 0; i < m.OBSOLETEGpsDateTime.length; ++i) {
                        {
                            var e = $root.polar_types.PbSystemDateTime.verify(m.OBSOLETEGpsDateTime[i]);
                            if (e)
                                return "OBSOLETEGpsDateTime." + e;
                        }
                    }
                }
                if (m.firstLocationTime != null && m.hasOwnProperty("firstLocationTime")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.firstLocationTime);
                        if (e)
                            return "firstLocationTime." + e;
                    }
                }
                return null;
            };
    
            return PbExerciseRouteSamples;
        })();
    
        polar_data.PbRROffline = (function() {
    
            function PbRROffline(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRROffline.prototype.startTime = null;
            PbRROffline.prototype.timeInterval = null;
    
            PbRROffline.create = function create(properties) {
                return new PbRROffline(properties);
            };
    
            PbRROffline.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDuration.encode(m.startTime, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.timeInterval, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbRROffline.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.startTime);
                    if (e)
                        return "startTime." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.timeInterval);
                    if (e)
                        return "timeInterval." + e;
                }
                return null;
            };
    
            return PbRROffline;
        })();
    
        polar_data.PbExerciseRRIntervals = (function() {
    
            function PbExerciseRRIntervals(p) {
                this.rrIntervals = [];
                this.rrSensorOffline = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbExerciseRRIntervals.prototype.rrIntervals = $util.emptyArray;
            PbExerciseRRIntervals.prototype.rrSensorOffline = $util.emptyArray;
    
            PbExerciseRRIntervals.create = function create(properties) {
                return new PbExerciseRRIntervals(properties);
            };
    
            PbExerciseRRIntervals.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.rrIntervals != null && m.rrIntervals.length) {
                    w.uint32(10).fork();
                    for (var i = 0; i < m.rrIntervals.length; ++i)
                        w.uint32(m.rrIntervals[i]);
                    w.ldelim();
                }
                if (m.rrSensorOffline != null && m.rrSensorOffline.length) {
                    for (var i = 0; i < m.rrSensorOffline.length; ++i)
                        $root.polar_data.PbRROffline.encode(m.rrSensorOffline[i], w.uint32(18).fork()).ldelim();
                }
                return w;
            };
    
            PbExerciseRRIntervals.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.rrIntervals != null && m.hasOwnProperty("rrIntervals")) {
                    if (!Array.isArray(m.rrIntervals))
                        return "rrIntervals: array expected";
                    for (var i = 0; i < m.rrIntervals.length; ++i) {
                        if (!$util.isInteger(m.rrIntervals[i]))
                            return "rrIntervals: integer[] expected";
                    }
                }
                if (m.rrSensorOffline != null && m.hasOwnProperty("rrSensorOffline")) {
                    if (!Array.isArray(m.rrSensorOffline))
                        return "rrSensorOffline: array expected";
                    for (var i = 0; i < m.rrSensorOffline.length; ++i) {
                        {
                            var e = $root.polar_data.PbRROffline.verify(m.rrSensorOffline[i]);
                            if (e)
                                return "rrSensorOffline." + e;
                        }
                    }
                }
                return null;
            };
    
            return PbExerciseRRIntervals;
        })();
    
        polar_data.PbPowerMeasurements = (function() {
    
            function PbPowerMeasurements(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPowerMeasurements.prototype.currentPower = 0;
            PbPowerMeasurements.prototype.cumulativeCrankRevolutions = 0;
            PbPowerMeasurements.prototype.cumulativeTimestamp = 0;
            PbPowerMeasurements.prototype.forceMagnitudeMin = 0;
            PbPowerMeasurements.prototype.forceMagnitudeMax = 0;
            PbPowerMeasurements.prototype.forceMagnitudeMinAngle = 0;
            PbPowerMeasurements.prototype.forceMagnitudeMaxAngle = 0;
            PbPowerMeasurements.prototype.bottomDeadSpotAngle = 0;
            PbPowerMeasurements.prototype.topDeadSpotAngle = 0;
    
            PbPowerMeasurements.create = function create(properties) {
                return new PbPowerMeasurements(properties);
            };
    
            PbPowerMeasurements.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.currentPower);
                if (m.cumulativeCrankRevolutions != null && m.hasOwnProperty("cumulativeCrankRevolutions"))
                    w.uint32(16).uint32(m.cumulativeCrankRevolutions);
                if (m.cumulativeTimestamp != null && m.hasOwnProperty("cumulativeTimestamp"))
                    w.uint32(24).uint32(m.cumulativeTimestamp);
                if (m.forceMagnitudeMin != null && m.hasOwnProperty("forceMagnitudeMin"))
                    w.uint32(32).sint32(m.forceMagnitudeMin);
                if (m.forceMagnitudeMax != null && m.hasOwnProperty("forceMagnitudeMax"))
                    w.uint32(40).int32(m.forceMagnitudeMax);
                if (m.forceMagnitudeMinAngle != null && m.hasOwnProperty("forceMagnitudeMinAngle"))
                    w.uint32(48).uint32(m.forceMagnitudeMinAngle);
                if (m.forceMagnitudeMaxAngle != null && m.hasOwnProperty("forceMagnitudeMaxAngle"))
                    w.uint32(56).uint32(m.forceMagnitudeMaxAngle);
                if (m.bottomDeadSpotAngle != null && m.hasOwnProperty("bottomDeadSpotAngle"))
                    w.uint32(64).uint32(m.bottomDeadSpotAngle);
                if (m.topDeadSpotAngle != null && m.hasOwnProperty("topDeadSpotAngle"))
                    w.uint32(72).uint32(m.topDeadSpotAngle);
                return w;
            };
    
            PbPowerMeasurements.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.currentPower))
                    return "currentPower: integer expected";
                if (m.cumulativeCrankRevolutions != null && m.hasOwnProperty("cumulativeCrankRevolutions")) {
                    if (!$util.isInteger(m.cumulativeCrankRevolutions))
                        return "cumulativeCrankRevolutions: integer expected";
                }
                if (m.cumulativeTimestamp != null && m.hasOwnProperty("cumulativeTimestamp")) {
                    if (!$util.isInteger(m.cumulativeTimestamp))
                        return "cumulativeTimestamp: integer expected";
                }
                if (m.forceMagnitudeMin != null && m.hasOwnProperty("forceMagnitudeMin")) {
                    if (!$util.isInteger(m.forceMagnitudeMin))
                        return "forceMagnitudeMin: integer expected";
                }
                if (m.forceMagnitudeMax != null && m.hasOwnProperty("forceMagnitudeMax")) {
                    if (!$util.isInteger(m.forceMagnitudeMax))
                        return "forceMagnitudeMax: integer expected";
                }
                if (m.forceMagnitudeMinAngle != null && m.hasOwnProperty("forceMagnitudeMinAngle")) {
                    if (!$util.isInteger(m.forceMagnitudeMinAngle))
                        return "forceMagnitudeMinAngle: integer expected";
                }
                if (m.forceMagnitudeMaxAngle != null && m.hasOwnProperty("forceMagnitudeMaxAngle")) {
                    if (!$util.isInteger(m.forceMagnitudeMaxAngle))
                        return "forceMagnitudeMaxAngle: integer expected";
                }
                if (m.bottomDeadSpotAngle != null && m.hasOwnProperty("bottomDeadSpotAngle")) {
                    if (!$util.isInteger(m.bottomDeadSpotAngle))
                        return "bottomDeadSpotAngle: integer expected";
                }
                if (m.topDeadSpotAngle != null && m.hasOwnProperty("topDeadSpotAngle")) {
                    if (!$util.isInteger(m.topDeadSpotAngle))
                        return "topDeadSpotAngle: integer expected";
                }
                return null;
            };
    
            return PbPowerMeasurements;
        })();
    
        polar_data.PbCalibrationValue = (function() {
    
            function PbCalibrationValue(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbCalibrationValue.prototype.startIndex = 0;
            PbCalibrationValue.prototype.value = 0;
            PbCalibrationValue.prototype.operation = 1;
            PbCalibrationValue.prototype.cause = 0;
    
            PbCalibrationValue.create = function create(properties) {
                return new PbCalibrationValue(properties);
            };
    
            PbCalibrationValue.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.startIndex);
                w.uint32(21).float(m.value);
                w.uint32(24).int32(m.operation);
                if (m.cause != null && m.hasOwnProperty("cause"))
                    w.uint32(32).int32(m.cause);
                return w;
            };
    
            PbCalibrationValue.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.startIndex))
                    return "startIndex: integer expected";
                if (typeof m.value !== "number")
                    return "value: number expected";
                switch (m.operation) {
                default:
                    return "operation: enum value expected";
                case 1:
                case 2:
                    break;
                }
                if (m.cause != null && m.hasOwnProperty("cause")) {
                    switch (m.cause) {
                    default:
                        return "cause: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                }
                return null;
            };
    
            return PbCalibrationValue;
        })();
    
        polar_data.PbExerciseSamples = (function() {
    
            function PbExerciseSamples(p) {
                this.heartRateSamples = [];
                this.heartRateOffline = [];
                this.cadenceSamples = [];
                this.cadenceOffline = [];
                this.altitudeSamples = [];
                this.altitudeOffline = [];
                this.altitudeCalibration = [];
                this.temperatureSamples = [];
                this.temperatureOffline = [];
                this.speedSamples = [];
                this.speedOffline = [];
                this.distanceSamples = [];
                this.distanceOffline = [];
                this.strideLengthSamples = [];
                this.strideLengthOffline = [];
                this.strideCalibration = [];
                this.forwardAcceleration = [];
                this.forwardAccelerationOffline = [];
                this.movingTypeSamples = [];
                this.movingTypeOffline = [];
                this.leftPedalPowerSamples = [];
                this.leftPedalPowerOffline = [];
                this.rightPedalPowerSamples = [];
                this.rightPedalPowerOffline = [];
                this.leftPowerCalibration = [];
                this.rightPowerCalibration = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbExerciseSamples.prototype.recordingInterval = null;
            PbExerciseSamples.prototype.heartRateSamples = $util.emptyArray;
            PbExerciseSamples.prototype.heartRateOffline = $util.emptyArray;
            PbExerciseSamples.prototype.cadenceSamples = $util.emptyArray;
            PbExerciseSamples.prototype.cadenceOffline = $util.emptyArray;
            PbExerciseSamples.prototype.altitudeSamples = $util.emptyArray;
            PbExerciseSamples.prototype.altitudeOffline = $util.emptyArray;
            PbExerciseSamples.prototype.altitudeCalibration = $util.emptyArray;
            PbExerciseSamples.prototype.temperatureSamples = $util.emptyArray;
            PbExerciseSamples.prototype.temperatureOffline = $util.emptyArray;
            PbExerciseSamples.prototype.speedSamples = $util.emptyArray;
            PbExerciseSamples.prototype.speedOffline = $util.emptyArray;
            PbExerciseSamples.prototype.distanceSamples = $util.emptyArray;
            PbExerciseSamples.prototype.distanceOffline = $util.emptyArray;
            PbExerciseSamples.prototype.strideLengthSamples = $util.emptyArray;
            PbExerciseSamples.prototype.strideLengthOffline = $util.emptyArray;
            PbExerciseSamples.prototype.strideCalibration = $util.emptyArray;
            PbExerciseSamples.prototype.forwardAcceleration = $util.emptyArray;
            PbExerciseSamples.prototype.forwardAccelerationOffline = $util.emptyArray;
            PbExerciseSamples.prototype.movingTypeSamples = $util.emptyArray;
            PbExerciseSamples.prototype.movingTypeOffline = $util.emptyArray;
            PbExerciseSamples.prototype.leftPedalPowerSamples = $util.emptyArray;
            PbExerciseSamples.prototype.leftPedalPowerOffline = $util.emptyArray;
            PbExerciseSamples.prototype.rightPedalPowerSamples = $util.emptyArray;
            PbExerciseSamples.prototype.rightPedalPowerOffline = $util.emptyArray;
            PbExerciseSamples.prototype.leftPowerCalibration = $util.emptyArray;
            PbExerciseSamples.prototype.rightPowerCalibration = $util.emptyArray;
            PbExerciseSamples.prototype.rrSamples = null;
    
            PbExerciseSamples.create = function create(properties) {
                return new PbExerciseSamples(properties);
            };
    
            PbExerciseSamples.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDuration.encode(m.recordingInterval, w.uint32(10).fork()).ldelim();
                if (m.heartRateSamples != null && m.heartRateSamples.length) {
                    w.uint32(18).fork();
                    for (var i = 0; i < m.heartRateSamples.length; ++i)
                        w.uint32(m.heartRateSamples[i]);
                    w.ldelim();
                }
                if (m.heartRateOffline != null && m.heartRateOffline.length) {
                    for (var i = 0; i < m.heartRateOffline.length; ++i)
                        $root.polar_types.PbSensorOffline.encode(m.heartRateOffline[i], w.uint32(26).fork()).ldelim();
                }
                if (m.cadenceSamples != null && m.cadenceSamples.length) {
                    w.uint32(34).fork();
                    for (var i = 0; i < m.cadenceSamples.length; ++i)
                        w.uint32(m.cadenceSamples[i]);
                    w.ldelim();
                }
                if (m.cadenceOffline != null && m.cadenceOffline.length) {
                    for (var i = 0; i < m.cadenceOffline.length; ++i)
                        $root.polar_types.PbSensorOffline.encode(m.cadenceOffline[i], w.uint32(42).fork()).ldelim();
                }
                if (m.altitudeSamples != null && m.altitudeSamples.length) {
                    w.uint32(50).fork();
                    for (var i = 0; i < m.altitudeSamples.length; ++i)
                        w.float(m.altitudeSamples[i]);
                    w.ldelim();
                }
                if (m.altitudeCalibration != null && m.altitudeCalibration.length) {
                    for (var i = 0; i < m.altitudeCalibration.length; ++i)
                        $root.polar_data.PbCalibrationValue.encode(m.altitudeCalibration[i], w.uint32(58).fork()).ldelim();
                }
                if (m.temperatureSamples != null && m.temperatureSamples.length) {
                    w.uint32(66).fork();
                    for (var i = 0; i < m.temperatureSamples.length; ++i)
                        w.float(m.temperatureSamples[i]);
                    w.ldelim();
                }
                if (m.speedSamples != null && m.speedSamples.length) {
                    w.uint32(74).fork();
                    for (var i = 0; i < m.speedSamples.length; ++i)
                        w.float(m.speedSamples[i]);
                    w.ldelim();
                }
                if (m.speedOffline != null && m.speedOffline.length) {
                    for (var i = 0; i < m.speedOffline.length; ++i)
                        $root.polar_types.PbSensorOffline.encode(m.speedOffline[i], w.uint32(82).fork()).ldelim();
                }
                if (m.distanceSamples != null && m.distanceSamples.length) {
                    w.uint32(90).fork();
                    for (var i = 0; i < m.distanceSamples.length; ++i)
                        w.float(m.distanceSamples[i]);
                    w.ldelim();
                }
                if (m.distanceOffline != null && m.distanceOffline.length) {
                    for (var i = 0; i < m.distanceOffline.length; ++i)
                        $root.polar_types.PbSensorOffline.encode(m.distanceOffline[i], w.uint32(98).fork()).ldelim();
                }
                if (m.strideLengthSamples != null && m.strideLengthSamples.length) {
                    for (var i = 0; i < m.strideLengthSamples.length; ++i)
                        w.uint32(104).uint32(m.strideLengthSamples[i]);
                }
                if (m.strideLengthOffline != null && m.strideLengthOffline.length) {
                    for (var i = 0; i < m.strideLengthOffline.length; ++i)
                        $root.polar_types.PbSensorOffline.encode(m.strideLengthOffline[i], w.uint32(114).fork()).ldelim();
                }
                if (m.strideCalibration != null && m.strideCalibration.length) {
                    for (var i = 0; i < m.strideCalibration.length; ++i)
                        $root.polar_data.PbCalibrationValue.encode(m.strideCalibration[i], w.uint32(122).fork()).ldelim();
                }
                if (m.forwardAcceleration != null && m.forwardAcceleration.length) {
                    for (var i = 0; i < m.forwardAcceleration.length; ++i)
                        w.uint32(133).float(m.forwardAcceleration[i]);
                }
                if (m.movingTypeSamples != null && m.movingTypeSamples.length) {
                    for (var i = 0; i < m.movingTypeSamples.length; ++i)
                        w.uint32(136).int32(m.movingTypeSamples[i]);
                }
                if (m.altitudeOffline != null && m.altitudeOffline.length) {
                    for (var i = 0; i < m.altitudeOffline.length; ++i)
                        $root.polar_types.PbSensorOffline.encode(m.altitudeOffline[i], w.uint32(146).fork()).ldelim();
                }
                if (m.temperatureOffline != null && m.temperatureOffline.length) {
                    for (var i = 0; i < m.temperatureOffline.length; ++i)
                        $root.polar_types.PbSensorOffline.encode(m.temperatureOffline[i], w.uint32(154).fork()).ldelim();
                }
                if (m.forwardAccelerationOffline != null && m.forwardAccelerationOffline.length) {
                    for (var i = 0; i < m.forwardAccelerationOffline.length; ++i)
                        $root.polar_types.PbSensorOffline.encode(m.forwardAccelerationOffline[i], w.uint32(162).fork()).ldelim();
                }
                if (m.movingTypeOffline != null && m.movingTypeOffline.length) {
                    for (var i = 0; i < m.movingTypeOffline.length; ++i)
                        $root.polar_types.PbSensorOffline.encode(m.movingTypeOffline[i], w.uint32(170).fork()).ldelim();
                }
                if (m.leftPedalPowerSamples != null && m.leftPedalPowerSamples.length) {
                    for (var i = 0; i < m.leftPedalPowerSamples.length; ++i)
                        $root.polar_data.PbPowerMeasurements.encode(m.leftPedalPowerSamples[i], w.uint32(178).fork()).ldelim();
                }
                if (m.leftPedalPowerOffline != null && m.leftPedalPowerOffline.length) {
                    for (var i = 0; i < m.leftPedalPowerOffline.length; ++i)
                        $root.polar_types.PbSensorOffline.encode(m.leftPedalPowerOffline[i], w.uint32(186).fork()).ldelim();
                }
                if (m.rightPedalPowerSamples != null && m.rightPedalPowerSamples.length) {
                    for (var i = 0; i < m.rightPedalPowerSamples.length; ++i)
                        $root.polar_data.PbPowerMeasurements.encode(m.rightPedalPowerSamples[i], w.uint32(194).fork()).ldelim();
                }
                if (m.rightPedalPowerOffline != null && m.rightPedalPowerOffline.length) {
                    for (var i = 0; i < m.rightPedalPowerOffline.length; ++i)
                        $root.polar_types.PbSensorOffline.encode(m.rightPedalPowerOffline[i], w.uint32(202).fork()).ldelim();
                }
                if (m.leftPowerCalibration != null && m.leftPowerCalibration.length) {
                    for (var i = 0; i < m.leftPowerCalibration.length; ++i)
                        $root.polar_data.PbCalibrationValue.encode(m.leftPowerCalibration[i], w.uint32(210).fork()).ldelim();
                }
                if (m.rightPowerCalibration != null && m.rightPowerCalibration.length) {
                    for (var i = 0; i < m.rightPowerCalibration.length; ++i)
                        $root.polar_data.PbCalibrationValue.encode(m.rightPowerCalibration[i], w.uint32(218).fork()).ldelim();
                }
                if (m.rrSamples != null && m.hasOwnProperty("rrSamples"))
                    $root.polar_data.PbExerciseRRIntervals.encode(m.rrSamples, w.uint32(226).fork()).ldelim();
                return w;
            };
    
            PbExerciseSamples.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.recordingInterval);
                    if (e)
                        return "recordingInterval." + e;
                }
                if (m.heartRateSamples != null && m.hasOwnProperty("heartRateSamples")) {
                    if (!Array.isArray(m.heartRateSamples))
                        return "heartRateSamples: array expected";
                    for (var i = 0; i < m.heartRateSamples.length; ++i) {
                        if (!$util.isInteger(m.heartRateSamples[i]))
                            return "heartRateSamples: integer[] expected";
                    }
                }
                if (m.heartRateOffline != null && m.hasOwnProperty("heartRateOffline")) {
                    if (!Array.isArray(m.heartRateOffline))
                        return "heartRateOffline: array expected";
                    for (var i = 0; i < m.heartRateOffline.length; ++i) {
                        {
                            var e = $root.polar_types.PbSensorOffline.verify(m.heartRateOffline[i]);
                            if (e)
                                return "heartRateOffline." + e;
                        }
                    }
                }
                if (m.cadenceSamples != null && m.hasOwnProperty("cadenceSamples")) {
                    if (!Array.isArray(m.cadenceSamples))
                        return "cadenceSamples: array expected";
                    for (var i = 0; i < m.cadenceSamples.length; ++i) {
                        if (!$util.isInteger(m.cadenceSamples[i]))
                            return "cadenceSamples: integer[] expected";
                    }
                }
                if (m.cadenceOffline != null && m.hasOwnProperty("cadenceOffline")) {
                    if (!Array.isArray(m.cadenceOffline))
                        return "cadenceOffline: array expected";
                    for (var i = 0; i < m.cadenceOffline.length; ++i) {
                        {
                            var e = $root.polar_types.PbSensorOffline.verify(m.cadenceOffline[i]);
                            if (e)
                                return "cadenceOffline." + e;
                        }
                    }
                }
                if (m.altitudeSamples != null && m.hasOwnProperty("altitudeSamples")) {
                    if (!Array.isArray(m.altitudeSamples))
                        return "altitudeSamples: array expected";
                    for (var i = 0; i < m.altitudeSamples.length; ++i) {
                        if (typeof m.altitudeSamples[i] !== "number")
                            return "altitudeSamples: number[] expected";
                    }
                }
                if (m.altitudeOffline != null && m.hasOwnProperty("altitudeOffline")) {
                    if (!Array.isArray(m.altitudeOffline))
                        return "altitudeOffline: array expected";
                    for (var i = 0; i < m.altitudeOffline.length; ++i) {
                        {
                            var e = $root.polar_types.PbSensorOffline.verify(m.altitudeOffline[i]);
                            if (e)
                                return "altitudeOffline." + e;
                        }
                    }
                }
                if (m.altitudeCalibration != null && m.hasOwnProperty("altitudeCalibration")) {
                    if (!Array.isArray(m.altitudeCalibration))
                        return "altitudeCalibration: array expected";
                    for (var i = 0; i < m.altitudeCalibration.length; ++i) {
                        {
                            var e = $root.polar_data.PbCalibrationValue.verify(m.altitudeCalibration[i]);
                            if (e)
                                return "altitudeCalibration." + e;
                        }
                    }
                }
                if (m.temperatureSamples != null && m.hasOwnProperty("temperatureSamples")) {
                    if (!Array.isArray(m.temperatureSamples))
                        return "temperatureSamples: array expected";
                    for (var i = 0; i < m.temperatureSamples.length; ++i) {
                        if (typeof m.temperatureSamples[i] !== "number")
                            return "temperatureSamples: number[] expected";
                    }
                }
                if (m.temperatureOffline != null && m.hasOwnProperty("temperatureOffline")) {
                    if (!Array.isArray(m.temperatureOffline))
                        return "temperatureOffline: array expected";
                    for (var i = 0; i < m.temperatureOffline.length; ++i) {
                        {
                            var e = $root.polar_types.PbSensorOffline.verify(m.temperatureOffline[i]);
                            if (e)
                                return "temperatureOffline." + e;
                        }
                    }
                }
                if (m.speedSamples != null && m.hasOwnProperty("speedSamples")) {
                    if (!Array.isArray(m.speedSamples))
                        return "speedSamples: array expected";
                    for (var i = 0; i < m.speedSamples.length; ++i) {
                        if (typeof m.speedSamples[i] !== "number")
                            return "speedSamples: number[] expected";
                    }
                }
                if (m.speedOffline != null && m.hasOwnProperty("speedOffline")) {
                    if (!Array.isArray(m.speedOffline))
                        return "speedOffline: array expected";
                    for (var i = 0; i < m.speedOffline.length; ++i) {
                        {
                            var e = $root.polar_types.PbSensorOffline.verify(m.speedOffline[i]);
                            if (e)
                                return "speedOffline." + e;
                        }
                    }
                }
                if (m.distanceSamples != null && m.hasOwnProperty("distanceSamples")) {
                    if (!Array.isArray(m.distanceSamples))
                        return "distanceSamples: array expected";
                    for (var i = 0; i < m.distanceSamples.length; ++i) {
                        if (typeof m.distanceSamples[i] !== "number")
                            return "distanceSamples: number[] expected";
                    }
                }
                if (m.distanceOffline != null && m.hasOwnProperty("distanceOffline")) {
                    if (!Array.isArray(m.distanceOffline))
                        return "distanceOffline: array expected";
                    for (var i = 0; i < m.distanceOffline.length; ++i) {
                        {
                            var e = $root.polar_types.PbSensorOffline.verify(m.distanceOffline[i]);
                            if (e)
                                return "distanceOffline." + e;
                        }
                    }
                }
                if (m.strideLengthSamples != null && m.hasOwnProperty("strideLengthSamples")) {
                    if (!Array.isArray(m.strideLengthSamples))
                        return "strideLengthSamples: array expected";
                    for (var i = 0; i < m.strideLengthSamples.length; ++i) {
                        if (!$util.isInteger(m.strideLengthSamples[i]))
                            return "strideLengthSamples: integer[] expected";
                    }
                }
                if (m.strideLengthOffline != null && m.hasOwnProperty("strideLengthOffline")) {
                    if (!Array.isArray(m.strideLengthOffline))
                        return "strideLengthOffline: array expected";
                    for (var i = 0; i < m.strideLengthOffline.length; ++i) {
                        {
                            var e = $root.polar_types.PbSensorOffline.verify(m.strideLengthOffline[i]);
                            if (e)
                                return "strideLengthOffline." + e;
                        }
                    }
                }
                if (m.strideCalibration != null && m.hasOwnProperty("strideCalibration")) {
                    if (!Array.isArray(m.strideCalibration))
                        return "strideCalibration: array expected";
                    for (var i = 0; i < m.strideCalibration.length; ++i) {
                        {
                            var e = $root.polar_data.PbCalibrationValue.verify(m.strideCalibration[i]);
                            if (e)
                                return "strideCalibration." + e;
                        }
                    }
                }
                if (m.forwardAcceleration != null && m.hasOwnProperty("forwardAcceleration")) {
                    if (!Array.isArray(m.forwardAcceleration))
                        return "forwardAcceleration: array expected";
                    for (var i = 0; i < m.forwardAcceleration.length; ++i) {
                        if (typeof m.forwardAcceleration[i] !== "number")
                            return "forwardAcceleration: number[] expected";
                    }
                }
                if (m.forwardAccelerationOffline != null && m.hasOwnProperty("forwardAccelerationOffline")) {
                    if (!Array.isArray(m.forwardAccelerationOffline))
                        return "forwardAccelerationOffline: array expected";
                    for (var i = 0; i < m.forwardAccelerationOffline.length; ++i) {
                        {
                            var e = $root.polar_types.PbSensorOffline.verify(m.forwardAccelerationOffline[i]);
                            if (e)
                                return "forwardAccelerationOffline." + e;
                        }
                    }
                }
                if (m.movingTypeSamples != null && m.hasOwnProperty("movingTypeSamples")) {
                    if (!Array.isArray(m.movingTypeSamples))
                        return "movingTypeSamples: array expected";
                    for (var i = 0; i < m.movingTypeSamples.length; ++i) {
                        switch (m.movingTypeSamples[i]) {
                        default:
                            return "movingTypeSamples: enum value[] expected";
                        case 0:
                        case 1:
                        case 2:
                            break;
                        }
                    }
                }
                if (m.movingTypeOffline != null && m.hasOwnProperty("movingTypeOffline")) {
                    if (!Array.isArray(m.movingTypeOffline))
                        return "movingTypeOffline: array expected";
                    for (var i = 0; i < m.movingTypeOffline.length; ++i) {
                        {
                            var e = $root.polar_types.PbSensorOffline.verify(m.movingTypeOffline[i]);
                            if (e)
                                return "movingTypeOffline." + e;
                        }
                    }
                }
                if (m.leftPedalPowerSamples != null && m.hasOwnProperty("leftPedalPowerSamples")) {
                    if (!Array.isArray(m.leftPedalPowerSamples))
                        return "leftPedalPowerSamples: array expected";
                    for (var i = 0; i < m.leftPedalPowerSamples.length; ++i) {
                        {
                            var e = $root.polar_data.PbPowerMeasurements.verify(m.leftPedalPowerSamples[i]);
                            if (e)
                                return "leftPedalPowerSamples." + e;
                        }
                    }
                }
                if (m.leftPedalPowerOffline != null && m.hasOwnProperty("leftPedalPowerOffline")) {
                    if (!Array.isArray(m.leftPedalPowerOffline))
                        return "leftPedalPowerOffline: array expected";
                    for (var i = 0; i < m.leftPedalPowerOffline.length; ++i) {
                        {
                            var e = $root.polar_types.PbSensorOffline.verify(m.leftPedalPowerOffline[i]);
                            if (e)
                                return "leftPedalPowerOffline." + e;
                        }
                    }
                }
                if (m.rightPedalPowerSamples != null && m.hasOwnProperty("rightPedalPowerSamples")) {
                    if (!Array.isArray(m.rightPedalPowerSamples))
                        return "rightPedalPowerSamples: array expected";
                    for (var i = 0; i < m.rightPedalPowerSamples.length; ++i) {
                        {
                            var e = $root.polar_data.PbPowerMeasurements.verify(m.rightPedalPowerSamples[i]);
                            if (e)
                                return "rightPedalPowerSamples." + e;
                        }
                    }
                }
                if (m.rightPedalPowerOffline != null && m.hasOwnProperty("rightPedalPowerOffline")) {
                    if (!Array.isArray(m.rightPedalPowerOffline))
                        return "rightPedalPowerOffline: array expected";
                    for (var i = 0; i < m.rightPedalPowerOffline.length; ++i) {
                        {
                            var e = $root.polar_types.PbSensorOffline.verify(m.rightPedalPowerOffline[i]);
                            if (e)
                                return "rightPedalPowerOffline." + e;
                        }
                    }
                }
                if (m.leftPowerCalibration != null && m.hasOwnProperty("leftPowerCalibration")) {
                    if (!Array.isArray(m.leftPowerCalibration))
                        return "leftPowerCalibration: array expected";
                    for (var i = 0; i < m.leftPowerCalibration.length; ++i) {
                        {
                            var e = $root.polar_data.PbCalibrationValue.verify(m.leftPowerCalibration[i]);
                            if (e)
                                return "leftPowerCalibration." + e;
                        }
                    }
                }
                if (m.rightPowerCalibration != null && m.hasOwnProperty("rightPowerCalibration")) {
                    if (!Array.isArray(m.rightPowerCalibration))
                        return "rightPowerCalibration: array expected";
                    for (var i = 0; i < m.rightPowerCalibration.length; ++i) {
                        {
                            var e = $root.polar_data.PbCalibrationValue.verify(m.rightPowerCalibration[i]);
                            if (e)
                                return "rightPowerCalibration." + e;
                        }
                    }
                }
                if (m.rrSamples != null && m.hasOwnProperty("rrSamples")) {
                    {
                        var e = $root.polar_data.PbExerciseRRIntervals.verify(m.rrSamples);
                        if (e)
                            return "rrSamples." + e;
                    }
                }
                return null;
            };
    
            return PbExerciseSamples;
        })();
    
        polar_data.PbExerciseSensor = (function() {
    
            function PbExerciseSensor(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbExerciseSensor.prototype.mac = null;
            PbExerciseSensor.prototype.deviceId = null;
            PbExerciseSensor.prototype.deviceName = null;
    
            PbExerciseSensor.create = function create(properties) {
                return new PbExerciseSensor(properties);
            };
    
            PbExerciseSensor.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbBleMac.encode(m.mac, w.uint32(10).fork()).ldelim();
                if (m.deviceId != null && m.hasOwnProperty("deviceId"))
                    $root.polar_types.PbDeviceId.encode(m.deviceId, w.uint32(18).fork()).ldelim();
                if (m.deviceName != null && m.hasOwnProperty("deviceName"))
                    $root.polar_types.PbBleDeviceName.encode(m.deviceName, w.uint32(26).fork()).ldelim();
                return w;
            };
    
            PbExerciseSensor.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbBleMac.verify(m.mac);
                    if (e)
                        return "mac." + e;
                }
                if (m.deviceId != null && m.hasOwnProperty("deviceId")) {
                    {
                        var e = $root.polar_types.PbDeviceId.verify(m.deviceId);
                        if (e)
                            return "deviceId." + e;
                    }
                }
                if (m.deviceName != null && m.hasOwnProperty("deviceName")) {
                    {
                        var e = $root.polar_types.PbBleDeviceName.verify(m.deviceName);
                        if (e)
                            return "deviceName." + e;
                    }
                }
                return null;
            };
    
            return PbExerciseSensor;
        })();
    
        polar_data.PbExerciseSensors = (function() {
    
            function PbExerciseSensors(p) {
                this.sensors = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbExerciseSensors.prototype.sensors = $util.emptyArray;
    
            PbExerciseSensors.create = function create(properties) {
                return new PbExerciseSensors(properties);
            };
    
            PbExerciseSensors.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.sensors != null && m.sensors.length) {
                    for (var i = 0; i < m.sensors.length; ++i)
                        $root.polar_data.PbExerciseSensor.encode(m.sensors[i], w.uint32(10).fork()).ldelim();
                }
                return w;
            };
    
            PbExerciseSensors.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.sensors != null && m.hasOwnProperty("sensors")) {
                    if (!Array.isArray(m.sensors))
                        return "sensors: array expected";
                    for (var i = 0; i < m.sensors.length; ++i) {
                        {
                            var e = $root.polar_data.PbExerciseSensor.verify(m.sensors[i]);
                            if (e)
                                return "sensors." + e;
                        }
                    }
                }
                return null;
            };
    
            return PbExerciseSensors;
        })();
    
        polar_data.PbSteadyRacePaceResult = (function() {
    
            function PbSteadyRacePaceResult(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSteadyRacePaceResult.prototype.completedTime = null;
            PbSteadyRacePaceResult.prototype.averageHeartrate = 0;
            PbSteadyRacePaceResult.prototype.averageSpeed = 0;
    
            PbSteadyRacePaceResult.create = function create(properties) {
                return new PbSteadyRacePaceResult(properties);
            };
    
            PbSteadyRacePaceResult.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDuration.encode(m.completedTime, w.uint32(10).fork()).ldelim();
                if (m.averageHeartrate != null && m.hasOwnProperty("averageHeartrate"))
                    w.uint32(16).uint32(m.averageHeartrate);
                if (m.averageSpeed != null && m.hasOwnProperty("averageSpeed"))
                    w.uint32(29).float(m.averageSpeed);
                return w;
            };
    
            PbSteadyRacePaceResult.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.completedTime);
                    if (e)
                        return "completedTime." + e;
                }
                if (m.averageHeartrate != null && m.hasOwnProperty("averageHeartrate")) {
                    if (!$util.isInteger(m.averageHeartrate))
                        return "averageHeartrate: integer expected";
                }
                if (m.averageSpeed != null && m.hasOwnProperty("averageSpeed")) {
                    if (typeof m.averageSpeed !== "number")
                        return "averageSpeed: number expected";
                }
                return null;
            };
    
            return PbSteadyRacePaceResult;
        })();
    
        polar_data.PbExerciseTargetInfo = (function() {
    
            function PbExerciseTargetInfo(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbExerciseTargetInfo.prototype.targetType = 0;
            PbExerciseTargetInfo.prototype.index = 0;
            PbExerciseTargetInfo.prototype.name = null;
            PbExerciseTargetInfo.prototype.targetReached = false;
            PbExerciseTargetInfo.prototype.endTime = null;
            PbExerciseTargetInfo.prototype.sportId = null;
            PbExerciseTargetInfo.prototype.volumeTarget = null;
            PbExerciseTargetInfo.prototype.phases = null;
            PbExerciseTargetInfo.prototype.route = null;
            PbExerciseTargetInfo.prototype.steadyRacePace = null;
            PbExerciseTargetInfo.prototype.steadyRacePaceResult = null;
            PbExerciseTargetInfo.prototype.stravaSegmentTarget = null;
    
            PbExerciseTargetInfo.create = function create(properties) {
                return new PbExerciseTargetInfo(properties);
            };
    
            PbExerciseTargetInfo.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.targetType);
                w.uint32(16).uint32(m.index);
                if (m.name != null && m.hasOwnProperty("name"))
                    $root.polar_types.PbOneLineText.encode(m.name, w.uint32(26).fork()).ldelim();
                if (m.targetReached != null && m.hasOwnProperty("targetReached"))
                    w.uint32(32).bool(m.targetReached);
                if (m.endTime != null && m.hasOwnProperty("endTime"))
                    $root.polar_types.PbDuration.encode(m.endTime, w.uint32(42).fork()).ldelim();
                if (m.sportId != null && m.hasOwnProperty("sportId"))
                    $root.polar_types.PbSportIdentifier.encode(m.sportId, w.uint32(50).fork()).ldelim();
                if (m.volumeTarget != null && m.hasOwnProperty("volumeTarget"))
                    $root.polar_types.PbVolumeTarget.encode(m.volumeTarget, w.uint32(58).fork()).ldelim();
                if (m.phases != null && m.hasOwnProperty("phases"))
                    $root.polar_data.PbPhases.encode(m.phases, w.uint32(66).fork()).ldelim();
                if (m.route != null && m.hasOwnProperty("route"))
                    $root.polar_types.PbRouteId.encode(m.route, w.uint32(74).fork()).ldelim();
                if (m.steadyRacePace != null && m.hasOwnProperty("steadyRacePace"))
                    $root.polar_data.PbSteadyRacePace.encode(m.steadyRacePace, w.uint32(82).fork()).ldelim();
                if (m.steadyRacePaceResult != null && m.hasOwnProperty("steadyRacePaceResult"))
                    $root.polar_data.PbSteadyRacePaceResult.encode(m.steadyRacePaceResult, w.uint32(90).fork()).ldelim();
                if (m.stravaSegmentTarget != null && m.hasOwnProperty("stravaSegmentTarget"))
                    $root.polar_types.PbStravaSegmentTarget.encode(m.stravaSegmentTarget, w.uint32(98).fork()).ldelim();
                return w;
            };
    
            PbExerciseTargetInfo.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.targetType) {
                default:
                    return "targetType: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                    break;
                }
                if (!$util.isInteger(m.index))
                    return "index: integer expected";
                if (m.name != null && m.hasOwnProperty("name")) {
                    {
                        var e = $root.polar_types.PbOneLineText.verify(m.name);
                        if (e)
                            return "name." + e;
                    }
                }
                if (m.targetReached != null && m.hasOwnProperty("targetReached")) {
                    if (typeof m.targetReached !== "boolean")
                        return "targetReached: boolean expected";
                }
                if (m.endTime != null && m.hasOwnProperty("endTime")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.endTime);
                        if (e)
                            return "endTime." + e;
                    }
                }
                if (m.sportId != null && m.hasOwnProperty("sportId")) {
                    {
                        var e = $root.polar_types.PbSportIdentifier.verify(m.sportId);
                        if (e)
                            return "sportId." + e;
                    }
                }
                if (m.volumeTarget != null && m.hasOwnProperty("volumeTarget")) {
                    {
                        var e = $root.polar_types.PbVolumeTarget.verify(m.volumeTarget);
                        if (e)
                            return "volumeTarget." + e;
                    }
                }
                if (m.phases != null && m.hasOwnProperty("phases")) {
                    {
                        var e = $root.polar_data.PbPhases.verify(m.phases);
                        if (e)
                            return "phases." + e;
                    }
                }
                if (m.route != null && m.hasOwnProperty("route")) {
                    {
                        var e = $root.polar_types.PbRouteId.verify(m.route);
                        if (e)
                            return "route." + e;
                    }
                }
                if (m.steadyRacePace != null && m.hasOwnProperty("steadyRacePace")) {
                    {
                        var e = $root.polar_data.PbSteadyRacePace.verify(m.steadyRacePace);
                        if (e)
                            return "steadyRacePace." + e;
                    }
                }
                if (m.steadyRacePaceResult != null && m.hasOwnProperty("steadyRacePaceResult")) {
                    {
                        var e = $root.polar_data.PbSteadyRacePaceResult.verify(m.steadyRacePaceResult);
                        if (e)
                            return "steadyRacePaceResult." + e;
                    }
                }
                if (m.stravaSegmentTarget != null && m.hasOwnProperty("stravaSegmentTarget")) {
                    {
                        var e = $root.polar_types.PbStravaSegmentTarget.verify(m.stravaSegmentTarget);
                        if (e)
                            return "stravaSegmentTarget." + e;
                    }
                }
                return null;
            };
    
            return PbExerciseTargetInfo;
        })();
    
        polar_data.PbSteadyRacePace = (function() {
    
            function PbSteadyRacePace(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSteadyRacePace.prototype.duration = null;
            PbSteadyRacePace.prototype.distance = 0;
    
            PbSteadyRacePace.create = function create(properties) {
                return new PbSteadyRacePace(properties);
            };
    
            PbSteadyRacePace.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDuration.encode(m.duration, w.uint32(10).fork()).ldelim();
                w.uint32(21).float(m.distance);
                return w;
            };
    
            PbSteadyRacePace.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.duration);
                    if (e)
                        return "duration." + e;
                }
                if (typeof m.distance !== "number")
                    return "distance: number expected";
                return null;
            };
    
            return PbSteadyRacePace;
        })();
    
        polar_data.PbExerciseTarget = (function() {
    
            function PbExerciseTarget(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbExerciseTarget.prototype.targetType = 0;
            PbExerciseTarget.prototype.sportId = null;
            PbExerciseTarget.prototype.volumeTarget = null;
            PbExerciseTarget.prototype.phases = null;
            PbExerciseTarget.prototype.route = null;
            PbExerciseTarget.prototype.steadyRacePace = null;
            PbExerciseTarget.prototype.stravaSegmentTarget = null;
    
            PbExerciseTarget.create = function create(properties) {
                return new PbExerciseTarget(properties);
            };
    
            PbExerciseTarget.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.targetType);
                if (m.sportId != null && m.hasOwnProperty("sportId"))
                    $root.polar_types.PbSportIdentifier.encode(m.sportId, w.uint32(18).fork()).ldelim();
                if (m.volumeTarget != null && m.hasOwnProperty("volumeTarget"))
                    $root.polar_types.PbVolumeTarget.encode(m.volumeTarget, w.uint32(26).fork()).ldelim();
                if (m.phases != null && m.hasOwnProperty("phases"))
                    $root.polar_data.PbPhases.encode(m.phases, w.uint32(34).fork()).ldelim();
                if (m.route != null && m.hasOwnProperty("route"))
                    $root.polar_types.PbRouteId.encode(m.route, w.uint32(42).fork()).ldelim();
                if (m.steadyRacePace != null && m.hasOwnProperty("steadyRacePace"))
                    $root.polar_data.PbSteadyRacePace.encode(m.steadyRacePace, w.uint32(50).fork()).ldelim();
                if (m.stravaSegmentTarget != null && m.hasOwnProperty("stravaSegmentTarget"))
                    $root.polar_types.PbStravaSegmentTarget.encode(m.stravaSegmentTarget, w.uint32(58).fork()).ldelim();
                return w;
            };
    
            PbExerciseTarget.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.targetType) {
                default:
                    return "targetType: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                    break;
                }
                if (m.sportId != null && m.hasOwnProperty("sportId")) {
                    {
                        var e = $root.polar_types.PbSportIdentifier.verify(m.sportId);
                        if (e)
                            return "sportId." + e;
                    }
                }
                if (m.volumeTarget != null && m.hasOwnProperty("volumeTarget")) {
                    {
                        var e = $root.polar_types.PbVolumeTarget.verify(m.volumeTarget);
                        if (e)
                            return "volumeTarget." + e;
                    }
                }
                if (m.phases != null && m.hasOwnProperty("phases")) {
                    {
                        var e = $root.polar_data.PbPhases.verify(m.phases);
                        if (e)
                            return "phases." + e;
                    }
                }
                if (m.route != null && m.hasOwnProperty("route")) {
                    {
                        var e = $root.polar_types.PbRouteId.verify(m.route);
                        if (e)
                            return "route." + e;
                    }
                }
                if (m.steadyRacePace != null && m.hasOwnProperty("steadyRacePace")) {
                    {
                        var e = $root.polar_data.PbSteadyRacePace.verify(m.steadyRacePace);
                        if (e)
                            return "steadyRacePace." + e;
                    }
                }
                if (m.stravaSegmentTarget != null && m.hasOwnProperty("stravaSegmentTarget")) {
                    {
                        var e = $root.polar_types.PbStravaSegmentTarget.verify(m.stravaSegmentTarget);
                        if (e)
                            return "stravaSegmentTarget." + e;
                    }
                }
                return null;
            };
    
            return PbExerciseTarget;
        })();
    
        polar_data.PbTrainingSessionTarget = (function() {
    
            function PbTrainingSessionTarget(p) {
                this.exerciseTarget = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTrainingSessionTarget.prototype.name = null;
            PbTrainingSessionTarget.prototype.sportId = null;
            PbTrainingSessionTarget.prototype.startTime = null;
            PbTrainingSessionTarget.prototype.description = null;
            PbTrainingSessionTarget.prototype.exerciseTarget = $util.emptyArray;
            PbTrainingSessionTarget.prototype.targetDone = false;
            PbTrainingSessionTarget.prototype.duration = null;
            PbTrainingSessionTarget.prototype.trainingProgramId = null;
            PbTrainingSessionTarget.prototype.eventId = null;
    
            PbTrainingSessionTarget.create = function create(properties) {
                return new PbTrainingSessionTarget(properties);
            };
    
            PbTrainingSessionTarget.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbOneLineText.encode(m.name, w.uint32(18).fork()).ldelim();
                if (m.sportId != null && m.hasOwnProperty("sportId"))
                    $root.polar_types.PbSportIdentifier.encode(m.sportId, w.uint32(26).fork()).ldelim();
                if (m.startTime != null && m.hasOwnProperty("startTime"))
                    $root.polar_types.PbLocalDateTime.encode(m.startTime, w.uint32(34).fork()).ldelim();
                if (m.description != null && m.hasOwnProperty("description"))
                    $root.polar_types.PbMultiLineText.encode(m.description, w.uint32(42).fork()).ldelim();
                if (m.exerciseTarget != null && m.exerciseTarget.length) {
                    for (var i = 0; i < m.exerciseTarget.length; ++i)
                        $root.polar_data.PbExerciseTarget.encode(m.exerciseTarget[i], w.uint32(50).fork()).ldelim();
                }
                if (m.targetDone != null && m.hasOwnProperty("targetDone"))
                    w.uint32(56).bool(m.targetDone);
                if (m.duration != null && m.hasOwnProperty("duration"))
                    $root.polar_types.PbDuration.encode(m.duration, w.uint32(66).fork()).ldelim();
                if (m.trainingProgramId != null && m.hasOwnProperty("trainingProgramId"))
                    $root.polar_types.PbTrainingProgramId.encode(m.trainingProgramId, w.uint32(74).fork()).ldelim();
                if (m.eventId != null && m.hasOwnProperty("eventId"))
                    $root.polar_types.PbEventId.encode(m.eventId, w.uint32(82).fork()).ldelim();
                return w;
            };
    
            PbTrainingSessionTarget.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbOneLineText.verify(m.name);
                    if (e)
                        return "name." + e;
                }
                if (m.sportId != null && m.hasOwnProperty("sportId")) {
                    {
                        var e = $root.polar_types.PbSportIdentifier.verify(m.sportId);
                        if (e)
                            return "sportId." + e;
                    }
                }
                if (m.startTime != null && m.hasOwnProperty("startTime")) {
                    {
                        var e = $root.polar_types.PbLocalDateTime.verify(m.startTime);
                        if (e)
                            return "startTime." + e;
                    }
                }
                if (m.description != null && m.hasOwnProperty("description")) {
                    {
                        var e = $root.polar_types.PbMultiLineText.verify(m.description);
                        if (e)
                            return "description." + e;
                    }
                }
                if (m.exerciseTarget != null && m.hasOwnProperty("exerciseTarget")) {
                    if (!Array.isArray(m.exerciseTarget))
                        return "exerciseTarget: array expected";
                    for (var i = 0; i < m.exerciseTarget.length; ++i) {
                        {
                            var e = $root.polar_data.PbExerciseTarget.verify(m.exerciseTarget[i]);
                            if (e)
                                return "exerciseTarget." + e;
                        }
                    }
                }
                if (m.targetDone != null && m.hasOwnProperty("targetDone")) {
                    if (typeof m.targetDone !== "boolean")
                        return "targetDone: boolean expected";
                }
                if (m.duration != null && m.hasOwnProperty("duration")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.duration);
                        if (e)
                            return "duration." + e;
                    }
                }
                if (m.trainingProgramId != null && m.hasOwnProperty("trainingProgramId")) {
                    {
                        var e = $root.polar_types.PbTrainingProgramId.verify(m.trainingProgramId);
                        if (e)
                            return "trainingProgramId." + e;
                    }
                }
                if (m.eventId != null && m.hasOwnProperty("eventId")) {
                    {
                        var e = $root.polar_types.PbEventId.verify(m.eventId);
                        if (e)
                            return "eventId." + e;
                    }
                }
                return null;
            };
    
            return PbTrainingSessionTarget;
        })();
    
        polar_data.PbRecordedHeartRateZone = (function() {
    
            function PbRecordedHeartRateZone(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRecordedHeartRateZone.prototype.zoneLimits = null;
            PbRecordedHeartRateZone.prototype.inZone = null;
    
            PbRecordedHeartRateZone.create = function create(properties) {
                return new PbRecordedHeartRateZone(properties);
            };
    
            PbRecordedHeartRateZone.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbHeartRateZone.encode(m.zoneLimits, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.inZone, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbRecordedHeartRateZone.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbHeartRateZone.verify(m.zoneLimits);
                    if (e)
                        return "zoneLimits." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.inZone);
                    if (e)
                        return "inZone." + e;
                }
                return null;
            };
    
            return PbRecordedHeartRateZone;
        })();
    
        polar_data.PbRecordedPowerZone = (function() {
    
            function PbRecordedPowerZone(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRecordedPowerZone.prototype.zoneLimits = null;
            PbRecordedPowerZone.prototype.inZone = null;
    
            PbRecordedPowerZone.create = function create(properties) {
                return new PbRecordedPowerZone(properties);
            };
    
            PbRecordedPowerZone.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbPowerZone.encode(m.zoneLimits, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.inZone, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbRecordedPowerZone.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbPowerZone.verify(m.zoneLimits);
                    if (e)
                        return "zoneLimits." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.inZone);
                    if (e)
                        return "inZone." + e;
                }
                return null;
            };
    
            return PbRecordedPowerZone;
        })();
    
        polar_data.PbRecordedFatFitZones = (function() {
    
            function PbRecordedFatFitZones(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRecordedFatFitZones.prototype.fatfitLimit = 0;
            PbRecordedFatFitZones.prototype.fatTime = null;
            PbRecordedFatFitZones.prototype.fitTime = null;
    
            PbRecordedFatFitZones.create = function create(properties) {
                return new PbRecordedFatFitZones(properties);
            };
    
            PbRecordedFatFitZones.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.fatfitLimit);
                $root.polar_types.PbDuration.encode(m.fatTime, w.uint32(18).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.fitTime, w.uint32(26).fork()).ldelim();
                return w;
            };
    
            PbRecordedFatFitZones.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.fatfitLimit))
                    return "fatfitLimit: integer expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.fatTime);
                    if (e)
                        return "fatTime." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.fitTime);
                    if (e)
                        return "fitTime." + e;
                }
                return null;
            };
    
            return PbRecordedFatFitZones;
        })();
    
        polar_data.PbRecordedSpeedZone = (function() {
    
            function PbRecordedSpeedZone(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRecordedSpeedZone.prototype.zoneLimits = null;
            PbRecordedSpeedZone.prototype.timeInZone = null;
            PbRecordedSpeedZone.prototype.distanceInZone = 0;
    
            PbRecordedSpeedZone.create = function create(properties) {
                return new PbRecordedSpeedZone(properties);
            };
    
            PbRecordedSpeedZone.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbSpeedZone.encode(m.zoneLimits, w.uint32(10).fork()).ldelim();
                if (m.timeInZone != null && m.hasOwnProperty("timeInZone"))
                    $root.polar_types.PbDuration.encode(m.timeInZone, w.uint32(18).fork()).ldelim();
                if (m.distanceInZone != null && m.hasOwnProperty("distanceInZone"))
                    w.uint32(29).float(m.distanceInZone);
                return w;
            };
    
            PbRecordedSpeedZone.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbSpeedZone.verify(m.zoneLimits);
                    if (e)
                        return "zoneLimits." + e;
                }
                if (m.timeInZone != null && m.hasOwnProperty("timeInZone")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.timeInZone);
                        if (e)
                            return "timeInZone." + e;
                    }
                }
                if (m.distanceInZone != null && m.hasOwnProperty("distanceInZone")) {
                    if (typeof m.distanceInZone !== "number")
                        return "distanceInZone: number expected";
                }
                return null;
            };
    
            return PbRecordedSpeedZone;
        })();
    
        polar_data.PbRecordedZones = (function() {
    
            function PbRecordedZones(p) {
                this.heartRateZone = [];
                this.powerZone = [];
                this.speedZone = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRecordedZones.prototype.heartRateZone = $util.emptyArray;
            PbRecordedZones.prototype.powerZone = $util.emptyArray;
            PbRecordedZones.prototype.fatfitZones = null;
            PbRecordedZones.prototype.speedZone = $util.emptyArray;
            PbRecordedZones.prototype.heartRateSettingSource = 0;
            PbRecordedZones.prototype.powerSettingSource = 0;
            PbRecordedZones.prototype.speedSettingSource = 0;
    
            PbRecordedZones.create = function create(properties) {
                return new PbRecordedZones(properties);
            };
    
            PbRecordedZones.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.heartRateZone != null && m.heartRateZone.length) {
                    for (var i = 0; i < m.heartRateZone.length; ++i)
                        $root.polar_data.PbRecordedHeartRateZone.encode(m.heartRateZone[i], w.uint32(10).fork()).ldelim();
                }
                if (m.powerZone != null && m.powerZone.length) {
                    for (var i = 0; i < m.powerZone.length; ++i)
                        $root.polar_data.PbRecordedPowerZone.encode(m.powerZone[i], w.uint32(18).fork()).ldelim();
                }
                if (m.fatfitZones != null && m.hasOwnProperty("fatfitZones"))
                    $root.polar_data.PbRecordedFatFitZones.encode(m.fatfitZones, w.uint32(26).fork()).ldelim();
                if (m.speedZone != null && m.speedZone.length) {
                    for (var i = 0; i < m.speedZone.length; ++i)
                        $root.polar_data.PbRecordedSpeedZone.encode(m.speedZone[i], w.uint32(34).fork()).ldelim();
                }
                if (m.heartRateSettingSource != null && m.hasOwnProperty("heartRateSettingSource"))
                    w.uint32(80).int32(m.heartRateSettingSource);
                if (m.powerSettingSource != null && m.hasOwnProperty("powerSettingSource"))
                    w.uint32(88).int32(m.powerSettingSource);
                if (m.speedSettingSource != null && m.hasOwnProperty("speedSettingSource"))
                    w.uint32(96).int32(m.speedSettingSource);
                return w;
            };
    
            PbRecordedZones.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.heartRateZone != null && m.hasOwnProperty("heartRateZone")) {
                    if (!Array.isArray(m.heartRateZone))
                        return "heartRateZone: array expected";
                    for (var i = 0; i < m.heartRateZone.length; ++i) {
                        {
                            var e = $root.polar_data.PbRecordedHeartRateZone.verify(m.heartRateZone[i]);
                            if (e)
                                return "heartRateZone." + e;
                        }
                    }
                }
                if (m.powerZone != null && m.hasOwnProperty("powerZone")) {
                    if (!Array.isArray(m.powerZone))
                        return "powerZone: array expected";
                    for (var i = 0; i < m.powerZone.length; ++i) {
                        {
                            var e = $root.polar_data.PbRecordedPowerZone.verify(m.powerZone[i]);
                            if (e)
                                return "powerZone." + e;
                        }
                    }
                }
                if (m.fatfitZones != null && m.hasOwnProperty("fatfitZones")) {
                    {
                        var e = $root.polar_data.PbRecordedFatFitZones.verify(m.fatfitZones);
                        if (e)
                            return "fatfitZones." + e;
                    }
                }
                if (m.speedZone != null && m.hasOwnProperty("speedZone")) {
                    if (!Array.isArray(m.speedZone))
                        return "speedZone: array expected";
                    for (var i = 0; i < m.speedZone.length; ++i) {
                        {
                            var e = $root.polar_data.PbRecordedSpeedZone.verify(m.speedZone[i]);
                            if (e)
                                return "speedZone." + e;
                        }
                    }
                }
                if (m.heartRateSettingSource != null && m.hasOwnProperty("heartRateSettingSource")) {
                    switch (m.heartRateSettingSource) {
                    default:
                        return "heartRateSettingSource: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.powerSettingSource != null && m.hasOwnProperty("powerSettingSource")) {
                    switch (m.powerSettingSource) {
                    default:
                        return "powerSettingSource: enum value expected";
                    case 0:
                    case 1:
                        break;
                    }
                }
                if (m.speedSettingSource != null && m.hasOwnProperty("speedSettingSource")) {
                    switch (m.speedSettingSource) {
                    default:
                        return "speedSettingSource: enum value expected";
                    case 0:
                    case 1:
                        break;
                    }
                }
                return null;
            };
    
            return PbRecordedZones;
        })();
    
        polar_data.PbFitnessTestResult = (function() {
    
            function PbFitnessTestResult(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbFitnessTestResult.prototype.startTime = null;
            PbFitnessTestResult.prototype.fitness = 0;
            PbFitnessTestResult.prototype.unknonw = 0;
            PbFitnessTestResult.prototype.hrAvg = 0;
    
            PbFitnessTestResult.create = function create(properties) {
                return new PbFitnessTestResult(properties);
            };
    
            PbFitnessTestResult.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLocalDateTime.encode(m.startTime, w.uint32(10).fork()).ldelim();
                w.uint32(16).uint32(m.fitness);
                w.uint32(24).uint32(m.unknonw);
                w.uint32(32).uint32(m.hrAvg);
                return w;
            };
    
            PbFitnessTestResult.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.startTime);
                    if (e)
                        return "startTime." + e;
                }
                if (!$util.isInteger(m.fitness))
                    return "fitness: integer expected";
                if (!$util.isInteger(m.unknonw))
                    return "unknonw: integer expected";
                if (!$util.isInteger(m.hrAvg))
                    return "hrAvg: integer expected";
                return null;
            };
    
            return PbFitnessTestResult;
        })();
    
        polar_data.PbGPSAlmanacInfo = (function() {
    
            function PbGPSAlmanacInfo(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbGPSAlmanacInfo.prototype.endTime = null;
    
            PbGPSAlmanacInfo.create = function create(properties) {
                return new PbGPSAlmanacInfo(properties);
            };
    
            PbGPSAlmanacInfo.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbSystemDateTime.encode(m.endTime, w.uint32(10).fork()).ldelim();
                return w;
            };
    
            PbGPSAlmanacInfo.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.endTime);
                    if (e)
                        return "endTime." + e;
                }
                return null;
            };
    
            return PbGPSAlmanacInfo;
        })();
    
        polar_data.PbIdentifier = (function() {
    
            function PbIdentifier(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbIdentifier.prototype.ecosystemId = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
            PbIdentifier.prototype.created = null;
            PbIdentifier.prototype.lastModified = null;
            PbIdentifier.prototype.deleted = false;
    
            PbIdentifier.create = function create(properties) {
                return new PbIdentifier(properties);
            };
    
            PbIdentifier.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.ecosystemId);
                $root.polar_types.PbSystemDateTime.encode(m.created, w.uint32(18).fork()).ldelim();
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(26).fork()).ldelim();
                if (m.deleted != null && m.hasOwnProperty("deleted"))
                    w.uint32(32).bool(m.deleted);
                return w;
            };
    
            PbIdentifier.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.ecosystemId) && !(m.ecosystemId && $util.isInteger(m.ecosystemId.low) && $util.isInteger(m.ecosystemId.high)))
                    return "ecosystemId: integer|Long expected";
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.created);
                    if (e)
                        return "created." + e;
                }
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                if (m.deleted != null && m.hasOwnProperty("deleted")) {
                    if (typeof m.deleted !== "boolean")
                        return "deleted: boolean expected";
                }
                return null;
            };
    
            return PbIdentifier;
        })();
    
        polar_data.PbJump = (function() {
    
            function PbJump(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbJump.prototype.flightTime = null;
            PbJump.prototype.contactTime = null;
    
            PbJump.create = function create(properties) {
                return new PbJump(properties);
            };
    
            PbJump.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDuration.encode(m.flightTime, w.uint32(10).fork()).ldelim();
                if (m.contactTime != null && m.hasOwnProperty("contactTime"))
                    $root.polar_types.PbDuration.encode(m.contactTime, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbJump.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.flightTime);
                    if (e)
                        return "flightTime." + e;
                }
                if (m.contactTime != null && m.hasOwnProperty("contactTime")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.contactTime);
                        if (e)
                            return "contactTime." + e;
                    }
                }
                return null;
            };
    
            return PbJump;
        })();
    
        polar_data.PbJumpTest = (function() {
    
            function PbJumpTest(p) {
                this.jump = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbJumpTest.prototype.testType = 0;
            PbJumpTest.prototype.startTime = null;
            PbJumpTest.prototype.jump = $util.emptyArray;
            PbJumpTest.prototype.contJumpDuration = null;
    
            PbJumpTest.create = function create(properties) {
                return new PbJumpTest(properties);
            };
    
            PbJumpTest.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.testType);
                $root.polar_types.PbLocalDateTime.encode(m.startTime, w.uint32(18).fork()).ldelim();
                if (m.jump != null && m.jump.length) {
                    for (var i = 0; i < m.jump.length; ++i)
                        $root.polar_data.PbJump.encode(m.jump[i], w.uint32(26).fork()).ldelim();
                }
                if (m.contJumpDuration != null && m.hasOwnProperty("contJumpDuration"))
                    $root.polar_types.PbDuration.encode(m.contJumpDuration, w.uint32(34).fork()).ldelim();
                return w;
            };
    
            PbJumpTest.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.testType) {
                default:
                    return "testType: enum value expected";
                case 0:
                case 1:
                case 2:
                    break;
                }
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.startTime);
                    if (e)
                        return "startTime." + e;
                }
                if (m.jump != null && m.hasOwnProperty("jump")) {
                    if (!Array.isArray(m.jump))
                        return "jump: array expected";
                    for (var i = 0; i < m.jump.length; ++i) {
                        {
                            var e = $root.polar_data.PbJump.verify(m.jump[i]);
                            if (e)
                                return "jump." + e;
                        }
                    }
                }
                if (m.contJumpDuration != null && m.hasOwnProperty("contJumpDuration")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.contJumpDuration);
                        if (e)
                            return "contJumpDuration." + e;
                    }
                }
                return null;
            };
    
            PbJumpTest.PbJumpTestType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "JUMP_TEST_TYPE_SQUAT"] = 0;
                values[valuesById[1] = "JUMP_TEST_TYPE_COUNTER"] = 1;
                values[valuesById[2] = "JUMP_TEST_TYPE_CONTINUOUS"] = 2;
                return values;
            })();
    
            return PbJumpTest;
        })();
    
        polar_data.PbMapLocation = (function() {
    
            function PbMapLocation(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbMapLocation.prototype.latitude = 0;
            PbMapLocation.prototype.longitude = 0;
    
            PbMapLocation.create = function create(properties) {
                return new PbMapLocation(properties);
            };
    
            PbMapLocation.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(9).double(m.latitude);
                w.uint32(17).double(m.longitude);
                return w;
            };
    
            PbMapLocation.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.latitude !== "number")
                    return "latitude: number expected";
                if (typeof m.longitude !== "number")
                    return "longitude: number expected";
                return null;
            };
    
            return PbMapLocation;
        })();
    
        polar_data.PbMapInformation = (function() {
    
            function PbMapInformation(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbMapInformation.prototype.centrePoint = null;
            PbMapInformation.prototype.dataTimestamp = null;
            PbMapInformation.prototype.updated = false;
    
            PbMapInformation.create = function create(properties) {
                return new PbMapInformation(properties);
            };
    
            PbMapInformation.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_data.PbMapLocation.encode(m.centrePoint, w.uint32(10).fork()).ldelim();
                if (m.dataTimestamp != null && m.hasOwnProperty("dataTimestamp"))
                    $root.polar_types.PbSystemDateTime.encode(m.dataTimestamp, w.uint32(18).fork()).ldelim();
                if (m.updated != null && m.hasOwnProperty("updated"))
                    w.uint32(24).bool(m.updated);
                return w;
            };
    
            PbMapInformation.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_data.PbMapLocation.verify(m.centrePoint);
                    if (e)
                        return "centrePoint." + e;
                }
                if (m.dataTimestamp != null && m.hasOwnProperty("dataTimestamp")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.dataTimestamp);
                        if (e)
                            return "dataTimestamp." + e;
                    }
                }
                if (m.updated != null && m.hasOwnProperty("updated")) {
                    if (typeof m.updated !== "boolean")
                        return "updated: boolean expected";
                }
                return null;
            };
    
            return PbMapInformation;
        })();
    
        polar_data.NanoPBOptions = (function() {
    
            function NanoPBOptions(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            NanoPBOptions.prototype.maxSize = 0;
            NanoPBOptions.prototype.maxCount = 0;
    
            NanoPBOptions.create = function create(properties) {
                return new NanoPBOptions(properties);
            };
    
            NanoPBOptions.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.maxSize != null && m.hasOwnProperty("maxSize"))
                    w.uint32(8).int32(m.maxSize);
                if (m.maxCount != null && m.hasOwnProperty("maxCount"))
                    w.uint32(16).int32(m.maxCount);
                return w;
            };
    
            NanoPBOptions.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.maxSize != null && m.hasOwnProperty("maxSize")) {
                    if (!$util.isInteger(m.maxSize))
                        return "maxSize: integer expected";
                }
                if (m.maxCount != null && m.hasOwnProperty("maxCount")) {
                    if (!$util.isInteger(m.maxCount))
                        return "maxCount: integer expected";
                }
                return null;
            };
    
            return NanoPBOptions;
        })();
    
        polar_data.PbOrthostaticTestResult = (function() {
    
            function PbOrthostaticTestResult(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbOrthostaticTestResult.prototype.startTime = null;
            PbOrthostaticTestResult.prototype.resetTime = null;
            PbOrthostaticTestResult.prototype.rrAvgSupine = 0;
            PbOrthostaticTestResult.prototype.rrLongTermAvgOfSupine = 0;
            PbOrthostaticTestResult.prototype.rrMinAfterStandup = 0;
            PbOrthostaticTestResult.prototype.rrLongTermAvgOfMinAfterStandup = 0;
            PbOrthostaticTestResult.prototype.rrAvgStand = 0;
            PbOrthostaticTestResult.prototype.rrLongTermAvgOfStand = 0;
    
            PbOrthostaticTestResult.create = function create(properties) {
                return new PbOrthostaticTestResult(properties);
            };
    
            PbOrthostaticTestResult.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLocalDateTime.encode(m.startTime, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbLocalDateTime.encode(m.resetTime, w.uint32(18).fork()).ldelim();
                w.uint32(24).uint32(m.rrAvgSupine);
                w.uint32(32).uint32(m.rrLongTermAvgOfSupine);
                w.uint32(40).uint32(m.rrMinAfterStandup);
                w.uint32(48).uint32(m.rrLongTermAvgOfMinAfterStandup);
                w.uint32(56).uint32(m.rrAvgStand);
                w.uint32(64).uint32(m.rrLongTermAvgOfStand);
                return w;
            };
    
            PbOrthostaticTestResult.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.startTime);
                    if (e)
                        return "startTime." + e;
                }
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.resetTime);
                    if (e)
                        return "resetTime." + e;
                }
                if (!$util.isInteger(m.rrAvgSupine))
                    return "rrAvgSupine: integer expected";
                if (!$util.isInteger(m.rrLongTermAvgOfSupine))
                    return "rrLongTermAvgOfSupine: integer expected";
                if (!$util.isInteger(m.rrMinAfterStandup))
                    return "rrMinAfterStandup: integer expected";
                if (!$util.isInteger(m.rrLongTermAvgOfMinAfterStandup))
                    return "rrLongTermAvgOfMinAfterStandup: integer expected";
                if (!$util.isInteger(m.rrAvgStand))
                    return "rrAvgStand: integer expected";
                if (!$util.isInteger(m.rrLongTermAvgOfStand))
                    return "rrLongTermAvgOfStand: integer expected";
                return null;
            };
    
            return PbOrthostaticTestResult;
        })();
    
        polar_data.PbPersonalBest = (function() {
    
            function PbPersonalBest(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPersonalBest.prototype.distance = 0;
            PbPersonalBest.prototype.averageSpeed = 0;
            PbPersonalBest.prototype.calories = 0;
            PbPersonalBest.prototype.ascent = 0;
    
            PbPersonalBest.create = function create(properties) {
                return new PbPersonalBest(properties);
            };
    
            PbPersonalBest.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.distance != null && m.hasOwnProperty("distance"))
                    w.uint32(13).float(m.distance);
                if (m.averageSpeed != null && m.hasOwnProperty("averageSpeed"))
                    w.uint32(21).float(m.averageSpeed);
                if (m.calories != null && m.hasOwnProperty("calories"))
                    w.uint32(24).uint32(m.calories);
                if (m.ascent != null && m.hasOwnProperty("ascent"))
                    w.uint32(37).float(m.ascent);
                return w;
            };
    
            PbPersonalBest.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.distance != null && m.hasOwnProperty("distance")) {
                    if (typeof m.distance !== "number")
                        return "distance: number expected";
                }
                if (m.averageSpeed != null && m.hasOwnProperty("averageSpeed")) {
                    if (typeof m.averageSpeed !== "number")
                        return "averageSpeed: number expected";
                }
                if (m.calories != null && m.hasOwnProperty("calories")) {
                    if (!$util.isInteger(m.calories))
                        return "calories: integer expected";
                }
                if (m.ascent != null && m.hasOwnProperty("ascent")) {
                    if (typeof m.ascent !== "number")
                        return "ascent: number expected";
                }
                return null;
            };
    
            return PbPersonalBest;
        })();
    
        polar_data.PbStravaSegmentPort = (function() {
    
            function PbStravaSegmentPort(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbStravaSegmentPort.prototype.leftLocation = null;
            PbStravaSegmentPort.prototype.rightLocation = null;
    
            PbStravaSegmentPort.create = function create(properties) {
                return new PbStravaSegmentPort(properties);
            };
    
            PbStravaSegmentPort.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLocation.encode(m.leftLocation, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbLocation.encode(m.rightLocation, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbStravaSegmentPort.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLocation.verify(m.leftLocation);
                    if (e)
                        return "leftLocation." + e;
                }
                {
                    var e = $root.polar_types.PbLocation.verify(m.rightLocation);
                    if (e)
                        return "rightLocation." + e;
                }
                return null;
            };
    
            return PbStravaSegmentPort;
        })();
    
        polar_data.PbRoutePoint = (function() {
    
            function PbRoutePoint(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRoutePoint.prototype.xOffset = 0;
            PbRoutePoint.prototype.yOffset = 0;
            PbRoutePoint.prototype.timeOffset = 0;
            PbRoutePoint.prototype.zOffset = 0;
    
            PbRoutePoint.create = function create(properties) {
                return new PbRoutePoint(properties);
            };
    
            PbRoutePoint.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).sint32(m.xOffset);
                w.uint32(16).sint32(m.yOffset);
                if (m.timeOffset != null && m.hasOwnProperty("timeOffset"))
                    w.uint32(24).uint32(m.timeOffset);
                if (m.zOffset != null && m.hasOwnProperty("zOffset"))
                    w.uint32(32).sint32(m.zOffset);
                return w;
            };
    
            PbRoutePoint.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.xOffset))
                    return "xOffset: integer expected";
                if (!$util.isInteger(m.yOffset))
                    return "yOffset: integer expected";
                if (m.timeOffset != null && m.hasOwnProperty("timeOffset")) {
                    if (!$util.isInteger(m.timeOffset))
                        return "timeOffset: integer expected";
                }
                if (m.zOffset != null && m.hasOwnProperty("zOffset")) {
                    if (!$util.isInteger(m.zOffset))
                        return "zOffset: integer expected";
                }
                return null;
            };
    
            return PbRoutePoint;
        })();
    
        polar_data.PbPlannedRoute = (function() {
    
            function PbPlannedRoute(p) {
                this.point = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPlannedRoute.prototype.routeId = null;
            PbPlannedRoute.prototype.name = null;
            PbPlannedRoute.prototype.length = 0;
            PbPlannedRoute.prototype.startLocation = null;
            PbPlannedRoute.prototype.startAltitude = 0;
            PbPlannedRoute.prototype.point = $util.emptyArray;
            PbPlannedRoute.prototype.segmentStartPort = null;
            PbPlannedRoute.prototype.segmentEndPort = null;
    
            PbPlannedRoute.create = function create(properties) {
                return new PbPlannedRoute(properties);
            };
    
            PbPlannedRoute.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbRouteId.encode(m.routeId, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbOneLineText.encode(m.name, w.uint32(18).fork()).ldelim();
                if (m.length != null && m.hasOwnProperty("length"))
                    w.uint32(29).float(m.length);
                if (m.startLocation != null && m.hasOwnProperty("startLocation"))
                    $root.polar_types.PbLocation.encode(m.startLocation, w.uint32(34).fork()).ldelim();
                if (m.startAltitude != null && m.hasOwnProperty("startAltitude"))
                    w.uint32(45).float(m.startAltitude);
                if (m.point != null && m.point.length) {
                    for (var i = 0; i < m.point.length; ++i)
                        $root.polar_data.PbRoutePoint.encode(m.point[i], w.uint32(50).fork()).ldelim();
                }
                if (m.segmentStartPort != null && m.hasOwnProperty("segmentStartPort"))
                    $root.polar_data.PbStravaSegmentPort.encode(m.segmentStartPort, w.uint32(58).fork()).ldelim();
                if (m.segmentEndPort != null && m.hasOwnProperty("segmentEndPort"))
                    $root.polar_data.PbStravaSegmentPort.encode(m.segmentEndPort, w.uint32(66).fork()).ldelim();
                return w;
            };
    
            PbPlannedRoute.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbRouteId.verify(m.routeId);
                    if (e)
                        return "routeId." + e;
                }
                {
                    var e = $root.polar_types.PbOneLineText.verify(m.name);
                    if (e)
                        return "name." + e;
                }
                if (m.length != null && m.hasOwnProperty("length")) {
                    if (typeof m.length !== "number")
                        return "length: number expected";
                }
                if (m.startLocation != null && m.hasOwnProperty("startLocation")) {
                    {
                        var e = $root.polar_types.PbLocation.verify(m.startLocation);
                        if (e)
                            return "startLocation." + e;
                    }
                }
                if (m.startAltitude != null && m.hasOwnProperty("startAltitude")) {
                    if (typeof m.startAltitude !== "number")
                        return "startAltitude: number expected";
                }
                if (m.point != null && m.hasOwnProperty("point")) {
                    if (!Array.isArray(m.point))
                        return "point: array expected";
                    for (var i = 0; i < m.point.length; ++i) {
                        {
                            var e = $root.polar_data.PbRoutePoint.verify(m.point[i]);
                            if (e)
                                return "point." + e;
                        }
                    }
                }
                if (m.segmentStartPort != null && m.hasOwnProperty("segmentStartPort")) {
                    {
                        var e = $root.polar_data.PbStravaSegmentPort.verify(m.segmentStartPort);
                        if (e)
                            return "segmentStartPort." + e;
                    }
                }
                if (m.segmentEndPort != null && m.hasOwnProperty("segmentEndPort")) {
                    {
                        var e = $root.polar_data.PbStravaSegmentPort.verify(m.segmentEndPort);
                        if (e)
                            return "segmentEndPort." + e;
                    }
                }
                return null;
            };
    
            return PbPlannedRoute;
        })();
    
        polar_data.PbPointOfInterest = (function() {
    
            function PbPointOfInterest(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPointOfInterest.prototype.location = null;
            PbPointOfInterest.prototype.pointId = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
            PbPointOfInterest.prototype.name = null;
            PbPointOfInterest.prototype.alarm = false;
            PbPointOfInterest.prototype.created = null;
            PbPointOfInterest.prototype.lastModified = null;
    
            PbPointOfInterest.create = function create(properties) {
                return new PbPointOfInterest(properties);
            };
    
            PbPointOfInterest.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLocation.encode(m.location, w.uint32(10).fork()).ldelim();
                if (m.pointId != null && m.hasOwnProperty("pointId"))
                    w.uint32(16).uint64(m.pointId);
                if (m.name != null && m.hasOwnProperty("name"))
                    $root.polar_types.PbMultiLineText.encode(m.name, w.uint32(26).fork()).ldelim();
                if (m.alarm != null && m.hasOwnProperty("alarm"))
                    w.uint32(32).bool(m.alarm);
                if (m.created != null && m.hasOwnProperty("created"))
                    $root.polar_types.PbSystemDateTime.encode(m.created, w.uint32(802).fork()).ldelim();
                if (m.lastModified != null && m.hasOwnProperty("lastModified"))
                    $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(810).fork()).ldelim();
                return w;
            };
    
            PbPointOfInterest.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLocation.verify(m.location);
                    if (e)
                        return "location." + e;
                }
                if (m.pointId != null && m.hasOwnProperty("pointId")) {
                    if (!$util.isInteger(m.pointId) && !(m.pointId && $util.isInteger(m.pointId.low) && $util.isInteger(m.pointId.high)))
                        return "pointId: integer|Long expected";
                }
                if (m.name != null && m.hasOwnProperty("name")) {
                    {
                        var e = $root.polar_types.PbMultiLineText.verify(m.name);
                        if (e)
                            return "name." + e;
                    }
                }
                if (m.alarm != null && m.hasOwnProperty("alarm")) {
                    if (typeof m.alarm !== "boolean")
                        return "alarm: boolean expected";
                }
                if (m.created != null && m.hasOwnProperty("created")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.created);
                        if (e)
                            return "created." + e;
                    }
                }
                if (m.lastModified != null && m.hasOwnProperty("lastModified")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                        if (e)
                            return "lastModified." + e;
                    }
                }
                return null;
            };
    
            return PbPointOfInterest;
        })();
    
        polar_data.PbPointOfInterests = (function() {
    
            function PbPointOfInterests(p) {
                this.point = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPointOfInterests.prototype.point = $util.emptyArray;
    
            PbPointOfInterests.create = function create(properties) {
                return new PbPointOfInterests(properties);
            };
    
            PbPointOfInterests.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.point != null && m.point.length) {
                    for (var i = 0; i < m.point.length; ++i)
                        $root.polar_data.PbPointOfInterest.encode(m.point[i], w.uint32(10).fork()).ldelim();
                }
                return w;
            };
    
            PbPointOfInterests.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.point != null && m.hasOwnProperty("point")) {
                    if (!Array.isArray(m.point))
                        return "point: array expected";
                    for (var i = 0; i < m.point.length; ++i) {
                        {
                            var e = $root.polar_data.PbPointOfInterest.verify(m.point[i]);
                            if (e)
                                return "point." + e;
                        }
                    }
                }
                return null;
            };
    
            return PbPointOfInterests;
        })();
    
        polar_data.PbRecoveryTimes = (function() {
    
            function PbRecoveryTimes(p) {
                this.recoveryTimes = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRecoveryTimes.prototype.startOfTimes = null;
            PbRecoveryTimes.prototype.recoveryTimes = $util.emptyArray;
            PbRecoveryTimes.prototype.endGlycogenLeftPercent = 0;
            PbRecoveryTimes.prototype.endCarboConsumption = 0;
            PbRecoveryTimes.prototype.endProteinConsumption = 0;
            PbRecoveryTimes.prototype.endCumulativeMechanicalStimulus = 0;
            PbRecoveryTimes.prototype.lastHalfHourAvgMet = 0;
            PbRecoveryTimes.prototype.exerciseCalories = 0;
            PbRecoveryTimes.prototype.activityCalories = 0;
            PbRecoveryTimes.prototype.bmrCalories = 0;
            PbRecoveryTimes.prototype.steps = 0;
            PbRecoveryTimes.prototype.accumulatedActivity = 0;
            PbRecoveryTimes.prototype.numberOfExerciseHalfHours = 0;
    
            PbRecoveryTimes.create = function create(properties) {
                return new PbRecoveryTimes(properties);
            };
    
            PbRecoveryTimes.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLocalDateTime.encode(m.startOfTimes, w.uint32(10).fork()).ldelim();
                if (m.recoveryTimes != null && m.recoveryTimes.length) {
                    w.uint32(18).fork();
                    for (var i = 0; i < m.recoveryTimes.length; ++i)
                        w.float(m.recoveryTimes[i]);
                    w.ldelim();
                }
                if (m.endGlycogenLeftPercent != null && m.hasOwnProperty("endGlycogenLeftPercent"))
                    w.uint32(29).float(m.endGlycogenLeftPercent);
                if (m.endCarboConsumption != null && m.hasOwnProperty("endCarboConsumption"))
                    w.uint32(37).float(m.endCarboConsumption);
                if (m.endProteinConsumption != null && m.hasOwnProperty("endProteinConsumption"))
                    w.uint32(45).float(m.endProteinConsumption);
                if (m.endCumulativeMechanicalStimulus != null && m.hasOwnProperty("endCumulativeMechanicalStimulus"))
                    w.uint32(53).float(m.endCumulativeMechanicalStimulus);
                if (m.lastHalfHourAvgMet != null && m.hasOwnProperty("lastHalfHourAvgMet"))
                    w.uint32(61).float(m.lastHalfHourAvgMet);
                if (m.exerciseCalories != null && m.hasOwnProperty("exerciseCalories"))
                    w.uint32(69).float(m.exerciseCalories);
                if (m.activityCalories != null && m.hasOwnProperty("activityCalories"))
                    w.uint32(77).float(m.activityCalories);
                if (m.bmrCalories != null && m.hasOwnProperty("bmrCalories"))
                    w.uint32(85).float(m.bmrCalories);
                if (m.steps != null && m.hasOwnProperty("steps"))
                    w.uint32(88).uint32(m.steps);
                if (m.accumulatedActivity != null && m.hasOwnProperty("accumulatedActivity"))
                    w.uint32(101).float(m.accumulatedActivity);
                if (m.numberOfExerciseHalfHours != null && m.hasOwnProperty("numberOfExerciseHalfHours"))
                    w.uint32(104).uint32(m.numberOfExerciseHalfHours);
                return w;
            };
    
            PbRecoveryTimes.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.startOfTimes);
                    if (e)
                        return "startOfTimes." + e;
                }
                if (m.recoveryTimes != null && m.hasOwnProperty("recoveryTimes")) {
                    if (!Array.isArray(m.recoveryTimes))
                        return "recoveryTimes: array expected";
                    for (var i = 0; i < m.recoveryTimes.length; ++i) {
                        if (typeof m.recoveryTimes[i] !== "number")
                            return "recoveryTimes: number[] expected";
                    }
                }
                if (m.endGlycogenLeftPercent != null && m.hasOwnProperty("endGlycogenLeftPercent")) {
                    if (typeof m.endGlycogenLeftPercent !== "number")
                        return "endGlycogenLeftPercent: number expected";
                }
                if (m.endCarboConsumption != null && m.hasOwnProperty("endCarboConsumption")) {
                    if (typeof m.endCarboConsumption !== "number")
                        return "endCarboConsumption: number expected";
                }
                if (m.endProteinConsumption != null && m.hasOwnProperty("endProteinConsumption")) {
                    if (typeof m.endProteinConsumption !== "number")
                        return "endProteinConsumption: number expected";
                }
                if (m.endCumulativeMechanicalStimulus != null && m.hasOwnProperty("endCumulativeMechanicalStimulus")) {
                    if (typeof m.endCumulativeMechanicalStimulus !== "number")
                        return "endCumulativeMechanicalStimulus: number expected";
                }
                if (m.lastHalfHourAvgMet != null && m.hasOwnProperty("lastHalfHourAvgMet")) {
                    if (typeof m.lastHalfHourAvgMet !== "number")
                        return "lastHalfHourAvgMet: number expected";
                }
                if (m.exerciseCalories != null && m.hasOwnProperty("exerciseCalories")) {
                    if (typeof m.exerciseCalories !== "number")
                        return "exerciseCalories: number expected";
                }
                if (m.activityCalories != null && m.hasOwnProperty("activityCalories")) {
                    if (typeof m.activityCalories !== "number")
                        return "activityCalories: number expected";
                }
                if (m.bmrCalories != null && m.hasOwnProperty("bmrCalories")) {
                    if (typeof m.bmrCalories !== "number")
                        return "bmrCalories: number expected";
                }
                if (m.steps != null && m.hasOwnProperty("steps")) {
                    if (!$util.isInteger(m.steps))
                        return "steps: integer expected";
                }
                if (m.accumulatedActivity != null && m.hasOwnProperty("accumulatedActivity")) {
                    if (typeof m.accumulatedActivity !== "number")
                        return "accumulatedActivity: number expected";
                }
                if (m.numberOfExerciseHalfHours != null && m.hasOwnProperty("numberOfExerciseHalfHours")) {
                    if (!$util.isInteger(m.numberOfExerciseHalfHours))
                        return "numberOfExerciseHalfHours: integer expected";
                }
                return null;
            };
    
            return PbRecoveryTimes;
        })();
    
        polar_data.PbRRRecordingTestResult = (function() {
    
            function PbRRRecordingTestResult(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRRRecordingTestResult.prototype.startTime = null;
            PbRRRecordingTestResult.prototype.endTime = null;
            PbRRRecordingTestResult.prototype.hrAvg = 0;
            PbRRRecordingTestResult.prototype.hrMin = 0;
            PbRRRecordingTestResult.prototype.hrMax = 0;
    
            PbRRRecordingTestResult.create = function create(properties) {
                return new PbRRRecordingTestResult(properties);
            };
    
            PbRRRecordingTestResult.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLocalDateTime.encode(m.startTime, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbLocalDateTime.encode(m.endTime, w.uint32(18).fork()).ldelim();
                w.uint32(24).uint32(m.hrAvg);
                w.uint32(32).uint32(m.hrMin);
                w.uint32(40).uint32(m.hrMax);
                return w;
            };
    
            PbRRRecordingTestResult.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.startTime);
                    if (e)
                        return "startTime." + e;
                }
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.endTime);
                    if (e)
                        return "endTime." + e;
                }
                if (!$util.isInteger(m.hrAvg))
                    return "hrAvg: integer expected";
                if (!$util.isInteger(m.hrMin))
                    return "hrMin: integer expected";
                if (!$util.isInteger(m.hrMax))
                    return "hrMax: integer expected";
                return null;
            };
    
            return PbRRRecordingTestResult;
        })();
    
        polar_data.PbSportTranslation = (function() {
    
            function PbSportTranslation(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSportTranslation.prototype.id = null;
            PbSportTranslation.prototype.text = null;
    
            PbSportTranslation.create = function create(properties) {
                return new PbSportTranslation(properties);
            };
    
            PbSportTranslation.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLanguageId.encode(m.id, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbOneLineText.encode(m.text, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbSportTranslation.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLanguageId.verify(m.id);
                    if (e)
                        return "id." + e;
                }
                {
                    var e = $root.polar_types.PbOneLineText.verify(m.text);
                    if (e)
                        return "text." + e;
                }
                return null;
            };
    
            return PbSportTranslation;
        })();
    
        polar_data.PbSport = (function() {
    
            function PbSport(p) {
                this.translation = [];
                this.stages = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSport.prototype.identifier = null;
            PbSport.prototype.parentIdentifier = null;
            PbSport.prototype.translation = $util.emptyArray;
            PbSport.prototype.factor = 0;
            PbSport.prototype.stages = $util.emptyArray;
            PbSport.prototype.sportType = 1;
            PbSport.prototype.speedZonesEnabled = false;
            PbSport.prototype.created = null;
            PbSport.prototype.lastModified = null;
    
            PbSport.create = function create(properties) {
                return new PbSport(properties);
            };
    
            PbSport.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbSportIdentifier.encode(m.identifier, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbSportIdentifier.encode(m.parentIdentifier, w.uint32(18).fork()).ldelim();
                if (m.translation != null && m.translation.length) {
                    for (var i = 0; i < m.translation.length; ++i)
                        $root.polar_data.PbSportTranslation.encode(m.translation[i], w.uint32(26).fork()).ldelim();
                }
                if (m.factor != null && m.hasOwnProperty("factor"))
                    w.uint32(37).float(m.factor);
                if (m.stages != null && m.stages.length) {
                    for (var i = 0; i < m.stages.length; ++i)
                        $root.polar_types.PbSportIdentifier.encode(m.stages[i], w.uint32(42).fork()).ldelim();
                }
                if (m.sportType != null && m.hasOwnProperty("sportType"))
                    w.uint32(48).int32(m.sportType);
                if (m.speedZonesEnabled != null && m.hasOwnProperty("speedZonesEnabled"))
                    w.uint32(56).bool(m.speedZonesEnabled);
                if (m.created != null && m.hasOwnProperty("created"))
                    $root.polar_types.PbSystemDateTime.encode(m.created, w.uint32(802).fork()).ldelim();
                if (m.lastModified != null && m.hasOwnProperty("lastModified"))
                    $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(810).fork()).ldelim();
                return w;
            };
    
            PbSport.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbSportIdentifier.verify(m.identifier);
                    if (e)
                        return "identifier." + e;
                }
                {
                    var e = $root.polar_types.PbSportIdentifier.verify(m.parentIdentifier);
                    if (e)
                        return "parentIdentifier." + e;
                }
                if (m.translation != null && m.hasOwnProperty("translation")) {
                    if (!Array.isArray(m.translation))
                        return "translation: array expected";
                    for (var i = 0; i < m.translation.length; ++i) {
                        {
                            var e = $root.polar_data.PbSportTranslation.verify(m.translation[i]);
                            if (e)
                                return "translation." + e;
                        }
                    }
                }
                if (m.factor != null && m.hasOwnProperty("factor")) {
                    if (typeof m.factor !== "number")
                        return "factor: number expected";
                }
                if (m.stages != null && m.hasOwnProperty("stages")) {
                    if (!Array.isArray(m.stages))
                        return "stages: array expected";
                    for (var i = 0; i < m.stages.length; ++i) {
                        {
                            var e = $root.polar_types.PbSportIdentifier.verify(m.stages[i]);
                            if (e)
                                return "stages." + e;
                        }
                    }
                }
                if (m.sportType != null && m.hasOwnProperty("sportType")) {
                    switch (m.sportType) {
                    default:
                        return "sportType: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                if (m.speedZonesEnabled != null && m.hasOwnProperty("speedZonesEnabled")) {
                    if (typeof m.speedZonesEnabled !== "boolean")
                        return "speedZonesEnabled: boolean expected";
                }
                if (m.created != null && m.hasOwnProperty("created")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.created);
                        if (e)
                            return "created." + e;
                    }
                }
                if (m.lastModified != null && m.hasOwnProperty("lastModified")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                        if (e)
                            return "lastModified." + e;
                    }
                }
                return null;
            };
    
            PbSport.PbSportType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "SPORT_TYPE_SINGLE_SPORT"] = 1;
                values[valuesById[2] = "SPORT_TYPE_MULTI_SPORT"] = 2;
                values[valuesById[3] = "SPORT_TYPE_SUB_SPORT"] = 3;
                values[valuesById[4] = "SPORT_TYPE_FREE_MULTI_SPORT"] = 4;
                return values;
            })();
    
            return PbSport;
        })();
    
        polar_data.PbAceSportProfileSettings = (function() {
    
            function PbAceSportProfileSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbAceSportProfileSettings.prototype.heartTouch = 1;
            PbAceSportProfileSettings.prototype.autoStart = false;
            PbAceSportProfileSettings.prototype.strideSensorCalibSettings = null;
    
            PbAceSportProfileSettings.create = function create(properties) {
                return new PbAceSportProfileSettings(properties);
            };
    
            PbAceSportProfileSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.heartTouch != null && m.hasOwnProperty("heartTouch"))
                    w.uint32(8).int32(m.heartTouch);
                if (m.autoStart != null && m.hasOwnProperty("autoStart"))
                    w.uint32(32).bool(m.autoStart);
                if (m.strideSensorCalibSettings != null && m.hasOwnProperty("strideSensorCalibSettings"))
                    $root.polar_types.PbStrideSensorCalibSettings.encode(m.strideSensorCalibSettings, w.uint32(50).fork()).ldelim();
                return w;
            };
    
            PbAceSportProfileSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.heartTouch != null && m.hasOwnProperty("heartTouch")) {
                    switch (m.heartTouch) {
                    default:
                        return "heartTouch: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                if (m.autoStart != null && m.hasOwnProperty("autoStart")) {
                    if (typeof m.autoStart !== "boolean")
                        return "autoStart: boolean expected";
                }
                if (m.strideSensorCalibSettings != null && m.hasOwnProperty("strideSensorCalibSettings")) {
                    {
                        var e = $root.polar_types.PbStrideSensorCalibSettings.verify(m.strideSensorCalibSettings);
                        if (e)
                            return "strideSensorCalibSettings." + e;
                    }
                }
                return null;
            };
    
            PbAceSportProfileSettings.PbHeartTouch = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "HEART_TOUCH_OFF"] = 1;
                values[valuesById[2] = "HEART_TOUCH_ACTIVATE_BACKLIGHT"] = 2;
                values[valuesById[3] = "HEART_TOUCH_SHOW_PREVIOUS_LAP"] = 3;
                values[valuesById[4] = "HEART_TOUCH_SHOW_TIME_OF_DAY"] = 4;
                return values;
            })();
    
            return PbAceSportProfileSettings;
        })();
    
        polar_data.PbArcherSportProfileSettings = (function() {
    
            function PbArcherSportProfileSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbArcherSportProfileSettings.prototype.heartTouch = 1;
            PbArcherSportProfileSettings.prototype.autoStart = false;
    
            PbArcherSportProfileSettings.create = function create(properties) {
                return new PbArcherSportProfileSettings(properties);
            };
    
            PbArcherSportProfileSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.heartTouch != null && m.hasOwnProperty("heartTouch"))
                    w.uint32(8).int32(m.heartTouch);
                if (m.autoStart != null && m.hasOwnProperty("autoStart"))
                    w.uint32(32).bool(m.autoStart);
                return w;
            };
    
            PbArcherSportProfileSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.heartTouch != null && m.hasOwnProperty("heartTouch")) {
                    switch (m.heartTouch) {
                    default:
                        return "heartTouch: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                if (m.autoStart != null && m.hasOwnProperty("autoStart")) {
                    if (typeof m.autoStart !== "boolean")
                        return "autoStart: boolean expected";
                }
                return null;
            };
    
            PbArcherSportProfileSettings.PbHeartTouch = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "HEART_TOUCH_OFF"] = 1;
                values[valuesById[2] = "HEART_TOUCH_ACTIVATE_BACKLIGHT"] = 2;
                values[valuesById[3] = "HEART_TOUCH_SHOW_PREVIOUS_LAP"] = 3;
                values[valuesById[4] = "HEART_TOUCH_SHOW_TIME_OF_DAY"] = 4;
                return values;
            })();
    
            return PbArcherSportProfileSettings;
        })();
    
        polar_data.PbAstraSportProfileSettings = (function() {
    
            function PbAstraSportProfileSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbAstraSportProfileSettings.prototype.vibration = false;
    
            PbAstraSportProfileSettings.create = function create(properties) {
                return new PbAstraSportProfileSettings(properties);
            };
    
            PbAstraSportProfileSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.vibration != null && m.hasOwnProperty("vibration"))
                    w.uint32(24).bool(m.vibration);
                return w;
            };
    
            PbAstraSportProfileSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.vibration != null && m.hasOwnProperty("vibration")) {
                    if (typeof m.vibration !== "boolean")
                        return "vibration: boolean expected";
                }
                return null;
            };
    
            return PbAstraSportProfileSettings;
        })();
    
        polar_data.PbAvalonSportProfileSettings = (function() {
    
            function PbAvalonSportProfileSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbAvalonSportProfileSettings.prototype.heartTouch = 1;
            PbAvalonSportProfileSettings.prototype.vibration = false;
            PbAvalonSportProfileSettings.prototype.autoStart = false;
    
            PbAvalonSportProfileSettings.create = function create(properties) {
                return new PbAvalonSportProfileSettings(properties);
            };
    
            PbAvalonSportProfileSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.heartTouch != null && m.hasOwnProperty("heartTouch"))
                    w.uint32(8).int32(m.heartTouch);
                if (m.vibration != null && m.hasOwnProperty("vibration"))
                    w.uint32(24).bool(m.vibration);
                if (m.autoStart != null && m.hasOwnProperty("autoStart"))
                    w.uint32(32).bool(m.autoStart);
                return w;
            };
    
            PbAvalonSportProfileSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.heartTouch != null && m.hasOwnProperty("heartTouch")) {
                    switch (m.heartTouch) {
                    default:
                        return "heartTouch: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                if (m.vibration != null && m.hasOwnProperty("vibration")) {
                    if (typeof m.vibration !== "boolean")
                        return "vibration: boolean expected";
                }
                if (m.autoStart != null && m.hasOwnProperty("autoStart")) {
                    if (typeof m.autoStart !== "boolean")
                        return "autoStart: boolean expected";
                }
                return null;
            };
    
            PbAvalonSportProfileSettings.PbHeartTouch = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "HEART_TOUCH_OFF"] = 1;
                values[valuesById[2] = "HEART_TOUCH_ACTIVATE_BACKLIGHT"] = 2;
                values[valuesById[3] = "HEART_TOUCH_SHOW_PREVIOUS_LAP"] = 3;
                values[valuesById[4] = "HEART_TOUCH_SHOW_TIME_OF_DAY"] = 4;
                return values;
            })();
    
            return PbAvalonSportProfileSettings;
        })();
    
        polar_data.PbGuitarSportProfileSettings = (function() {
    
            function PbGuitarSportProfileSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbGuitarSportProfileSettings.prototype.heartTouch = 1;
            PbGuitarSportProfileSettings.prototype.tapButtonAction = 1;
            PbGuitarSportProfileSettings.prototype.vibration = false;
            PbGuitarSportProfileSettings.prototype.autoStart = false;
            PbGuitarSportProfileSettings.prototype.autoScrolling = false;
            PbGuitarSportProfileSettings.prototype.strideSensorCalibSettings = null;
            PbGuitarSportProfileSettings.prototype.sprintDisplayActivation = 0;
            PbGuitarSportProfileSettings.prototype.sportTapButtonSensitivity = 3;
            PbGuitarSportProfileSettings.prototype.swimmingPool = null;
    
            PbGuitarSportProfileSettings.create = function create(properties) {
                return new PbGuitarSportProfileSettings(properties);
            };
    
            PbGuitarSportProfileSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.heartTouch != null && m.hasOwnProperty("heartTouch"))
                    w.uint32(8).int32(m.heartTouch);
                if (m.tapButtonAction != null && m.hasOwnProperty("tapButtonAction"))
                    w.uint32(16).int32(m.tapButtonAction);
                if (m.vibration != null && m.hasOwnProperty("vibration"))
                    w.uint32(24).bool(m.vibration);
                if (m.autoStart != null && m.hasOwnProperty("autoStart"))
                    w.uint32(32).bool(m.autoStart);
                if (m.autoScrolling != null && m.hasOwnProperty("autoScrolling"))
                    w.uint32(40).bool(m.autoScrolling);
                if (m.strideSensorCalibSettings != null && m.hasOwnProperty("strideSensorCalibSettings"))
                    $root.polar_types.PbStrideSensorCalibSettings.encode(m.strideSensorCalibSettings, w.uint32(50).fork()).ldelim();
                if (m.sprintDisplayActivation != null && m.hasOwnProperty("sprintDisplayActivation"))
                    w.uint32(56).uint32(m.sprintDisplayActivation);
                if (m.sportTapButtonSensitivity != null && m.hasOwnProperty("sportTapButtonSensitivity"))
                    w.uint32(64).int32(m.sportTapButtonSensitivity);
                if (m.swimmingPool != null && m.hasOwnProperty("swimmingPool"))
                    $root.polar_types.PbSwimmingPoolInfo.encode(m.swimmingPool, w.uint32(74).fork()).ldelim();
                return w;
            };
    
            PbGuitarSportProfileSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.heartTouch != null && m.hasOwnProperty("heartTouch")) {
                    switch (m.heartTouch) {
                    default:
                        return "heartTouch: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                if (m.tapButtonAction != null && m.hasOwnProperty("tapButtonAction")) {
                    switch (m.tapButtonAction) {
                    default:
                        return "tapButtonAction: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                if (m.vibration != null && m.hasOwnProperty("vibration")) {
                    if (typeof m.vibration !== "boolean")
                        return "vibration: boolean expected";
                }
                if (m.autoStart != null && m.hasOwnProperty("autoStart")) {
                    if (typeof m.autoStart !== "boolean")
                        return "autoStart: boolean expected";
                }
                if (m.autoScrolling != null && m.hasOwnProperty("autoScrolling")) {
                    if (typeof m.autoScrolling !== "boolean")
                        return "autoScrolling: boolean expected";
                }
                if (m.strideSensorCalibSettings != null && m.hasOwnProperty("strideSensorCalibSettings")) {
                    {
                        var e = $root.polar_types.PbStrideSensorCalibSettings.verify(m.strideSensorCalibSettings);
                        if (e)
                            return "strideSensorCalibSettings." + e;
                    }
                }
                if (m.sprintDisplayActivation != null && m.hasOwnProperty("sprintDisplayActivation")) {
                    if (!$util.isInteger(m.sprintDisplayActivation))
                        return "sprintDisplayActivation: integer expected";
                }
                if (m.sportTapButtonSensitivity != null && m.hasOwnProperty("sportTapButtonSensitivity")) {
                    switch (m.sportTapButtonSensitivity) {
                    default:
                        return "sportTapButtonSensitivity: enum value expected";
                    case 1:
                    case 5:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                if (m.swimmingPool != null && m.hasOwnProperty("swimmingPool")) {
                    {
                        var e = $root.polar_types.PbSwimmingPoolInfo.verify(m.swimmingPool);
                        if (e)
                            return "swimmingPool." + e;
                    }
                }
                return null;
            };
    
            PbGuitarSportProfileSettings.PbHeartTouch = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "HEART_TOUCH_OFF"] = 1;
                values[valuesById[2] = "HEART_TOUCH_ACTIVATE_BACKLIGHT"] = 2;
                values[valuesById[3] = "HEART_TOUCH_SHOW_PREVIOUS_LAP"] = 3;
                values[valuesById[4] = "HEART_TOUCH_SHOW_TIME_OF_DAY"] = 4;
                return values;
            })();
    
            PbGuitarSportProfileSettings.PbTapButtonAction = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "TAP_BUTTON_OFF"] = 1;
                values[valuesById[2] = "TAP_BUTTON_TAKE_LAP"] = 2;
                values[valuesById[3] = "TAP_BUTTON_CHANGE_TRAINING_VIEW"] = 3;
                values[valuesById[4] = "TAP_BUTTON_ACTIVATE_BACKLIGHT"] = 4;
                return values;
            })();
    
            PbGuitarSportProfileSettings.PbSportTapButtonSensitivity = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "SPORT_TAP_BUTTON_SENSITIVITY_OFF"] = 1;
                values[valuesById[5] = "SPORT_TAP_BUTTON_SENSITIVITY_VERY_LOW"] = 5;
                values[valuesById[2] = "SPORT_TAP_BUTTON_SENSITIVITY_LOW"] = 2;
                values[valuesById[3] = "SPORT_TAP_BUTTON_SENSITIVITY_MEDIUM"] = 3;
                values[valuesById[4] = "SPORT_TAP_BUTTON_SENSITIVITY_HIGH"] = 4;
                return values;
            })();
    
            return PbGuitarSportProfileSettings;
        })();
    
        polar_data.PbMaseratiSportProfileSettings = (function() {
    
            function PbMaseratiSportProfileSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbMaseratiSportProfileSettings.prototype.heartTouch = 1;
            PbMaseratiSportProfileSettings.prototype.tapButtonAction = 1;
            PbMaseratiSportProfileSettings.prototype.vibration = false;
            PbMaseratiSportProfileSettings.prototype.autoStart = false;
    
            PbMaseratiSportProfileSettings.create = function create(properties) {
                return new PbMaseratiSportProfileSettings(properties);
            };
    
            PbMaseratiSportProfileSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.heartTouch != null && m.hasOwnProperty("heartTouch"))
                    w.uint32(8).int32(m.heartTouch);
                if (m.tapButtonAction != null && m.hasOwnProperty("tapButtonAction"))
                    w.uint32(16).int32(m.tapButtonAction);
                if (m.vibration != null && m.hasOwnProperty("vibration"))
                    w.uint32(24).bool(m.vibration);
                if (m.autoStart != null && m.hasOwnProperty("autoStart"))
                    w.uint32(32).bool(m.autoStart);
                return w;
            };
    
            PbMaseratiSportProfileSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.heartTouch != null && m.hasOwnProperty("heartTouch")) {
                    switch (m.heartTouch) {
                    default:
                        return "heartTouch: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                if (m.tapButtonAction != null && m.hasOwnProperty("tapButtonAction")) {
                    switch (m.tapButtonAction) {
                    default:
                        return "tapButtonAction: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                if (m.vibration != null && m.hasOwnProperty("vibration")) {
                    if (typeof m.vibration !== "boolean")
                        return "vibration: boolean expected";
                }
                if (m.autoStart != null && m.hasOwnProperty("autoStart")) {
                    if (typeof m.autoStart !== "boolean")
                        return "autoStart: boolean expected";
                }
                return null;
            };
    
            PbMaseratiSportProfileSettings.PbHeartTouch = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "HEART_TOUCH_OFF"] = 1;
                values[valuesById[2] = "HEART_TOUCH_ACTIVATE_BACKLIGHT"] = 2;
                values[valuesById[3] = "HEART_TOUCH_SHOW_PREVIOUS_LAP"] = 3;
                values[valuesById[4] = "HEART_TOUCH_SHOW_TIME_OF_DAY"] = 4;
                return values;
            })();
    
            PbMaseratiSportProfileSettings.PbTapButtonAction = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "TAP_BUTTON_OFF"] = 1;
                values[valuesById[2] = "TAP_BUTTON_TAKE_LAP"] = 2;
                values[valuesById[3] = "TAP_BUTTON_CHANGE_TRAINING_VIEW"] = 3;
                values[valuesById[4] = "TAP_BUTTON_ACTIVATE_BACKLIGHT"] = 4;
                return values;
            })();
    
            return PbMaseratiSportProfileSettings;
        })();
    
        polar_data.PbMcLarenSportProfileSettings = (function() {
    
            function PbMcLarenSportProfileSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbMcLarenSportProfileSettings.prototype.autoStart = false;
    
            PbMcLarenSportProfileSettings.create = function create(properties) {
                return new PbMcLarenSportProfileSettings(properties);
            };
    
            PbMcLarenSportProfileSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(32).bool(m.autoStart);
                return w;
            };
    
            PbMcLarenSportProfileSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.autoStart !== "boolean")
                    return "autoStart: boolean expected";
                return null;
            };
    
            return PbMcLarenSportProfileSettings;
        })();
    
        polar_data.PbTrainingDisplayItem = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[2] = "TIME_OF_DAY"] = 2;
            values[valuesById[3] = "STOPWATCH"] = 3;
            values[valuesById[6] = "CURRENT_LAP_TIME"] = 6;
            values[valuesById[7] = "LAST_LAP_TIME"] = 7;
            values[valuesById[8] = "LAST_AUTOMATIC_LAP_TIME"] = 8;
            values[valuesById[10] = "ALTITUDE"] = 10;
            values[valuesById[11] = "ASCENT"] = 11;
            values[valuesById[12] = "DESCENT"] = 12;
            values[valuesById[13] = "INCLINOMETER"] = 13;
            values[valuesById[15] = "TEMPERATURE"] = 15;
            values[valuesById[16] = "CURRENT_LAP_ASCENT"] = 16;
            values[valuesById[17] = "CURRENT_LAP_DESCENT"] = 17;
            values[valuesById[18] = "CURRENT_LAP_VAM"] = 18;
            values[valuesById[20] = "CURRENT_HEART_RATE"] = 20;
            values[valuesById[21] = "AVERAGE_HEART_RATE"] = 21;
            values[valuesById[22] = "MAXIMUM_HEART_RATE"] = 22;
            values[valuesById[24] = "CURRENT_LAP_AVERAGE_HEART_RATE"] = 24;
            values[valuesById[25] = "CURRENT_LAP_MAX_HEART_RATE"] = 25;
            values[valuesById[26] = "PREVIOUS_LAP_AVERAGE_HEART_RATE"] = 26;
            values[valuesById[28] = "PREVIOUS_LAP_MAX_HEART_RATE"] = 28;
            values[valuesById[27] = "CALORIES"] = 27;
            values[valuesById[32] = "ZONE_POINTER"] = 32;
            values[valuesById[33] = "TIME_IN_ZONE"] = 33;
            values[valuesById[35] = "RR_VARIATION"] = 35;
            values[valuesById[37] = "DISTANCE"] = 37;
            values[valuesById[38] = "CURRENT_LAP_DISTANCE"] = 38;
            values[valuesById[39] = "PREVIOUS_LAP_DISTANCE"] = 39;
            values[valuesById[41] = "SPEED_OR_PACE"] = 41;
            values[valuesById[42] = "SPEED_OR_PACE_AVERAGE"] = 42;
            values[valuesById[43] = "SPEED_OR_PACE_MAXIMUM"] = 43;
            values[valuesById[44] = "CURRENT_LAP_SPEED_OR_PACE"] = 44;
            values[valuesById[45] = "SPEED_ZONE_POINTER"] = 45;
            values[valuesById[46] = "TIME_IN_SPEED_ZONE"] = 46;
            values[valuesById[47] = "CURRENT_LAP_MAX_PACE_OR_SPEED"] = 47;
            values[valuesById[48] = "PREVIOUS_LAP_MAX_PACE_OR_SPEED"] = 48;
            values[valuesById[220] = "PREVIOUS_LAP_SPEED_OR_PACE"] = 220;
            values[valuesById[221] = "VERTICAL_SPEED_MOVING_AVERAGE"] = 221;
            values[valuesById[49] = "CADENCE"] = 49;
            values[valuesById[50] = "AVERAGE_CADENCE"] = 50;
            values[valuesById[240] = "MAXIMUM_CADENCE"] = 240;
            values[valuesById[51] = "CURRENT_LAP_CADENCE"] = 51;
            values[valuesById[52] = "CURRENT_LAP_MAX_CADENCE"] = 52;
            values[valuesById[53] = "PREVIOUS_LAP_CADENCE"] = 53;
            values[valuesById[54] = "STRIDE_LENGTH"] = 54;
            values[valuesById[55] = "AVERAGE_STRIDE_LENGTH"] = 55;
            values[valuesById[56] = "CURRENT_POWER"] = 56;
            values[valuesById[57] = "CURRENT_POWER_LEFT_RIGHT_BALANCE"] = 57;
            values[valuesById[58] = "MAXIMUM_FORCE"] = 58;
            values[valuesById[59] = "POWER_ZONE_POINTER"] = 59;
            values[valuesById[60] = "AVERAGE_POWER"] = 60;
            values[valuesById[61] = "MAXIMUM_POWER"] = 61;
            values[valuesById[62] = "AVERAGE_POWER_LEFT_RIGHT_BALANCE"] = 62;
            values[valuesById[63] = "CURRENT_LAP_AVERAGE_POWER"] = 63;
            values[valuesById[64] = "CURRENT_LAP_MAXIMUM_POWER"] = 64;
            values[valuesById[65] = "CURRENT_LAP_AVERAGE_POWER_LR_BALANCE"] = 65;
            values[valuesById[66] = "TIME_IN_POWER_ZONE"] = 66;
            values[valuesById[67] = "PREVIOUS_LAP_AVERAGE_POWER"] = 67;
            values[valuesById[68] = "PREVIOUS_LAP_MAXIMUM_POWER"] = 68;
            values[valuesById[230] = "PREVIOUS_LAP_AVERAGE_POWER_LR_BALANCE"] = 230;
            values[valuesById[69] = "REST_TIME"] = 69;
            values[valuesById[70] = "POOL_COUNTER"] = 70;
            values[valuesById[88] = "MULTISPORT_DURATION"] = 88;
            values[valuesById[89] = "MULTISPORT_DISTANCE"] = 89;
            values[valuesById[90] = "MULTISPORT_CALORIES"] = 90;
            values[valuesById[91] = "MULTISPORT_ASCENT"] = 91;
            values[valuesById[92] = "MULTISPORT_DESCENT"] = 92;
            values[valuesById[100] = "HEART_RATE_ZONES"] = 100;
            values[valuesById[101] = "MULTISPORT_HEART_RATE_ZONES"] = 101;
            values[valuesById[102] = "LOCATION_GUIDE"] = 102;
            values[valuesById[103] = "POWER_ZONES"] = 103;
            values[valuesById[104] = "FORCE_GRAPH"] = 104;
            values[valuesById[105] = "TIME_BASED_SPEED_ZONES"] = 105;
            values[valuesById[200] = "CURRENT_ALAP_AVERAGE_HEART_RATE"] = 200;
            values[valuesById[201] = "CURRENT_ALAP_TIME"] = 201;
            values[valuesById[202] = "CURRENT_ALAP_AVERAGE_POWER"] = 202;
            values[valuesById[203] = "CURRENT_ALAP_MAXIMUM_POWER"] = 203;
            values[valuesById[204] = "CURRENT_ALAP_SPEED_OR_PACE"] = 204;
            values[valuesById[205] = "CURRENT_ALAP_DISTANCE"] = 205;
            values[valuesById[206] = "CURRENT_ALAP_ASCENT"] = 206;
            values[valuesById[207] = "CURRENT_ALAP_DESCENT"] = 207;
            values[valuesById[208] = "CURRENT_ALAP_CADENCE"] = 208;
            values[valuesById[209] = "CURRENT_ALAP_AVERAGE_POWER_LR_BALANCE"] = 209;
            values[valuesById[210] = "CURRENT_ALAP_MAX_HEART_RATE"] = 210;
            values[valuesById[211] = "CURRENT_ALAP_MAX_SPEED"] = 211;
            values[valuesById[212] = "CURRENT_ALAP_MAX_CADENCE"] = 212;
            return values;
        })();
    
        polar_data.PbSirius2TrainingDisplay = (function() {
    
            function PbSirius2TrainingDisplay(p) {
                this.item = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSirius2TrainingDisplay.prototype.item = $util.emptyArray;
    
            PbSirius2TrainingDisplay.create = function create(properties) {
                return new PbSirius2TrainingDisplay(properties);
            };
    
            PbSirius2TrainingDisplay.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.item != null && m.item.length) {
                    for (var i = 0; i < m.item.length; ++i)
                        w.uint32(8).int32(m.item[i]);
                }
                return w;
            };
    
            PbSirius2TrainingDisplay.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.item != null && m.hasOwnProperty("item")) {
                    if (!Array.isArray(m.item))
                        return "item: array expected";
                    for (var i = 0; i < m.item.length; ++i) {
                        switch (m.item[i]) {
                        default:
                            return "item: enum value[] expected";
                        case 2:
                        case 3:
                        case 6:
                        case 7:
                        case 8:
                        case 10:
                        case 11:
                        case 12:
                        case 13:
                        case 15:
                        case 16:
                        case 17:
                        case 18:
                        case 20:
                        case 21:
                        case 22:
                        case 24:
                        case 25:
                        case 26:
                        case 28:
                        case 27:
                        case 32:
                        case 33:
                        case 35:
                        case 37:
                        case 38:
                        case 39:
                        case 41:
                        case 42:
                        case 43:
                        case 44:
                        case 45:
                        case 46:
                        case 47:
                        case 48:
                        case 220:
                        case 221:
                        case 49:
                        case 50:
                        case 240:
                        case 51:
                        case 52:
                        case 53:
                        case 54:
                        case 55:
                        case 56:
                        case 57:
                        case 58:
                        case 59:
                        case 60:
                        case 61:
                        case 62:
                        case 63:
                        case 64:
                        case 65:
                        case 66:
                        case 67:
                        case 68:
                        case 230:
                        case 69:
                        case 70:
                        case 88:
                        case 89:
                        case 90:
                        case 91:
                        case 92:
                        case 100:
                        case 101:
                        case 102:
                        case 103:
                        case 104:
                        case 105:
                        case 200:
                        case 201:
                        case 202:
                        case 203:
                        case 204:
                        case 205:
                        case 206:
                        case 207:
                        case 208:
                        case 209:
                        case 210:
                        case 211:
                        case 212:
                            break;
                        }
                    }
                }
                return null;
            };
    
            return PbSirius2TrainingDisplay;
        })();
    
        polar_data.PbSirius2DisplaySettings = (function() {
    
            function PbSirius2DisplaySettings(p) {
                this.display = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSirius2DisplaySettings.prototype.display = $util.emptyArray;
            PbSirius2DisplaySettings.prototype.lastShownDisplay = 0;
            PbSirius2DisplaySettings.prototype.addedDefaultDisplays = 0;
    
            PbSirius2DisplaySettings.create = function create(properties) {
                return new PbSirius2DisplaySettings(properties);
            };
    
            PbSirius2DisplaySettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.display != null && m.display.length) {
                    for (var i = 0; i < m.display.length; ++i)
                        $root.polar_data.PbSirius2TrainingDisplay.encode(m.display[i], w.uint32(10).fork()).ldelim();
                }
                if (m.lastShownDisplay != null && m.hasOwnProperty("lastShownDisplay"))
                    w.uint32(16).uint32(m.lastShownDisplay);
                if (m.addedDefaultDisplays != null && m.hasOwnProperty("addedDefaultDisplays"))
                    w.uint32(24).uint32(m.addedDefaultDisplays);
                return w;
            };
    
            PbSirius2DisplaySettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.display != null && m.hasOwnProperty("display")) {
                    if (!Array.isArray(m.display))
                        return "display: array expected";
                    for (var i = 0; i < m.display.length; ++i) {
                        {
                            var e = $root.polar_data.PbSirius2TrainingDisplay.verify(m.display[i]);
                            if (e)
                                return "display." + e;
                        }
                    }
                }
                if (m.lastShownDisplay != null && m.hasOwnProperty("lastShownDisplay")) {
                    if (!$util.isInteger(m.lastShownDisplay))
                        return "lastShownDisplay: integer expected";
                }
                if (m.addedDefaultDisplays != null && m.hasOwnProperty("addedDefaultDisplays")) {
                    if (!$util.isInteger(m.addedDefaultDisplays))
                        return "addedDefaultDisplays: integer expected";
                }
                return null;
            };
    
            return PbSirius2DisplaySettings;
        })();
    
        polar_data.PbAutoLapSettings = (function() {
    
            function PbAutoLapSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbAutoLapSettings.prototype.automaticLap = 1;
            PbAutoLapSettings.prototype.automaticLapDistance = 0;
            PbAutoLapSettings.prototype.automaticLapDuration = null;
    
            PbAutoLapSettings.create = function create(properties) {
                return new PbAutoLapSettings(properties);
            };
    
            PbAutoLapSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.automaticLap);
                if (m.automaticLapDistance != null && m.hasOwnProperty("automaticLapDistance"))
                    w.uint32(21).float(m.automaticLapDistance);
                if (m.automaticLapDuration != null && m.hasOwnProperty("automaticLapDuration"))
                    $root.polar_types.PbDuration.encode(m.automaticLapDuration, w.uint32(26).fork()).ldelim();
                return w;
            };
    
            PbAutoLapSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.automaticLap) {
                default:
                    return "automaticLap: enum value expected";
                case 1:
                case 2:
                case 3:
                case 4:
                    break;
                }
                if (m.automaticLapDistance != null && m.hasOwnProperty("automaticLapDistance")) {
                    if (typeof m.automaticLapDistance !== "number")
                        return "automaticLapDistance: number expected";
                }
                if (m.automaticLapDuration != null && m.hasOwnProperty("automaticLapDuration")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.automaticLapDuration);
                        if (e)
                            return "automaticLapDuration." + e;
                    }
                }
                return null;
            };
    
            PbAutoLapSettings.PbAutomaticLap = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "AUTOMATIC_LAP_OFF"] = 1;
                values[valuesById[2] = "AUTOMATIC_LAP_DISTANCE"] = 2;
                values[valuesById[3] = "AUTOMATIC_LAP_DURATION"] = 3;
                values[valuesById[4] = "AUTOMATIC_LAP_LOCATION"] = 4;
                return values;
            })();
    
            return PbAutoLapSettings;
        })();
    
        polar_data.PbTrainingReminder = (function() {
    
            function PbTrainingReminder(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTrainingReminder.prototype.reminderType = 1;
            PbTrainingReminder.prototype.reminderText = null;
            PbTrainingReminder.prototype.calorieReminderValue = 0;
            PbTrainingReminder.prototype.timeReminderValue = null;
            PbTrainingReminder.prototype.distanceReminderValue = 0;
    
            PbTrainingReminder.create = function create(properties) {
                return new PbTrainingReminder(properties);
            };
    
            PbTrainingReminder.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.reminderType);
                if (m.reminderText != null && m.hasOwnProperty("reminderText"))
                    $root.polar_types.PbOneLineText.encode(m.reminderText, w.uint32(18).fork()).ldelim();
                if (m.calorieReminderValue != null && m.hasOwnProperty("calorieReminderValue"))
                    w.uint32(24).uint32(m.calorieReminderValue);
                if (m.timeReminderValue != null && m.hasOwnProperty("timeReminderValue"))
                    $root.polar_types.PbDuration.encode(m.timeReminderValue, w.uint32(34).fork()).ldelim();
                if (m.distanceReminderValue != null && m.hasOwnProperty("distanceReminderValue"))
                    w.uint32(45).float(m.distanceReminderValue);
                return w;
            };
    
            PbTrainingReminder.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.reminderType) {
                default:
                    return "reminderType: enum value expected";
                case 1:
                case 2:
                case 3:
                case 4:
                    break;
                }
                if (m.reminderText != null && m.hasOwnProperty("reminderText")) {
                    {
                        var e = $root.polar_types.PbOneLineText.verify(m.reminderText);
                        if (e)
                            return "reminderText." + e;
                    }
                }
                if (m.calorieReminderValue != null && m.hasOwnProperty("calorieReminderValue")) {
                    if (!$util.isInteger(m.calorieReminderValue))
                        return "calorieReminderValue: integer expected";
                }
                if (m.timeReminderValue != null && m.hasOwnProperty("timeReminderValue")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.timeReminderValue);
                        if (e)
                            return "timeReminderValue." + e;
                    }
                }
                if (m.distanceReminderValue != null && m.hasOwnProperty("distanceReminderValue")) {
                    if (typeof m.distanceReminderValue !== "number")
                        return "distanceReminderValue: number expected";
                }
                return null;
            };
    
            PbTrainingReminder.PbTrainingReminderType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "TRAINING_REMINDER_OFF"] = 1;
                values[valuesById[2] = "TRAINING_REMINDER_CALORIES_BASED"] = 2;
                values[valuesById[3] = "TRAINING_REMINDER_DISTANCE_BASED"] = 3;
                values[valuesById[4] = "TRAINING_REMINDER_TIME_BASED"] = 4;
                return values;
            })();
    
            return PbTrainingReminder;
        })();
    
        polar_data.PbSportProfileSettings = (function() {
    
            function PbSportProfileSettings(p) {
                this.remoteButtonActions = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSportProfileSettings.prototype.volume = null;
            PbSportProfileSettings.prototype.speedView = 1;
            PbSportProfileSettings.prototype.zoneOptimizerSetting = 1;
            PbSportProfileSettings.prototype.heartRateView = 1;
            PbSportProfileSettings.prototype.sensorBroadcastingHr = false;
            PbSportProfileSettings.prototype.zoneLimits = null;
            PbSportProfileSettings.prototype.trainingReminder = null;
            PbSportProfileSettings.prototype.voiceGuidance = false;
            PbSportProfileSettings.prototype.gpsSetting = 0;
            PbSportProfileSettings.prototype.autolapSettings = null;
            PbSportProfileSettings.prototype.altitudeSetting = 0;
            PbSportProfileSettings.prototype.powerView = 1;
            PbSportProfileSettings.prototype.strideSpeedSource = 1;
            PbSportProfileSettings.prototype.remoteButtonActions = $util.emptyArray;
            PbSportProfileSettings.prototype.hrZoneLockAvailable = false;
            PbSportProfileSettings.prototype.speedZoneLockAvailable = false;
            PbSportProfileSettings.prototype.powerZoneLockAvailable = false;
            PbSportProfileSettings.prototype.swimmingUnits = 0;
    
            PbSportProfileSettings.create = function create(properties) {
                return new PbSportProfileSettings(properties);
            };
    
            PbSportProfileSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.volume != null && m.hasOwnProperty("volume"))
                    $root.polar_types.PbVolume.encode(m.volume, w.uint32(10).fork()).ldelim();
                if (m.speedView != null && m.hasOwnProperty("speedView"))
                    w.uint32(16).int32(m.speedView);
                if (m.zoneOptimizerSetting != null && m.hasOwnProperty("zoneOptimizerSetting"))
                    w.uint32(24).int32(m.zoneOptimizerSetting);
                if (m.heartRateView != null && m.hasOwnProperty("heartRateView"))
                    w.uint32(32).int32(m.heartRateView);
                if (m.sensorBroadcastingHr != null && m.hasOwnProperty("sensorBroadcastingHr"))
                    w.uint32(40).bool(m.sensorBroadcastingHr);
                if (m.zoneLimits != null && m.hasOwnProperty("zoneLimits"))
                    $root.polar_types.PbZones.encode(m.zoneLimits, w.uint32(50).fork()).ldelim();
                if (m.trainingReminder != null && m.hasOwnProperty("trainingReminder"))
                    $root.polar_data.PbTrainingReminder.encode(m.trainingReminder, w.uint32(58).fork()).ldelim();
                if (m.voiceGuidance != null && m.hasOwnProperty("voiceGuidance"))
                    w.uint32(64).bool(m.voiceGuidance);
                if (m.gpsSetting != null && m.hasOwnProperty("gpsSetting"))
                    w.uint32(72).int32(m.gpsSetting);
                if (m.autolapSettings != null && m.hasOwnProperty("autolapSettings"))
                    $root.polar_data.PbAutoLapSettings.encode(m.autolapSettings, w.uint32(82).fork()).ldelim();
                if (m.altitudeSetting != null && m.hasOwnProperty("altitudeSetting"))
                    w.uint32(88).int32(m.altitudeSetting);
                if (m.powerView != null && m.hasOwnProperty("powerView"))
                    w.uint32(96).int32(m.powerView);
                if (m.strideSpeedSource != null && m.hasOwnProperty("strideSpeedSource"))
                    w.uint32(104).int32(m.strideSpeedSource);
                if (m.remoteButtonActions != null && m.remoteButtonActions.length) {
                    for (var i = 0; i < m.remoteButtonActions.length; ++i)
                        w.uint32(112).int32(m.remoteButtonActions[i]);
                }
                if (m.hrZoneLockAvailable != null && m.hasOwnProperty("hrZoneLockAvailable"))
                    w.uint32(120).bool(m.hrZoneLockAvailable);
                if (m.speedZoneLockAvailable != null && m.hasOwnProperty("speedZoneLockAvailable"))
                    w.uint32(128).bool(m.speedZoneLockAvailable);
                if (m.powerZoneLockAvailable != null && m.hasOwnProperty("powerZoneLockAvailable"))
                    w.uint32(136).bool(m.powerZoneLockAvailable);
                if (m.swimmingUnits != null && m.hasOwnProperty("swimmingUnits"))
                    w.uint32(144).int32(m.swimmingUnits);
                return w;
            };
    
            PbSportProfileSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.volume != null && m.hasOwnProperty("volume")) {
                    {
                        var e = $root.polar_types.PbVolume.verify(m.volume);
                        if (e)
                            return "volume." + e;
                    }
                }
                if (m.speedView != null && m.hasOwnProperty("speedView")) {
                    switch (m.speedView) {
                    default:
                        return "speedView: enum value expected";
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.zoneOptimizerSetting != null && m.hasOwnProperty("zoneOptimizerSetting")) {
                    switch (m.zoneOptimizerSetting) {
                    default:
                        return "zoneOptimizerSetting: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                if (m.heartRateView != null && m.hasOwnProperty("heartRateView")) {
                    switch (m.heartRateView) {
                    default:
                        return "heartRateView: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                }
                if (m.sensorBroadcastingHr != null && m.hasOwnProperty("sensorBroadcastingHr")) {
                    if (typeof m.sensorBroadcastingHr !== "boolean")
                        return "sensorBroadcastingHr: boolean expected";
                }
                if (m.zoneLimits != null && m.hasOwnProperty("zoneLimits")) {
                    {
                        var e = $root.polar_types.PbZones.verify(m.zoneLimits);
                        if (e)
                            return "zoneLimits." + e;
                    }
                }
                if (m.trainingReminder != null && m.hasOwnProperty("trainingReminder")) {
                    {
                        var e = $root.polar_data.PbTrainingReminder.verify(m.trainingReminder);
                        if (e)
                            return "trainingReminder." + e;
                    }
                }
                if (m.voiceGuidance != null && m.hasOwnProperty("voiceGuidance")) {
                    if (typeof m.voiceGuidance !== "boolean")
                        return "voiceGuidance: boolean expected";
                }
                if (m.gpsSetting != null && m.hasOwnProperty("gpsSetting")) {
                    switch (m.gpsSetting) {
                    default:
                        return "gpsSetting: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.autolapSettings != null && m.hasOwnProperty("autolapSettings")) {
                    {
                        var e = $root.polar_data.PbAutoLapSettings.verify(m.autolapSettings);
                        if (e)
                            return "autolapSettings." + e;
                    }
                }
                if (m.altitudeSetting != null && m.hasOwnProperty("altitudeSetting")) {
                    switch (m.altitudeSetting) {
                    default:
                        return "altitudeSetting: enum value expected";
                    case 0:
                    case 1:
                        break;
                    }
                }
                if (m.powerView != null && m.hasOwnProperty("powerView")) {
                    switch (m.powerView) {
                    default:
                        return "powerView: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                }
                if (m.strideSpeedSource != null && m.hasOwnProperty("strideSpeedSource")) {
                    switch (m.strideSpeedSource) {
                    default:
                        return "strideSpeedSource: enum value expected";
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.remoteButtonActions != null && m.hasOwnProperty("remoteButtonActions")) {
                    if (!Array.isArray(m.remoteButtonActions))
                        return "remoteButtonActions: array expected";
                    for (var i = 0; i < m.remoteButtonActions.length; ++i) {
                        switch (m.remoteButtonActions[i]) {
                        default:
                            return "remoteButtonActions: enum value[] expected";
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                        case 5:
                            break;
                        }
                    }
                }
                if (m.hrZoneLockAvailable != null && m.hasOwnProperty("hrZoneLockAvailable")) {
                    if (typeof m.hrZoneLockAvailable !== "boolean")
                        return "hrZoneLockAvailable: boolean expected";
                }
                if (m.speedZoneLockAvailable != null && m.hasOwnProperty("speedZoneLockAvailable")) {
                    if (typeof m.speedZoneLockAvailable !== "boolean")
                        return "speedZoneLockAvailable: boolean expected";
                }
                if (m.powerZoneLockAvailable != null && m.hasOwnProperty("powerZoneLockAvailable")) {
                    if (typeof m.powerZoneLockAvailable !== "boolean")
                        return "powerZoneLockAvailable: boolean expected";
                }
                if (m.swimmingUnits != null && m.hasOwnProperty("swimmingUnits")) {
                    switch (m.swimmingUnits) {
                    default:
                        return "swimmingUnits: enum value expected";
                    case 0:
                    case 1:
                        break;
                    }
                }
                return null;
            };
    
            PbSportProfileSettings.PbSpeedView = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "SPEED_VIEW_PACE"] = 1;
                values[valuesById[2] = "SPEED_VIEW_SPEED"] = 2;
                return values;
            })();
    
            PbSportProfileSettings.PbZoneOptimizerSetting = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "ZONEOPTIMIZER_OFF"] = 1;
                values[valuesById[2] = "ZONEOPTIMIZER_MODIFIED_OFF"] = 2;
                values[valuesById[3] = "ZONEOPTIMIZER_DEFAULT"] = 3;
                values[valuesById[4] = "ZONEOPTIMIZER_MODIFIED"] = 4;
                return values;
            })();
    
            PbSportProfileSettings.PbGPSSetting = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "GPS_OFF"] = 0;
                values[valuesById[1] = "GPS_ON_NORMAL"] = 1;
                values[valuesById[2] = "GPS_ON_LONG"] = 2;
                return values;
            })();
    
            PbSportProfileSettings.PbAltitudeSetting = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "ALTITUDE_OFF"] = 0;
                values[valuesById[1] = "ALTITUDE_ON"] = 1;
                return values;
            })();
    
            PbSportProfileSettings.PbPowerView = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "POWER_VIEW_WATT"] = 1;
                values[valuesById[2] = "POWER_VIEW_WATT_PER_KG"] = 2;
                values[valuesById[3] = "POWER_VIEW_FTP_PERCENT"] = 3;
                return values;
            })();
    
            PbSportProfileSettings.PbStrideSpeedSource = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "STRIDE_SPEED_SOURCE_STRIDE"] = 1;
                values[valuesById[2] = "STRIDE_SPEED_SOURCE_GPS"] = 2;
                return values;
            })();
    
            PbSportProfileSettings.PbRemoteButtonAction = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "REMOTE_BUTTON_RING_BELL"] = 1;
                values[valuesById[2] = "REMOTE_BUTTON_ACTIVATE_BACKLIGHT"] = 2;
                values[valuesById[3] = "REMOTE_BUTTON_CHANGE_TRAINING_VIEW"] = 3;
                values[valuesById[4] = "REMOTE_BUTTON_TAKE_LAP"] = 4;
                values[valuesById[5] = "REMOTE_BUTTON_ACTIVATE_SAFETY_LIGHT"] = 5;
                return values;
            })();
    
            PbSportProfileSettings.PbSwimmingUnits = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "SWIMMING_METERS"] = 0;
                values[valuesById[1] = "SWIMMING_YARDS"] = 1;
                return values;
            })();
    
            return PbSportProfileSettings;
        })();
    
        polar_data.PbAutoPause = (function() {
    
            function PbAutoPause(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbAutoPause.prototype.trigger = 0;
            PbAutoPause.prototype.speedThreshold = 0;
    
            PbAutoPause.create = function create(properties) {
                return new PbAutoPause(properties);
            };
    
            PbAutoPause.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.trigger);
                if (m.speedThreshold != null && m.hasOwnProperty("speedThreshold"))
                    w.uint32(21).float(m.speedThreshold);
                return w;
            };
    
            PbAutoPause.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.trigger) {
                default:
                    return "trigger: enum value expected";
                case 0:
                case 1:
                    break;
                }
                if (m.speedThreshold != null && m.hasOwnProperty("speedThreshold")) {
                    if (typeof m.speedThreshold !== "number")
                        return "speedThreshold: number expected";
                }
                return null;
            };
    
            PbAutoPause.PbAutoPauseTrigger = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "AUTO_PAUSE_OFF"] = 0;
                values[valuesById[1] = "AUTO_PAUSE_TRIGGER_SPEED"] = 1;
                return values;
            })();
    
            return PbAutoPause;
        })();
    
        polar_data.PbSportProfile = (function() {
    
            function PbSportProfile(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSportProfile.prototype.identifier = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
            PbSportProfile.prototype.sportIdentifier = null;
            PbSportProfile.prototype.settings = null;
            PbSportProfile.prototype.sirius2DisplaySettings = null;
            PbSportProfile.prototype.sportFactor = 0;
            PbSportProfile.prototype.aerobicThreshold = 0;
            PbSportProfile.prototype.anaerobicThreshold = 0;
            PbSportProfile.prototype.lastModified = null;
            PbSportProfile.prototype.sprintThreshold = 0;
            PbSportProfile.prototype.autoPause = null;
    
            PbSportProfile.create = function create(properties) {
                return new PbSportProfile(properties);
            };
    
            PbSportProfile.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.identifier != null && m.hasOwnProperty("identifier"))
                    w.uint32(8).uint64(m.identifier);
                $root.polar_types.PbSportIdentifier.encode(m.sportIdentifier, w.uint32(18).fork()).ldelim();
                if (m.settings != null && m.hasOwnProperty("settings"))
                    $root.polar_data.PbSportProfileSettings.encode(m.settings, w.uint32(26).fork()).ldelim();
                if (m.sirius2DisplaySettings != null && m.hasOwnProperty("sirius2DisplaySettings"))
                    $root.polar_data.PbSirius2DisplaySettings.encode(m.sirius2DisplaySettings, w.uint32(34).fork()).ldelim();
                if (m.sportFactor != null && m.hasOwnProperty("sportFactor"))
                    w.uint32(45).float(m.sportFactor);
                if (m.aerobicThreshold != null && m.hasOwnProperty("aerobicThreshold"))
                    w.uint32(48).uint32(m.aerobicThreshold);
                if (m.anaerobicThreshold != null && m.hasOwnProperty("anaerobicThreshold"))
                    w.uint32(56).uint32(m.anaerobicThreshold);
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(66).fork()).ldelim();
                if (m.sprintThreshold != null && m.hasOwnProperty("sprintThreshold"))
                    w.uint32(77).float(m.sprintThreshold);
                if (m.autoPause != null && m.hasOwnProperty("autoPause"))
                    $root.polar_data.PbAutoPause.encode(m.autoPause, w.uint32(82).fork()).ldelim();
                return w;
            };
    
            PbSportProfile.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.identifier != null && m.hasOwnProperty("identifier")) {
                    if (!$util.isInteger(m.identifier) && !(m.identifier && $util.isInteger(m.identifier.low) && $util.isInteger(m.identifier.high)))
                        return "identifier: integer|Long expected";
                }
                {
                    var e = $root.polar_types.PbSportIdentifier.verify(m.sportIdentifier);
                    if (e)
                        return "sportIdentifier." + e;
                }
                if (m.settings != null && m.hasOwnProperty("settings")) {
                    {
                        var e = $root.polar_data.PbSportProfileSettings.verify(m.settings);
                        if (e)
                            return "settings." + e;
                    }
                }
                if (m.sirius2DisplaySettings != null && m.hasOwnProperty("sirius2DisplaySettings")) {
                    {
                        var e = $root.polar_data.PbSirius2DisplaySettings.verify(m.sirius2DisplaySettings);
                        if (e)
                            return "sirius2DisplaySettings." + e;
                    }
                }
                if (m.sportFactor != null && m.hasOwnProperty("sportFactor")) {
                    if (typeof m.sportFactor !== "number")
                        return "sportFactor: number expected";
                }
                if (m.aerobicThreshold != null && m.hasOwnProperty("aerobicThreshold")) {
                    if (!$util.isInteger(m.aerobicThreshold))
                        return "aerobicThreshold: integer expected";
                }
                if (m.anaerobicThreshold != null && m.hasOwnProperty("anaerobicThreshold")) {
                    if (!$util.isInteger(m.anaerobicThreshold))
                        return "anaerobicThreshold: integer expected";
                }
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                if (m.sprintThreshold != null && m.hasOwnProperty("sprintThreshold")) {
                    if (typeof m.sprintThreshold !== "number")
                        return "sprintThreshold: number expected";
                }
                if (m.autoPause != null && m.hasOwnProperty("autoPause")) {
                    {
                        var e = $root.polar_data.PbAutoPause.verify(m.autoPause);
                        if (e)
                            return "autoPause." + e;
                    }
                }
                return null;
            };
    
            return PbSportProfile;
        })();
    
        polar_data.PbSwimmingStyleChange = (function() {
    
            function PbSwimmingStyleChange(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSwimmingStyleChange.prototype.style = -1;
            PbSwimmingStyleChange.prototype.timestamp = null;
    
            PbSwimmingStyleChange.create = function create(properties) {
                return new PbSwimmingStyleChange(properties);
            };
    
            PbSwimmingStyleChange.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.style);
                $root.polar_types.PbDuration.encode(m.timestamp, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbSwimmingStyleChange.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.style) {
                default:
                    return "style: enum value expected";
                case -1:
                case 0:
                case 10:
                case 11:
                case 12:
                case 13:
                case 14:
                    break;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.timestamp);
                    if (e)
                        return "timestamp." + e;
                }
                return null;
            };
    
            return PbSwimmingStyleChange;
        })();
    
        polar_data.PbSwimmingPoolMetric = (function() {
    
            function PbSwimmingPoolMetric(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSwimmingPoolMetric.prototype.startOffset = null;
            PbSwimmingPoolMetric.prototype.duration = null;
            PbSwimmingPoolMetric.prototype.style = -1;
            PbSwimmingPoolMetric.prototype.strokes = 0;
    
            PbSwimmingPoolMetric.create = function create(properties) {
                return new PbSwimmingPoolMetric(properties);
            };
    
            PbSwimmingPoolMetric.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDuration.encode(m.startOffset, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.duration, w.uint32(18).fork()).ldelim();
                if (m.style != null && m.hasOwnProperty("style"))
                    w.uint32(24).int32(m.style);
                if (m.strokes != null && m.hasOwnProperty("strokes"))
                    w.uint32(32).uint32(m.strokes);
                return w;
            };
    
            PbSwimmingPoolMetric.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.startOffset);
                    if (e)
                        return "startOffset." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.duration);
                    if (e)
                        return "duration." + e;
                }
                if (m.style != null && m.hasOwnProperty("style")) {
                    switch (m.style) {
                    default:
                        return "style: enum value expected";
                    case -1:
                    case 0:
                    case 10:
                    case 11:
                    case 12:
                    case 13:
                    case 14:
                        break;
                    }
                }
                if (m.strokes != null && m.hasOwnProperty("strokes")) {
                    if (!$util.isInteger(m.strokes))
                        return "strokes: integer expected";
                }
                return null;
            };
    
            return PbSwimmingPoolMetric;
        })();
    
        polar_data.PbSwimmingSamples = (function() {
    
            function PbSwimmingSamples(p) {
                this.poolMetric = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSwimmingSamples.prototype.start = null;
            PbSwimmingSamples.prototype.poolMetric = $util.emptyArray;
    
            PbSwimmingSamples.create = function create(properties) {
                return new PbSwimmingSamples(properties);
            };
    
            PbSwimmingSamples.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLocalDateTime.encode(m.start, w.uint32(10).fork()).ldelim();
                if (m.poolMetric != null && m.poolMetric.length) {
                    for (var i = 0; i < m.poolMetric.length; ++i)
                        $root.polar_data.PbSwimmingPoolMetric.encode(m.poolMetric[i], w.uint32(26).fork()).ldelim();
                }
                return w;
            };
    
            PbSwimmingSamples.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.start);
                    if (e)
                        return "start." + e;
                }
                if (m.poolMetric != null && m.hasOwnProperty("poolMetric")) {
                    if (!Array.isArray(m.poolMetric))
                        return "poolMetric: array expected";
                    for (var i = 0; i < m.poolMetric.length; ++i) {
                        {
                            var e = $root.polar_data.PbSwimmingPoolMetric.verify(m.poolMetric[i]);
                            if (e)
                                return "poolMetric." + e;
                        }
                    }
                }
                return null;
            };
    
            return PbSwimmingSamples;
        })();
    
        polar_data.PbSyncInfo = (function() {
    
            function PbSyncInfo(p) {
                this.changedPath = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSyncInfo.prototype.lastModified = null;
            PbSyncInfo.prototype.changedPath = $util.emptyArray;
            PbSyncInfo.prototype.lastSynchronized = null;
            PbSyncInfo.prototype.fullSyncRequired = true;
    
            PbSyncInfo.create = function create(properties) {
                return new PbSyncInfo(properties);
            };
    
            PbSyncInfo.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(10).fork()).ldelim();
                if (m.changedPath != null && m.changedPath.length) {
                    for (var i = 0; i < m.changedPath.length; ++i)
                        w.uint32(18).string(m.changedPath[i]);
                }
                if (m.lastSynchronized != null && m.hasOwnProperty("lastSynchronized"))
                    $root.polar_types.PbSystemDateTime.encode(m.lastSynchronized, w.uint32(26).fork()).ldelim();
                if (m.fullSyncRequired != null && m.hasOwnProperty("fullSyncRequired"))
                    w.uint32(32).bool(m.fullSyncRequired);
                return w;
            };
    
            PbSyncInfo.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                if (m.changedPath != null && m.hasOwnProperty("changedPath")) {
                    if (!Array.isArray(m.changedPath))
                        return "changedPath: array expected";
                    for (var i = 0; i < m.changedPath.length; ++i) {
                        if (!$util.isString(m.changedPath[i]))
                            return "changedPath: string[] expected";
                    }
                }
                if (m.lastSynchronized != null && m.hasOwnProperty("lastSynchronized")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.lastSynchronized);
                        if (e)
                            return "lastSynchronized." + e;
                    }
                }
                if (m.fullSyncRequired != null && m.hasOwnProperty("fullSyncRequired")) {
                    if (typeof m.fullSyncRequired !== "boolean")
                        return "fullSyncRequired: boolean expected";
                }
                return null;
            };
    
            return PbSyncInfo;
        })();
    
        polar_data.PbTeamMember = (function() {
    
            function PbTeamMember(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTeamMember.prototype.teamIdentifier = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
            PbTeamMember.prototype.playerNumber = 0;
            PbTeamMember.prototype.playerRole = null;
    
            PbTeamMember.create = function create(properties) {
                return new PbTeamMember(properties);
            };
    
            PbTeamMember.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.teamIdentifier);
                if (m.playerNumber != null && m.hasOwnProperty("playerNumber"))
                    w.uint32(16).uint32(m.playerNumber);
                if (m.playerRole != null && m.hasOwnProperty("playerRole"))
                    $root.polar_types.PbOneLineText.encode(m.playerRole, w.uint32(26).fork()).ldelim();
                return w;
            };
    
            PbTeamMember.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.teamIdentifier) && !(m.teamIdentifier && $util.isInteger(m.teamIdentifier.low) && $util.isInteger(m.teamIdentifier.high)))
                    return "teamIdentifier: integer|Long expected";
                if (m.playerNumber != null && m.hasOwnProperty("playerNumber")) {
                    if (!$util.isInteger(m.playerNumber))
                        return "playerNumber: integer expected";
                }
                if (m.playerRole != null && m.hasOwnProperty("playerRole")) {
                    {
                        var e = $root.polar_types.PbOneLineText.verify(m.playerRole);
                        if (e)
                            return "playerRole." + e;
                    }
                }
                return null;
            };
    
            return PbTeamMember;
        })();
    
        polar_data.PbSessionHeartRateStatistics = (function() {
    
            function PbSessionHeartRateStatistics(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSessionHeartRateStatistics.prototype.average = 0;
            PbSessionHeartRateStatistics.prototype.maximum = 0;
    
            PbSessionHeartRateStatistics.create = function create(properties) {
                return new PbSessionHeartRateStatistics(properties);
            };
    
            PbSessionHeartRateStatistics.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.average != null && m.hasOwnProperty("average"))
                    w.uint32(8).uint32(m.average);
                if (m.maximum != null && m.hasOwnProperty("maximum"))
                    w.uint32(16).uint32(m.maximum);
                return w;
            };
    
            PbSessionHeartRateStatistics.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.average != null && m.hasOwnProperty("average")) {
                    if (!$util.isInteger(m.average))
                        return "average: integer expected";
                }
                if (m.maximum != null && m.hasOwnProperty("maximum")) {
                    if (!$util.isInteger(m.maximum))
                        return "maximum: integer expected";
                }
                return null;
            };
    
            return PbSessionHeartRateStatistics;
        })();
    
        polar_data.PbTrainingSession = (function() {
    
            function PbTrainingSession(p) {
                this.heartRateZoneDuration = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTrainingSession.prototype.start = null;
            PbTrainingSession.prototype.end = null;
            PbTrainingSession.prototype.exerciseCount = 0;
            PbTrainingSession.prototype.deviceId = "";
            PbTrainingSession.prototype.modelName = "";
            PbTrainingSession.prototype.duration = null;
            PbTrainingSession.prototype.distance = 0;
            PbTrainingSession.prototype.calories = 0;
            PbTrainingSession.prototype.heartRate = null;
            PbTrainingSession.prototype.heartRateZoneDuration = $util.emptyArray;
            PbTrainingSession.prototype.trainingLoad = null;
            PbTrainingSession.prototype.sessionName = null;
            PbTrainingSession.prototype.feeling = 0;
            PbTrainingSession.prototype.note = null;
            PbTrainingSession.prototype.place = null;
            PbTrainingSession.prototype.latitude = 0;
            PbTrainingSession.prototype.longitude = 0;
            PbTrainingSession.prototype.benefit = 1;
            PbTrainingSession.prototype.sport = null;
            PbTrainingSession.prototype.trainingSessionTargetId = null;
            PbTrainingSession.prototype.trainingSessionFavoriteId = null;
    
            PbTrainingSession.create = function create(properties) {
                return new PbTrainingSession(properties);
            };
    
            PbTrainingSession.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbLocalDateTime.encode(m.start, w.uint32(10).fork()).ldelim();
                w.uint32(16).uint32(m.exerciseCount);
                if (m.deviceId != null && m.hasOwnProperty("deviceId"))
                    w.uint32(26).string(m.deviceId);
                if (m.modelName != null && m.hasOwnProperty("modelName"))
                    w.uint32(34).string(m.modelName);
                if (m.duration != null && m.hasOwnProperty("duration"))
                    $root.polar_types.PbDuration.encode(m.duration, w.uint32(42).fork()).ldelim();
                if (m.distance != null && m.hasOwnProperty("distance"))
                    w.uint32(53).float(m.distance);
                if (m.calories != null && m.hasOwnProperty("calories"))
                    w.uint32(56).uint32(m.calories);
                if (m.heartRate != null && m.hasOwnProperty("heartRate"))
                    $root.polar_data.PbSessionHeartRateStatistics.encode(m.heartRate, w.uint32(66).fork()).ldelim();
                if (m.heartRateZoneDuration != null && m.heartRateZoneDuration.length) {
                    for (var i = 0; i < m.heartRateZoneDuration.length; ++i)
                        $root.polar_types.PbDuration.encode(m.heartRateZoneDuration[i], w.uint32(74).fork()).ldelim();
                }
                if (m.trainingLoad != null && m.hasOwnProperty("trainingLoad"))
                    $root.polar_types.PbTrainingLoad.encode(m.trainingLoad, w.uint32(82).fork()).ldelim();
                if (m.sessionName != null && m.hasOwnProperty("sessionName"))
                    $root.polar_types.PbOneLineText.encode(m.sessionName, w.uint32(90).fork()).ldelim();
                if (m.feeling != null && m.hasOwnProperty("feeling"))
                    w.uint32(101).float(m.feeling);
                if (m.note != null && m.hasOwnProperty("note"))
                    $root.polar_types.PbMultiLineText.encode(m.note, w.uint32(106).fork()).ldelim();
                if (m.place != null && m.hasOwnProperty("place"))
                    $root.polar_types.PbOneLineText.encode(m.place, w.uint32(114).fork()).ldelim();
                if (m.latitude != null && m.hasOwnProperty("latitude"))
                    w.uint32(121).double(m.latitude);
                if (m.longitude != null && m.hasOwnProperty("longitude"))
                    w.uint32(129).double(m.longitude);
                if (m.benefit != null && m.hasOwnProperty("benefit"))
                    w.uint32(136).int32(m.benefit);
                if (m.sport != null && m.hasOwnProperty("sport"))
                    $root.polar_types.PbSportIdentifier.encode(m.sport, w.uint32(146).fork()).ldelim();
                if (m.trainingSessionTargetId != null && m.hasOwnProperty("trainingSessionTargetId"))
                    $root.polar_types.PbTrainingSessionTargetId.encode(m.trainingSessionTargetId, w.uint32(154).fork()).ldelim();
                if (m.end != null && m.hasOwnProperty("end"))
                    $root.polar_types.PbLocalDateTime.encode(m.end, w.uint32(162).fork()).ldelim();
                if (m.trainingSessionFavoriteId != null && m.hasOwnProperty("trainingSessionFavoriteId"))
                    $root.polar_types.PbTrainingSessionFavoriteId.encode(m.trainingSessionFavoriteId, w.uint32(170).fork()).ldelim();
                return w;
            };
    
            PbTrainingSession.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbLocalDateTime.verify(m.start);
                    if (e)
                        return "start." + e;
                }
                if (m.end != null && m.hasOwnProperty("end")) {
                    {
                        var e = $root.polar_types.PbLocalDateTime.verify(m.end);
                        if (e)
                            return "end." + e;
                    }
                }
                if (!$util.isInteger(m.exerciseCount))
                    return "exerciseCount: integer expected";
                if (m.deviceId != null && m.hasOwnProperty("deviceId")) {
                    if (!$util.isString(m.deviceId))
                        return "deviceId: string expected";
                }
                if (m.modelName != null && m.hasOwnProperty("modelName")) {
                    if (!$util.isString(m.modelName))
                        return "modelName: string expected";
                }
                if (m.duration != null && m.hasOwnProperty("duration")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.duration);
                        if (e)
                            return "duration." + e;
                    }
                }
                if (m.distance != null && m.hasOwnProperty("distance")) {
                    if (typeof m.distance !== "number")
                        return "distance: number expected";
                }
                if (m.calories != null && m.hasOwnProperty("calories")) {
                    if (!$util.isInteger(m.calories))
                        return "calories: integer expected";
                }
                if (m.heartRate != null && m.hasOwnProperty("heartRate")) {
                    {
                        var e = $root.polar_data.PbSessionHeartRateStatistics.verify(m.heartRate);
                        if (e)
                            return "heartRate." + e;
                    }
                }
                if (m.heartRateZoneDuration != null && m.hasOwnProperty("heartRateZoneDuration")) {
                    if (!Array.isArray(m.heartRateZoneDuration))
                        return "heartRateZoneDuration: array expected";
                    for (var i = 0; i < m.heartRateZoneDuration.length; ++i) {
                        {
                            var e = $root.polar_types.PbDuration.verify(m.heartRateZoneDuration[i]);
                            if (e)
                                return "heartRateZoneDuration." + e;
                        }
                    }
                }
                if (m.trainingLoad != null && m.hasOwnProperty("trainingLoad")) {
                    {
                        var e = $root.polar_types.PbTrainingLoad.verify(m.trainingLoad);
                        if (e)
                            return "trainingLoad." + e;
                    }
                }
                if (m.sessionName != null && m.hasOwnProperty("sessionName")) {
                    {
                        var e = $root.polar_types.PbOneLineText.verify(m.sessionName);
                        if (e)
                            return "sessionName." + e;
                    }
                }
                if (m.feeling != null && m.hasOwnProperty("feeling")) {
                    if (typeof m.feeling !== "number")
                        return "feeling: number expected";
                }
                if (m.note != null && m.hasOwnProperty("note")) {
                    {
                        var e = $root.polar_types.PbMultiLineText.verify(m.note);
                        if (e)
                            return "note." + e;
                    }
                }
                if (m.place != null && m.hasOwnProperty("place")) {
                    {
                        var e = $root.polar_types.PbOneLineText.verify(m.place);
                        if (e)
                            return "place." + e;
                    }
                }
                if (m.latitude != null && m.hasOwnProperty("latitude")) {
                    if (typeof m.latitude !== "number")
                        return "latitude: number expected";
                }
                if (m.longitude != null && m.hasOwnProperty("longitude")) {
                    if (typeof m.longitude !== "number")
                        return "longitude: number expected";
                }
                if (m.benefit != null && m.hasOwnProperty("benefit")) {
                    switch (m.benefit) {
                    default:
                        return "benefit: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                    case 8:
                    case 9:
                    case 10:
                    case 11:
                    case 12:
                    case 13:
                    case 14:
                    case 15:
                    case 16:
                    case 17:
                    case 18:
                        break;
                    }
                }
                if (m.sport != null && m.hasOwnProperty("sport")) {
                    {
                        var e = $root.polar_types.PbSportIdentifier.verify(m.sport);
                        if (e)
                            return "sport." + e;
                    }
                }
                if (m.trainingSessionTargetId != null && m.hasOwnProperty("trainingSessionTargetId")) {
                    {
                        var e = $root.polar_types.PbTrainingSessionTargetId.verify(m.trainingSessionTargetId);
                        if (e)
                            return "trainingSessionTargetId." + e;
                    }
                }
                if (m.trainingSessionFavoriteId != null && m.hasOwnProperty("trainingSessionFavoriteId")) {
                    {
                        var e = $root.polar_types.PbTrainingSessionFavoriteId.verify(m.trainingSessionFavoriteId);
                        if (e)
                            return "trainingSessionFavoriteId." + e;
                    }
                }
                return null;
            };
    
            return PbTrainingSession;
        })();
    
        polar_data.PbUserDb = (function() {
    
            function PbUserDb(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDb.prototype.currentUserIndex = 0;
    
            PbUserDb.create = function create(properties) {
                return new PbUserDb(properties);
            };
    
            PbUserDb.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.currentUserIndex);
                return w;
            };
    
            PbUserDb.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.currentUserIndex))
                    return "currentUserIndex: integer expected";
                return null;
            };
    
            return PbUserDb;
        })();
    
        polar_data.PbUserDeviceGeneralSettings = (function() {
    
            function PbUserDeviceGeneralSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceGeneralSettings.prototype.OBSOLETETimeSelection = 1;
            PbUserDeviceGeneralSettings.prototype.OBSOLETETime2Offset = 0;
            PbUserDeviceGeneralSettings.prototype.watchFace = 1;
            PbUserDeviceGeneralSettings.prototype.buttonLockMode = 1;
            PbUserDeviceGeneralSettings.prototype.buttonSoundVolume = null;
            PbUserDeviceGeneralSettings.prototype.vibrationMode = false;
            PbUserDeviceGeneralSettings.prototype.handedness = 1;
            PbUserDeviceGeneralSettings.prototype.exeviewInverted = false;
            PbUserDeviceGeneralSettings.prototype.tapButtonSensitivity = 1;
            PbUserDeviceGeneralSettings.prototype.inactivityAlert = 1;
            PbUserDeviceGeneralSettings.prototype.bleConnectModeEnable = false;
            PbUserDeviceGeneralSettings.prototype.backupWatchFace = 1;
            PbUserDeviceGeneralSettings.prototype.flightmode = 1;
            PbUserDeviceGeneralSettings.prototype.deviceLocation = 0;
            PbUserDeviceGeneralSettings.prototype.watchFaceColor = 0;
    
            PbUserDeviceGeneralSettings.create = function create(properties) {
                return new PbUserDeviceGeneralSettings(properties);
            };
    
            PbUserDeviceGeneralSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.OBSOLETETimeSelection != null && m.hasOwnProperty("OBSOLETETimeSelection"))
                    w.uint32(8).int32(m.OBSOLETETimeSelection);
                if (m.OBSOLETETime2Offset != null && m.hasOwnProperty("OBSOLETETime2Offset"))
                    w.uint32(16).int32(m.OBSOLETETime2Offset);
                if (m.watchFace != null && m.hasOwnProperty("watchFace"))
                    w.uint32(24).int32(m.watchFace);
                if (m.buttonLockMode != null && m.hasOwnProperty("buttonLockMode"))
                    w.uint32(32).int32(m.buttonLockMode);
                if (m.buttonSoundVolume != null && m.hasOwnProperty("buttonSoundVolume"))
                    $root.polar_types.PbVolume.encode(m.buttonSoundVolume, w.uint32(42).fork()).ldelim();
                if (m.vibrationMode != null && m.hasOwnProperty("vibrationMode"))
                    w.uint32(56).bool(m.vibrationMode);
                if (m.handedness != null && m.hasOwnProperty("handedness"))
                    w.uint32(64).int32(m.handedness);
                if (m.exeviewInverted != null && m.hasOwnProperty("exeviewInverted"))
                    w.uint32(72).bool(m.exeviewInverted);
                if (m.tapButtonSensitivity != null && m.hasOwnProperty("tapButtonSensitivity"))
                    w.uint32(80).int32(m.tapButtonSensitivity);
                if (m.inactivityAlert != null && m.hasOwnProperty("inactivityAlert"))
                    w.uint32(88).int32(m.inactivityAlert);
                if (m.bleConnectModeEnable != null && m.hasOwnProperty("bleConnectModeEnable"))
                    w.uint32(96).bool(m.bleConnectModeEnable);
                if (m.backupWatchFace != null && m.hasOwnProperty("backupWatchFace"))
                    w.uint32(104).int32(m.backupWatchFace);
                if (m.flightmode != null && m.hasOwnProperty("flightmode"))
                    w.uint32(112).int32(m.flightmode);
                if (m.deviceLocation != null && m.hasOwnProperty("deviceLocation"))
                    w.uint32(120).int32(m.deviceLocation);
                if (m.watchFaceColor != null && m.hasOwnProperty("watchFaceColor"))
                    w.uint32(128).int32(m.watchFaceColor);
                return w;
            };
    
            PbUserDeviceGeneralSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.OBSOLETETimeSelection != null && m.hasOwnProperty("OBSOLETETimeSelection")) {
                    switch (m.OBSOLETETimeSelection) {
                    default:
                        return "OBSOLETETimeSelection: enum value expected";
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.OBSOLETETime2Offset != null && m.hasOwnProperty("OBSOLETETime2Offset")) {
                    if (!$util.isInteger(m.OBSOLETETime2Offset))
                        return "OBSOLETETime2Offset: integer expected";
                }
                if (m.watchFace != null && m.hasOwnProperty("watchFace")) {
                    switch (m.watchFace) {
                    default:
                        return "watchFace: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                        break;
                    }
                }
                if (m.buttonLockMode != null && m.hasOwnProperty("buttonLockMode")) {
                    switch (m.buttonLockMode) {
                    default:
                        return "buttonLockMode: enum value expected";
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.buttonSoundVolume != null && m.hasOwnProperty("buttonSoundVolume")) {
                    {
                        var e = $root.polar_types.PbVolume.verify(m.buttonSoundVolume);
                        if (e)
                            return "buttonSoundVolume." + e;
                    }
                }
                if (m.vibrationMode != null && m.hasOwnProperty("vibrationMode")) {
                    if (typeof m.vibrationMode !== "boolean")
                        return "vibrationMode: boolean expected";
                }
                if (m.handedness != null && m.hasOwnProperty("handedness")) {
                    switch (m.handedness) {
                    default:
                        return "handedness: enum value expected";
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.exeviewInverted != null && m.hasOwnProperty("exeviewInverted")) {
                    if (typeof m.exeviewInverted !== "boolean")
                        return "exeviewInverted: boolean expected";
                }
                if (m.tapButtonSensitivity != null && m.hasOwnProperty("tapButtonSensitivity")) {
                    switch (m.tapButtonSensitivity) {
                    default:
                        return "tapButtonSensitivity: enum value expected";
                    case 1:
                    case 5:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                if (m.inactivityAlert != null && m.hasOwnProperty("inactivityAlert")) {
                    switch (m.inactivityAlert) {
                    default:
                        return "inactivityAlert: enum value expected";
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.bleConnectModeEnable != null && m.hasOwnProperty("bleConnectModeEnable")) {
                    if (typeof m.bleConnectModeEnable !== "boolean")
                        return "bleConnectModeEnable: boolean expected";
                }
                if (m.backupWatchFace != null && m.hasOwnProperty("backupWatchFace")) {
                    switch (m.backupWatchFace) {
                    default:
                        return "backupWatchFace: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                        break;
                    }
                }
                if (m.flightmode != null && m.hasOwnProperty("flightmode")) {
                    switch (m.flightmode) {
                    default:
                        return "flightmode: enum value expected";
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.deviceLocation != null && m.hasOwnProperty("deviceLocation")) {
                    switch (m.deviceLocation) {
                    default:
                        return "deviceLocation: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                    case 8:
                    case 9:
                    case 10:
                    case 11:
                    case 12:
                    case 13:
                        break;
                    }
                }
                if (m.watchFaceColor != null && m.hasOwnProperty("watchFaceColor")) {
                    if (!$util.isInteger(m.watchFaceColor))
                        return "watchFaceColor: integer expected";
                }
                return null;
            };
    
            PbUserDeviceGeneralSettings.PbFlightMode = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "FLIGHTMODE_OFF"] = 1;
                values[valuesById[2] = "FLIGHTMODE_ON"] = 2;
                return values;
            })();
    
            PbUserDeviceGeneralSettings.PbWatchFace = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "BASIC"] = 1;
                values[valuesById[2] = "AWARD"] = 2;
                values[valuesById[3] = "USER_NAME"] = 3;
                values[valuesById[4] = "EVENT"] = 4;
                values[valuesById[5] = "ANALOG"] = 5;
                values[valuesById[6] = "BIG"] = 6;
                values[valuesById[7] = "ACTIVITY"] = 7;
                return values;
            })();
    
            PbUserDeviceGeneralSettings.PbButtonLockMode = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "MANUAL"] = 1;
                values[valuesById[2] = "AUTO"] = 2;
                return values;
            })();
    
            PbUserDeviceGeneralSettings.PbHandedness = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "WU_IN_LEFT_HAND"] = 1;
                values[valuesById[2] = "WU_IN_RIGHT_HAND"] = 2;
                return values;
            })();
    
            PbUserDeviceGeneralSettings.PbTapButtonSensitivity = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "TAP_BUTTON_SENSITIVITY_OFF"] = 1;
                values[valuesById[5] = "TAP_BUTTON_SENSITIVITY_VERY_LOW"] = 5;
                values[valuesById[2] = "TAP_BUTTON_SENSITIVITY_LOW"] = 2;
                values[valuesById[3] = "TAP_BUTTON_SENSITIVITY_MEDIUM"] = 3;
                values[valuesById[4] = "TAP_BUTTON_SENSITIVITY_HIGH"] = 4;
                return values;
            })();
    
            PbUserDeviceGeneralSettings.PbInactivityAlert = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "INACTIVITY_ALERT_OFF"] = 1;
                values[valuesById[2] = "INACTIVITY_ALERT_ON"] = 2;
                return values;
            })();
    
            return PbUserDeviceGeneralSettings;
        })();
    
        polar_data.PbUserDeviceAlarmSettings = (function() {
    
            function PbUserDeviceAlarmSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceAlarmSettings.prototype.alarmMode = 1;
            PbUserDeviceAlarmSettings.prototype.alarmTime = null;
    
            PbUserDeviceAlarmSettings.create = function create(properties) {
                return new PbUserDeviceAlarmSettings(properties);
            };
    
            PbUserDeviceAlarmSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.alarmMode);
                $root.polar_types.PbTime.encode(m.alarmTime, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbUserDeviceAlarmSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.alarmMode) {
                default:
                    return "alarmMode: enum value expected";
                case 1:
                case 2:
                case 3:
                case 4:
                    break;
                }
                {
                    var e = $root.polar_types.PbTime.verify(m.alarmTime);
                    if (e)
                        return "alarmTime." + e;
                }
                return null;
            };
    
            PbUserDeviceAlarmSettings.PbAlarmMode = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "ALARM_MODE_OFF"] = 1;
                values[valuesById[2] = "ALARM_MODE_ONCE"] = 2;
                values[valuesById[3] = "ALARM_MODE_MON_TO_FRI"] = 3;
                values[valuesById[4] = "ALARM_MODE_EVERY_DAY"] = 4;
                return values;
            })();
    
            return PbUserDeviceAlarmSettings;
        })();
    
        polar_data.PbUserDeviceCountdownSettings = (function() {
    
            function PbUserDeviceCountdownSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceCountdownSettings.prototype.countdownTime = null;
    
            PbUserDeviceCountdownSettings.create = function create(properties) {
                return new PbUserDeviceCountdownSettings(properties);
            };
    
            PbUserDeviceCountdownSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDuration.encode(m.countdownTime, w.uint32(10).fork()).ldelim();
                return w;
            };
    
            PbUserDeviceCountdownSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.countdownTime);
                    if (e)
                        return "countdownTime." + e;
                }
                return null;
            };
    
            return PbUserDeviceCountdownSettings;
        })();
    
        polar_data.PbUserDeviceJumpTestSettings = (function() {
    
            function PbUserDeviceJumpTestSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceJumpTestSettings.prototype.contJumpDuration = null;
    
            PbUserDeviceJumpTestSettings.create = function create(properties) {
                return new PbUserDeviceJumpTestSettings(properties);
            };
    
            PbUserDeviceJumpTestSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDuration.encode(m.contJumpDuration, w.uint32(10).fork()).ldelim();
                return w;
            };
    
            PbUserDeviceJumpTestSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.contJumpDuration);
                    if (e)
                        return "contJumpDuration." + e;
                }
                return null;
            };
    
            return PbUserDeviceJumpTestSettings;
        })();
    
        polar_data.PbIntervalTimerValue = (function() {
    
            function PbIntervalTimerValue(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbIntervalTimerValue.prototype.intervalTimerType = 1;
            PbIntervalTimerValue.prototype.intervalTimerDuration = null;
            PbIntervalTimerValue.prototype.intervalTimerDistance = 0;
    
            PbIntervalTimerValue.create = function create(properties) {
                return new PbIntervalTimerValue(properties);
            };
    
            PbIntervalTimerValue.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.intervalTimerType);
                if (m.intervalTimerDuration != null && m.hasOwnProperty("intervalTimerDuration"))
                    $root.polar_types.PbDuration.encode(m.intervalTimerDuration, w.uint32(18).fork()).ldelim();
                if (m.intervalTimerDistance != null && m.hasOwnProperty("intervalTimerDistance"))
                    w.uint32(29).float(m.intervalTimerDistance);
                return w;
            };
    
            PbIntervalTimerValue.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.intervalTimerType) {
                default:
                    return "intervalTimerType: enum value expected";
                case 1:
                case 2:
                    break;
                }
                if (m.intervalTimerDuration != null && m.hasOwnProperty("intervalTimerDuration")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.intervalTimerDuration);
                        if (e)
                            return "intervalTimerDuration." + e;
                    }
                }
                if (m.intervalTimerDistance != null && m.hasOwnProperty("intervalTimerDistance")) {
                    if (typeof m.intervalTimerDistance !== "number")
                        return "intervalTimerDistance: number expected";
                }
                return null;
            };
    
            PbIntervalTimerValue.PbIntervalTimerType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "INTERVAL_TIMER_TYPE_DURATION"] = 1;
                values[valuesById[2] = "INTERVAL_TIMER_TYPE_DISTANCE"] = 2;
                return values;
            })();
    
            return PbIntervalTimerValue;
        })();
    
        polar_data.PbUserIntervalTimerSettings = (function() {
    
            function PbUserIntervalTimerSettings(p) {
                this.intervalTimerValue = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserIntervalTimerSettings.prototype.intervalTimerValue = $util.emptyArray;
    
            PbUserIntervalTimerSettings.create = function create(properties) {
                return new PbUserIntervalTimerSettings(properties);
            };
    
            PbUserIntervalTimerSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.intervalTimerValue != null && m.intervalTimerValue.length) {
                    for (var i = 0; i < m.intervalTimerValue.length; ++i)
                        $root.polar_data.PbIntervalTimerValue.encode(m.intervalTimerValue[i], w.uint32(10).fork()).ldelim();
                }
                return w;
            };
    
            PbUserIntervalTimerSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.intervalTimerValue != null && m.hasOwnProperty("intervalTimerValue")) {
                    if (!Array.isArray(m.intervalTimerValue))
                        return "intervalTimerValue: array expected";
                    for (var i = 0; i < m.intervalTimerValue.length; ++i) {
                        {
                            var e = $root.polar_data.PbIntervalTimerValue.verify(m.intervalTimerValue[i]);
                            if (e)
                                return "intervalTimerValue." + e;
                        }
                    }
                }
                return null;
            };
    
            return PbUserIntervalTimerSettings;
        })();
    
        polar_data.PbUserEndTimeEstimatorSettings = (function() {
    
            function PbUserEndTimeEstimatorSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserEndTimeEstimatorSettings.prototype.endTimeEstimatorTarget = 0;
    
            PbUserEndTimeEstimatorSettings.create = function create(properties) {
                return new PbUserEndTimeEstimatorSettings(properties);
            };
    
            PbUserEndTimeEstimatorSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.endTimeEstimatorTarget != null && m.hasOwnProperty("endTimeEstimatorTarget"))
                    w.uint32(13).float(m.endTimeEstimatorTarget);
                return w;
            };
    
            PbUserEndTimeEstimatorSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.endTimeEstimatorTarget != null && m.hasOwnProperty("endTimeEstimatorTarget")) {
                    if (typeof m.endTimeEstimatorTarget !== "number")
                        return "endTimeEstimatorTarget: number expected";
                }
                return null;
            };
    
            return PbUserEndTimeEstimatorSettings;
        })();
    
        polar_data.PbUserDeviceResearchSettings = (function() {
    
            function PbUserDeviceResearchSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceResearchSettings.prototype.accelerometerRawDataEnable = false;
            PbUserDeviceResearchSettings.prototype.gyroscopeRawDataEnable = false;
            PbUserDeviceResearchSettings.prototype.magnetometerRawDataEnable = false;
            PbUserDeviceResearchSettings.prototype.linearAccelerationDataEnable = false;
    
            PbUserDeviceResearchSettings.create = function create(properties) {
                return new PbUserDeviceResearchSettings(properties);
            };
    
            PbUserDeviceResearchSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.accelerometerRawDataEnable != null && m.hasOwnProperty("accelerometerRawDataEnable"))
                    w.uint32(8).bool(m.accelerometerRawDataEnable);
                if (m.gyroscopeRawDataEnable != null && m.hasOwnProperty("gyroscopeRawDataEnable"))
                    w.uint32(16).bool(m.gyroscopeRawDataEnable);
                if (m.magnetometerRawDataEnable != null && m.hasOwnProperty("magnetometerRawDataEnable"))
                    w.uint32(24).bool(m.magnetometerRawDataEnable);
                if (m.linearAccelerationDataEnable != null && m.hasOwnProperty("linearAccelerationDataEnable"))
                    w.uint32(32).bool(m.linearAccelerationDataEnable);
                return w;
            };
    
            PbUserDeviceResearchSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.accelerometerRawDataEnable != null && m.hasOwnProperty("accelerometerRawDataEnable")) {
                    if (typeof m.accelerometerRawDataEnable !== "boolean")
                        return "accelerometerRawDataEnable: boolean expected";
                }
                if (m.gyroscopeRawDataEnable != null && m.hasOwnProperty("gyroscopeRawDataEnable")) {
                    if (typeof m.gyroscopeRawDataEnable !== "boolean")
                        return "gyroscopeRawDataEnable: boolean expected";
                }
                if (m.magnetometerRawDataEnable != null && m.hasOwnProperty("magnetometerRawDataEnable")) {
                    if (typeof m.magnetometerRawDataEnable !== "boolean")
                        return "magnetometerRawDataEnable: boolean expected";
                }
                if (m.linearAccelerationDataEnable != null && m.hasOwnProperty("linearAccelerationDataEnable")) {
                    if (typeof m.linearAccelerationDataEnable !== "boolean")
                        return "linearAccelerationDataEnable: boolean expected";
                }
                return null;
            };
    
            return PbUserDeviceResearchSettings;
        })();
    
        polar_data.PbUserSafetyLightSettings = (function() {
    
            function PbUserSafetyLightSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserSafetyLightSettings.prototype.mode = 1;
            PbUserSafetyLightSettings.prototype.activationLevel = 1;
            PbUserSafetyLightSettings.prototype.blinkRate = 1;
    
            PbUserSafetyLightSettings.create = function create(properties) {
                return new PbUserSafetyLightSettings(properties);
            };
    
            PbUserSafetyLightSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.mode);
                if (m.activationLevel != null && m.hasOwnProperty("activationLevel"))
                    w.uint32(16).int32(m.activationLevel);
                if (m.blinkRate != null && m.hasOwnProperty("blinkRate"))
                    w.uint32(24).int32(m.blinkRate);
                return w;
            };
    
            PbUserSafetyLightSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.mode) {
                default:
                    return "mode: enum value expected";
                case 1:
                case 2:
                    break;
                }
                if (m.activationLevel != null && m.hasOwnProperty("activationLevel")) {
                    switch (m.activationLevel) {
                    default:
                        return "activationLevel: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                }
                if (m.blinkRate != null && m.hasOwnProperty("blinkRate")) {
                    switch (m.blinkRate) {
                    default:
                        return "blinkRate: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                return null;
            };
    
            PbUserSafetyLightSettings.PbSafetyLightMode = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "SAFETY_LIGHT_MANUAL"] = 1;
                values[valuesById[2] = "SAFETY_LIGHT_AUTOMATIC"] = 2;
                return values;
            })();
    
            PbUserSafetyLightSettings.PbSafetyLightActivationLevel = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "ACTIVATION_LEVEL_DARK"] = 1;
                values[valuesById[2] = "ACTIVATION_LEVEL_DUSK"] = 2;
                values[valuesById[3] = "ACTIVATION_LEVEL_LIGHT"] = 3;
                return values;
            })();
    
            PbUserSafetyLightSettings.PbSafetyLightBlinkRate = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "BLINK_RATE_OFF"] = 1;
                values[valuesById[2] = "BLINK_RATE_SLOW"] = 2;
                values[valuesById[3] = "BLINK_RATE_FAST"] = 3;
                values[valuesById[4] = "BLINK_RATE_VERY_FAST"] = 4;
                return values;
            })();
    
            return PbUserSafetyLightSettings;
        })();
    
        polar_data.PbDoNotDisturbSettings = (function() {
    
            function PbDoNotDisturbSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbDoNotDisturbSettings.prototype.enabled = false;
            PbDoNotDisturbSettings.prototype.start = null;
            PbDoNotDisturbSettings.prototype.end = null;
    
            PbDoNotDisturbSettings.create = function create(properties) {
                return new PbDoNotDisturbSettings(properties);
            };
    
            PbDoNotDisturbSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).bool(m.enabled);
                if (m.start != null && m.hasOwnProperty("start"))
                    $root.polar_types.PbTime.encode(m.start, w.uint32(18).fork()).ldelim();
                if (m.end != null && m.hasOwnProperty("end"))
                    $root.polar_types.PbTime.encode(m.end, w.uint32(26).fork()).ldelim();
                return w;
            };
    
            PbDoNotDisturbSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.enabled !== "boolean")
                    return "enabled: boolean expected";
                if (m.start != null && m.hasOwnProperty("start")) {
                    {
                        var e = $root.polar_types.PbTime.verify(m.start);
                        if (e)
                            return "start." + e;
                    }
                }
                if (m.end != null && m.hasOwnProperty("end")) {
                    {
                        var e = $root.polar_types.PbTime.verify(m.end);
                        if (e)
                            return "end." + e;
                    }
                }
                return null;
            };
    
            return PbDoNotDisturbSettings;
        })();
    
        polar_data.PbUserSmartWatchNotificationSettings = (function() {
    
            function PbUserSmartWatchNotificationSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserSmartWatchNotificationSettings.prototype.enabled = false;
            PbUserSmartWatchNotificationSettings.prototype.previewEnabled = false;
            PbUserSmartWatchNotificationSettings.prototype.doNotDisturbSettings = null;
            PbUserSmartWatchNotificationSettings.prototype.soundsEnabled = false;
    
            PbUserSmartWatchNotificationSettings.create = function create(properties) {
                return new PbUserSmartWatchNotificationSettings(properties);
            };
    
            PbUserSmartWatchNotificationSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).bool(m.enabled);
                if (m.previewEnabled != null && m.hasOwnProperty("previewEnabled"))
                    w.uint32(16).bool(m.previewEnabled);
                if (m.doNotDisturbSettings != null && m.hasOwnProperty("doNotDisturbSettings"))
                    $root.polar_data.PbDoNotDisturbSettings.encode(m.doNotDisturbSettings, w.uint32(26).fork()).ldelim();
                if (m.soundsEnabled != null && m.hasOwnProperty("soundsEnabled"))
                    w.uint32(32).bool(m.soundsEnabled);
                return w;
            };
    
            PbUserSmartWatchNotificationSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.enabled !== "boolean")
                    return "enabled: boolean expected";
                if (m.previewEnabled != null && m.hasOwnProperty("previewEnabled")) {
                    if (typeof m.previewEnabled !== "boolean")
                        return "previewEnabled: boolean expected";
                }
                if (m.doNotDisturbSettings != null && m.hasOwnProperty("doNotDisturbSettings")) {
                    {
                        var e = $root.polar_data.PbDoNotDisturbSettings.verify(m.doNotDisturbSettings);
                        if (e)
                            return "doNotDisturbSettings." + e;
                    }
                }
                if (m.soundsEnabled != null && m.hasOwnProperty("soundsEnabled")) {
                    if (typeof m.soundsEnabled !== "boolean")
                        return "soundsEnabled: boolean expected";
                }
                return null;
            };
    
            return PbUserSmartWatchNotificationSettings;
        })();
    
        polar_data.PbUserMapSettings = (function() {
    
            function PbUserMapSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserMapSettings.prototype.mapTopDirection = 1;
            PbUserMapSettings.prototype.bikeRouteDataEnabled = false;
            PbUserMapSettings.prototype.altitudeDataEnabled = false;
    
            PbUserMapSettings.create = function create(properties) {
                return new PbUserMapSettings(properties);
            };
    
            PbUserMapSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.mapTopDirection);
                if (m.bikeRouteDataEnabled != null && m.hasOwnProperty("bikeRouteDataEnabled"))
                    w.uint32(16).bool(m.bikeRouteDataEnabled);
                if (m.altitudeDataEnabled != null && m.hasOwnProperty("altitudeDataEnabled"))
                    w.uint32(24).bool(m.altitudeDataEnabled);
                return w;
            };
    
            PbUserMapSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.mapTopDirection) {
                default:
                    return "mapTopDirection: enum value expected";
                case 1:
                case 2:
                    break;
                }
                if (m.bikeRouteDataEnabled != null && m.hasOwnProperty("bikeRouteDataEnabled")) {
                    if (typeof m.bikeRouteDataEnabled !== "boolean")
                        return "bikeRouteDataEnabled: boolean expected";
                }
                if (m.altitudeDataEnabled != null && m.hasOwnProperty("altitudeDataEnabled")) {
                    if (typeof m.altitudeDataEnabled !== "boolean")
                        return "altitudeDataEnabled: boolean expected";
                }
                return null;
            };
    
            PbUserMapSettings.PbMapTopDirection = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "TOP_DIRECTION_NORTH"] = 1;
                values[valuesById[2] = "TOP_DIRECTION_HEADING"] = 2;
                return values;
            })();
    
            return PbUserMapSettings;
        })();
    
        polar_data.PbUserDeviceRinseDryMessageSettings = (function() {
    
            function PbUserDeviceRinseDryMessageSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceRinseDryMessageSettings.prototype.messageCount = 0;
            PbUserDeviceRinseDryMessageSettings.prototype.lastModified = null;
    
            PbUserDeviceRinseDryMessageSettings.create = function create(properties) {
                return new PbUserDeviceRinseDryMessageSettings(properties);
            };
    
            PbUserDeviceRinseDryMessageSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.messageCount);
                if (m.lastModified != null && m.hasOwnProperty("lastModified"))
                    $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbUserDeviceRinseDryMessageSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.messageCount))
                    return "messageCount: integer expected";
                if (m.lastModified != null && m.hasOwnProperty("lastModified")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                        if (e)
                            return "lastModified." + e;
                    }
                }
                return null;
            };
    
            return PbUserDeviceRinseDryMessageSettings;
        })();
    
        polar_data.PbUserDeviceMassStorageSettings = (function() {
    
            function PbUserDeviceMassStorageSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceMassStorageSettings.prototype.enabled = false;
    
            PbUserDeviceMassStorageSettings.create = function create(properties) {
                return new PbUserDeviceMassStorageSettings(properties);
            };
    
            PbUserDeviceMassStorageSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).bool(m.enabled);
                return w;
            };
    
            PbUserDeviceMassStorageSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.enabled !== "boolean")
                    return "enabled: boolean expected";
                return null;
            };
    
            return PbUserDeviceMassStorageSettings;
        })();
    
        polar_data.PbUserDeviceDoNotDisturbSettings = (function() {
    
            function PbUserDeviceDoNotDisturbSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceDoNotDisturbSettings.prototype.doNotDisturbOn = false;
            PbUserDeviceDoNotDisturbSettings.prototype.settingSource = 0;
    
            PbUserDeviceDoNotDisturbSettings.create = function create(properties) {
                return new PbUserDeviceDoNotDisturbSettings(properties);
            };
    
            PbUserDeviceDoNotDisturbSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).bool(m.doNotDisturbOn);
                if (m.settingSource != null && m.hasOwnProperty("settingSource"))
                    w.uint32(16).int32(m.settingSource);
                return w;
            };
    
            PbUserDeviceDoNotDisturbSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.doNotDisturbOn !== "boolean")
                    return "doNotDisturbOn: boolean expected";
                if (m.settingSource != null && m.hasOwnProperty("settingSource")) {
                    switch (m.settingSource) {
                    default:
                        return "settingSource: enum value expected";
                    case 0:
                    case 1:
                        break;
                    }
                }
                return null;
            };
    
            PbUserDeviceDoNotDisturbSettings.PbDoNotDisturbSettingSource = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "SOURCE_USER"] = 0;
                values[valuesById[1] = "SOURCE_TIMED"] = 1;
                return values;
            })();
    
            return PbUserDeviceDoNotDisturbSettings;
        })();
    
        polar_data.PbUserDeviceAutoSyncSettings = (function() {
    
            function PbUserDeviceAutoSyncSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceAutoSyncSettings.prototype.enabled = false;
    
            PbUserDeviceAutoSyncSettings.create = function create(properties) {
                return new PbUserDeviceAutoSyncSettings(properties);
            };
    
            PbUserDeviceAutoSyncSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).bool(m.enabled);
                return w;
            };
    
            PbUserDeviceAutoSyncSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.enabled !== "boolean")
                    return "enabled: boolean expected";
                return null;
            };
    
            return PbUserDeviceAutoSyncSettings;
        })();
    
        polar_data.PbUserDeviceAutomaticSampleSettings = (function() {
    
            function PbUserDeviceAutomaticSampleSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceAutomaticSampleSettings.prototype.ohr247Enabled = false;
    
            PbUserDeviceAutomaticSampleSettings.create = function create(properties) {
                return new PbUserDeviceAutomaticSampleSettings(properties);
            };
    
            PbUserDeviceAutomaticSampleSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).bool(m.ohr247Enabled);
                return w;
            };
    
            PbUserDeviceAutomaticSampleSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.ohr247Enabled !== "boolean")
                    return "ohr247Enabled: boolean expected";
                return null;
            };
    
            return PbUserDeviceAutomaticSampleSettings;
        })();
    
        polar_data.PbUserDeviceStravaSegmentsSettings = (function() {
    
            function PbUserDeviceStravaSegmentsSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceStravaSegmentsSettings.prototype.enabled = false;
    
            PbUserDeviceStravaSegmentsSettings.create = function create(properties) {
                return new PbUserDeviceStravaSegmentsSettings(properties);
            };
    
            PbUserDeviceStravaSegmentsSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).bool(m.enabled);
                return w;
            };
    
            PbUserDeviceStravaSegmentsSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.enabled !== "boolean")
                    return "enabled: boolean expected";
                return null;
            };
    
            return PbUserDeviceStravaSegmentsSettings;
        })();
    
        polar_data.PbUserDeviceDaylightSaving = (function() {
    
            function PbUserDeviceDaylightSaving(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceDaylightSaving.prototype.nextDaylightSavingTime = null;
            PbUserDeviceDaylightSaving.prototype.offset = 0;
    
            PbUserDeviceDaylightSaving.create = function create(properties) {
                return new PbUserDeviceDaylightSaving(properties);
            };
    
            PbUserDeviceDaylightSaving.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbSystemDateTime.encode(m.nextDaylightSavingTime, w.uint32(10).fork()).ldelim();
                w.uint32(16).int32(m.offset);
                return w;
            };
    
            PbUserDeviceDaylightSaving.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.nextDaylightSavingTime);
                    if (e)
                        return "nextDaylightSavingTime." + e;
                }
                if (!$util.isInteger(m.offset))
                    return "offset: integer expected";
                return null;
            };
    
            return PbUserDeviceDaylightSaving;
        })();
    
        polar_data.PbUserDeviceSettings = (function() {
    
            function PbUserDeviceSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserDeviceSettings.prototype.generalSettings = null;
            PbUserDeviceSettings.prototype.alarmSettings = null;
            PbUserDeviceSettings.prototype.countdownSettings = null;
            PbUserDeviceSettings.prototype.jumptestSettings = null;
            PbUserDeviceSettings.prototype.intervalTimerSettings = null;
            PbUserDeviceSettings.prototype.endTimeEstimatorSettings = null;
            PbUserDeviceSettings.prototype.researchSettings = null;
            PbUserDeviceSettings.prototype.safetyLightSettings = null;
            PbUserDeviceSettings.prototype.smartWatchNotificationSettings = null;
            PbUserDeviceSettings.prototype.mapSettings = null;
            PbUserDeviceSettings.prototype.rinseDryMessageSettings = null;
            PbUserDeviceSettings.prototype.massStorageSettings = null;
            PbUserDeviceSettings.prototype.doNotDisturbSettings = null;
            PbUserDeviceSettings.prototype.autoSyncSettings = null;
            PbUserDeviceSettings.prototype.automaticSampleSettings = null;
            PbUserDeviceSettings.prototype.stravaSegmentsSettings = null;
            PbUserDeviceSettings.prototype.daylightSaving = null;
            PbUserDeviceSettings.prototype.lastModified = null;
    
            PbUserDeviceSettings.create = function create(properties) {
                return new PbUserDeviceSettings(properties);
            };
    
            PbUserDeviceSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_data.PbUserDeviceGeneralSettings.encode(m.generalSettings, w.uint32(10).fork()).ldelim();
                if (m.alarmSettings != null && m.hasOwnProperty("alarmSettings"))
                    $root.polar_data.PbUserDeviceAlarmSettings.encode(m.alarmSettings, w.uint32(18).fork()).ldelim();
                if (m.countdownSettings != null && m.hasOwnProperty("countdownSettings"))
                    $root.polar_data.PbUserDeviceCountdownSettings.encode(m.countdownSettings, w.uint32(26).fork()).ldelim();
                if (m.jumptestSettings != null && m.hasOwnProperty("jumptestSettings"))
                    $root.polar_data.PbUserDeviceJumpTestSettings.encode(m.jumptestSettings, w.uint32(34).fork()).ldelim();
                if (m.intervalTimerSettings != null && m.hasOwnProperty("intervalTimerSettings"))
                    $root.polar_data.PbUserIntervalTimerSettings.encode(m.intervalTimerSettings, w.uint32(42).fork()).ldelim();
                if (m.endTimeEstimatorSettings != null && m.hasOwnProperty("endTimeEstimatorSettings"))
                    $root.polar_data.PbUserEndTimeEstimatorSettings.encode(m.endTimeEstimatorSettings, w.uint32(50).fork()).ldelim();
                if (m.researchSettings != null && m.hasOwnProperty("researchSettings"))
                    $root.polar_data.PbUserDeviceResearchSettings.encode(m.researchSettings, w.uint32(58).fork()).ldelim();
                if (m.safetyLightSettings != null && m.hasOwnProperty("safetyLightSettings"))
                    $root.polar_data.PbUserSafetyLightSettings.encode(m.safetyLightSettings, w.uint32(66).fork()).ldelim();
                if (m.smartWatchNotificationSettings != null && m.hasOwnProperty("smartWatchNotificationSettings"))
                    $root.polar_data.PbUserSmartWatchNotificationSettings.encode(m.smartWatchNotificationSettings, w.uint32(74).fork()).ldelim();
                if (m.mapSettings != null && m.hasOwnProperty("mapSettings"))
                    $root.polar_data.PbUserMapSettings.encode(m.mapSettings, w.uint32(82).fork()).ldelim();
                if (m.rinseDryMessageSettings != null && m.hasOwnProperty("rinseDryMessageSettings"))
                    $root.polar_data.PbUserDeviceRinseDryMessageSettings.encode(m.rinseDryMessageSettings, w.uint32(90).fork()).ldelim();
                if (m.massStorageSettings != null && m.hasOwnProperty("massStorageSettings"))
                    $root.polar_data.PbUserDeviceMassStorageSettings.encode(m.massStorageSettings, w.uint32(98).fork()).ldelim();
                if (m.doNotDisturbSettings != null && m.hasOwnProperty("doNotDisturbSettings"))
                    $root.polar_data.PbUserDeviceDoNotDisturbSettings.encode(m.doNotDisturbSettings, w.uint32(106).fork()).ldelim();
                if (m.autoSyncSettings != null && m.hasOwnProperty("autoSyncSettings"))
                    $root.polar_data.PbUserDeviceAutoSyncSettings.encode(m.autoSyncSettings, w.uint32(114).fork()).ldelim();
                if (m.automaticSampleSettings != null && m.hasOwnProperty("automaticSampleSettings"))
                    $root.polar_data.PbUserDeviceAutomaticSampleSettings.encode(m.automaticSampleSettings, w.uint32(122).fork()).ldelim();
                if (m.stravaSegmentsSettings != null && m.hasOwnProperty("stravaSegmentsSettings"))
                    $root.polar_data.PbUserDeviceStravaSegmentsSettings.encode(m.stravaSegmentsSettings, w.uint32(130).fork()).ldelim();
                if (m.daylightSaving != null && m.hasOwnProperty("daylightSaving"))
                    $root.polar_data.PbUserDeviceDaylightSaving.encode(m.daylightSaving, w.uint32(138).fork()).ldelim();
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(810).fork()).ldelim();
                return w;
            };
    
            PbUserDeviceSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_data.PbUserDeviceGeneralSettings.verify(m.generalSettings);
                    if (e)
                        return "generalSettings." + e;
                }
                if (m.alarmSettings != null && m.hasOwnProperty("alarmSettings")) {
                    {
                        var e = $root.polar_data.PbUserDeviceAlarmSettings.verify(m.alarmSettings);
                        if (e)
                            return "alarmSettings." + e;
                    }
                }
                if (m.countdownSettings != null && m.hasOwnProperty("countdownSettings")) {
                    {
                        var e = $root.polar_data.PbUserDeviceCountdownSettings.verify(m.countdownSettings);
                        if (e)
                            return "countdownSettings." + e;
                    }
                }
                if (m.jumptestSettings != null && m.hasOwnProperty("jumptestSettings")) {
                    {
                        var e = $root.polar_data.PbUserDeviceJumpTestSettings.verify(m.jumptestSettings);
                        if (e)
                            return "jumptestSettings." + e;
                    }
                }
                if (m.intervalTimerSettings != null && m.hasOwnProperty("intervalTimerSettings")) {
                    {
                        var e = $root.polar_data.PbUserIntervalTimerSettings.verify(m.intervalTimerSettings);
                        if (e)
                            return "intervalTimerSettings." + e;
                    }
                }
                if (m.endTimeEstimatorSettings != null && m.hasOwnProperty("endTimeEstimatorSettings")) {
                    {
                        var e = $root.polar_data.PbUserEndTimeEstimatorSettings.verify(m.endTimeEstimatorSettings);
                        if (e)
                            return "endTimeEstimatorSettings." + e;
                    }
                }
                if (m.researchSettings != null && m.hasOwnProperty("researchSettings")) {
                    {
                        var e = $root.polar_data.PbUserDeviceResearchSettings.verify(m.researchSettings);
                        if (e)
                            return "researchSettings." + e;
                    }
                }
                if (m.safetyLightSettings != null && m.hasOwnProperty("safetyLightSettings")) {
                    {
                        var e = $root.polar_data.PbUserSafetyLightSettings.verify(m.safetyLightSettings);
                        if (e)
                            return "safetyLightSettings." + e;
                    }
                }
                if (m.smartWatchNotificationSettings != null && m.hasOwnProperty("smartWatchNotificationSettings")) {
                    {
                        var e = $root.polar_data.PbUserSmartWatchNotificationSettings.verify(m.smartWatchNotificationSettings);
                        if (e)
                            return "smartWatchNotificationSettings." + e;
                    }
                }
                if (m.mapSettings != null && m.hasOwnProperty("mapSettings")) {
                    {
                        var e = $root.polar_data.PbUserMapSettings.verify(m.mapSettings);
                        if (e)
                            return "mapSettings." + e;
                    }
                }
                if (m.rinseDryMessageSettings != null && m.hasOwnProperty("rinseDryMessageSettings")) {
                    {
                        var e = $root.polar_data.PbUserDeviceRinseDryMessageSettings.verify(m.rinseDryMessageSettings);
                        if (e)
                            return "rinseDryMessageSettings." + e;
                    }
                }
                if (m.massStorageSettings != null && m.hasOwnProperty("massStorageSettings")) {
                    {
                        var e = $root.polar_data.PbUserDeviceMassStorageSettings.verify(m.massStorageSettings);
                        if (e)
                            return "massStorageSettings." + e;
                    }
                }
                if (m.doNotDisturbSettings != null && m.hasOwnProperty("doNotDisturbSettings")) {
                    {
                        var e = $root.polar_data.PbUserDeviceDoNotDisturbSettings.verify(m.doNotDisturbSettings);
                        if (e)
                            return "doNotDisturbSettings." + e;
                    }
                }
                if (m.autoSyncSettings != null && m.hasOwnProperty("autoSyncSettings")) {
                    {
                        var e = $root.polar_data.PbUserDeviceAutoSyncSettings.verify(m.autoSyncSettings);
                        if (e)
                            return "autoSyncSettings." + e;
                    }
                }
                if (m.automaticSampleSettings != null && m.hasOwnProperty("automaticSampleSettings")) {
                    {
                        var e = $root.polar_data.PbUserDeviceAutomaticSampleSettings.verify(m.automaticSampleSettings);
                        if (e)
                            return "automaticSampleSettings." + e;
                    }
                }
                if (m.stravaSegmentsSettings != null && m.hasOwnProperty("stravaSegmentsSettings")) {
                    {
                        var e = $root.polar_data.PbUserDeviceStravaSegmentsSettings.verify(m.stravaSegmentsSettings);
                        if (e)
                            return "stravaSegmentsSettings." + e;
                    }
                }
                if (m.daylightSaving != null && m.hasOwnProperty("daylightSaving")) {
                    {
                        var e = $root.polar_data.PbUserDeviceDaylightSaving.verify(m.daylightSaving);
                        if (e)
                            return "daylightSaving." + e;
                    }
                }
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                return null;
            };
    
            return PbUserDeviceSettings;
        })();
    
        polar_data.PbPasswordToken = (function() {
    
            function PbPasswordToken(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPasswordToken.prototype.token = $util.newBuffer([]);
            PbPasswordToken.prototype.encrypted = false;
    
            PbPasswordToken.create = function create(properties) {
                return new PbPasswordToken(properties);
            };
    
            PbPasswordToken.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).bytes(m.token);
                w.uint32(16).bool(m.encrypted);
                return w;
            };
    
            PbPasswordToken.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!(m.token && typeof m.token.length === "number" || $util.isString(m.token)))
                    return "token: buffer expected";
                if (typeof m.encrypted !== "boolean")
                    return "encrypted: boolean expected";
                return null;
            };
    
            return PbPasswordToken;
        })();
    
        polar_data.PbUserIdentifier = (function() {
    
            function PbUserIdentifier(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserIdentifier.prototype.masterIdentifier = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
            PbUserIdentifier.prototype.email = "";
            PbUserIdentifier.prototype.passwordToken = null;
            PbUserIdentifier.prototype.nickname = "";
            PbUserIdentifier.prototype.firstName = "";
            PbUserIdentifier.prototype.lastName = "";
            PbUserIdentifier.prototype.userIdLastModified = null;
    
            PbUserIdentifier.create = function create(properties) {
                return new PbUserIdentifier(properties);
            };
    
            PbUserIdentifier.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.masterIdentifier != null && m.hasOwnProperty("masterIdentifier"))
                    w.uint32(8).uint64(m.masterIdentifier);
                if (m.email != null && m.hasOwnProperty("email"))
                    w.uint32(18).string(m.email);
                if (m.passwordToken != null && m.hasOwnProperty("passwordToken"))
                    $root.polar_data.PbPasswordToken.encode(m.passwordToken, w.uint32(26).fork()).ldelim();
                if (m.nickname != null && m.hasOwnProperty("nickname"))
                    w.uint32(34).string(m.nickname);
                if (m.firstName != null && m.hasOwnProperty("firstName"))
                    w.uint32(42).string(m.firstName);
                if (m.lastName != null && m.hasOwnProperty("lastName"))
                    w.uint32(50).string(m.lastName);
                if (m.userIdLastModified != null && m.hasOwnProperty("userIdLastModified"))
                    $root.polar_types.PbSystemDateTime.encode(m.userIdLastModified, w.uint32(802).fork()).ldelim();
                return w;
            };
    
            PbUserIdentifier.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.masterIdentifier != null && m.hasOwnProperty("masterIdentifier")) {
                    if (!$util.isInteger(m.masterIdentifier) && !(m.masterIdentifier && $util.isInteger(m.masterIdentifier.low) && $util.isInteger(m.masterIdentifier.high)))
                        return "masterIdentifier: integer|Long expected";
                }
                if (m.email != null && m.hasOwnProperty("email")) {
                    if (!$util.isString(m.email))
                        return "email: string expected";
                }
                if (m.passwordToken != null && m.hasOwnProperty("passwordToken")) {
                    {
                        var e = $root.polar_data.PbPasswordToken.verify(m.passwordToken);
                        if (e)
                            return "passwordToken." + e;
                    }
                }
                if (m.nickname != null && m.hasOwnProperty("nickname")) {
                    if (!$util.isString(m.nickname))
                        return "nickname: string expected";
                }
                if (m.firstName != null && m.hasOwnProperty("firstName")) {
                    if (!$util.isString(m.firstName))
                        return "firstName: string expected";
                }
                if (m.lastName != null && m.hasOwnProperty("lastName")) {
                    if (!$util.isString(m.lastName))
                        return "lastName: string expected";
                }
                if (m.userIdLastModified != null && m.hasOwnProperty("userIdLastModified")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.userIdLastModified);
                        if (e)
                            return "userIdLastModified." + e;
                    }
                }
                return null;
            };
    
            return PbUserIdentifier;
        })();
    
        polar_data.PbUserBirthday = (function() {
    
            function PbUserBirthday(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserBirthday.prototype.value = null;
            PbUserBirthday.prototype.lastModified = null;
    
            PbUserBirthday.create = function create(properties) {
                return new PbUserBirthday(properties);
            };
    
            PbUserBirthday.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDate.encode(m.value, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbUserBirthday.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDate.verify(m.value);
                    if (e)
                        return "value." + e;
                }
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                return null;
            };
    
            return PbUserBirthday;
        })();
    
        polar_data.PbUserGender = (function() {
    
            function PbUserGender(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserGender.prototype.value = 1;
            PbUserGender.prototype.lastModified = null;
    
            PbUserGender.create = function create(properties) {
                return new PbUserGender(properties);
            };
    
            PbUserGender.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.value);
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbUserGender.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.value) {
                default:
                    return "value: enum value expected";
                case 1:
                case 2:
                    break;
                }
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                return null;
            };
    
            PbUserGender.Gender = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "MALE"] = 1;
                values[valuesById[2] = "FEMALE"] = 2;
                return values;
            })();
    
            return PbUserGender;
        })();
    
        polar_data.PbUserHrAttribute = (function() {
    
            function PbUserHrAttribute(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserHrAttribute.prototype.value = 0;
            PbUserHrAttribute.prototype.lastModified = null;
            PbUserHrAttribute.prototype.settingSource = 0;
    
            PbUserHrAttribute.create = function create(properties) {
                return new PbUserHrAttribute(properties);
            };
    
            PbUserHrAttribute.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.value);
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                if (m.settingSource != null && m.hasOwnProperty("settingSource"))
                    w.uint32(24).int32(m.settingSource);
                return w;
            };
    
            PbUserHrAttribute.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value))
                    return "value: integer expected";
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                if (m.settingSource != null && m.hasOwnProperty("settingSource")) {
                    switch (m.settingSource) {
                    default:
                        return "settingSource: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        break;
                    }
                }
                return null;
            };
    
            PbUserHrAttribute.HrSettingSource = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "SOURCE_DEFAULT"] = 0;
                values[valuesById[1] = "SOURCE_AGE_BASED"] = 1;
                values[valuesById[2] = "SOURCE_USER"] = 2;
                values[valuesById[3] = "SOURCE_MEASURED"] = 3;
                values[valuesById[4] = "SOURCE_KEEP"] = 4;
                return values;
            })();
    
            return PbUserHrAttribute;
        })();
    
        polar_data.PbUserWeight = (function() {
    
            function PbUserWeight(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserWeight.prototype.value = 0;
            PbUserWeight.prototype.lastModified = null;
            PbUserWeight.prototype.settingSource = 0;
    
            PbUserWeight.create = function create(properties) {
                return new PbUserWeight(properties);
            };
    
            PbUserWeight.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.value);
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                if (m.settingSource != null && m.hasOwnProperty("settingSource"))
                    w.uint32(24).int32(m.settingSource);
                return w;
            };
    
            PbUserWeight.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.value !== "number")
                    return "value: number expected";
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                if (m.settingSource != null && m.hasOwnProperty("settingSource")) {
                    switch (m.settingSource) {
                    default:
                        return "settingSource: enum value expected";
                    case 0:
                    case 2:
                    case 3:
                        break;
                    }
                }
                return null;
            };
    
            PbUserWeight.WeightSettingSource = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "SOURCE_DEFAULT"] = 0;
                values[valuesById[2] = "SOURCE_USER"] = 2;
                values[valuesById[3] = "SOURCE_MEASURED"] = 3;
                return values;
            })();
    
            return PbUserWeight;
        })();
    
        polar_data.PbUserHeight = (function() {
    
            function PbUserHeight(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserHeight.prototype.value = 0;
            PbUserHeight.prototype.lastModified = null;
    
            PbUserHeight.create = function create(properties) {
                return new PbUserHeight(properties);
            };
    
            PbUserHeight.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.value);
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbUserHeight.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.value !== "number")
                    return "value: number expected";
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                return null;
            };
    
            return PbUserHeight;
        })();
    
        polar_data.PbUserVo2Max = (function() {
    
            function PbUserVo2Max(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserVo2Max.prototype.value = 0;
            PbUserVo2Max.prototype.lastModified = null;
            PbUserVo2Max.prototype.settingSource = 0;
    
            PbUserVo2Max.create = function create(properties) {
                return new PbUserVo2Max(properties);
            };
    
            PbUserVo2Max.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.value);
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                if (m.settingSource != null && m.hasOwnProperty("settingSource"))
                    w.uint32(24).int32(m.settingSource);
                return w;
            };
    
            PbUserVo2Max.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value))
                    return "value: integer expected";
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                if (m.settingSource != null && m.hasOwnProperty("settingSource")) {
                    switch (m.settingSource) {
                    default:
                        return "settingSource: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                }
                return null;
            };
    
            PbUserVo2Max.Vo2MaxSettingSource = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "SOURCE_DEFAULT"] = 0;
                values[valuesById[1] = "SOURCE_ESTIMATE"] = 1;
                values[valuesById[2] = "SOURCE_USER"] = 2;
                values[valuesById[3] = "SOURCE_FITNESSTEST"] = 3;
                return values;
            })();
    
            return PbUserVo2Max;
        })();
    
        polar_data.PbUserTrainingBackground = (function() {
    
            function PbUserTrainingBackground(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserTrainingBackground.prototype.value = 10;
            PbUserTrainingBackground.prototype.lastModified = null;
    
            PbUserTrainingBackground.create = function create(properties) {
                return new PbUserTrainingBackground(properties);
            };
    
            PbUserTrainingBackground.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.value);
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbUserTrainingBackground.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.value) {
                default:
                    return "value: enum value expected";
                case 10:
                case 20:
                case 30:
                case 40:
                case 50:
                case 60:
                    break;
                }
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                return null;
            };
    
            PbUserTrainingBackground.TrainingBackground = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[10] = "OCCASIONAL"] = 10;
                values[valuesById[20] = "REGULAR"] = 20;
                values[valuesById[30] = "FREQUENT"] = 30;
                values[valuesById[40] = "HEAVY"] = 40;
                values[valuesById[50] = "SEMI_PRO"] = 50;
                values[valuesById[60] = "PRO"] = 60;
                return values;
            })();
    
            return PbUserTrainingBackground;
        })();
    
        polar_data.PbUserTypicalDay = (function() {
    
            function PbUserTypicalDay(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserTypicalDay.prototype.value = 1;
            PbUserTypicalDay.prototype.lastModified = null;
    
            PbUserTypicalDay.create = function create(properties) {
                return new PbUserTypicalDay(properties);
            };
    
            PbUserTypicalDay.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.value);
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbUserTypicalDay.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.value) {
                default:
                    return "value: enum value expected";
                case 1:
                case 2:
                case 3:
                    break;
                }
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                return null;
            };
    
            PbUserTypicalDay.TypicalDay = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "MOSTLY_SITTING"] = 1;
                values[valuesById[2] = "MOSTLY_STANDING"] = 2;
                values[valuesById[3] = "MOSTLY_MOVING"] = 3;
                return values;
            })();
    
            return PbUserTypicalDay;
        })();
    
        polar_data.PbWeeklyRecoveryTimeSum = (function() {
    
            function PbWeeklyRecoveryTimeSum(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbWeeklyRecoveryTimeSum.prototype.value = 0;
            PbWeeklyRecoveryTimeSum.prototype.lastModified = null;
    
            PbWeeklyRecoveryTimeSum.create = function create(properties) {
                return new PbWeeklyRecoveryTimeSum(properties);
            };
    
            PbWeeklyRecoveryTimeSum.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.value);
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbWeeklyRecoveryTimeSum.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.value !== "number")
                    return "value: number expected";
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                return null;
            };
    
            return PbWeeklyRecoveryTimeSum;
        })();
    
        polar_data.PbSpeedCalibrationOffset = (function() {
    
            function PbSpeedCalibrationOffset(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSpeedCalibrationOffset.prototype.value = 0;
            PbSpeedCalibrationOffset.prototype.lastModified = null;
    
            PbSpeedCalibrationOffset.create = function create(properties) {
                return new PbSpeedCalibrationOffset(properties);
            };
    
            PbSpeedCalibrationOffset.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.value);
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbSpeedCalibrationOffset.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.value !== "number")
                    return "value: number expected";
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                return null;
            };
    
            return PbSpeedCalibrationOffset;
        })();
    
        polar_data.PbUserFunctionalThresholdPower = (function() {
    
            function PbUserFunctionalThresholdPower(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserFunctionalThresholdPower.prototype.value = 0;
            PbUserFunctionalThresholdPower.prototype.lastModified = null;
            PbUserFunctionalThresholdPower.prototype.settingSource = 0;
    
            PbUserFunctionalThresholdPower.create = function create(properties) {
                return new PbUserFunctionalThresholdPower(properties);
            };
    
            PbUserFunctionalThresholdPower.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.value);
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                if (m.settingSource != null && m.hasOwnProperty("settingSource"))
                    w.uint32(24).int32(m.settingSource);
                return w;
            };
    
            PbUserFunctionalThresholdPower.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value))
                    return "value: integer expected";
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                if (m.settingSource != null && m.hasOwnProperty("settingSource")) {
                    switch (m.settingSource) {
                    default:
                        return "settingSource: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                }
                return null;
            };
    
            PbUserFunctionalThresholdPower.FTPSettingSource = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "SOURCE_DEFAULT"] = 0;
                values[valuesById[1] = "SOURCE_ESTIMATE"] = 1;
                values[valuesById[2] = "SOURCE_USER"] = 2;
                return values;
            })();
    
            return PbUserFunctionalThresholdPower;
        })();
    
        polar_data.PbUserPhysData = (function() {
    
            function PbUserPhysData(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserPhysData.prototype.birthday = null;
            PbUserPhysData.prototype.gender = null;
            PbUserPhysData.prototype.weight = null;
            PbUserPhysData.prototype.height = null;
            PbUserPhysData.prototype.maximumHeartrate = null;
            PbUserPhysData.prototype.restingHeartrate = null;
            PbUserPhysData.prototype.OBSOLETESittingHeartrate = null;
            PbUserPhysData.prototype.aerobicThreshold = null;
            PbUserPhysData.prototype.anaerobicThreshold = null;
            PbUserPhysData.prototype.vo2max = null;
            PbUserPhysData.prototype.trainingBackground = null;
            PbUserPhysData.prototype.typicalDay = null;
            PbUserPhysData.prototype.weeklyRecoveryTimeSum = null;
            PbUserPhysData.prototype.speedCalibrationOffset = null;
            PbUserPhysData.prototype.functionalThresholdPower = null;
            PbUserPhysData.prototype.lastModified = null;
            PbUserPhysData.prototype.snapshotStartTime = null;
    
            PbUserPhysData.create = function create(properties) {
                return new PbUserPhysData(properties);
            };
    
            PbUserPhysData.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_data.PbUserBirthday.encode(m.birthday, w.uint32(10).fork()).ldelim();
                $root.polar_data.PbUserGender.encode(m.gender, w.uint32(18).fork()).ldelim();
                if (m.weight != null && m.hasOwnProperty("weight"))
                    $root.polar_data.PbUserWeight.encode(m.weight, w.uint32(26).fork()).ldelim();
                if (m.height != null && m.hasOwnProperty("height"))
                    $root.polar_data.PbUserHeight.encode(m.height, w.uint32(34).fork()).ldelim();
                if (m.maximumHeartrate != null && m.hasOwnProperty("maximumHeartrate"))
                    $root.polar_data.PbUserHrAttribute.encode(m.maximumHeartrate, w.uint32(42).fork()).ldelim();
                if (m.restingHeartrate != null && m.hasOwnProperty("restingHeartrate"))
                    $root.polar_data.PbUserHrAttribute.encode(m.restingHeartrate, w.uint32(50).fork()).ldelim();
                if (m.OBSOLETESittingHeartrate != null && m.hasOwnProperty("OBSOLETESittingHeartrate"))
                    $root.polar_data.PbUserHrAttribute.encode(m.OBSOLETESittingHeartrate, w.uint32(58).fork()).ldelim();
                if (m.aerobicThreshold != null && m.hasOwnProperty("aerobicThreshold"))
                    $root.polar_data.PbUserHrAttribute.encode(m.aerobicThreshold, w.uint32(66).fork()).ldelim();
                if (m.anaerobicThreshold != null && m.hasOwnProperty("anaerobicThreshold"))
                    $root.polar_data.PbUserHrAttribute.encode(m.anaerobicThreshold, w.uint32(74).fork()).ldelim();
                if (m.vo2max != null && m.hasOwnProperty("vo2max"))
                    $root.polar_data.PbUserVo2Max.encode(m.vo2max, w.uint32(82).fork()).ldelim();
                if (m.trainingBackground != null && m.hasOwnProperty("trainingBackground"))
                    $root.polar_data.PbUserTrainingBackground.encode(m.trainingBackground, w.uint32(90).fork()).ldelim();
                if (m.typicalDay != null && m.hasOwnProperty("typicalDay"))
                    $root.polar_data.PbUserTypicalDay.encode(m.typicalDay, w.uint32(98).fork()).ldelim();
                if (m.weeklyRecoveryTimeSum != null && m.hasOwnProperty("weeklyRecoveryTimeSum"))
                    $root.polar_data.PbWeeklyRecoveryTimeSum.encode(m.weeklyRecoveryTimeSum, w.uint32(106).fork()).ldelim();
                if (m.speedCalibrationOffset != null && m.hasOwnProperty("speedCalibrationOffset"))
                    $root.polar_data.PbSpeedCalibrationOffset.encode(m.speedCalibrationOffset, w.uint32(114).fork()).ldelim();
                if (m.functionalThresholdPower != null && m.hasOwnProperty("functionalThresholdPower"))
                    $root.polar_data.PbUserFunctionalThresholdPower.encode(m.functionalThresholdPower, w.uint32(122).fork()).ldelim();
                if (m.lastModified != null && m.hasOwnProperty("lastModified"))
                    $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(802).fork()).ldelim();
                if (m.snapshotStartTime != null && m.hasOwnProperty("snapshotStartTime"))
                    $root.polar_types.PbLocalDateTime.encode(m.snapshotStartTime, w.uint32(810).fork()).ldelim();
                return w;
            };
    
            PbUserPhysData.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_data.PbUserBirthday.verify(m.birthday);
                    if (e)
                        return "birthday." + e;
                }
                {
                    var e = $root.polar_data.PbUserGender.verify(m.gender);
                    if (e)
                        return "gender." + e;
                }
                if (m.weight != null && m.hasOwnProperty("weight")) {
                    {
                        var e = $root.polar_data.PbUserWeight.verify(m.weight);
                        if (e)
                            return "weight." + e;
                    }
                }
                if (m.height != null && m.hasOwnProperty("height")) {
                    {
                        var e = $root.polar_data.PbUserHeight.verify(m.height);
                        if (e)
                            return "height." + e;
                    }
                }
                if (m.maximumHeartrate != null && m.hasOwnProperty("maximumHeartrate")) {
                    {
                        var e = $root.polar_data.PbUserHrAttribute.verify(m.maximumHeartrate);
                        if (e)
                            return "maximumHeartrate." + e;
                    }
                }
                if (m.restingHeartrate != null && m.hasOwnProperty("restingHeartrate")) {
                    {
                        var e = $root.polar_data.PbUserHrAttribute.verify(m.restingHeartrate);
                        if (e)
                            return "restingHeartrate." + e;
                    }
                }
                if (m.OBSOLETESittingHeartrate != null && m.hasOwnProperty("OBSOLETESittingHeartrate")) {
                    {
                        var e = $root.polar_data.PbUserHrAttribute.verify(m.OBSOLETESittingHeartrate);
                        if (e)
                            return "OBSOLETESittingHeartrate." + e;
                    }
                }
                if (m.aerobicThreshold != null && m.hasOwnProperty("aerobicThreshold")) {
                    {
                        var e = $root.polar_data.PbUserHrAttribute.verify(m.aerobicThreshold);
                        if (e)
                            return "aerobicThreshold." + e;
                    }
                }
                if (m.anaerobicThreshold != null && m.hasOwnProperty("anaerobicThreshold")) {
                    {
                        var e = $root.polar_data.PbUserHrAttribute.verify(m.anaerobicThreshold);
                        if (e)
                            return "anaerobicThreshold." + e;
                    }
                }
                if (m.vo2max != null && m.hasOwnProperty("vo2max")) {
                    {
                        var e = $root.polar_data.PbUserVo2Max.verify(m.vo2max);
                        if (e)
                            return "vo2max." + e;
                    }
                }
                if (m.trainingBackground != null && m.hasOwnProperty("trainingBackground")) {
                    {
                        var e = $root.polar_data.PbUserTrainingBackground.verify(m.trainingBackground);
                        if (e)
                            return "trainingBackground." + e;
                    }
                }
                if (m.typicalDay != null && m.hasOwnProperty("typicalDay")) {
                    {
                        var e = $root.polar_data.PbUserTypicalDay.verify(m.typicalDay);
                        if (e)
                            return "typicalDay." + e;
                    }
                }
                if (m.weeklyRecoveryTimeSum != null && m.hasOwnProperty("weeklyRecoveryTimeSum")) {
                    {
                        var e = $root.polar_data.PbWeeklyRecoveryTimeSum.verify(m.weeklyRecoveryTimeSum);
                        if (e)
                            return "weeklyRecoveryTimeSum." + e;
                    }
                }
                if (m.speedCalibrationOffset != null && m.hasOwnProperty("speedCalibrationOffset")) {
                    {
                        var e = $root.polar_data.PbSpeedCalibrationOffset.verify(m.speedCalibrationOffset);
                        if (e)
                            return "speedCalibrationOffset." + e;
                    }
                }
                if (m.functionalThresholdPower != null && m.hasOwnProperty("functionalThresholdPower")) {
                    {
                        var e = $root.polar_data.PbUserFunctionalThresholdPower.verify(m.functionalThresholdPower);
                        if (e)
                            return "functionalThresholdPower." + e;
                    }
                }
                if (m.lastModified != null && m.hasOwnProperty("lastModified")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                        if (e)
                            return "lastModified." + e;
                    }
                }
                if (m.snapshotStartTime != null && m.hasOwnProperty("snapshotStartTime")) {
                    {
                        var e = $root.polar_types.PbLocalDateTime.verify(m.snapshotStartTime);
                        if (e)
                            return "snapshotStartTime." + e;
                    }
                }
                return null;
            };
    
            return PbUserPhysData;
        })();
    
        polar_data.PbLocalizationPreferences = (function() {
    
            function PbLocalizationPreferences(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLocalizationPreferences.prototype.language = null;
            PbLocalizationPreferences.prototype.unitSystem = 1;
            PbLocalizationPreferences.prototype.timeFormat = 1;
            PbLocalizationPreferences.prototype.timeFormatSeparator = 1;
            PbLocalizationPreferences.prototype.dateFormat = 1;
            PbLocalizationPreferences.prototype.dateFormatSeparator = 1;
            PbLocalizationPreferences.prototype.firstdayOfWeek = 1;
    
            PbLocalizationPreferences.create = function create(properties) {
                return new PbLocalizationPreferences(properties);
            };
    
            PbLocalizationPreferences.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.language != null && m.hasOwnProperty("language"))
                    $root.polar_types.PbLanguageId.encode(m.language, w.uint32(10).fork()).ldelim();
                if (m.unitSystem != null && m.hasOwnProperty("unitSystem"))
                    w.uint32(16).int32(m.unitSystem);
                if (m.timeFormat != null && m.hasOwnProperty("timeFormat"))
                    w.uint32(24).int32(m.timeFormat);
                if (m.timeFormatSeparator != null && m.hasOwnProperty("timeFormatSeparator"))
                    w.uint32(32).int32(m.timeFormatSeparator);
                if (m.dateFormat != null && m.hasOwnProperty("dateFormat"))
                    w.uint32(40).int32(m.dateFormat);
                if (m.dateFormatSeparator != null && m.hasOwnProperty("dateFormatSeparator"))
                    w.uint32(48).int32(m.dateFormatSeparator);
                if (m.firstdayOfWeek != null && m.hasOwnProperty("firstdayOfWeek"))
                    w.uint32(56).int32(m.firstdayOfWeek);
                return w;
            };
    
            PbLocalizationPreferences.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.language != null && m.hasOwnProperty("language")) {
                    {
                        var e = $root.polar_types.PbLanguageId.verify(m.language);
                        if (e)
                            return "language." + e;
                    }
                }
                if (m.unitSystem != null && m.hasOwnProperty("unitSystem")) {
                    switch (m.unitSystem) {
                    default:
                        return "unitSystem: enum value expected";
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.timeFormat != null && m.hasOwnProperty("timeFormat")) {
                    switch (m.timeFormat) {
                    default:
                        return "timeFormat: enum value expected";
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.timeFormatSeparator != null && m.hasOwnProperty("timeFormatSeparator")) {
                    switch (m.timeFormatSeparator) {
                    default:
                        return "timeFormatSeparator: enum value expected";
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.dateFormat != null && m.hasOwnProperty("dateFormat")) {
                    switch (m.dateFormat) {
                    default:
                        return "dateFormat: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                }
                if (m.dateFormatSeparator != null && m.hasOwnProperty("dateFormatSeparator")) {
                    switch (m.dateFormatSeparator) {
                    default:
                        return "dateFormatSeparator: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                }
                if (m.firstdayOfWeek != null && m.hasOwnProperty("firstdayOfWeek")) {
                    switch (m.firstdayOfWeek) {
                    default:
                        return "firstdayOfWeek: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                }
                return null;
            };
    
            return PbLocalizationPreferences;
        })();
    
        polar_data.PbTrainingPreferences = (function() {
    
            function PbTrainingPreferences(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTrainingPreferences.prototype.OBSOLETEHeartRateZoneLock = 0;
            PbTrainingPreferences.prototype.heartRateView = 1;
    
            PbTrainingPreferences.create = function create(properties) {
                return new PbTrainingPreferences(properties);
            };
    
            PbTrainingPreferences.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.OBSOLETEHeartRateZoneLock != null && m.hasOwnProperty("OBSOLETEHeartRateZoneLock"))
                    w.uint32(8).uint32(m.OBSOLETEHeartRateZoneLock);
                if (m.heartRateView != null && m.hasOwnProperty("heartRateView"))
                    w.uint32(16).int32(m.heartRateView);
                return w;
            };
    
            PbTrainingPreferences.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.OBSOLETEHeartRateZoneLock != null && m.hasOwnProperty("OBSOLETEHeartRateZoneLock")) {
                    if (!$util.isInteger(m.OBSOLETEHeartRateZoneLock))
                        return "OBSOLETEHeartRateZoneLock: integer expected";
                }
                if (m.heartRateView != null && m.hasOwnProperty("heartRateView")) {
                    switch (m.heartRateView) {
                    default:
                        return "heartRateView: enum value expected";
                    case 1:
                    case 2:
                    case 3:
                        break;
                    }
                }
                return null;
            };
    
            return PbTrainingPreferences;
        })();
    
        polar_data.PbActivityGoalPreferences = (function() {
    
            function PbActivityGoalPreferences(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbActivityGoalPreferences.prototype.visible = false;
    
            PbActivityGoalPreferences.create = function create(properties) {
                return new PbActivityGoalPreferences(properties);
            };
    
            PbActivityGoalPreferences.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).bool(m.visible);
                return w;
            };
    
            PbActivityGoalPreferences.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.visible !== "boolean")
                    return "visible: boolean expected";
                return null;
            };
    
            return PbActivityGoalPreferences;
        })();
    
        polar_data.PbGeneralPreferences = (function() {
    
            function PbGeneralPreferences(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbGeneralPreferences.prototype.localizationPreferences = null;
            PbGeneralPreferences.prototype.trainingPreferences = null;
            PbGeneralPreferences.prototype.activityGoalPreferences = null;
            PbGeneralPreferences.prototype.lastModified = null;
    
            PbGeneralPreferences.create = function create(properties) {
                return new PbGeneralPreferences(properties);
            };
    
            PbGeneralPreferences.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.localizationPreferences != null && m.hasOwnProperty("localizationPreferences"))
                    $root.polar_data.PbLocalizationPreferences.encode(m.localizationPreferences, w.uint32(10).fork()).ldelim();
                if (m.trainingPreferences != null && m.hasOwnProperty("trainingPreferences"))
                    $root.polar_data.PbTrainingPreferences.encode(m.trainingPreferences, w.uint32(18).fork()).ldelim();
                if (m.activityGoalPreferences != null && m.hasOwnProperty("activityGoalPreferences"))
                    $root.polar_data.PbActivityGoalPreferences.encode(m.activityGoalPreferences, w.uint32(26).fork()).ldelim();
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(810).fork()).ldelim();
                return w;
            };
    
            PbGeneralPreferences.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.localizationPreferences != null && m.hasOwnProperty("localizationPreferences")) {
                    {
                        var e = $root.polar_data.PbLocalizationPreferences.verify(m.localizationPreferences);
                        if (e)
                            return "localizationPreferences." + e;
                    }
                }
                if (m.trainingPreferences != null && m.hasOwnProperty("trainingPreferences")) {
                    {
                        var e = $root.polar_data.PbTrainingPreferences.verify(m.trainingPreferences);
                        if (e)
                            return "trainingPreferences." + e;
                    }
                }
                if (m.activityGoalPreferences != null && m.hasOwnProperty("activityGoalPreferences")) {
                    {
                        var e = $root.polar_data.PbActivityGoalPreferences.verify(m.activityGoalPreferences);
                        if (e)
                            return "activityGoalPreferences." + e;
                    }
                }
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                return null;
            };
    
            return PbGeneralPreferences;
        })();
    
        polar_data.PbUserTestPreferences = (function() {
    
            function PbUserTestPreferences(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbUserTestPreferences.prototype.orthostaticTestReset = null;
            PbUserTestPreferences.prototype.lastModified = null;
    
            PbUserTestPreferences.create = function create(properties) {
                return new PbUserTestPreferences(properties);
            };
    
            PbUserTestPreferences.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.orthostaticTestReset != null && m.hasOwnProperty("orthostaticTestReset"))
                    $root.polar_types.PbLocalDateTime.encode(m.orthostaticTestReset, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(810).fork()).ldelim();
                return w;
            };
    
            PbUserTestPreferences.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.orthostaticTestReset != null && m.hasOwnProperty("orthostaticTestReset")) {
                    {
                        var e = $root.polar_types.PbLocalDateTime.verify(m.orthostaticTestReset);
                        if (e)
                            return "orthostaticTestReset." + e;
                    }
                }
                {
                    var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                    if (e)
                        return "lastModified." + e;
                }
                return null;
            };
    
            return PbUserTestPreferences;
        })();
    
        return polar_data;
    })();
    
    $root.polar_types = (function() {
    
        var polar_types = {};
    
        polar_types.PbDataType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "TYPE_UNDEFINED"] = 0;
            values[valuesById[1] = "TYPE_INHERITED"] = 1;
            values[valuesById[2] = "TYPE_ENUM"] = 2;
            values[valuesById[3] = "TYPE_MILLIS"] = 3;
            values[valuesById[4] = "TYPE_SECOND"] = 4;
            values[valuesById[5] = "TYPE_MINUTE"] = 5;
            values[valuesById[6] = "TYPE_HOUR"] = 6;
            values[valuesById[7] = "TYPE_HOURS"] = 7;
            values[valuesById[8] = "TYPE_DAY"] = 8;
            values[valuesById[9] = "TYPE_MONTH"] = 9;
            values[valuesById[10] = "TYPE_YEAR"] = 10;
            values[valuesById[11] = "TYPE_WEIGHT"] = 11;
            values[valuesById[12] = "TYPE_HEIGHT"] = 12;
            values[valuesById[13] = "TYPE_VO2MAX"] = 13;
            values[valuesById[20] = "TYPE_HEARTRATE"] = 20;
            values[valuesById[21] = "TYPE_HR_PERCENT"] = 21;
            values[valuesById[22] = "TYPE_HR_RESERVE"] = 22;
            values[valuesById[23] = "TYPE_SPEED"] = 23;
            values[valuesById[24] = "TYPE_CADENCE"] = 24;
            values[valuesById[25] = "TYPE_ALTITUDE"] = 25;
            values[valuesById[26] = "TYPE_POWER"] = 26;
            values[valuesById[27] = "TYPE_POWER_LRB"] = 27;
            values[valuesById[28] = "TYPE_POWER_PI"] = 28;
            values[valuesById[29] = "TYPE_TEMPERATURE"] = 29;
            values[valuesById[30] = "TYPE_ACTIVITY"] = 30;
            values[valuesById[31] = "TYPE_STRIDE_LENGTH"] = 31;
            values[valuesById[32] = "TYPE_INCLINE"] = 32;
            values[valuesById[33] = "TYPE_DECLINE"] = 33;
            values[valuesById[52] = "TYPE_DISTANCE"] = 52;
            values[valuesById[53] = "TYPE_ENERGY"] = 53;
            values[valuesById[54] = "TYPE_FAT_PERCENTS"] = 54;
            values[valuesById[55] = "TYPE_ASCENT"] = 55;
            values[valuesById[56] = "TYPE_DESCENT"] = 56;
            values[valuesById[57] = "TYPE_LATITUDE"] = 57;
            values[valuesById[58] = "TYPE_LONGITUDE"] = 58;
            values[valuesById[59] = "TYPE_HERTZ"] = 59;
            values[valuesById[60] = "TYPE_PERCENT"] = 60;
            values[valuesById[61] = "TYPE_CUMULATED_ACTIVITY_DAY"] = 61;
            values[valuesById[62] = "TYPE_RUNNING_INDEX"] = 62;
            values[valuesById[63] = "TYPE_RR_INTERVAL"] = 63;
            values[valuesById[64] = "TYPE_Z_INDEX"] = 64;
            values[valuesById[65] = "TYPE_EXERCISE_TARGET_INDEX"] = 65;
            values[valuesById[66] = "TYPE_TIME_ZONE_OFFSET"] = 66;
            values[valuesById[67] = "TYPE_WHEEL_SIZE"] = 67;
            values[valuesById[68] = "TYPE_FITNESS_CLASS"] = 68;
            values[valuesById[69] = "TYPE_ACCELERATION"] = 69;
            values[valuesById[70] = "TYPE_CRANK_LENGTH"] = 70;
            values[valuesById[71] = "TYPE_ANGLE_DEGREE"] = 71;
            values[valuesById[72] = "TYPE_NEWTON"] = 72;
            values[valuesById[73] = "TYPE_FUNCTIONAL_THRESHOLD_POWER"] = 73;
            values[valuesById[74] = "TYPE_CALORIES"] = 74;
            values[valuesById[75] = "TYPE_SPEED_CALIBRATION_OFFSET"] = 75;
            return values;
        })();
    
        polar_types.PbHeartRateView = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "HEART_RATE_VIEW_BPM"] = 1;
            values[valuesById[2] = "HEART_RATE_VIEW_PERCENTS_OF_HR_RESERVE"] = 2;
            values[valuesById[3] = "HEART_RATE_VIEW_PERCENTS_OF_MAX_HR"] = 3;
            return values;
        })();
    
        polar_types.PbUnitSystem = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "METRIC"] = 1;
            values[valuesById[2] = "IMPERIAL"] = 2;
            return values;
        })();
    
        polar_types.PbTimeSelection = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "TIME_1"] = 1;
            values[valuesById[2] = "TIME_2"] = 2;
            return values;
        })();
    
        polar_types.PbTimeFormat = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "TIME_FORMAT_24H"] = 1;
            values[valuesById[2] = "TIME_FORMAT_12H"] = 2;
            return values;
        })();
    
        polar_types.PbTimeFormatSeparator = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "TIME_FORMAT_SEPARATOR_DOT"] = 1;
            values[valuesById[2] = "TIME_FORMAT_SEPARATOR_COLON"] = 2;
            return values;
        })();
    
        polar_types.PbStartDayOfWeek = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "MONDAY"] = 1;
            values[valuesById[2] = "SATURDAY"] = 2;
            values[valuesById[3] = "SUNDAY"] = 3;
            return values;
        })();
    
        polar_types.PbDateFormatSeparator = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "DOT"] = 1;
            values[valuesById[2] = "SLASH"] = 2;
            values[valuesById[3] = "HYPHEN"] = 3;
            return values;
        })();
    
        polar_types.PbDateFormat = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "DD_MM_YYYY"] = 1;
            values[valuesById[2] = "MM_DD_YYYY"] = 2;
            values[valuesById[3] = "YYYY_MM_DD"] = 3;
            return values;
        })();
    
        polar_types.PbFeatureType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "FEATURE_TYPE_HEART_RATE"] = 1;
            values[valuesById[2] = "FEATURE_TYPE_RR_INTERVAL"] = 2;
            values[valuesById[3] = "FEATURE_TYPE_SPEED"] = 3;
            values[valuesById[4] = "FEATURE_TYPE_DISTANCE"] = 4;
            values[valuesById[5] = "FEATURE_TYPE_BIKE_CADENCE"] = 5;
            values[valuesById[6] = "FEATURE_TYPE_BIKE_POWER"] = 6;
            values[valuesById[7] = "FEATURE_TYPE_GPS_LOCATION"] = 7;
            values[valuesById[8] = "FEATURE_TYPE_RUNNING_CADENCE"] = 8;
            values[valuesById[9] = "FEATURE_TYPE_PRESS_TEMPERATURE"] = 9;
            values[valuesById[10] = "FEATURE_TYPE_ALTITUDE"] = 10;
            values[valuesById[11] = "FEATURE_TYPE_STEPS"] = 11;
            values[valuesById[12] = "FEATURE_TYPE_ACTIVITY"] = 12;
            values[valuesById[13] = "FEATURE_TYPE_STRIDE_LENGTH"] = 13;
            values[valuesById[14] = "FEATURE_TYPE_RSC_MOVING_TYPE"] = 14;
            values[valuesById[15] = "FEATURE_TYPE_JUMP_HEIGTH"] = 15;
            values[valuesById[16] = "FEATURE_TYPE_COMPASS_HEADING"] = 16;
            values[valuesById[17] = "FEATURE_TYPE_GPS_SPEED"] = 17;
            values[valuesById[18] = "FEATURE_TYPE_GPS_DISTANCE"] = 18;
            values[valuesById[19] = "FEATURE_TYPE_GPS_ALTITUDE"] = 19;
            values[valuesById[20] = "FEATURE_TYPE_BIKE_WHEEL_REVOLUTION"] = 20;
            values[valuesById[21] = "FEATURE_TYPE_BIKE_CRANK_REVOLUTION"] = 21;
            values[valuesById[22] = "FEATURE_TYPE_AS_SPEED"] = 22;
            values[valuesById[23] = "FEATURE_TYPE_AS_CADENCE"] = 23;
            values[valuesById[24] = "FEATURE_TYPE_AS_DISTANCE"] = 24;
            values[valuesById[25] = "FEATURE_TYPE_AS_SWR_STATE"] = 25;
            values[valuesById[26] = "FEATURE_TYPE_BATTERY_LEVEL"] = 26;
            values[valuesById[27] = "FEATURE_TYPE_FILE_TRANSFER"] = 27;
            values[valuesById[28] = "FEATURE_TYPE_PUSH_NOTIFICATIONS"] = 28;
            values[valuesById[29] = "FEATURE_TYPE_WEIGHT_SCALE"] = 29;
            return values;
        })();
    
        polar_types.PbMovingType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "WALKING"] = 0;
            values[valuesById[1] = "RUNNING"] = 1;
            values[valuesById[2] = "STANDING"] = 2;
            return values;
        })();
    
        polar_types.PbOperationType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "MULTIPLY"] = 1;
            values[valuesById[2] = "SUM"] = 2;
            return values;
        })();
    
        polar_types.PbExerciseFeedback = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "FEEDBACK_NONE"] = 1;
            values[valuesById[2] = "FEEDBACK_1"] = 2;
            values[valuesById[3] = "FEEDBACK_2"] = 3;
            values[valuesById[4] = "FEEDBACK_3"] = 4;
            values[valuesById[5] = "FEEDBACK_4"] = 5;
            values[valuesById[6] = "FEEDBACK_5"] = 6;
            values[valuesById[7] = "FEEDBACK_6"] = 7;
            values[valuesById[8] = "FEEDBACK_7"] = 8;
            values[valuesById[9] = "FEEDBACK_8"] = 9;
            values[valuesById[10] = "FEEDBACK_9"] = 10;
            values[valuesById[11] = "FEEDBACK_10"] = 11;
            values[valuesById[12] = "FEEDBACK_11"] = 12;
            values[valuesById[13] = "FEEDBACK_12"] = 13;
            values[valuesById[14] = "FEEDBACK_13"] = 14;
            values[valuesById[15] = "FEEDBACK_14"] = 15;
            values[valuesById[16] = "FEEDBACK_15"] = 16;
            values[valuesById[17] = "FEEDBACK_16"] = 17;
            values[valuesById[18] = "FEEDBACK_17"] = 18;
            return values;
        })();
    
        polar_types.PbHeartRateZoneSettingSource = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "HEART_RATE_ZONE_SETTING_SOURCE_DEFAULT"] = 0;
            values[valuesById[1] = "HEART_RATE_ZONE_SETTING_SOURCE_THRESHOLD"] = 1;
            values[valuesById[2] = "HEART_RATE_ZONE_SETTING_SOURCE_FREE"] = 2;
            return values;
        })();
    
        polar_types.PbPowerZoneSettingSource = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "POWER_ZONE_SETTING_SOURCE_DEFAULT"] = 0;
            values[valuesById[1] = "POWER_ZONE_SETTING_SOURCE_FREE"] = 1;
            return values;
        })();
    
        polar_types.PbSpeedZoneSettingSource = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "SPEED_ZONE_SETTING_SOURCE_DEFAULT"] = 0;
            values[valuesById[1] = "SPEED_ZONE_SETTING_SOURCE_FREE"] = 1;
            return values;
        })();
    
        polar_types.PbMacType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "MAC_TYPE_PUBLIC"] = 0;
            values[valuesById[1] = "MAC_TYPE_STATIC"] = 1;
            values[valuesById[2] = "MAC_TYPE_PRIVATE_NONRESOLVABLE"] = 2;
            values[valuesById[3] = "MAC_TYPE_PRIVATE_RESOLVABLE"] = 3;
            values[valuesById[4] = "MAC_TYPE_BT_CLASSIC"] = 4;
            return values;
        })();
    
        polar_types.PbSwimmingStyle = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[-1] = "OTHER"] = -1;
            values[valuesById[0] = "TURN"] = 0;
            values[valuesById[10] = "OTHER_SWIMMING"] = 10;
            values[valuesById[11] = "FREESTYLE"] = 11;
            values[valuesById[12] = "BREASTSTROKE"] = 12;
            values[valuesById[13] = "BACKSTROKE"] = 13;
            values[valuesById[14] = "BUTTERFLY"] = 14;
            return values;
        })();
    
        polar_types.PbSwimmingPoolUnits = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "SWIMMING_POOL_METERS"] = 0;
            values[valuesById[1] = "SWIMMING_POOL_YARDS"] = 1;
            return values;
        })();
    
        polar_types.PbExerciseTargetType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "EXERCISE_TARGET_TYPE_FREE"] = 0;
            values[valuesById[1] = "EXERCISE_TARGET_TYPE_VOLUME"] = 1;
            values[valuesById[2] = "EXERCISE_TARGET_TYPE_PHASED"] = 2;
            values[valuesById[3] = "EXERCISE_TARGET_TYPE_ROUTE"] = 3;
            values[valuesById[4] = "EXERCISE_TARGET_TYPE_STEADY_RACE_PACE"] = 4;
            values[valuesById[5] = "EXERCISE_TARGET_TYPE_ROUTE_RACE_PACE"] = 5;
            values[valuesById[6] = "EXERCISE_TARGET_TYPE_STRAVA_SEGMENT"] = 6;
            return values;
        })();
    
        polar_types.PbDeviceLocation = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "DEVICE_LOCATION_UNDEFINED"] = 0;
            values[valuesById[1] = "DEVICE_LOCATION_OTHER"] = 1;
            values[valuesById[2] = "DEVICE_LOCATION_WRIST_LEFT"] = 2;
            values[valuesById[3] = "DEVICE_LOCATION_WRIST_RIGHT"] = 3;
            values[valuesById[4] = "DEVICE_LOCATION_NECKLACE"] = 4;
            values[valuesById[5] = "DEVICE_LOCATION_CHEST"] = 5;
            values[valuesById[6] = "DEVICE_LOCATION_UPPER_BACK"] = 6;
            values[valuesById[7] = "DEVICE_LOCATION_FOOT_LEFT"] = 7;
            values[valuesById[8] = "DEVICE_LOCATION_FOOT_RIGHT"] = 8;
            values[valuesById[9] = "DEVICE_LOCATION_LOWER_ARM_LEFT"] = 9;
            values[valuesById[10] = "DEVICE_LOCATION_LOWER_ARM_RIGHT"] = 10;
            values[valuesById[11] = "DEVICE_LOCATION_UPPER_ARM_LEFT"] = 11;
            values[valuesById[12] = "DEVICE_LOCATION_UPPER_ARM_RIGHT"] = 12;
            values[valuesById[13] = "DEVICE_LOCATION_BIKE_MOUNT"] = 13;
            return values;
        })();
    
        polar_types.PbRangeOptions = (function() {
    
            function PbRangeOptions(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRangeOptions.prototype.minValue = 0;
            PbRangeOptions.prototype.maxValue = 0;
    
            PbRangeOptions.create = function create(properties) {
                return new PbRangeOptions(properties);
            };
    
            PbRangeOptions.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.minValue != null && m.hasOwnProperty("minValue"))
                    w.uint32(8).int32(m.minValue);
                if (m.maxValue != null && m.hasOwnProperty("maxValue"))
                    w.uint32(16).int32(m.maxValue);
                return w;
            };
    
            PbRangeOptions.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.minValue != null && m.hasOwnProperty("minValue")) {
                    if (!$util.isInteger(m.minValue))
                        return "minValue: integer expected";
                }
                if (m.maxValue != null && m.hasOwnProperty("maxValue")) {
                    if (!$util.isInteger(m.maxValue))
                        return "maxValue: integer expected";
                }
                return null;
            };
    
            return PbRangeOptions;
        })();
    
        polar_types.PbDate = (function() {
    
            function PbDate(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbDate.prototype.year = 0;
            PbDate.prototype.month = 0;
            PbDate.prototype.day = 0;
    
            PbDate.create = function create(properties) {
                return new PbDate(properties);
            };
    
            PbDate.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.year);
                w.uint32(16).uint32(m.month);
                w.uint32(24).uint32(m.day);
                return w;
            };
    
            PbDate.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.year))
                    return "year: integer expected";
                if (!$util.isInteger(m.month))
                    return "month: integer expected";
                if (!$util.isInteger(m.day))
                    return "day: integer expected";
                return null;
            };
    
            return PbDate;
        })();
    
        polar_types.PbTime = (function() {
    
            function PbTime(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTime.prototype.hour = 0;
            PbTime.prototype.minute = 0;
            PbTime.prototype.seconds = 0;
            PbTime.prototype.millis = 0;
    
            PbTime.create = function create(properties) {
                return new PbTime(properties);
            };
    
            PbTime.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.hour);
                w.uint32(16).uint32(m.minute);
                w.uint32(24).uint32(m.seconds);
                if (m.millis != null && m.hasOwnProperty("millis"))
                    w.uint32(32).uint32(m.millis);
                return w;
            };
    
            PbTime.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.hour))
                    return "hour: integer expected";
                if (!$util.isInteger(m.minute))
                    return "minute: integer expected";
                if (!$util.isInteger(m.seconds))
                    return "seconds: integer expected";
                if (m.millis != null && m.hasOwnProperty("millis")) {
                    if (!$util.isInteger(m.millis))
                        return "millis: integer expected";
                }
                return null;
            };
    
            return PbTime;
        })();
    
        polar_types.PbSystemDateTime = (function() {
    
            function PbSystemDateTime(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSystemDateTime.prototype.date = null;
            PbSystemDateTime.prototype.time = null;
            PbSystemDateTime.prototype.trusted = false;
    
            PbSystemDateTime.create = function create(properties) {
                return new PbSystemDateTime(properties);
            };
    
            PbSystemDateTime.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDate.encode(m.date, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbTime.encode(m.time, w.uint32(18).fork()).ldelim();
                w.uint32(24).bool(m.trusted);
                return w;
            };
    
            PbSystemDateTime.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDate.verify(m.date);
                    if (e)
                        return "date." + e;
                }
                {
                    var e = $root.polar_types.PbTime.verify(m.time);
                    if (e)
                        return "time." + e;
                }
                if (typeof m.trusted !== "boolean")
                    return "trusted: boolean expected";
                return null;
            };
    
            return PbSystemDateTime;
        })();
    
        polar_types.PbLocalDateTime = (function() {
    
            function PbLocalDateTime(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLocalDateTime.prototype.date = null;
            PbLocalDateTime.prototype.time = null;
            PbLocalDateTime.prototype.OBSOLETETrusted = false;
            PbLocalDateTime.prototype.timeZoneOffset = 0;
    
            PbLocalDateTime.create = function create(properties) {
                return new PbLocalDateTime(properties);
            };
    
            PbLocalDateTime.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDate.encode(m.date, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbTime.encode(m.time, w.uint32(18).fork()).ldelim();
                w.uint32(24).bool(m.OBSOLETETrusted);
                if (m.timeZoneOffset != null && m.hasOwnProperty("timeZoneOffset"))
                    w.uint32(32).int32(m.timeZoneOffset);
                return w;
            };
    
            PbLocalDateTime.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDate.verify(m.date);
                    if (e)
                        return "date." + e;
                }
                {
                    var e = $root.polar_types.PbTime.verify(m.time);
                    if (e)
                        return "time." + e;
                }
                if (typeof m.OBSOLETETrusted !== "boolean")
                    return "OBSOLETETrusted: boolean expected";
                if (m.timeZoneOffset != null && m.hasOwnProperty("timeZoneOffset")) {
                    if (!$util.isInteger(m.timeZoneOffset))
                        return "timeZoneOffset: integer expected";
                }
                return null;
            };
    
            return PbLocalDateTime;
        })();
    
        polar_types.PbDuration = (function() {
    
            function PbDuration(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbDuration.prototype.hours = 0;
            PbDuration.prototype.minutes = 0;
            PbDuration.prototype.seconds = 0;
            PbDuration.prototype.millis = 0;
    
            PbDuration.create = function create(properties) {
                return new PbDuration(properties);
            };
    
            PbDuration.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.hours != null && m.hasOwnProperty("hours"))
                    w.uint32(8).uint32(m.hours);
                if (m.minutes != null && m.hasOwnProperty("minutes"))
                    w.uint32(16).uint32(m.minutes);
                if (m.seconds != null && m.hasOwnProperty("seconds"))
                    w.uint32(24).uint32(m.seconds);
                if (m.millis != null && m.hasOwnProperty("millis"))
                    w.uint32(32).uint32(m.millis);
                return w;
            };
    
            PbDuration.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.hours != null && m.hasOwnProperty("hours")) {
                    if (!$util.isInteger(m.hours))
                        return "hours: integer expected";
                }
                if (m.minutes != null && m.hasOwnProperty("minutes")) {
                    if (!$util.isInteger(m.minutes))
                        return "minutes: integer expected";
                }
                if (m.seconds != null && m.hasOwnProperty("seconds")) {
                    if (!$util.isInteger(m.seconds))
                        return "seconds: integer expected";
                }
                if (m.millis != null && m.hasOwnProperty("millis")) {
                    if (!$util.isInteger(m.millis))
                        return "millis: integer expected";
                }
                return null;
            };
    
            return PbDuration;
        })();
    
        polar_types.PbLocation = (function() {
    
            function PbLocation(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLocation.prototype.latitude = 0;
            PbLocation.prototype.longitude = 0;
            PbLocation.prototype.timestamp = null;
            PbLocation.prototype.fix = 0;
            PbLocation.prototype.satellites = 0;
    
            PbLocation.create = function create(properties) {
                return new PbLocation(properties);
            };
    
            PbLocation.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(9).double(m.latitude);
                w.uint32(17).double(m.longitude);
                if (m.timestamp != null && m.hasOwnProperty("timestamp"))
                    $root.polar_types.PbSystemDateTime.encode(m.timestamp, w.uint32(26).fork()).ldelim();
                if (m.fix != null && m.hasOwnProperty("fix"))
                    w.uint32(32).int32(m.fix);
                if (m.satellites != null && m.hasOwnProperty("satellites"))
                    w.uint32(40).uint32(m.satellites);
                return w;
            };
    
            PbLocation.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.latitude !== "number")
                    return "latitude: number expected";
                if (typeof m.longitude !== "number")
                    return "longitude: number expected";
                if (m.timestamp != null && m.hasOwnProperty("timestamp")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.timestamp);
                        if (e)
                            return "timestamp." + e;
                    }
                }
                if (m.fix != null && m.hasOwnProperty("fix")) {
                    switch (m.fix) {
                    default:
                        return "fix: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.satellites != null && m.hasOwnProperty("satellites")) {
                    if (!$util.isInteger(m.satellites))
                        return "satellites: integer expected";
                }
                return null;
            };
    
            PbLocation.Fix = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "FIX_NONE"] = 0;
                values[valuesById[1] = "FIX_2D"] = 1;
                values[valuesById[2] = "FIX_3D"] = 2;
                return values;
            })();
    
            return PbLocation;
        })();
    
        polar_types.PbSensorOffline = (function() {
    
            function PbSensorOffline(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSensorOffline.prototype.startIndex = 0;
            PbSensorOffline.prototype.stopIndex = 0;
    
            PbSensorOffline.create = function create(properties) {
                return new PbSensorOffline(properties);
            };
    
            PbSensorOffline.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.startIndex);
                w.uint32(16).uint32(m.stopIndex);
                return w;
            };
    
            PbSensorOffline.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.startIndex))
                    return "startIndex: integer expected";
                if (!$util.isInteger(m.stopIndex))
                    return "stopIndex: integer expected";
                return null;
            };
    
            return PbSensorOffline;
        })();
    
        polar_types.PbVolume = (function() {
    
            function PbVolume(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbVolume.prototype.volume = 0;
    
            PbVolume.create = function create(properties) {
                return new PbVolume(properties);
            };
    
            PbVolume.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.volume);
                return w;
            };
    
            PbVolume.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.volume))
                    return "volume: integer expected";
                return null;
            };
    
            return PbVolume;
        })();
    
        polar_types.PbStrideSensorCalibSettings = (function() {
    
            function PbStrideSensorCalibSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbStrideSensorCalibSettings.prototype.runningFactor = 0;
            PbStrideSensorCalibSettings.prototype.calibType = 0;
            PbStrideSensorCalibSettings.prototype.runningFactorSource = 0;
    
            PbStrideSensorCalibSettings.create = function create(properties) {
                return new PbStrideSensorCalibSettings(properties);
            };
    
            PbStrideSensorCalibSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.runningFactor);
                w.uint32(16).int32(m.calibType);
                if (m.runningFactorSource != null && m.hasOwnProperty("runningFactorSource"))
                    w.uint32(24).int32(m.runningFactorSource);
                return w;
            };
    
            PbStrideSensorCalibSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.runningFactor !== "number")
                    return "runningFactor: number expected";
                switch (m.calibType) {
                default:
                    return "calibType: enum value expected";
                case 0:
                case 1:
                    break;
                }
                if (m.runningFactorSource != null && m.hasOwnProperty("runningFactorSource")) {
                    switch (m.runningFactorSource) {
                    default:
                        return "runningFactorSource: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                }
                return null;
            };
    
            PbStrideSensorCalibSettings.PbStrideCalibType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "STRIDE_CALIB_MANUAL"] = 0;
                values[valuesById[1] = "STRIDE_CALIB_AUTO"] = 1;
                return values;
            })();
    
            PbStrideSensorCalibSettings.PbRunningFactorSource = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "RUNNING_FACTOR_SOURCE_DEFAULT"] = 0;
                values[valuesById[1] = "RUNNING_FACTOR_SOURCE_AUTO_CALIBRATION"] = 1;
                values[valuesById[2] = "RUNNING_FACTOR_SOURCE_MANUAL_CALIBRATION"] = 2;
                return values;
            })();
    
            return PbStrideSensorCalibSettings;
        })();
    
        polar_types.PbVolumeTarget = (function() {
    
            function PbVolumeTarget(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbVolumeTarget.prototype.targetType = 0;
            PbVolumeTarget.prototype.duration = null;
            PbVolumeTarget.prototype.distance = 0;
            PbVolumeTarget.prototype.calories = 0;
    
            PbVolumeTarget.create = function create(properties) {
                return new PbVolumeTarget(properties);
            };
    
            PbVolumeTarget.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.targetType);
                if (m.duration != null && m.hasOwnProperty("duration"))
                    $root.polar_types.PbDuration.encode(m.duration, w.uint32(18).fork()).ldelim();
                if (m.distance != null && m.hasOwnProperty("distance"))
                    w.uint32(29).float(m.distance);
                if (m.calories != null && m.hasOwnProperty("calories"))
                    w.uint32(32).uint32(m.calories);
                return w;
            };
    
            PbVolumeTarget.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.targetType) {
                default:
                    return "targetType: enum value expected";
                case 0:
                case 1:
                case 2:
                    break;
                }
                if (m.duration != null && m.hasOwnProperty("duration")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.duration);
                        if (e)
                            return "duration." + e;
                    }
                }
                if (m.distance != null && m.hasOwnProperty("distance")) {
                    if (typeof m.distance !== "number")
                        return "distance: number expected";
                }
                if (m.calories != null && m.hasOwnProperty("calories")) {
                    if (!$util.isInteger(m.calories))
                        return "calories: integer expected";
                }
                return null;
            };
    
            PbVolumeTarget.PbVolymeTargetType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "VOLUME_TARGET_TYPE_DURATION"] = 0;
                values[valuesById[1] = "VOLUME_TARGET_TYPE_DISTANCE"] = 1;
                values[valuesById[2] = "VOLUME_TARGET_TYPE_CALORIES"] = 2;
                return values;
            })();
    
            return PbVolumeTarget;
        })();
    
        polar_types.PbTrainingLoad = (function() {
    
            function PbTrainingLoad(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTrainingLoad.prototype.trainingLoadVal = 0;
            PbTrainingLoad.prototype.recoveryTime = null;
            PbTrainingLoad.prototype.carbohydrateConsumption = 0;
            PbTrainingLoad.prototype.proteinConsumption = 0;
            PbTrainingLoad.prototype.fatConsumption = 0;
    
            PbTrainingLoad.create = function create(properties) {
                return new PbTrainingLoad(properties);
            };
    
            PbTrainingLoad.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.trainingLoadVal != null && m.hasOwnProperty("trainingLoadVal"))
                    w.uint32(8).uint32(m.trainingLoadVal);
                if (m.recoveryTime != null && m.hasOwnProperty("recoveryTime"))
                    $root.polar_types.PbDuration.encode(m.recoveryTime, w.uint32(18).fork()).ldelim();
                if (m.carbohydrateConsumption != null && m.hasOwnProperty("carbohydrateConsumption"))
                    w.uint32(24).uint32(m.carbohydrateConsumption);
                if (m.proteinConsumption != null && m.hasOwnProperty("proteinConsumption"))
                    w.uint32(32).uint32(m.proteinConsumption);
                if (m.fatConsumption != null && m.hasOwnProperty("fatConsumption"))
                    w.uint32(40).uint32(m.fatConsumption);
                return w;
            };
    
            PbTrainingLoad.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.trainingLoadVal != null && m.hasOwnProperty("trainingLoadVal")) {
                    if (!$util.isInteger(m.trainingLoadVal))
                        return "trainingLoadVal: integer expected";
                }
                if (m.recoveryTime != null && m.hasOwnProperty("recoveryTime")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.recoveryTime);
                        if (e)
                            return "recoveryTime." + e;
                    }
                }
                if (m.carbohydrateConsumption != null && m.hasOwnProperty("carbohydrateConsumption")) {
                    if (!$util.isInteger(m.carbohydrateConsumption))
                        return "carbohydrateConsumption: integer expected";
                }
                if (m.proteinConsumption != null && m.hasOwnProperty("proteinConsumption")) {
                    if (!$util.isInteger(m.proteinConsumption))
                        return "proteinConsumption: integer expected";
                }
                if (m.fatConsumption != null && m.hasOwnProperty("fatConsumption")) {
                    if (!$util.isInteger(m.fatConsumption))
                        return "fatConsumption: integer expected";
                }
                return null;
            };
    
            return PbTrainingLoad;
        })();
    
        polar_types.PbHeartRateZone = (function() {
    
            function PbHeartRateZone(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbHeartRateZone.prototype.lowerLimit = 0;
            PbHeartRateZone.prototype.higherLimit = 0;
    
            PbHeartRateZone.create = function create(properties) {
                return new PbHeartRateZone(properties);
            };
    
            PbHeartRateZone.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.lowerLimit);
                w.uint32(16).uint32(m.higherLimit);
                return w;
            };
    
            PbHeartRateZone.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.lowerLimit))
                    return "lowerLimit: integer expected";
                if (!$util.isInteger(m.higherLimit))
                    return "higherLimit: integer expected";
                return null;
            };
    
            return PbHeartRateZone;
        })();
    
        polar_types.PbSpeedZone = (function() {
    
            function PbSpeedZone(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSpeedZone.prototype.lowerLimit = 0;
            PbSpeedZone.prototype.higherLimit = 0;
    
            PbSpeedZone.create = function create(properties) {
                return new PbSpeedZone(properties);
            };
    
            PbSpeedZone.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.lowerLimit);
                w.uint32(21).float(m.higherLimit);
                return w;
            };
    
            PbSpeedZone.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.lowerLimit !== "number")
                    return "lowerLimit: number expected";
                if (typeof m.higherLimit !== "number")
                    return "higherLimit: number expected";
                return null;
            };
    
            return PbSpeedZone;
        })();
    
        polar_types.PbPowerZone = (function() {
    
            function PbPowerZone(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPowerZone.prototype.lowerLimit = 0;
            PbPowerZone.prototype.higherLimit = 0;
    
            PbPowerZone.create = function create(properties) {
                return new PbPowerZone(properties);
            };
    
            PbPowerZone.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.lowerLimit);
                w.uint32(16).uint32(m.higherLimit);
                return w;
            };
    
            PbPowerZone.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.lowerLimit))
                    return "lowerLimit: integer expected";
                if (!$util.isInteger(m.higherLimit))
                    return "higherLimit: integer expected";
                return null;
            };
    
            return PbPowerZone;
        })();
    
        polar_types.PbZones = (function() {
    
            function PbZones(p) {
                this.heartRateZone = [];
                this.speedZone = [];
                this.powerZone = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbZones.prototype.heartRateZone = $util.emptyArray;
            PbZones.prototype.speedZone = $util.emptyArray;
            PbZones.prototype.powerZone = $util.emptyArray;
            PbZones.prototype.heartRateSettingSource = 0;
            PbZones.prototype.powerSettingSource = 0;
            PbZones.prototype.speedSettingSource = 0;
    
            PbZones.create = function create(properties) {
                return new PbZones(properties);
            };
    
            PbZones.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.heartRateZone != null && m.heartRateZone.length) {
                    for (var i = 0; i < m.heartRateZone.length; ++i)
                        $root.polar_types.PbHeartRateZone.encode(m.heartRateZone[i], w.uint32(10).fork()).ldelim();
                }
                if (m.speedZone != null && m.speedZone.length) {
                    for (var i = 0; i < m.speedZone.length; ++i)
                        $root.polar_types.PbSpeedZone.encode(m.speedZone[i], w.uint32(18).fork()).ldelim();
                }
                if (m.powerZone != null && m.powerZone.length) {
                    for (var i = 0; i < m.powerZone.length; ++i)
                        $root.polar_types.PbPowerZone.encode(m.powerZone[i], w.uint32(26).fork()).ldelim();
                }
                if (m.heartRateSettingSource != null && m.hasOwnProperty("heartRateSettingSource"))
                    w.uint32(80).int32(m.heartRateSettingSource);
                if (m.powerSettingSource != null && m.hasOwnProperty("powerSettingSource"))
                    w.uint32(88).int32(m.powerSettingSource);
                if (m.speedSettingSource != null && m.hasOwnProperty("speedSettingSource"))
                    w.uint32(96).int32(m.speedSettingSource);
                return w;
            };
    
            PbZones.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.heartRateZone != null && m.hasOwnProperty("heartRateZone")) {
                    if (!Array.isArray(m.heartRateZone))
                        return "heartRateZone: array expected";
                    for (var i = 0; i < m.heartRateZone.length; ++i) {
                        {
                            var e = $root.polar_types.PbHeartRateZone.verify(m.heartRateZone[i]);
                            if (e)
                                return "heartRateZone." + e;
                        }
                    }
                }
                if (m.speedZone != null && m.hasOwnProperty("speedZone")) {
                    if (!Array.isArray(m.speedZone))
                        return "speedZone: array expected";
                    for (var i = 0; i < m.speedZone.length; ++i) {
                        {
                            var e = $root.polar_types.PbSpeedZone.verify(m.speedZone[i]);
                            if (e)
                                return "speedZone." + e;
                        }
                    }
                }
                if (m.powerZone != null && m.hasOwnProperty("powerZone")) {
                    if (!Array.isArray(m.powerZone))
                        return "powerZone: array expected";
                    for (var i = 0; i < m.powerZone.length; ++i) {
                        {
                            var e = $root.polar_types.PbPowerZone.verify(m.powerZone[i]);
                            if (e)
                                return "powerZone." + e;
                        }
                    }
                }
                if (m.heartRateSettingSource != null && m.hasOwnProperty("heartRateSettingSource")) {
                    switch (m.heartRateSettingSource) {
                    default:
                        return "heartRateSettingSource: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.powerSettingSource != null && m.hasOwnProperty("powerSettingSource")) {
                    switch (m.powerSettingSource) {
                    default:
                        return "powerSettingSource: enum value expected";
                    case 0:
                    case 1:
                        break;
                    }
                }
                if (m.speedSettingSource != null && m.hasOwnProperty("speedSettingSource")) {
                    switch (m.speedSettingSource) {
                    default:
                        return "speedSettingSource: enum value expected";
                    case 0:
                    case 1:
                        break;
                    }
                }
                return null;
            };
    
            return PbZones;
        })();
    
        polar_types.PbBleMac = (function() {
    
            function PbBleMac(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbBleMac.prototype.mac = $util.newBuffer([]);
            PbBleMac.prototype.type = 0;
    
            PbBleMac.create = function create(properties) {
                return new PbBleMac(properties);
            };
    
            PbBleMac.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).bytes(m.mac);
                w.uint32(16).int32(m.type);
                return w;
            };
    
            PbBleMac.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!(m.mac && typeof m.mac.length === "number" || $util.isString(m.mac)))
                    return "mac: buffer expected";
                switch (m.type) {
                default:
                    return "type: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                    break;
                }
                return null;
            };
    
            return PbBleMac;
        })();
    
        polar_types.PbBleDeviceName = (function() {
    
            function PbBleDeviceName(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbBleDeviceName.prototype.name = "";
    
            PbBleDeviceName.create = function create(properties) {
                return new PbBleDeviceName(properties);
            };
    
            PbBleDeviceName.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).string(m.name);
                return w;
            };
    
            PbBleDeviceName.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isString(m.name))
                    return "name: string expected";
                return null;
            };
    
            return PbBleDeviceName;
        })();
    
        polar_types.PbDeviceId = (function() {
    
            function PbDeviceId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbDeviceId.prototype.deviceId = "";
    
            PbDeviceId.create = function create(properties) {
                return new PbDeviceId(properties);
            };
    
            PbDeviceId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).string(m.deviceId);
                return w;
            };
    
            PbDeviceId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isString(m.deviceId))
                    return "deviceId: string expected";
                return null;
            };
    
            return PbDeviceId;
        })();
    
        polar_types.PbRunningIndex = (function() {
    
            function PbRunningIndex(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRunningIndex.prototype.value = 0;
            PbRunningIndex.prototype.calculationTime = null;
    
            PbRunningIndex.create = function create(properties) {
                return new PbRunningIndex(properties);
            };
    
            PbRunningIndex.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.value);
                if (m.calculationTime != null && m.hasOwnProperty("calculationTime"))
                    $root.polar_types.PbDuration.encode(m.calculationTime, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbRunningIndex.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value))
                    return "value: integer expected";
                if (m.calculationTime != null && m.hasOwnProperty("calculationTime")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.calculationTime);
                        if (e)
                            return "calculationTime." + e;
                    }
                }
                return null;
            };
    
            return PbRunningIndex;
        })();
    
        polar_types.PbSportIdentifier = (function() {
    
            function PbSportIdentifier(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSportIdentifier.prototype.value = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
            PbSportIdentifier.create = function create(properties) {
                return new PbSportIdentifier(properties);
            };
    
            PbSportIdentifier.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.value);
                return w;
            };
    
            PbSportIdentifier.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value) && !(m.value && $util.isInteger(m.value.low) && $util.isInteger(m.value.high)))
                    return "value: integer|Long expected";
                return null;
            };
    
            return PbSportIdentifier;
        })();
    
        polar_types.PbOneLineText = (function() {
    
            function PbOneLineText(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbOneLineText.prototype.text = "";
    
            PbOneLineText.create = function create(properties) {
                return new PbOneLineText(properties);
            };
    
            PbOneLineText.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).string(m.text);
                return w;
            };
    
            PbOneLineText.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isString(m.text))
                    return "text: string expected";
                return null;
            };
    
            return PbOneLineText;
        })();
    
        polar_types.PbMultiLineText = (function() {
    
            function PbMultiLineText(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbMultiLineText.prototype.text = "";
    
            PbMultiLineText.create = function create(properties) {
                return new PbMultiLineText(properties);
            };
    
            PbMultiLineText.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).string(m.text);
                return w;
            };
    
            PbMultiLineText.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isString(m.text))
                    return "text: string expected";
                return null;
            };
    
            return PbMultiLineText;
        })();
    
        polar_types.PbLanguageId = (function() {
    
            function PbLanguageId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLanguageId.prototype.language = "";
    
            PbLanguageId.create = function create(properties) {
                return new PbLanguageId(properties);
            };
    
            PbLanguageId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).string(m.language);
                return w;
            };
    
            PbLanguageId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isString(m.language))
                    return "language: string expected";
                return null;
            };
    
            return PbLanguageId;
        })();
    
        polar_types.PbTrainingSessionTargetId = (function() {
    
            function PbTrainingSessionTargetId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTrainingSessionTargetId.prototype.value = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
            PbTrainingSessionTargetId.prototype.lastModified = null;
    
            PbTrainingSessionTargetId.create = function create(properties) {
                return new PbTrainingSessionTargetId(properties);
            };
    
            PbTrainingSessionTargetId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.value);
                if (m.lastModified != null && m.hasOwnProperty("lastModified"))
                    $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbTrainingSessionTargetId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value) && !(m.value && $util.isInteger(m.value.low) && $util.isInteger(m.value.high)))
                    return "value: integer|Long expected";
                if (m.lastModified != null && m.hasOwnProperty("lastModified")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                        if (e)
                            return "lastModified." + e;
                    }
                }
                return null;
            };
    
            return PbTrainingSessionTargetId;
        })();
    
        polar_types.PbTrainingSessionFavoriteId = (function() {
    
            function PbTrainingSessionFavoriteId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTrainingSessionFavoriteId.prototype.value = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
            PbTrainingSessionFavoriteId.prototype.lastModified = null;
    
            PbTrainingSessionFavoriteId.create = function create(properties) {
                return new PbTrainingSessionFavoriteId(properties);
            };
    
            PbTrainingSessionFavoriteId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.value);
                if (m.lastModified != null && m.hasOwnProperty("lastModified"))
                    $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbTrainingSessionFavoriteId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value) && !(m.value && $util.isInteger(m.value.low) && $util.isInteger(m.value.high)))
                    return "value: integer|Long expected";
                if (m.lastModified != null && m.hasOwnProperty("lastModified")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                        if (e)
                            return "lastModified." + e;
                    }
                }
                return null;
            };
    
            return PbTrainingSessionFavoriteId;
        })();
    
        polar_types.PbRouteId = (function() {
    
            function PbRouteId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRouteId.prototype.value = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
            PbRouteId.create = function create(properties) {
                return new PbRouteId(properties);
            };
    
            PbRouteId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.value);
                return w;
            };
    
            PbRouteId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value) && !(m.value && $util.isInteger(m.value.low) && $util.isInteger(m.value.high)))
                    return "value: integer|Long expected";
                return null;
            };
    
            return PbRouteId;
        })();
    
        polar_types.PbSwimmingPoolInfo = (function() {
    
            function PbSwimmingPoolInfo(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSwimmingPoolInfo.prototype.poolLength = 0;
            PbSwimmingPoolInfo.prototype.swimmingPoolType = 0;
    
            PbSwimmingPoolInfo.create = function create(properties) {
                return new PbSwimmingPoolInfo(properties);
            };
    
            PbSwimmingPoolInfo.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.poolLength != null && m.hasOwnProperty("poolLength"))
                    w.uint32(13).float(m.poolLength);
                w.uint32(16).int32(m.swimmingPoolType);
                return w;
            };
    
            PbSwimmingPoolInfo.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.poolLength != null && m.hasOwnProperty("poolLength")) {
                    if (typeof m.poolLength !== "number")
                        return "poolLength: number expected";
                }
                switch (m.swimmingPoolType) {
                default:
                    return "swimmingPoolType: enum value expected";
                case 0:
                case 1:
                    break;
                }
                return null;
            };
    
            return PbSwimmingPoolInfo;
        })();
    
        polar_types.PbTrainingProgramId = (function() {
    
            function PbTrainingProgramId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTrainingProgramId.prototype.value = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
            PbTrainingProgramId.create = function create(properties) {
                return new PbTrainingProgramId(properties);
            };
    
            PbTrainingProgramId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.value);
                return w;
            };
    
            PbTrainingProgramId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value) && !(m.value && $util.isInteger(m.value.low) && $util.isInteger(m.value.high)))
                    return "value: integer|Long expected";
                return null;
            };
    
            return PbTrainingProgramId;
        })();
    
        polar_types.PbEventId = (function() {
    
            function PbEventId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbEventId.prototype.value = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
            PbEventId.create = function create(properties) {
                return new PbEventId(properties);
            };
    
            PbEventId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.value);
                return w;
            };
    
            PbEventId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value) && !(m.value && $util.isInteger(m.value.low) && $util.isInteger(m.value.high)))
                    return "value: integer|Long expected";
                return null;
            };
    
            return PbEventId;
        })();
    
        polar_types.PbStravaSegmentTargets = (function() {
    
            function PbStravaSegmentTargets(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbStravaSegmentTargets.prototype.ownBest = null;
            PbStravaSegmentTargets.prototype.komQom = null;
    
            PbStravaSegmentTargets.create = function create(properties) {
                return new PbStravaSegmentTargets(properties);
            };
    
            PbStravaSegmentTargets.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDuration.encode(m.ownBest, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.komQom, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbStravaSegmentTargets.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.ownBest);
                    if (e)
                        return "ownBest." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.komQom);
                    if (e)
                        return "komQom." + e;
                }
                return null;
            };
    
            return PbStravaSegmentTargets;
        })();
    
        polar_types.PbStravaSegmentTarget = (function() {
    
            function PbStravaSegmentTarget(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbStravaSegmentTarget.prototype.stravaSegmentType = 1;
            PbStravaSegmentTarget.prototype.stravaSegmentTargets = null;
    
            PbStravaSegmentTarget.create = function create(properties) {
                return new PbStravaSegmentTarget(properties);
            };
    
            PbStravaSegmentTarget.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.stravaSegmentType);
                $root.polar_types.PbStravaSegmentTargets.encode(m.stravaSegmentTargets, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbStravaSegmentTarget.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.stravaSegmentType) {
                default:
                    return "stravaSegmentType: enum value expected";
                case 1:
                case 2:
                    break;
                }
                {
                    var e = $root.polar_types.PbStravaSegmentTargets.verify(m.stravaSegmentTargets);
                    if (e)
                        return "stravaSegmentTargets." + e;
                }
                return null;
            };
    
            PbStravaSegmentTarget.PbStravaSegmentType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "STRAVA_SEGMENT_TYPE_RIDE"] = 1;
                values[valuesById[2] = "STRAVA_SEGMENT_TYPE_RUN"] = 2;
                return values;
            })();
    
            return PbStravaSegmentTarget;
        })();
    
        return polar_types;
    })();

    return $root;
});

},{"protobufjs/minimal":9}],21:[function(require,module,exports){
/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function(global, factory) { /* global define, require, module */

    /* AMD */ if (typeof define === 'function' && define.amd)
        define(["protobufjs/minimal"], factory);

    /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports)
        module.exports = factory(require("protobufjs/minimal"));

})(this, function($protobuf) {
    "use strict";

    var $Writer = $protobuf.Writer, $util = $protobuf.util;
    
    var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});
    
    $root.polar_types = (function() {
    
        var polar_types = {};
    
        polar_types.PbDataType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "TYPE_UNDEFINED"] = 0;
            values[valuesById[1] = "TYPE_INHERITED"] = 1;
            values[valuesById[2] = "TYPE_ENUM"] = 2;
            values[valuesById[3] = "TYPE_MILLIS"] = 3;
            values[valuesById[4] = "TYPE_SECOND"] = 4;
            values[valuesById[5] = "TYPE_MINUTE"] = 5;
            values[valuesById[6] = "TYPE_HOUR"] = 6;
            values[valuesById[7] = "TYPE_HOURS"] = 7;
            values[valuesById[8] = "TYPE_DAY"] = 8;
            values[valuesById[9] = "TYPE_MONTH"] = 9;
            values[valuesById[10] = "TYPE_YEAR"] = 10;
            values[valuesById[11] = "TYPE_WEIGHT"] = 11;
            values[valuesById[12] = "TYPE_HEIGHT"] = 12;
            values[valuesById[13] = "TYPE_VO2MAX"] = 13;
            values[valuesById[20] = "TYPE_HEARTRATE"] = 20;
            values[valuesById[21] = "TYPE_HR_PERCENT"] = 21;
            values[valuesById[22] = "TYPE_HR_RESERVE"] = 22;
            values[valuesById[23] = "TYPE_SPEED"] = 23;
            values[valuesById[24] = "TYPE_CADENCE"] = 24;
            values[valuesById[25] = "TYPE_ALTITUDE"] = 25;
            values[valuesById[26] = "TYPE_POWER"] = 26;
            values[valuesById[27] = "TYPE_POWER_LRB"] = 27;
            values[valuesById[28] = "TYPE_POWER_PI"] = 28;
            values[valuesById[29] = "TYPE_TEMPERATURE"] = 29;
            values[valuesById[30] = "TYPE_ACTIVITY"] = 30;
            values[valuesById[31] = "TYPE_STRIDE_LENGTH"] = 31;
            values[valuesById[32] = "TYPE_INCLINE"] = 32;
            values[valuesById[33] = "TYPE_DECLINE"] = 33;
            values[valuesById[52] = "TYPE_DISTANCE"] = 52;
            values[valuesById[53] = "TYPE_ENERGY"] = 53;
            values[valuesById[54] = "TYPE_FAT_PERCENTS"] = 54;
            values[valuesById[55] = "TYPE_ASCENT"] = 55;
            values[valuesById[56] = "TYPE_DESCENT"] = 56;
            values[valuesById[57] = "TYPE_LATITUDE"] = 57;
            values[valuesById[58] = "TYPE_LONGITUDE"] = 58;
            values[valuesById[59] = "TYPE_HERTZ"] = 59;
            values[valuesById[60] = "TYPE_PERCENT"] = 60;
            values[valuesById[61] = "TYPE_CUMULATED_ACTIVITY_DAY"] = 61;
            values[valuesById[62] = "TYPE_RUNNING_INDEX"] = 62;
            values[valuesById[63] = "TYPE_RR_INTERVAL"] = 63;
            values[valuesById[64] = "TYPE_Z_INDEX"] = 64;
            values[valuesById[65] = "TYPE_EXERCISE_TARGET_INDEX"] = 65;
            values[valuesById[66] = "TYPE_TIME_ZONE_OFFSET"] = 66;
            values[valuesById[67] = "TYPE_WHEEL_SIZE"] = 67;
            values[valuesById[68] = "TYPE_FITNESS_CLASS"] = 68;
            values[valuesById[69] = "TYPE_ACCELERATION"] = 69;
            values[valuesById[70] = "TYPE_CRANK_LENGTH"] = 70;
            values[valuesById[71] = "TYPE_ANGLE_DEGREE"] = 71;
            values[valuesById[72] = "TYPE_NEWTON"] = 72;
            values[valuesById[73] = "TYPE_FUNCTIONAL_THRESHOLD_POWER"] = 73;
            values[valuesById[74] = "TYPE_CALORIES"] = 74;
            values[valuesById[75] = "TYPE_SPEED_CALIBRATION_OFFSET"] = 75;
            return values;
        })();
    
        polar_types.PbHeartRateView = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "HEART_RATE_VIEW_BPM"] = 1;
            values[valuesById[2] = "HEART_RATE_VIEW_PERCENTS_OF_HR_RESERVE"] = 2;
            values[valuesById[3] = "HEART_RATE_VIEW_PERCENTS_OF_MAX_HR"] = 3;
            return values;
        })();
    
        polar_types.PbUnitSystem = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "METRIC"] = 1;
            values[valuesById[2] = "IMPERIAL"] = 2;
            return values;
        })();
    
        polar_types.PbTimeSelection = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "TIME_1"] = 1;
            values[valuesById[2] = "TIME_2"] = 2;
            return values;
        })();
    
        polar_types.PbTimeFormat = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "TIME_FORMAT_24H"] = 1;
            values[valuesById[2] = "TIME_FORMAT_12H"] = 2;
            return values;
        })();
    
        polar_types.PbTimeFormatSeparator = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "TIME_FORMAT_SEPARATOR_DOT"] = 1;
            values[valuesById[2] = "TIME_FORMAT_SEPARATOR_COLON"] = 2;
            return values;
        })();
    
        polar_types.PbStartDayOfWeek = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "MONDAY"] = 1;
            values[valuesById[2] = "SATURDAY"] = 2;
            values[valuesById[3] = "SUNDAY"] = 3;
            return values;
        })();
    
        polar_types.PbDateFormatSeparator = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "DOT"] = 1;
            values[valuesById[2] = "SLASH"] = 2;
            values[valuesById[3] = "HYPHEN"] = 3;
            return values;
        })();
    
        polar_types.PbDateFormat = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "DD_MM_YYYY"] = 1;
            values[valuesById[2] = "MM_DD_YYYY"] = 2;
            values[valuesById[3] = "YYYY_MM_DD"] = 3;
            return values;
        })();
    
        polar_types.PbFeatureType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "FEATURE_TYPE_HEART_RATE"] = 1;
            values[valuesById[2] = "FEATURE_TYPE_RR_INTERVAL"] = 2;
            values[valuesById[3] = "FEATURE_TYPE_SPEED"] = 3;
            values[valuesById[4] = "FEATURE_TYPE_DISTANCE"] = 4;
            values[valuesById[5] = "FEATURE_TYPE_BIKE_CADENCE"] = 5;
            values[valuesById[6] = "FEATURE_TYPE_BIKE_POWER"] = 6;
            values[valuesById[7] = "FEATURE_TYPE_GPS_LOCATION"] = 7;
            values[valuesById[8] = "FEATURE_TYPE_RUNNING_CADENCE"] = 8;
            values[valuesById[9] = "FEATURE_TYPE_PRESS_TEMPERATURE"] = 9;
            values[valuesById[10] = "FEATURE_TYPE_ALTITUDE"] = 10;
            values[valuesById[11] = "FEATURE_TYPE_STEPS"] = 11;
            values[valuesById[12] = "FEATURE_TYPE_ACTIVITY"] = 12;
            values[valuesById[13] = "FEATURE_TYPE_STRIDE_LENGTH"] = 13;
            values[valuesById[14] = "FEATURE_TYPE_RSC_MOVING_TYPE"] = 14;
            values[valuesById[15] = "FEATURE_TYPE_JUMP_HEIGTH"] = 15;
            values[valuesById[16] = "FEATURE_TYPE_COMPASS_HEADING"] = 16;
            values[valuesById[17] = "FEATURE_TYPE_GPS_SPEED"] = 17;
            values[valuesById[18] = "FEATURE_TYPE_GPS_DISTANCE"] = 18;
            values[valuesById[19] = "FEATURE_TYPE_GPS_ALTITUDE"] = 19;
            values[valuesById[20] = "FEATURE_TYPE_BIKE_WHEEL_REVOLUTION"] = 20;
            values[valuesById[21] = "FEATURE_TYPE_BIKE_CRANK_REVOLUTION"] = 21;
            values[valuesById[22] = "FEATURE_TYPE_AS_SPEED"] = 22;
            values[valuesById[23] = "FEATURE_TYPE_AS_CADENCE"] = 23;
            values[valuesById[24] = "FEATURE_TYPE_AS_DISTANCE"] = 24;
            values[valuesById[25] = "FEATURE_TYPE_AS_SWR_STATE"] = 25;
            values[valuesById[26] = "FEATURE_TYPE_BATTERY_LEVEL"] = 26;
            values[valuesById[27] = "FEATURE_TYPE_FILE_TRANSFER"] = 27;
            values[valuesById[28] = "FEATURE_TYPE_PUSH_NOTIFICATIONS"] = 28;
            values[valuesById[29] = "FEATURE_TYPE_WEIGHT_SCALE"] = 29;
            return values;
        })();
    
        polar_types.PbMovingType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "WALKING"] = 0;
            values[valuesById[1] = "RUNNING"] = 1;
            values[valuesById[2] = "STANDING"] = 2;
            return values;
        })();
    
        polar_types.PbOperationType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "MULTIPLY"] = 1;
            values[valuesById[2] = "SUM"] = 2;
            return values;
        })();
    
        polar_types.PbExerciseFeedback = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "FEEDBACK_NONE"] = 1;
            values[valuesById[2] = "FEEDBACK_1"] = 2;
            values[valuesById[3] = "FEEDBACK_2"] = 3;
            values[valuesById[4] = "FEEDBACK_3"] = 4;
            values[valuesById[5] = "FEEDBACK_4"] = 5;
            values[valuesById[6] = "FEEDBACK_5"] = 6;
            values[valuesById[7] = "FEEDBACK_6"] = 7;
            values[valuesById[8] = "FEEDBACK_7"] = 8;
            values[valuesById[9] = "FEEDBACK_8"] = 9;
            values[valuesById[10] = "FEEDBACK_9"] = 10;
            values[valuesById[11] = "FEEDBACK_10"] = 11;
            values[valuesById[12] = "FEEDBACK_11"] = 12;
            values[valuesById[13] = "FEEDBACK_12"] = 13;
            values[valuesById[14] = "FEEDBACK_13"] = 14;
            values[valuesById[15] = "FEEDBACK_14"] = 15;
            values[valuesById[16] = "FEEDBACK_15"] = 16;
            values[valuesById[17] = "FEEDBACK_16"] = 17;
            values[valuesById[18] = "FEEDBACK_17"] = 18;
            return values;
        })();
    
        polar_types.PbHeartRateZoneSettingSource = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "HEART_RATE_ZONE_SETTING_SOURCE_DEFAULT"] = 0;
            values[valuesById[1] = "HEART_RATE_ZONE_SETTING_SOURCE_THRESHOLD"] = 1;
            values[valuesById[2] = "HEART_RATE_ZONE_SETTING_SOURCE_FREE"] = 2;
            return values;
        })();
    
        polar_types.PbPowerZoneSettingSource = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "POWER_ZONE_SETTING_SOURCE_DEFAULT"] = 0;
            values[valuesById[1] = "POWER_ZONE_SETTING_SOURCE_FREE"] = 1;
            return values;
        })();
    
        polar_types.PbSpeedZoneSettingSource = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "SPEED_ZONE_SETTING_SOURCE_DEFAULT"] = 0;
            values[valuesById[1] = "SPEED_ZONE_SETTING_SOURCE_FREE"] = 1;
            return values;
        })();
    
        polar_types.PbMacType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "MAC_TYPE_PUBLIC"] = 0;
            values[valuesById[1] = "MAC_TYPE_STATIC"] = 1;
            values[valuesById[2] = "MAC_TYPE_PRIVATE_NONRESOLVABLE"] = 2;
            values[valuesById[3] = "MAC_TYPE_PRIVATE_RESOLVABLE"] = 3;
            values[valuesById[4] = "MAC_TYPE_BT_CLASSIC"] = 4;
            return values;
        })();
    
        polar_types.PbSwimmingStyle = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[-1] = "OTHER"] = -1;
            values[valuesById[0] = "TURN"] = 0;
            values[valuesById[10] = "OTHER_SWIMMING"] = 10;
            values[valuesById[11] = "FREESTYLE"] = 11;
            values[valuesById[12] = "BREASTSTROKE"] = 12;
            values[valuesById[13] = "BACKSTROKE"] = 13;
            values[valuesById[14] = "BUTTERFLY"] = 14;
            return values;
        })();
    
        polar_types.PbSwimmingPoolUnits = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "SWIMMING_POOL_METERS"] = 0;
            values[valuesById[1] = "SWIMMING_POOL_YARDS"] = 1;
            return values;
        })();
    
        polar_types.PbExerciseTargetType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "EXERCISE_TARGET_TYPE_FREE"] = 0;
            values[valuesById[1] = "EXERCISE_TARGET_TYPE_VOLUME"] = 1;
            values[valuesById[2] = "EXERCISE_TARGET_TYPE_PHASED"] = 2;
            values[valuesById[3] = "EXERCISE_TARGET_TYPE_ROUTE"] = 3;
            values[valuesById[4] = "EXERCISE_TARGET_TYPE_STEADY_RACE_PACE"] = 4;
            values[valuesById[5] = "EXERCISE_TARGET_TYPE_ROUTE_RACE_PACE"] = 5;
            values[valuesById[6] = "EXERCISE_TARGET_TYPE_STRAVA_SEGMENT"] = 6;
            return values;
        })();
    
        polar_types.PbDeviceLocation = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "DEVICE_LOCATION_UNDEFINED"] = 0;
            values[valuesById[1] = "DEVICE_LOCATION_OTHER"] = 1;
            values[valuesById[2] = "DEVICE_LOCATION_WRIST_LEFT"] = 2;
            values[valuesById[3] = "DEVICE_LOCATION_WRIST_RIGHT"] = 3;
            values[valuesById[4] = "DEVICE_LOCATION_NECKLACE"] = 4;
            values[valuesById[5] = "DEVICE_LOCATION_CHEST"] = 5;
            values[valuesById[6] = "DEVICE_LOCATION_UPPER_BACK"] = 6;
            values[valuesById[7] = "DEVICE_LOCATION_FOOT_LEFT"] = 7;
            values[valuesById[8] = "DEVICE_LOCATION_FOOT_RIGHT"] = 8;
            values[valuesById[9] = "DEVICE_LOCATION_LOWER_ARM_LEFT"] = 9;
            values[valuesById[10] = "DEVICE_LOCATION_LOWER_ARM_RIGHT"] = 10;
            values[valuesById[11] = "DEVICE_LOCATION_UPPER_ARM_LEFT"] = 11;
            values[valuesById[12] = "DEVICE_LOCATION_UPPER_ARM_RIGHT"] = 12;
            values[valuesById[13] = "DEVICE_LOCATION_BIKE_MOUNT"] = 13;
            return values;
        })();
    
        polar_types.PbRangeOptions = (function() {
    
            function PbRangeOptions(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRangeOptions.prototype.minValue = 0;
            PbRangeOptions.prototype.maxValue = 0;
    
            PbRangeOptions.create = function create(properties) {
                return new PbRangeOptions(properties);
            };
    
            PbRangeOptions.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.minValue != null && m.hasOwnProperty("minValue"))
                    w.uint32(8).int32(m.minValue);
                if (m.maxValue != null && m.hasOwnProperty("maxValue"))
                    w.uint32(16).int32(m.maxValue);
                return w;
            };
    
            PbRangeOptions.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.minValue != null && m.hasOwnProperty("minValue")) {
                    if (!$util.isInteger(m.minValue))
                        return "minValue: integer expected";
                }
                if (m.maxValue != null && m.hasOwnProperty("maxValue")) {
                    if (!$util.isInteger(m.maxValue))
                        return "maxValue: integer expected";
                }
                return null;
            };
    
            return PbRangeOptions;
        })();
    
        polar_types.PbDate = (function() {
    
            function PbDate(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbDate.prototype.year = 0;
            PbDate.prototype.month = 0;
            PbDate.prototype.day = 0;
    
            PbDate.create = function create(properties) {
                return new PbDate(properties);
            };
    
            PbDate.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.year);
                w.uint32(16).uint32(m.month);
                w.uint32(24).uint32(m.day);
                return w;
            };
    
            PbDate.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.year))
                    return "year: integer expected";
                if (!$util.isInteger(m.month))
                    return "month: integer expected";
                if (!$util.isInteger(m.day))
                    return "day: integer expected";
                return null;
            };
    
            return PbDate;
        })();
    
        polar_types.PbTime = (function() {
    
            function PbTime(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTime.prototype.hour = 0;
            PbTime.prototype.minute = 0;
            PbTime.prototype.seconds = 0;
            PbTime.prototype.millis = 0;
    
            PbTime.create = function create(properties) {
                return new PbTime(properties);
            };
    
            PbTime.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.hour);
                w.uint32(16).uint32(m.minute);
                w.uint32(24).uint32(m.seconds);
                if (m.millis != null && m.hasOwnProperty("millis"))
                    w.uint32(32).uint32(m.millis);
                return w;
            };
    
            PbTime.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.hour))
                    return "hour: integer expected";
                if (!$util.isInteger(m.minute))
                    return "minute: integer expected";
                if (!$util.isInteger(m.seconds))
                    return "seconds: integer expected";
                if (m.millis != null && m.hasOwnProperty("millis")) {
                    if (!$util.isInteger(m.millis))
                        return "millis: integer expected";
                }
                return null;
            };
    
            return PbTime;
        })();
    
        polar_types.PbSystemDateTime = (function() {
    
            function PbSystemDateTime(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSystemDateTime.prototype.date = null;
            PbSystemDateTime.prototype.time = null;
            PbSystemDateTime.prototype.trusted = false;
    
            PbSystemDateTime.create = function create(properties) {
                return new PbSystemDateTime(properties);
            };
    
            PbSystemDateTime.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDate.encode(m.date, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbTime.encode(m.time, w.uint32(18).fork()).ldelim();
                w.uint32(24).bool(m.trusted);
                return w;
            };
    
            PbSystemDateTime.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDate.verify(m.date);
                    if (e)
                        return "date." + e;
                }
                {
                    var e = $root.polar_types.PbTime.verify(m.time);
                    if (e)
                        return "time." + e;
                }
                if (typeof m.trusted !== "boolean")
                    return "trusted: boolean expected";
                return null;
            };
    
            return PbSystemDateTime;
        })();
    
        polar_types.PbLocalDateTime = (function() {
    
            function PbLocalDateTime(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLocalDateTime.prototype.date = null;
            PbLocalDateTime.prototype.time = null;
            PbLocalDateTime.prototype.OBSOLETETrusted = false;
            PbLocalDateTime.prototype.timeZoneOffset = 0;
    
            PbLocalDateTime.create = function create(properties) {
                return new PbLocalDateTime(properties);
            };
    
            PbLocalDateTime.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDate.encode(m.date, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbTime.encode(m.time, w.uint32(18).fork()).ldelim();
                w.uint32(24).bool(m.OBSOLETETrusted);
                if (m.timeZoneOffset != null && m.hasOwnProperty("timeZoneOffset"))
                    w.uint32(32).int32(m.timeZoneOffset);
                return w;
            };
    
            PbLocalDateTime.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDate.verify(m.date);
                    if (e)
                        return "date." + e;
                }
                {
                    var e = $root.polar_types.PbTime.verify(m.time);
                    if (e)
                        return "time." + e;
                }
                if (typeof m.OBSOLETETrusted !== "boolean")
                    return "OBSOLETETrusted: boolean expected";
                if (m.timeZoneOffset != null && m.hasOwnProperty("timeZoneOffset")) {
                    if (!$util.isInteger(m.timeZoneOffset))
                        return "timeZoneOffset: integer expected";
                }
                return null;
            };
    
            return PbLocalDateTime;
        })();
    
        polar_types.PbDuration = (function() {
    
            function PbDuration(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbDuration.prototype.hours = 0;
            PbDuration.prototype.minutes = 0;
            PbDuration.prototype.seconds = 0;
            PbDuration.prototype.millis = 0;
    
            PbDuration.create = function create(properties) {
                return new PbDuration(properties);
            };
    
            PbDuration.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.hours != null && m.hasOwnProperty("hours"))
                    w.uint32(8).uint32(m.hours);
                if (m.minutes != null && m.hasOwnProperty("minutes"))
                    w.uint32(16).uint32(m.minutes);
                if (m.seconds != null && m.hasOwnProperty("seconds"))
                    w.uint32(24).uint32(m.seconds);
                if (m.millis != null && m.hasOwnProperty("millis"))
                    w.uint32(32).uint32(m.millis);
                return w;
            };
    
            PbDuration.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.hours != null && m.hasOwnProperty("hours")) {
                    if (!$util.isInteger(m.hours))
                        return "hours: integer expected";
                }
                if (m.minutes != null && m.hasOwnProperty("minutes")) {
                    if (!$util.isInteger(m.minutes))
                        return "minutes: integer expected";
                }
                if (m.seconds != null && m.hasOwnProperty("seconds")) {
                    if (!$util.isInteger(m.seconds))
                        return "seconds: integer expected";
                }
                if (m.millis != null && m.hasOwnProperty("millis")) {
                    if (!$util.isInteger(m.millis))
                        return "millis: integer expected";
                }
                return null;
            };
    
            return PbDuration;
        })();
    
        polar_types.PbLocation = (function() {
    
            function PbLocation(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLocation.prototype.latitude = 0;
            PbLocation.prototype.longitude = 0;
            PbLocation.prototype.timestamp = null;
            PbLocation.prototype.fix = 0;
            PbLocation.prototype.satellites = 0;
    
            PbLocation.create = function create(properties) {
                return new PbLocation(properties);
            };
    
            PbLocation.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(9).double(m.latitude);
                w.uint32(17).double(m.longitude);
                if (m.timestamp != null && m.hasOwnProperty("timestamp"))
                    $root.polar_types.PbSystemDateTime.encode(m.timestamp, w.uint32(26).fork()).ldelim();
                if (m.fix != null && m.hasOwnProperty("fix"))
                    w.uint32(32).int32(m.fix);
                if (m.satellites != null && m.hasOwnProperty("satellites"))
                    w.uint32(40).uint32(m.satellites);
                return w;
            };
    
            PbLocation.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.latitude !== "number")
                    return "latitude: number expected";
                if (typeof m.longitude !== "number")
                    return "longitude: number expected";
                if (m.timestamp != null && m.hasOwnProperty("timestamp")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.timestamp);
                        if (e)
                            return "timestamp." + e;
                    }
                }
                if (m.fix != null && m.hasOwnProperty("fix")) {
                    switch (m.fix) {
                    default:
                        return "fix: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.satellites != null && m.hasOwnProperty("satellites")) {
                    if (!$util.isInteger(m.satellites))
                        return "satellites: integer expected";
                }
                return null;
            };
    
            PbLocation.Fix = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "FIX_NONE"] = 0;
                values[valuesById[1] = "FIX_2D"] = 1;
                values[valuesById[2] = "FIX_3D"] = 2;
                return values;
            })();
    
            return PbLocation;
        })();
    
        polar_types.PbSensorOffline = (function() {
    
            function PbSensorOffline(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSensorOffline.prototype.startIndex = 0;
            PbSensorOffline.prototype.stopIndex = 0;
    
            PbSensorOffline.create = function create(properties) {
                return new PbSensorOffline(properties);
            };
    
            PbSensorOffline.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.startIndex);
                w.uint32(16).uint32(m.stopIndex);
                return w;
            };
    
            PbSensorOffline.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.startIndex))
                    return "startIndex: integer expected";
                if (!$util.isInteger(m.stopIndex))
                    return "stopIndex: integer expected";
                return null;
            };
    
            return PbSensorOffline;
        })();
    
        polar_types.PbVolume = (function() {
    
            function PbVolume(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbVolume.prototype.volume = 0;
    
            PbVolume.create = function create(properties) {
                return new PbVolume(properties);
            };
    
            PbVolume.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.volume);
                return w;
            };
    
            PbVolume.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.volume))
                    return "volume: integer expected";
                return null;
            };
    
            return PbVolume;
        })();
    
        polar_types.PbStrideSensorCalibSettings = (function() {
    
            function PbStrideSensorCalibSettings(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbStrideSensorCalibSettings.prototype.runningFactor = 0;
            PbStrideSensorCalibSettings.prototype.calibType = 0;
            PbStrideSensorCalibSettings.prototype.runningFactorSource = 0;
    
            PbStrideSensorCalibSettings.create = function create(properties) {
                return new PbStrideSensorCalibSettings(properties);
            };
    
            PbStrideSensorCalibSettings.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.runningFactor);
                w.uint32(16).int32(m.calibType);
                if (m.runningFactorSource != null && m.hasOwnProperty("runningFactorSource"))
                    w.uint32(24).int32(m.runningFactorSource);
                return w;
            };
    
            PbStrideSensorCalibSettings.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.runningFactor !== "number")
                    return "runningFactor: number expected";
                switch (m.calibType) {
                default:
                    return "calibType: enum value expected";
                case 0:
                case 1:
                    break;
                }
                if (m.runningFactorSource != null && m.hasOwnProperty("runningFactorSource")) {
                    switch (m.runningFactorSource) {
                    default:
                        return "runningFactorSource: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                }
                return null;
            };
    
            PbStrideSensorCalibSettings.PbStrideCalibType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "STRIDE_CALIB_MANUAL"] = 0;
                values[valuesById[1] = "STRIDE_CALIB_AUTO"] = 1;
                return values;
            })();
    
            PbStrideSensorCalibSettings.PbRunningFactorSource = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "RUNNING_FACTOR_SOURCE_DEFAULT"] = 0;
                values[valuesById[1] = "RUNNING_FACTOR_SOURCE_AUTO_CALIBRATION"] = 1;
                values[valuesById[2] = "RUNNING_FACTOR_SOURCE_MANUAL_CALIBRATION"] = 2;
                return values;
            })();
    
            return PbStrideSensorCalibSettings;
        })();
    
        polar_types.PbVolumeTarget = (function() {
    
            function PbVolumeTarget(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbVolumeTarget.prototype.targetType = 0;
            PbVolumeTarget.prototype.duration = null;
            PbVolumeTarget.prototype.distance = 0;
            PbVolumeTarget.prototype.calories = 0;
    
            PbVolumeTarget.create = function create(properties) {
                return new PbVolumeTarget(properties);
            };
    
            PbVolumeTarget.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.targetType);
                if (m.duration != null && m.hasOwnProperty("duration"))
                    $root.polar_types.PbDuration.encode(m.duration, w.uint32(18).fork()).ldelim();
                if (m.distance != null && m.hasOwnProperty("distance"))
                    w.uint32(29).float(m.distance);
                if (m.calories != null && m.hasOwnProperty("calories"))
                    w.uint32(32).uint32(m.calories);
                return w;
            };
    
            PbVolumeTarget.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.targetType) {
                default:
                    return "targetType: enum value expected";
                case 0:
                case 1:
                case 2:
                    break;
                }
                if (m.duration != null && m.hasOwnProperty("duration")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.duration);
                        if (e)
                            return "duration." + e;
                    }
                }
                if (m.distance != null && m.hasOwnProperty("distance")) {
                    if (typeof m.distance !== "number")
                        return "distance: number expected";
                }
                if (m.calories != null && m.hasOwnProperty("calories")) {
                    if (!$util.isInteger(m.calories))
                        return "calories: integer expected";
                }
                return null;
            };
    
            PbVolumeTarget.PbVolymeTargetType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "VOLUME_TARGET_TYPE_DURATION"] = 0;
                values[valuesById[1] = "VOLUME_TARGET_TYPE_DISTANCE"] = 1;
                values[valuesById[2] = "VOLUME_TARGET_TYPE_CALORIES"] = 2;
                return values;
            })();
    
            return PbVolumeTarget;
        })();
    
        polar_types.PbTrainingLoad = (function() {
    
            function PbTrainingLoad(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTrainingLoad.prototype.trainingLoadVal = 0;
            PbTrainingLoad.prototype.recoveryTime = null;
            PbTrainingLoad.prototype.carbohydrateConsumption = 0;
            PbTrainingLoad.prototype.proteinConsumption = 0;
            PbTrainingLoad.prototype.fatConsumption = 0;
    
            PbTrainingLoad.create = function create(properties) {
                return new PbTrainingLoad(properties);
            };
    
            PbTrainingLoad.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.trainingLoadVal != null && m.hasOwnProperty("trainingLoadVal"))
                    w.uint32(8).uint32(m.trainingLoadVal);
                if (m.recoveryTime != null && m.hasOwnProperty("recoveryTime"))
                    $root.polar_types.PbDuration.encode(m.recoveryTime, w.uint32(18).fork()).ldelim();
                if (m.carbohydrateConsumption != null && m.hasOwnProperty("carbohydrateConsumption"))
                    w.uint32(24).uint32(m.carbohydrateConsumption);
                if (m.proteinConsumption != null && m.hasOwnProperty("proteinConsumption"))
                    w.uint32(32).uint32(m.proteinConsumption);
                if (m.fatConsumption != null && m.hasOwnProperty("fatConsumption"))
                    w.uint32(40).uint32(m.fatConsumption);
                return w;
            };
    
            PbTrainingLoad.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.trainingLoadVal != null && m.hasOwnProperty("trainingLoadVal")) {
                    if (!$util.isInteger(m.trainingLoadVal))
                        return "trainingLoadVal: integer expected";
                }
                if (m.recoveryTime != null && m.hasOwnProperty("recoveryTime")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.recoveryTime);
                        if (e)
                            return "recoveryTime." + e;
                    }
                }
                if (m.carbohydrateConsumption != null && m.hasOwnProperty("carbohydrateConsumption")) {
                    if (!$util.isInteger(m.carbohydrateConsumption))
                        return "carbohydrateConsumption: integer expected";
                }
                if (m.proteinConsumption != null && m.hasOwnProperty("proteinConsumption")) {
                    if (!$util.isInteger(m.proteinConsumption))
                        return "proteinConsumption: integer expected";
                }
                if (m.fatConsumption != null && m.hasOwnProperty("fatConsumption")) {
                    if (!$util.isInteger(m.fatConsumption))
                        return "fatConsumption: integer expected";
                }
                return null;
            };
    
            return PbTrainingLoad;
        })();
    
        polar_types.PbHeartRateZone = (function() {
    
            function PbHeartRateZone(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbHeartRateZone.prototype.lowerLimit = 0;
            PbHeartRateZone.prototype.higherLimit = 0;
    
            PbHeartRateZone.create = function create(properties) {
                return new PbHeartRateZone(properties);
            };
    
            PbHeartRateZone.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.lowerLimit);
                w.uint32(16).uint32(m.higherLimit);
                return w;
            };
    
            PbHeartRateZone.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.lowerLimit))
                    return "lowerLimit: integer expected";
                if (!$util.isInteger(m.higherLimit))
                    return "higherLimit: integer expected";
                return null;
            };
    
            return PbHeartRateZone;
        })();
    
        polar_types.PbSpeedZone = (function() {
    
            function PbSpeedZone(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSpeedZone.prototype.lowerLimit = 0;
            PbSpeedZone.prototype.higherLimit = 0;
    
            PbSpeedZone.create = function create(properties) {
                return new PbSpeedZone(properties);
            };
    
            PbSpeedZone.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(13).float(m.lowerLimit);
                w.uint32(21).float(m.higherLimit);
                return w;
            };
    
            PbSpeedZone.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (typeof m.lowerLimit !== "number")
                    return "lowerLimit: number expected";
                if (typeof m.higherLimit !== "number")
                    return "higherLimit: number expected";
                return null;
            };
    
            return PbSpeedZone;
        })();
    
        polar_types.PbPowerZone = (function() {
    
            function PbPowerZone(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbPowerZone.prototype.lowerLimit = 0;
            PbPowerZone.prototype.higherLimit = 0;
    
            PbPowerZone.create = function create(properties) {
                return new PbPowerZone(properties);
            };
    
            PbPowerZone.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.lowerLimit);
                w.uint32(16).uint32(m.higherLimit);
                return w;
            };
    
            PbPowerZone.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.lowerLimit))
                    return "lowerLimit: integer expected";
                if (!$util.isInteger(m.higherLimit))
                    return "higherLimit: integer expected";
                return null;
            };
    
            return PbPowerZone;
        })();
    
        polar_types.PbZones = (function() {
    
            function PbZones(p) {
                this.heartRateZone = [];
                this.speedZone = [];
                this.powerZone = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbZones.prototype.heartRateZone = $util.emptyArray;
            PbZones.prototype.speedZone = $util.emptyArray;
            PbZones.prototype.powerZone = $util.emptyArray;
            PbZones.prototype.heartRateSettingSource = 0;
            PbZones.prototype.powerSettingSource = 0;
            PbZones.prototype.speedSettingSource = 0;
    
            PbZones.create = function create(properties) {
                return new PbZones(properties);
            };
    
            PbZones.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.heartRateZone != null && m.heartRateZone.length) {
                    for (var i = 0; i < m.heartRateZone.length; ++i)
                        $root.polar_types.PbHeartRateZone.encode(m.heartRateZone[i], w.uint32(10).fork()).ldelim();
                }
                if (m.speedZone != null && m.speedZone.length) {
                    for (var i = 0; i < m.speedZone.length; ++i)
                        $root.polar_types.PbSpeedZone.encode(m.speedZone[i], w.uint32(18).fork()).ldelim();
                }
                if (m.powerZone != null && m.powerZone.length) {
                    for (var i = 0; i < m.powerZone.length; ++i)
                        $root.polar_types.PbPowerZone.encode(m.powerZone[i], w.uint32(26).fork()).ldelim();
                }
                if (m.heartRateSettingSource != null && m.hasOwnProperty("heartRateSettingSource"))
                    w.uint32(80).int32(m.heartRateSettingSource);
                if (m.powerSettingSource != null && m.hasOwnProperty("powerSettingSource"))
                    w.uint32(88).int32(m.powerSettingSource);
                if (m.speedSettingSource != null && m.hasOwnProperty("speedSettingSource"))
                    w.uint32(96).int32(m.speedSettingSource);
                return w;
            };
    
            PbZones.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.heartRateZone != null && m.hasOwnProperty("heartRateZone")) {
                    if (!Array.isArray(m.heartRateZone))
                        return "heartRateZone: array expected";
                    for (var i = 0; i < m.heartRateZone.length; ++i) {
                        {
                            var e = $root.polar_types.PbHeartRateZone.verify(m.heartRateZone[i]);
                            if (e)
                                return "heartRateZone." + e;
                        }
                    }
                }
                if (m.speedZone != null && m.hasOwnProperty("speedZone")) {
                    if (!Array.isArray(m.speedZone))
                        return "speedZone: array expected";
                    for (var i = 0; i < m.speedZone.length; ++i) {
                        {
                            var e = $root.polar_types.PbSpeedZone.verify(m.speedZone[i]);
                            if (e)
                                return "speedZone." + e;
                        }
                    }
                }
                if (m.powerZone != null && m.hasOwnProperty("powerZone")) {
                    if (!Array.isArray(m.powerZone))
                        return "powerZone: array expected";
                    for (var i = 0; i < m.powerZone.length; ++i) {
                        {
                            var e = $root.polar_types.PbPowerZone.verify(m.powerZone[i]);
                            if (e)
                                return "powerZone." + e;
                        }
                    }
                }
                if (m.heartRateSettingSource != null && m.hasOwnProperty("heartRateSettingSource")) {
                    switch (m.heartRateSettingSource) {
                    default:
                        return "heartRateSettingSource: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                }
                if (m.powerSettingSource != null && m.hasOwnProperty("powerSettingSource")) {
                    switch (m.powerSettingSource) {
                    default:
                        return "powerSettingSource: enum value expected";
                    case 0:
                    case 1:
                        break;
                    }
                }
                if (m.speedSettingSource != null && m.hasOwnProperty("speedSettingSource")) {
                    switch (m.speedSettingSource) {
                    default:
                        return "speedSettingSource: enum value expected";
                    case 0:
                    case 1:
                        break;
                    }
                }
                return null;
            };
    
            return PbZones;
        })();
    
        polar_types.PbBleMac = (function() {
    
            function PbBleMac(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbBleMac.prototype.mac = $util.newBuffer([]);
            PbBleMac.prototype.type = 0;
    
            PbBleMac.create = function create(properties) {
                return new PbBleMac(properties);
            };
    
            PbBleMac.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).bytes(m.mac);
                w.uint32(16).int32(m.type);
                return w;
            };
    
            PbBleMac.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!(m.mac && typeof m.mac.length === "number" || $util.isString(m.mac)))
                    return "mac: buffer expected";
                switch (m.type) {
                default:
                    return "type: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                    break;
                }
                return null;
            };
    
            return PbBleMac;
        })();
    
        polar_types.PbBleDeviceName = (function() {
    
            function PbBleDeviceName(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbBleDeviceName.prototype.name = "";
    
            PbBleDeviceName.create = function create(properties) {
                return new PbBleDeviceName(properties);
            };
    
            PbBleDeviceName.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).string(m.name);
                return w;
            };
    
            PbBleDeviceName.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isString(m.name))
                    return "name: string expected";
                return null;
            };
    
            return PbBleDeviceName;
        })();
    
        polar_types.PbDeviceId = (function() {
    
            function PbDeviceId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbDeviceId.prototype.deviceId = "";
    
            PbDeviceId.create = function create(properties) {
                return new PbDeviceId(properties);
            };
    
            PbDeviceId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).string(m.deviceId);
                return w;
            };
    
            PbDeviceId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isString(m.deviceId))
                    return "deviceId: string expected";
                return null;
            };
    
            return PbDeviceId;
        })();
    
        polar_types.PbRunningIndex = (function() {
    
            function PbRunningIndex(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRunningIndex.prototype.value = 0;
            PbRunningIndex.prototype.calculationTime = null;
    
            PbRunningIndex.create = function create(properties) {
                return new PbRunningIndex(properties);
            };
    
            PbRunningIndex.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint32(m.value);
                if (m.calculationTime != null && m.hasOwnProperty("calculationTime"))
                    $root.polar_types.PbDuration.encode(m.calculationTime, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbRunningIndex.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value))
                    return "value: integer expected";
                if (m.calculationTime != null && m.hasOwnProperty("calculationTime")) {
                    {
                        var e = $root.polar_types.PbDuration.verify(m.calculationTime);
                        if (e)
                            return "calculationTime." + e;
                    }
                }
                return null;
            };
    
            return PbRunningIndex;
        })();
    
        polar_types.PbSportIdentifier = (function() {
    
            function PbSportIdentifier(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSportIdentifier.prototype.value = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
            PbSportIdentifier.create = function create(properties) {
                return new PbSportIdentifier(properties);
            };
    
            PbSportIdentifier.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.value);
                return w;
            };
    
            PbSportIdentifier.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value) && !(m.value && $util.isInteger(m.value.low) && $util.isInteger(m.value.high)))
                    return "value: integer|Long expected";
                return null;
            };
    
            return PbSportIdentifier;
        })();
    
        polar_types.PbOneLineText = (function() {
    
            function PbOneLineText(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbOneLineText.prototype.text = "";
    
            PbOneLineText.create = function create(properties) {
                return new PbOneLineText(properties);
            };
    
            PbOneLineText.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).string(m.text);
                return w;
            };
    
            PbOneLineText.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isString(m.text))
                    return "text: string expected";
                return null;
            };
    
            return PbOneLineText;
        })();
    
        polar_types.PbMultiLineText = (function() {
    
            function PbMultiLineText(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbMultiLineText.prototype.text = "";
    
            PbMultiLineText.create = function create(properties) {
                return new PbMultiLineText(properties);
            };
    
            PbMultiLineText.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).string(m.text);
                return w;
            };
    
            PbMultiLineText.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isString(m.text))
                    return "text: string expected";
                return null;
            };
    
            return PbMultiLineText;
        })();
    
        polar_types.PbLanguageId = (function() {
    
            function PbLanguageId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbLanguageId.prototype.language = "";
    
            PbLanguageId.create = function create(properties) {
                return new PbLanguageId(properties);
            };
    
            PbLanguageId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(10).string(m.language);
                return w;
            };
    
            PbLanguageId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isString(m.language))
                    return "language: string expected";
                return null;
            };
    
            return PbLanguageId;
        })();
    
        polar_types.PbTrainingSessionTargetId = (function() {
    
            function PbTrainingSessionTargetId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTrainingSessionTargetId.prototype.value = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
            PbTrainingSessionTargetId.prototype.lastModified = null;
    
            PbTrainingSessionTargetId.create = function create(properties) {
                return new PbTrainingSessionTargetId(properties);
            };
    
            PbTrainingSessionTargetId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.value);
                if (m.lastModified != null && m.hasOwnProperty("lastModified"))
                    $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbTrainingSessionTargetId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value) && !(m.value && $util.isInteger(m.value.low) && $util.isInteger(m.value.high)))
                    return "value: integer|Long expected";
                if (m.lastModified != null && m.hasOwnProperty("lastModified")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                        if (e)
                            return "lastModified." + e;
                    }
                }
                return null;
            };
    
            return PbTrainingSessionTargetId;
        })();
    
        polar_types.PbTrainingSessionFavoriteId = (function() {
    
            function PbTrainingSessionFavoriteId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTrainingSessionFavoriteId.prototype.value = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
            PbTrainingSessionFavoriteId.prototype.lastModified = null;
    
            PbTrainingSessionFavoriteId.create = function create(properties) {
                return new PbTrainingSessionFavoriteId(properties);
            };
    
            PbTrainingSessionFavoriteId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.value);
                if (m.lastModified != null && m.hasOwnProperty("lastModified"))
                    $root.polar_types.PbSystemDateTime.encode(m.lastModified, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbTrainingSessionFavoriteId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value) && !(m.value && $util.isInteger(m.value.low) && $util.isInteger(m.value.high)))
                    return "value: integer|Long expected";
                if (m.lastModified != null && m.hasOwnProperty("lastModified")) {
                    {
                        var e = $root.polar_types.PbSystemDateTime.verify(m.lastModified);
                        if (e)
                            return "lastModified." + e;
                    }
                }
                return null;
            };
    
            return PbTrainingSessionFavoriteId;
        })();
    
        polar_types.PbRouteId = (function() {
    
            function PbRouteId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbRouteId.prototype.value = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
            PbRouteId.create = function create(properties) {
                return new PbRouteId(properties);
            };
    
            PbRouteId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.value);
                return w;
            };
    
            PbRouteId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value) && !(m.value && $util.isInteger(m.value.low) && $util.isInteger(m.value.high)))
                    return "value: integer|Long expected";
                return null;
            };
    
            return PbRouteId;
        })();
    
        polar_types.PbSwimmingPoolInfo = (function() {
    
            function PbSwimmingPoolInfo(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbSwimmingPoolInfo.prototype.poolLength = 0;
            PbSwimmingPoolInfo.prototype.swimmingPoolType = 0;
    
            PbSwimmingPoolInfo.create = function create(properties) {
                return new PbSwimmingPoolInfo(properties);
            };
    
            PbSwimmingPoolInfo.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.poolLength != null && m.hasOwnProperty("poolLength"))
                    w.uint32(13).float(m.poolLength);
                w.uint32(16).int32(m.swimmingPoolType);
                return w;
            };
    
            PbSwimmingPoolInfo.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (m.poolLength != null && m.hasOwnProperty("poolLength")) {
                    if (typeof m.poolLength !== "number")
                        return "poolLength: number expected";
                }
                switch (m.swimmingPoolType) {
                default:
                    return "swimmingPoolType: enum value expected";
                case 0:
                case 1:
                    break;
                }
                return null;
            };
    
            return PbSwimmingPoolInfo;
        })();
    
        polar_types.PbTrainingProgramId = (function() {
    
            function PbTrainingProgramId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbTrainingProgramId.prototype.value = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
            PbTrainingProgramId.create = function create(properties) {
                return new PbTrainingProgramId(properties);
            };
    
            PbTrainingProgramId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.value);
                return w;
            };
    
            PbTrainingProgramId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value) && !(m.value && $util.isInteger(m.value.low) && $util.isInteger(m.value.high)))
                    return "value: integer|Long expected";
                return null;
            };
    
            return PbTrainingProgramId;
        })();
    
        polar_types.PbEventId = (function() {
    
            function PbEventId(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbEventId.prototype.value = $util.Long ? $util.Long.fromBits(0,0,true) : 0;
    
            PbEventId.create = function create(properties) {
                return new PbEventId(properties);
            };
    
            PbEventId.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).uint64(m.value);
                return w;
            };
    
            PbEventId.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                if (!$util.isInteger(m.value) && !(m.value && $util.isInteger(m.value.low) && $util.isInteger(m.value.high)))
                    return "value: integer|Long expected";
                return null;
            };
    
            return PbEventId;
        })();
    
        polar_types.PbStravaSegmentTargets = (function() {
    
            function PbStravaSegmentTargets(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbStravaSegmentTargets.prototype.ownBest = null;
            PbStravaSegmentTargets.prototype.komQom = null;
    
            PbStravaSegmentTargets.create = function create(properties) {
                return new PbStravaSegmentTargets(properties);
            };
    
            PbStravaSegmentTargets.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                $root.polar_types.PbDuration.encode(m.ownBest, w.uint32(10).fork()).ldelim();
                $root.polar_types.PbDuration.encode(m.komQom, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbStravaSegmentTargets.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                {
                    var e = $root.polar_types.PbDuration.verify(m.ownBest);
                    if (e)
                        return "ownBest." + e;
                }
                {
                    var e = $root.polar_types.PbDuration.verify(m.komQom);
                    if (e)
                        return "komQom." + e;
                }
                return null;
            };
    
            return PbStravaSegmentTargets;
        })();
    
        polar_types.PbStravaSegmentTarget = (function() {
    
            function PbStravaSegmentTarget(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }
    
            PbStravaSegmentTarget.prototype.stravaSegmentType = 1;
            PbStravaSegmentTarget.prototype.stravaSegmentTargets = null;
    
            PbStravaSegmentTarget.create = function create(properties) {
                return new PbStravaSegmentTarget(properties);
            };
    
            PbStravaSegmentTarget.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                w.uint32(8).int32(m.stravaSegmentType);
                $root.polar_types.PbStravaSegmentTargets.encode(m.stravaSegmentTargets, w.uint32(18).fork()).ldelim();
                return w;
            };
    
            PbStravaSegmentTarget.verify = function verify(m) {
                if (typeof m !== "object" || m === null)
                    return "object expected";
                switch (m.stravaSegmentType) {
                default:
                    return "stravaSegmentType: enum value expected";
                case 1:
                case 2:
                    break;
                }
                {
                    var e = $root.polar_types.PbStravaSegmentTargets.verify(m.stravaSegmentTargets);
                    if (e)
                        return "stravaSegmentTargets." + e;
                }
                return null;
            };
    
            PbStravaSegmentTarget.PbStravaSegmentType = (function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[1] = "STRAVA_SEGMENT_TYPE_RIDE"] = 1;
                values[valuesById[2] = "STRAVA_SEGMENT_TYPE_RUN"] = 2;
                return values;
            })();
    
            return PbStravaSegmentTarget;
        })();
    
        return polar_types;
    })();

    return $root;
});

},{"protobufjs/minimal":9}],22:[function(require,module,exports){
/*
 * Generated by PEG.js 0.10.0.
 *
 * http://pegjs.org/
 */

"use strict";

function peg$subclass(child, parent) {
  function ctor() { this.constructor = child; }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
}

function peg$SyntaxError(message, expected, found, location) {
  this.message  = message;
  this.expected = expected;
  this.found    = found;
  this.location = location;
  this.name     = "SyntaxError";

  if (typeof Error.captureStackTrace === "function") {
    Error.captureStackTrace(this, peg$SyntaxError);
  }
}

peg$subclass(peg$SyntaxError, Error);

peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return "\"" + literalEscape(expectation.text) + "\"";
        },

        "class": function(expectation) {
          var escapedParts = "",
              i;

          for (i = 0; i < expectation.parts.length; i++) {
            escapedParts += expectation.parts[i] instanceof Array
              ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
              : classEscape(expectation.parts[i]);
          }

          return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
        },

        any: function(expectation) {
          return "any character";
        },

        end: function(expectation) {
          return "end of input";
        },

        other: function(expectation) {
          return expectation.description;
        }
      };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g,  '\\"')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/\]/g, '\\]')
      .replace(/\^/g, '\\^')
      .replace(/-/g,  '\\-')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = new Array(expected.length),
        i, j;

    for (i = 0; i < expected.length; i++) {
      descriptions[i] = describeExpectation(expected[i]);
    }

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ")
          + ", or "
          + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== void 0 ? options : {};

  var peg$FAILED = {},

      peg$startRuleFunctions = { start: peg$parsestart },
      peg$startRuleFunction  = peg$parsestart,

      peg$c0 = function(pl) { return pl },
      peg$c1 = function(p) { return { phases: [ p ], recovery_phase: null } },
      peg$c2 = peg$otherExpectation("phase block"),
      peg$c3 = "(",
      peg$c4 = peg$literalExpectation("(", false),
      peg$c5 = ")",
      peg$c6 = peg$literalExpectation(")", false),
      peg$c7 = function(phases) { return phases },
      peg$c8 = peg$otherExpectation("block"),
      peg$c9 = /^[xX*]/,
      peg$c10 = peg$classExpectation(["x", "X", "*"], false, false),
      peg$c11 = function(repetitions, phases) { 
      		return { repetitions, ...phases } 
      	},
      peg$c12 = peg$otherExpectation("phase list"),
      peg$c13 = function(p1, pn) { 
      		return [p1, ...pn.map(a => a[3])]
      	},
      peg$c14 = peg$otherExpectation("phase"),
      peg$c15 = function(phase) { return phase },
      peg$c16 = peg$otherExpectation("block_phase list"),
      peg$c17 = function(p1, pn, rp) {
      			return {
      				phases: [p1, ...pn.map(a => a[3])],
      				recovery_phase: rp ? rp[3] : null
       			}
       		},
      peg$c18 = peg$otherExpectation("separator"),
      peg$c19 = /^[+\n]/,
      peg$c20 = peg$classExpectation(["+", "\n"], false, false),
      peg$c21 = "\n",
      peg$c22 = peg$literalExpectation("\n", false),
      peg$c23 = "/",
      peg$c24 = peg$literalExpectation("/", false),
      peg$c25 = "\\",
      peg$c26 = peg$literalExpectation("\\", false),
      peg$c27 = function(duration, comment) { return { name: comment || "unknown", duration } },
      peg$c28 = peg$otherExpectation("phase name"),
      peg$c29 = function() { return text() },
      peg$c30 = peg$otherExpectation("phase duration"),
      peg$c31 = function(dur) { return { hours: 0, ...dur } },
      peg$c32 = /^[hH]/,
      peg$c33 = peg$classExpectation(["h", "H"], false, false),
      peg$c34 = function(hours, dur) { return { hours, ...dur } },
      peg$c35 = function(hours) { return { hours, minutes: 0, seconds: 0 } },
      peg$c36 = function(minutes, seconds) { return { minutes, seconds } },
      peg$c37 = function(seconds) { return { seconds, minutes: 0 } },
      peg$c38 = function(minutes) { return { seconds: 0, minutes } },
      peg$c39 = peg$otherExpectation("apostrophe"),
      peg$c40 = /^[\xB4\u2019`'\u2018]/,
      peg$c41 = peg$classExpectation(["\xB4", "\u2019", "`", "'", "\u2018"], false, false),
      peg$c42 = peg$otherExpectation("double apostrophe"),
      peg$c43 = /^[\u201D"]/,
      peg$c44 = peg$classExpectation(["\u201D", "\""], false, false),
      peg$c45 = peg$otherExpectation("integer"),
      peg$c46 = /^[0-9]/,
      peg$c47 = peg$classExpectation([["0", "9"]], false, false),
      peg$c48 = function() { return parseInt(text(), 10); },
      peg$c49 = peg$otherExpectation("space"),
      peg$c50 = /^[ \t\r]/,
      peg$c51 = peg$classExpectation([" ", "\t", "\r"], false, false),
      peg$c52 = peg$otherExpectation("whitespace"),
      peg$c53 = /^[ \t\n\r]/,
      peg$c54 = peg$classExpectation([" ", "\t", "\n", "\r"], false, false),
      peg$c55 = /^[^\n+()\/]/,
      peg$c56 = peg$classExpectation(["\n", "+", "(", ")", "/"], true, false),

      peg$currPos          = 0,
      peg$savedPos         = 0,
      peg$posDetailsCache  = [{ line: 1, column: 1 }],
      peg$maxFailPos       = 0,
      peg$maxFailExpected  = [],
      peg$silentFails      = 0,

      peg$result;

  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }

  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }

  function expected(description, location) {
    location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

    throw peg$buildStructuredError(
      [peg$otherExpectation(description)],
      input.substring(peg$savedPos, peg$currPos),
      location
    );
  }

  function error(message, location) {
    location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

    throw peg$buildSimpleError(message, location);
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
  }

  function peg$anyExpectation() {
    return { type: "any" };
  }

  function peg$endExpectation() {
    return { type: "end" };
  }

  function peg$otherExpectation(description) {
    return { type: "other", description: description };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos], p;

    if (details) {
      return details;
    } else {
      p = pos - 1;
      while (!peg$posDetailsCache[p]) {
        p--;
      }

      details = peg$posDetailsCache[p];
      details = {
        line:   details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;
      return details;
    }
  }

  function peg$computeLocation(startPos, endPos) {
    var startPosDetails = peg$computePosDetails(startPos),
        endPosDetails   = peg$computePosDetails(endPos);

    return {
      start: {
        offset: startPos,
        line:   startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line:   endPosDetails.line,
        column: endPosDetails.column
      }
    };
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parsestart() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsews();
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$parsews();
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsephase_list();
      if (s2 !== peg$FAILED) {
        s3 = [];
        s4 = peg$parsews();
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$parsews();
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c0(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsephase_as_block() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parsephase();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c1(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsephase_block() {
    var s0, s1, s2, s3, s4, s5;

    peg$silentFails++;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 40) {
      s1 = peg$c3;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c4); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseblock_phase_list();
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 41) {
              s5 = peg$c5;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c6); }
            }
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c7(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c2); }
    }

    return s0;
  }

  function peg$parseblock() {
    var s0, s1, s2, s3, s4, s5;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parseinteger();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        if (peg$c9.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c10); }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsephase_block();
            if (s5 === peg$FAILED) {
              s5 = peg$parsephase_as_block();
            }
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c11(s1, s5);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c8); }
    }

    return s0;
  }

  function peg$parsephase_list() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsephase_or_block();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (s4 !== peg$FAILED) {
        s5 = peg$parsephase_separator();
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          if (s6 !== peg$FAILED) {
            s7 = peg$parsephase_or_block();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsephase_separator();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parsephase_or_block();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c13(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c12); }
    }

    return s0;
  }

  function peg$parsephase_or_block() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsews();
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$parsews();
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsephase();
      if (s2 === peg$FAILED) {
        s2 = peg$parseblock();
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c15(s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c14); }
    }

    return s0;
  }

  function peg$parseblock_phase_list() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsephase_or_block();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (s4 !== peg$FAILED) {
        s5 = peg$parsephase_separator();
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          if (s6 !== peg$FAILED) {
            s7 = peg$parsephase_or_block();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsephase_separator();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parsephase_or_block();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parserecovery_separator();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parsephase();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c17(s1, s2, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c16); }
    }

    return s0;
  }

  function peg$parsephase_separator() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 !== peg$FAILED) {
      if (peg$c19.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c20); }
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c18); }
    }

    return s0;
  }

  function peg$parserecovery_separator() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 10) {
      s3 = peg$c21;
      peg$currPos++;
    } else {
      s3 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c22); }
    }
    if (s3 !== peg$FAILED) {
      s4 = peg$parse_();
      if (s4 !== peg$FAILED) {
        s3 = [s3, s4];
        s2 = s3;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
    } else {
      peg$currPos = s2;
      s2 = peg$FAILED;
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 10) {
        s3 = peg$c21;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c22); }
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s3 = [s3, s4];
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
    }
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 47) {
        s2 = peg$c23;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c24); }
      }
      if (s2 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 92) {
          s2 = peg$c25;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c26); }
        }
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsephase() {
    var s0, s1, s2, s3;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parseduration();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsecomment();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c27(s1, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c14); }
    }

    return s0;
  }

  function peg$parsecomment() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parseletter();
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$parseletter();
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c29();
    }
    s0 = s1;
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c28); }
    }

    return s0;
  }

  function peg$parseduration() {
    var s0, s1, s2, s3, s4, s5;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parseduration_no_hours();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c31(s1);
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseinteger();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (peg$c32.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c33); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseduration_no_hours();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c34(s1, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseinteger();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            if (peg$c32.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c33); }
            }
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c35(s1);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c30); }
    }

    return s0;
  }

  function peg$parseduration_no_hours() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parseinteger();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseapos();
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseinteger();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsedapos();
                if (s7 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c36(s1, s5);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseinteger();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsedapos();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c37(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseinteger();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseapos();
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c38(s1);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c30); }
    }

    return s0;
  }

  function peg$parseapos() {
    var s0, s1;

    peg$silentFails++;
    if (peg$c40.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c41); }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c39); }
    }

    return s0;
  }

  function peg$parsedapos() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parseapos();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseapos();
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      if (peg$c43.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c44); }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c42); }
    }

    return s0;
  }

  function peg$parseinteger() {
    var s0, s1, s2, s3;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 !== peg$FAILED) {
      s2 = [];
      if (peg$c46.test(input.charAt(peg$currPos))) {
        s3 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c47); }
      }
      if (s3 !== peg$FAILED) {
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c46.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c47); }
          }
        }
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c48();
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c45); }
    }

    return s0;
  }

  function peg$parse_() {
    var s0, s1;

    peg$silentFails++;
    s0 = [];
    if (peg$c50.test(input.charAt(peg$currPos))) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c51); }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      if (peg$c50.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c51); }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c49); }
    }

    return s0;
  }

  function peg$parsews() {
    var s0, s1;

    peg$silentFails++;
    if (peg$c53.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c54); }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c52); }
    }

    return s0;
  }

  function peg$parseletter() {
    var s0;

    if (peg$c55.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c56); }
    }

    return s0;
  }

  peg$result = peg$startRuleFunction();

  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

module.exports = {
  SyntaxError: peg$SyntaxError,
  parse:       peg$parse
};

},{}],23:[function(require,module,exports){
const polarData = require('./output/proto-data').polar_data
const polarTypes = require('./output/proto-types').polar_types
const {
    parse,
    SyntaxError
} = require('./output/train-description-parser')

const INTENSITY_TYPE_FREE = polarData.PbPhaseIntensity.create({
    intensity_type: polarData.PbPhaseIntensity.PhaseIntensityType.PHASE_INTENSITY_FREE
})

const ZERO_DURATION = polarTypes.PbDuration.create()
const KAYAK = polarTypes.PbSportIdentifier.create({
    value: 95
})

function flatten(array) {
    let result = []

    for (let entry of array) {
        if (entry instanceof Array) {
            result = [...result, ...entry]
        } else {
            result = [...result, entry]
        }
    }

    return result
}

function newPhase(name, duration) {
    return polarData.PbPhase.create({
        name: polarTypes.PbOneLineText.create({ text: name.trim() }),
        change: 1,
        goal: polarData.PbPhaseGoal.create({
            goalType: 1,
            duration: duration
        }),
        intensity: INTENSITY_TYPE_FREE
    })
}

function newDuration({ hours, minutes, seconds }) {
    const secs = 3600 * hours + 60 * minutes + seconds

    return polarTypes.PbDuration.create({
        hours: Math.floor(secs / 3600),
        minutes: Math.floor((secs % 3600) / 60),
        seconds: secs % 60,
        millis: 0
    })
}

function emptyDuration() {
    return newDuration({
        hours: 0,
        minutes: 0,
        seconds: 0
    })
}

function preparePhases(item) {
    // List of items
    if (item instanceof Array) {
        return flatten(item.map(preparePhases))
    }

    if (item.hasOwnProperty('name')) {
        return item
    }

    // Repeat block
    let innerPhases = preparePhases(item.phases)

    if (item.repetitions === 1) {
        // Blocks with a single repetition do not need to repeat
        return innerPhases
    }

    if (item.repetitions <= 0) {
        // We can discard blocks with 0 repetitions
        return []
    }

    if (item.recovery_phase) {
        return flatten([
            ...preparePhases({
                repetitions: item.repetitions - 1,
                phases: [...item.phases, item.recovery_phase],
                recovery_phase: null
            }),
            ...preparePhases(item.phases),
        ])
    }

    let last = innerPhases[innerPhases.length - 1]

    if (last.hasOwnProperty('repetitions')) {
        // Add filler phase at the end to store repetitions
        return [...innerPhases, {
            name: 'filler',
            duration: {
                minutes: 0,
                seconds: 0
            },
            repetitions: item.repetitions,
            blockSize: innerPhases.length + 1
        }]
    }

    innerPhases[innerPhases.length - 1] = {
        name: last.name,
        duration: last.duration,
        repetitions: item.repetitions,
        blockSize: innerPhases.length
    }

    return innerPhases
}

function buildPhases(phases) {
    return phases.map((phase, i) => {
        const polarPhase = newPhase(phase.name, newDuration(phase.duration))

        if (phase.hasOwnProperty('repetitions')) {
            polarPhase.jumpIndex = i - phase.blockSize + 2
            polarPhase.repeatCount = phase.repetitions - 1
        }

        console.assert(polarData.PbPhase.verify(polarPhase) === null)
        return polarPhase
    })
}

function buildSession(tree, sessionName) {
    const phases = buildPhases(preparePhases(tree))

    const target = polarData.PbExerciseTarget.create({
        targetType: 2,
        phases: polarData.PbPhases.create({
            phase: phases
        }),
        sportId: KAYAK
    })

    const session = polarData.PbTrainingSessionTarget.create({
        name: polarTypes.PbOneLineText.create({
            text: sessionName
        }),
        exerciseTarget: [target]
    })

    console.assert(polarData.PbTrainingSessionTarget.verify(session) === null)
    return session
}

function addDuration(a, b) {
    return newDuration({
        hours: a.hours + b.hours,
        minutes: a.minutes + b.minutes,
        seconds: a.seconds + b.seconds
    })
}

function multiplyDuration(d, by) {
    return newDuration({
        hours: d.hours,
        minutes: by * d.minutes,
        seconds: by * d.seconds
    })
}

function describeSession(phases, trainName) {
    function getInnerDuration(phase) {
        if (phase.repetitions) {
            // It's a block
            let result = emptyDuration()

            for (const p of phase.phases) {
                result = addDuration(result, getDuration(p))
            }

            return result
        }

        // It's a phase
        return getDuration(phase)
    }

    function getDuration(phase) {
        if (phase.repetitions) {
            // It's a block
            let result = emptyDuration()

            for (const p of phase.phases) {
                result = addDuration(result, getDuration(p))
            }

            return multiplyDuration(result, phase.repetitions)
        }

        // It's a phase
        return phase.duration
    }

    function drawDuration(duration) {
        const {
            hours: h,
            minutes: m,
            seconds: s
        } = duration

        let result = ''

        if (h > 0) {
            result += h + 'h'
        }

        if (m > 0) {
            result += m + '\''
        }

        if (s > 0 || (h === 0 && m === 0)) {
            result += s + '\'\''
        }

        return result
    }

    function describePhase(phase) {
        if (phase.repetitions) {
            // It's a block
            let result = ''

            for (let p of (phase.phases)) {
                result += '\n' + describePhase(p)
            }

            const duration = drawDuration(getInnerDuration(phase))
            return `Repeat x${phase.repetitions} [${duration}]` + result.replace(/\n/g, '\n\t')
        }

        // It's a phase
        const duration = drawDuration(getDuration(phase))
        return `${duration} ${phase.name}`
    }

    const p = phases.map((phase, i) => ({
        id: i + 1,
        duration: phase.goal.duration,
        name: phase.name.text,
        jumpIndex: phase.jumpIndex || null,
        repeatCount: phase.repeatCount || null
    }))

    let result = []
    for (const phase of p) {
        result.push(phase)

        if (phase.repeatCount !== null) {
            // Pack phases into a block
            const sliceI = result.findIndex(p => p.id === phase.jumpIndex)
            console.assert(sliceI !== -1)

            let blockPhases = result.slice(sliceI)

            result = [
                ...result.slice(0, sliceI),
                {
                    id: blockPhases[0].id,
                    phases: blockPhases,
                    repetitions: phase.repeatCount + 1
                }
            ]
        }
    }

    const description = trainName + describePhase({
        id: 0,
        phases: result,
        repetitions: 1
    }).slice(9)

    if (phases.length > 20) {
        return 'WARNING: your training session has too many different phases and probably won\'t work\n'
            + description
    }

    return description
}

function encodeSession(session) {
    return polarData.PbTrainingSessionTarget
        .encode(session)
        .finish()
}

module.exports = {
    buildSession,
    describeSession,
    encodeSession,
    parse,
    SyntaxError
}
},{"./output/proto-data":20,"./output/proto-types":21,"./output/train-description-parser":22}]},{},[1]);
