/// <reference path="../utils.ts"/>

module Factor {
    class Point {
        constructor(public x: number, public y: number) {
        }
    }

    class Animation {
        private step: number;
        private totalTime = 0;
        private timeoutToken: number = null;

        constructor(public stepCount: number, public duration: number,
            public handler: (normalized: number) => void, public stop: () => void) {
            this.step = duration / stepCount;
            this.timeoutToken = setTimeout(() => this.tick(), 0);
        }

        private tick() {
            this.handler(this.totalTime / this.duration);
            if (this.totalTime < this.duration) {
                this.totalTime += this.step;
                this.timeoutToken = setTimeout(() => this.tick(), this.step);
            } else {
                this.stop();
            }
        }

        public cancel(invoke_stop: boolean) {
            if (this.timeoutToken != null)
                clearTimeout(this.timeoutToken);
            if (invoke_stop)
                this.stop();
        }
    }

    class FactorizationVisualizer {
        canvas: HTMLCanvasElement;

        points: Point[] = [];
        pointSize: number = 0;
        oldPoints: Point[];
        oldPointSize: number;

        current = 0;
        timerToken: number;
        animation: Animation;

        constructor(canvas: HTMLCanvasElement) {
            this.canvas = canvas;
        }

        public start(initialNumber?: number) {
            if (typeof initialNumber != 'undefined')
                this.current = initialNumber - 1;
            if (this.animation == null)
                this.update();
        }

        public stop() {
            if (this.timerToken != null)
                clearTimeout(this.timerToken);
            if (this.animation != null) {
                this.animation.cancel(false);
                this.animation = null;
            }
        }

        private update() {
            this.current++;

            var info = document.getElementById('info');
            info.innerText = this.current.toString() + " = " + factorize(this.current).toString();

            this.buildPoints(this.current);
            this.animation = new Animation(20, 500,
                x => this.drawPoints(x),
                () => {
                    this.animation = null;
                    this.timerToken = setTimeout(() => this.start(), 1000);
                });
        }

        private buildPoints(n: number) {
            var arranger = new Arranger(factorize(n));
            var origin = new Point(this.canvas.width / 2, this.canvas.height / 2);
            var radius = Math.min(origin.x, origin.y) * 0.5;

            this.oldPointSize = this.pointSize;
            this.pointSize = arranger.getPointSize(radius);
            this.oldPoints = this.points;
            this.points = arranger.arrange(origin, radius, -Math.PI / 2);
        }

        private drawPoints(weight: number) {
            var context = this.canvas.getContext('2d');
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);

            for (var i = this.points.length - 1; i >= 0; i--) {
                var x = this.points[i].x;
                var y = this.points[i].y;
                if (i < this.oldPoints.length) {
                    x = (1 - weight) * this.oldPoints[i].x + weight * x;
                    y = (1 - weight) * this.oldPoints[i].y + weight * y;
                } else if (this.oldPoints.length != 0) {
                    var last = this.oldPoints[this.oldPoints.length - 1];
                    x = (1 - weight) * last.x + weight * x;
                    y = (1 - weight) * last.y + weight * y;
                }
                var size = (1 - weight) * this.oldPointSize + weight * this.pointSize;
                context.fillStyle = this.getColor(i / this.points.length);
                context.beginPath();
                context.arc(x, y, size, 0, Math.PI * 2);
                context.closePath();
                context.fill();
            }
        }

        private getColor(value: number): string {
            var rgb = hsvToRgb(value * 0.5, 1, 1);
            return "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
        }
    }

    function factorize(n: number): number[] {
        var factors = [n];
        if (n <= 3)
            return factors;

        var i = 0;
        var j = 1;
        while (true) {
            if (fermatsMethod(factors, i, j)) {
                j++;
            } else {
                i++;
                if (i == factors.length)
                    break;
            }
        }
        return factors.sort((a, b) => b - a);
    }

    function fermatsMethod(factors: number[], i: number, j: number): boolean {
        var setFactors = (a, b: number) => {
            factors[i] = a;
            factors[j] = b;
        };

        var m = factors[i];
        if (m <= 2)
            return false;
        if (m % 2 == 0) {
            setFactors(2, Math.floor(m / 2));
            return true;
        }

        var sqrt = Math.floor(Math.sqrt(m));
        var rx = sqrt * 2 + 1;
        var ry = 1;
        var r = sqrt * sqrt - m;
        var half = Math.floor(m / 2);

        while (r != 0) {
            r += rx;
            rx += 2;

            while (r > 0) {
                r -= ry;
                ry += 2;
            }

            if (ry > half)
                return false;
        }

        var x = (rx - 1) / 2;
        var y = (ry - 1) / 2;
        setFactors(x + y, x - y);
        return true;
    }

    class Arranger {
        usedRadius = 1;

        groups: number[];
        points: Point[];
        margin: number;

        constructor(groups: number[]) {
            this.points = [];
            // clone groups array
            this.groups = groups.slice(0);

            var i = 1;
            while (i < this.groups.length) {
                if (this.groups[i] == 2 && this.groups[i - 1] == 2) {
                    // replace [..., 2, 2, ...] by [..., 4, ...]
                    this.groups.splice(i - 1, 2, 4);
                } else {
                    i++;
                }
            }
        }

        public getPointSize(radius: number): number {
            for (var i = 0; i < this.groups.length; i++) {
                if (this.groups[i] > 1) {
                    var angle = Math.PI / this.groups[i]
                    radius *= Math.sin(angle) / (1 + Math.sin(angle));
                }

                radius *= this.usedRadius;
            }
            return radius;
        }

        public arrange(origin: Point, radius: number, baseAngle: number): Point[] {
            this.arrangeGroup(0, origin, radius, baseAngle);
            return this.points;
        }

        private arrangeGroup(groupIndex: number, origin: Point, radius: number, baseAngle: number) {
            radius *= this.usedRadius;

            var groupSize = this.groups[groupIndex];
            var angleStep = 2 * Math.PI / groupSize;
            var groupRadius = radius * Math.sin(angleStep / 2) / (1 + Math.sin(angleStep / 2));
            var isLast = groupIndex == this.groups.length - 1;

            var angle = baseAngle;
            for (var i = 0; i < groupSize; i++) {
                var groupPosition = new Point(
                    origin.x + (radius - groupRadius) * Math.cos(angle),
                    origin.y + (radius - groupRadius) * Math.sin(angle));

                if (isLast) {
                    this.points[this.points.length] = groupPosition;
                } else {
                    this.arrangeGroup(groupIndex + 1, groupPosition, groupRadius, angle);
                }

                angle += angleStep;
            }
        }
    }

    /**
     * Converts an HSV color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
     * Assumes h, s, and v are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     *
     * @param   Number  h       The hue
     * @param   Number  s       The saturation
     * @param   Number  v       The value
     * @return  Array           The RGB representation
     */
    function hsvToRgb(h: number, s: number, v: number): number[] {
        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = v * (1 - s);
        var q = v * (1 - f * s);
        var t = v * (1 - (1 - f) * s);

        var r, g, b;
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }

        return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
    }

    function getStartNumberFromLocationHash(): number {
        var hashParams = Utils.parseURIParams(window.location.hash.substr(1));
        var start = hashParams['start'];
        if (typeof start == 'undefined')
            start = '';
        var startNumber = parseInt(start, 10);
        return isNaN(startNumber) ? 1 : startNumber;
    }

    window.onload = () => {
        var start = getStartNumberFromLocationHash();
        var startText = <HTMLTextAreaElement>document.getElementById('start_number');
        startText.value = start.toString();

        var onGoTo = () => {
            var startNumber = parseInt(startText.value, 10);
            if (isNaN(startNumber))
                startNumber = 1;
            if (startNumber == getStartNumberFromLocationHash()) {
                visualizer.stop();
                visualizer.start(startNumber);
            } else {
                window.location.hash = (startNumber == 1 ? '' : '#start=' + startNumber);
            }
        };
        document.getElementById('go').onclick = e => onGoTo();
        startText.onkeyup = e => {
            if (e.keyCode == 13) {
                onGoTo();
                return false;
            } else {
                return true;
            }
        }

        var element = document.getElementById('content');
        var canvas = <HTMLCanvasElement>document.createElement('canvas');
        element.appendChild(canvas);
        fullscreenify(canvas);
        var visualizer = new FactorizationVisualizer(canvas);

        window.onhashchange = e => {
            var start = getStartNumberFromLocationHash();
            startText.value = start.toString();
            visualizer.stop();
            visualizer.start(start);
        };

        visualizer.start(start);
    };

    /**
     * fullscreenify()
     * Stretch canvas to size of window.
     *
     * Zachary Johnson
     * http://www.zachstronaut.com/
     *
     * See also: https://gist.github.com/1178522
     */
    function fullscreenify(canvas) {
        var style = canvas.getAttribute('style') || '';

        window.addEventListener('resize', function () { resize(canvas); }, false);

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
}