var Utils;
(function (Utils) {
    /**
    * Use as follows:
    *   parseURIParams(window.location.search.substr(1));
    * or
    *   parseURIParams(window.location.hash.substr(1));
    */
    function parseURIParams(uri) {
        var pairs = uri.split("&");
        var params = {};

        for (var i = 0; i < pairs.length; i++) {
            var keyValue = pairs[i].split("=");
            if (keyValue.length >= 2) {
                params[decodeURIComponent(keyValue[0])] = decodeURIComponent(keyValue[1]);
            }
        }

        return params;
    }
    Utils.parseURIParams = parseURIParams;

    /**
    * Stretch canvas to size of window.
    *
    * Zachary Johnson
    * http://www.zachstronaut.com/
    *
    * See also: https://gist.github.com/1178522
    */
    function fullscreenify(canvas) {
        var style = canvas.getAttribute('style') || '';

        window.addEventListener('resize', function () {
            resize(canvas);
        }, false);

        resize(canvas);

        function resize(canvas) {
            var pw = canvas.parentNode.clientWidth;
            var ph = canvas.parentNode.clientHeight;

            canvas.height = pw * 0.8 * (canvas.height / canvas.width);
            canvas.width = pw * 0.8;
            canvas.style.top = (ph - canvas.height) / 2 + "px";
            canvas.style.left = (pw - canvas.width) / 2 + "px";
        }
    }
    Utils.fullscreenify = fullscreenify;

    /**
    * Sets .offsetX and .offsetY properties of MouseEvent if they're not defined (Firefox for example).
    */
    function fixOffsetXY(e) {
        if (!e.hasOwnProperty('offsetX')) {
            e.offsetX = e.layerX - (e.currentTarget).offsetLeft;
            e.offsetY = e.layerY - (e.currentTarget).offsetTop;
        }
        return e;
    }
    Utils.fixOffsetXY = fixOffsetXY;
})(Utils || (Utils = {}));

var Random;
(function (Random) {
    // LICENSE (BSD):
    //
    // Copyright 2013 David Bau, all rights reserved.
    //
    // Redistribution and use in source and binary forms, with or without
    // modification, are permitted provided that the following conditions are met:
    //
    //   1. Redistributions of source code must retain the above copyright
    //      notice, this list of conditions and the following disclaimer.
    //
    //   2. Redistributions in binary form must reproduce the above copyright
    //      notice, this list of conditions and the following disclaimer in the
    //      documentation and/or other materials provided with the distribution.
    //
    //   3. Neither the name of this module nor the names of its contributors may
    //      be used to endorse or promote products derived from this software
    //      without specific prior written permission.
    //
    // THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
    // "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
    // LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
    // A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
    // OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
    // SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
    // LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
    // DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    // THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    // (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    // OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    var global = window;
    var pool = [];
    var math = Math;
    var width = 256;
    var chunks = 6;
    var digits = 52;

    //
    // The following constants are related to IEEE 754 limits.
    //
    var startdenom = math.pow(width, chunks);
    var significance = math.pow(2, digits);
    var overflow = significance * 2;
    var mask = width - 1;

    function seed(seed) {
        if (typeof seed === "undefined") { seed = null; }
        var key = [];

        // Flatten the seed string or build one from local entropy if needed.
        var shortseed = mixkey(flatten(seed ? seed : autoseed(), 3), key);

        // Use the seed to initialize an ARC4 generator.
        var arc4 = new ARC4(key);

        // Mix the randomness into accumulated entropy.
        mixkey(tostring(arc4.S), pool);

        // Override Math.random
        // This function returns a random double in [0, 1) that contains
        // randomness in every bit of the mantissa of the IEEE 754 value.
        math['random'] = function () {
            var n = arc4.g(chunks), d = startdenom, x = 0;
            while (n < significance) {
                n = (n + x) * width;
                d *= width;
                x = arc4.g(1);
            }
            while (n >= overflow) {
                n /= 2;
                d /= 2;
                x >>>= 1;
            }
            return (n + x) / d;
        };

        // Return the seed that was used
        return shortseed;
    }
    Random.seed = seed;
    ;

    //
    // ARC4
    //
    // An ARC4 implementation.  The constructor takes a key in the form of
    // an array of at most (width) integers that should be 0 <= x < (width).
    //
    // The g(count) method returns a pseudorandom integer that concatenates
    // the next (count) outputs from ARC4.  Its return value is a number x
    // that is in the range 0 <= x < (width ^ count).
    //
    /** @constructor */
    function ARC4(key) {
        var t, keylen = key.length, me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

        if (!keylen) {
            key = [keylen++];
        }

        while (i < width) {
            s[i] = i++;
        }
        for (i = 0; i < width; i++) {
            s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
            s[j] = t;
        }

        // The "g" method returns the next (count) outputs as one number.
        (me.g = function (count) {
            // Using instance members instead of closure state nearly doubles speed.
            var t, r = 0, i = me.i, j = me.j, s = me.S;
            while (count--) {
                t = s[i = mask & (i + 1)];
                r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
            }
            me.i = i;
            me.j = j;
            return r;
            // For robust unpredictability discard an initial batch of values.
            // See http://www.rsa.com/rsalabs/node.asp?id=2009
        })(width);
    }

    //
    // flatten()
    // Converts an object tree to nested arrays of strings.
    //
    function flatten(obj, depth) {
        var result = [], typ = (typeof obj)[0], prop;
        if (depth && typ == 'o') {
            for (prop in obj) {
                try  {
                    result.push(flatten(obj[prop], depth - 1));
                } catch (e) {
                }
            }
        }
        return (result.length ? result : typ == 's' ? obj : obj + '\0');
    }

    //
    // Mixes a string seed into a key that is an array of integers, and
    // returns a shortened string seed that is equivalent to the result key.
    //
    function mixkey(seed, key) {
        var stringseed = seed + '', smear, j = 0;
        while (j < stringseed.length) {
            key[mask & j] = mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
        }
        return tostring(key);
    }

    //
    // autoseed()
    // Returns an object for autoseeding, using window.crypto if available.
    //
    /** @param {Uint8Array=} seed */
    function autoseed() {
        return [+new Date(), global, global.navigator.plugins, global.screen, tostring(pool)];
    }

    //
    // tostring()
    // Converts an array of charcodes to a string
    //
    function tostring(a) {
        return String.fromCharCode.apply(0, a);
    }

    //
    // When seedrandom.js is loaded, we immediately mix a few bits
    // from the built-in RNG into the entropy pool.  Because we do
    // not want to intefere with determinstic PRNG state later,
    // seedrandom will not call math.random on its own again after
    // initialization.
    //
    mixkey(math.random(), pool);

    function permutation(size) {
        var permuatation = new Array();
        for (var i = 0; i < size; i++) {
            permuatation.push(i);
        }
        for (var j = size - 1; j > 0; j--) {
            var i = Math.floor(Math.random() * j);
            var temp = permuatation[j];
            permuatation[j] = permuatation[i];
            permuatation[i] = temp;
        }
        return permuatation;
    }
    Random.permutation = permutation;
})(Random || (Random = {}));
//# sourceMappingURL=utils.js.map
