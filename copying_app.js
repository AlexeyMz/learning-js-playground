/// <reference path="utils.ts"/>
var Animation = (function () {
    function Animation(stepCount, duration, handler, stop) {
        var _this = this;
        this.stepCount = stepCount;
        this.duration = duration;
        this.handler = handler;
        this.stop = stop;
        this.totalTime = 0;
        this.timeoutToken = null;
        this.step = duration / stepCount;
        this.timeoutToken = setTimeout(function () {
            return _this.tick();
        }, 0);
    }
    Animation.prototype.tick = function () {
        var _this = this;
        this.handler(this.totalTime / this.duration);
        if (this.totalTime < this.duration) {
            this.totalTime += this.step;
            this.timeoutToken = setTimeout(function () {
                return _this.tick();
            }, this.step);
        } else {
            this.stop();
        }
    };

    Animation.prototype.cancel = function (invoke_stop) {
        if (this.timeoutToken != null)
            clearTimeout(this.timeoutToken);
        if (invoke_stop)
            this.stop();
    };
    return Animation;
})();

var Part = (function () {
    function Part(red, green, blue) {
        if (typeof red === "undefined") { red = 0; }
        if (typeof green === "undefined") { green = 0; }
        if (typeof blue === "undefined") { blue = 0; }
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.life = 20;
        this.last_creation = 0;
    }
    Part.prototype.create_child = function (partner) {
        if (partner == null || this.last_creation > 0)
            return null;

        this.last_creation = Part.creation_timeout;
        partner.last_creation = Part.creation_timeout;
        this.life -= 5;
        partner.life -= 5;

        return new Part(Math.random() > 0.5 ? this.red : partner.red, Math.random() > 0.5 ? this.green : partner.green, Math.random() > 0.5 ? this.blue : partner.blue);
    };

    Part.prototype.update = function () {
        this.last_creation--;
    };
    Part.creation_timeout = 3;
    return Part;
})();

var PartMove = (function () {
    function PartMove(part, old_x, old_y, new_x, new_y) {
        this.part = part;
        this.old_x = old_x;
        this.old_y = old_y;
        this.new_x = new_x;
        this.new_y = new_y;
    }
    return PartMove;
})();

var PartTransition = (function () {
    function PartTransition(part, isBirth, x, y) {
        this.part = part;
        this.isBirth = isBirth;
        this.x = x;
        this.y = y;
    }
    return PartTransition;
})();

var World = (function () {
    function World(width, height, initial_count) {
        this.width = width;
        this.height = height;
        this.parts = [];
        this.buffer = [];
        this.last_step = 0;
        this.xs = [-1, 0, 1, -1, 1, -1, 0, 1];
        this.ys = [-1, -1, -1, 0, 0, 1, 1, 1];
        this.moves = [];
        this.transitions = [];
        this.life_to_add = 0;
        this.kill_all = false;
        for (var i = 0; i < initial_count; i++) {
            var x = 0, y = 0;
            do {
                x = Math.floor(Math.random() * (this.width - 1));
                y = Math.floor(Math.random() * (this.height - 1));
            } while(this.get_part(x, y) != null);

            //this.set_part(x, y, new Part(
            //    Math.floor(Math.random() * 255),
            //    Math.floor(Math.random() * 255),
            //    Math.floor(Math.random() * 255)));
            var black = Math.random() > 0.5;
            this.set_part(x, y, new Part(black ? 0 : 255, black ? 0 : 255, black ? 0 : 255));
        }
    }
    World.prototype.get_part = function (x, y) {
        var result = this.parts[x + y * this.width];
        return result === undefined ? null : result;
    };

    World.prototype.set_part = function (x, y, part) {
        this.parts[x + y * this.width] = part;
    };

    World.prototype.get_buffer = function (x, y) {
        var result = this.buffer[x + y * this.width];
        return result === undefined ? null : result;
    };

    World.prototype.set_buffer = function (x, y, part) {
        this.buffer[x + y * this.width] = part;
    };

    World.prototype.swap_buffers = function () {
        for (var i = 0; i < this.parts.length; i++) {
            this.parts[i] = this.buffer[i];
            this.buffer[i] = null;
        }
    };

    World.prototype.update = function () {
        this.moves = [];
        this.transitions = [];

        if (this.kill_all) {
            this.kill_all_life();
            this.life_to_add = 0;
            this.kill_all = false;
            return;
        }

        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                if (this.get_part(x, y) == null)
                    continue;

                var child = null;
                for (var dx = -1; dx <= 1; dx++) {
                    for (var dy = -1; dy <= 1; dy++) {
                        var x1 = x + dx, y1 = y + dy;
                        if (x1 < 0 || x1 >= this.width || y1 < 0 || y1 >= this.height || (dx == 0 && dy == 0)) {
                            continue;
                        }

                        child = this.get_part(x, y).create_child(this.get_part(x1, y1));
                        break;
                    }
                }

                if (child == null)
                    continue;

                var indexes = Random.permutation(this.xs.length);
                for (var i = 0; i < indexes.length; i++) {
                    var x1 = x + this.xs[indexes[i]];
                    var y1 = y + this.ys[indexes[i]];
                    if (x1 < 0 || x1 >= this.width || y1 < 0 || y1 >= this.height || this.get_part(x1, y1) != null || this.get_buffer(x1, y1) != null) {
                        continue;
                    }

                    this.set_buffer(x1, y1, child);
                    this.transitions.push(new PartTransition(child, true, x1, y1));
                    break;
                }
            }
        }

        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                var part = this.get_part(x, y);
                if (part == null)
                    continue;
                if (part.life <= 0) {
                    this.set_part(x, y, null);
                    this.transitions.push(new PartTransition(part, false, x, y));
                    continue;
                }
                part.update();
                this.move(x, y);
            }
        }

        this.add_new_life(this.life_to_add);
        this.life_to_add = 0;
        this.swap_buffers();
    };

    World.prototype.move = function (x, y) {
        var x1, y1;
        var indexes = Random.permutation(this.xs.length);
        for (var i = 0; i < indexes.length; i++) {
            var x1 = x + this.xs[indexes[i]];
            var y1 = y + this.ys[indexes[i]];
            if (x1 < 0 || x1 >= this.width || y1 < 0 || y1 >= this.height || this.get_buffer(x1, y1) != null) {
                continue;
            }

            var part = this.get_part(x, y);
            this.set_buffer(x1, y1, part);
            this.moves.push(new PartMove(part, x, y, x1, y1));
            break;
        }
    };

    World.prototype.draw = function (canvas, weight) {
        var pw = canvas.width / this.width;
        var ph = canvas.height / this.height;

        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = rgb(100, 149, 237);
        context.fillRect(0, 0, canvas.width, canvas.height);

        var m = 0.12;
        var rm = 1 - 2 * m;
        var strokeWidth = m * (pw + ph) * 0.5;

        for (var i = 0; i < this.transitions.length; i++) {
            var trans = this.transitions[i];
            var scale = trans.isBirth ? weight : (1 - weight);
            var x = trans.x + (1 - scale) / 2;
            var y = trans.y + (1 - scale) / 2;

            var p = trans.part;

            //context.fillStyle = rgb(p.red, p.green, p.blue);
            //context.fillRect(x * pw, y * ph, pw * scale, ph * scale);
            context.beginPath();
            context.rect((x + m) * pw, (y + m) * ph, pw * rm * scale, ph * rm * scale);
            context.strokeStyle = rgb(p.red, p.green, p.blue);
            context.lineWidth = strokeWidth;
            context.stroke();
        }

        for (var i = 0; i < this.moves.length; i++) {
            var move = this.moves[i];
            var x = move.old_x * (1 - weight) + move.new_x * weight;
            var y = move.old_y * (1 - weight) + move.new_y * weight;

            var p = move.part;

            //context.fillStyle = rgb(p.red, p.green, p.blue);
            //context.fillRect(x * pw, y * ph, pw, ph);
            context.beginPath();
            context.rect((x + m) * pw, (y + m) * ph, pw * rm, ph * rm);
            context.strokeStyle = rgb(p.red, p.green, p.blue);
            context.lineWidth = strokeWidth;
            context.stroke();
        }
    };

    World.prototype.add_new_life = function (count) {
        for (var i = 0; i < count; i++) {
            var x = Math.floor(Math.random() * (this.width - 1));
            var y = Math.floor(Math.random() * (this.height - 1));
            if (this.get_buffer(x, y) != null)
                continue;
            var part = new Part(Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255));
            this.set_buffer(x, y, part);
            this.transitions.push(new PartTransition(part, true, x, y));
        }
    };

    World.prototype.kill_all_life = function () {
        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                var part = this.get_part(x, y);
                if (part == null)
                    continue;
                this.transitions.push(new PartTransition(part, false, x, y));
                this.set_part(x, y, null);
            }
        }
    };

    World.prototype.on_key_down = function (e) {
        if (e.keyCode == 76) {
            this.life_to_add += 10;
        } else if (e.keyCode == 67) {
            this.kill_all = true;
        }
    };
    return World;
})();

function rgb(r, g, b) {
    return "rgb(" + r + "," + g + "," + b + ")";
}

var Game = (function () {
    function Game(canvas, seed) {
        if (typeof seed === "undefined") { seed = null; }
        var _this = this;
        this.canvas = canvas;
        this.seed = seed;
        this.timerToken = null;
        this.generation = 0;
        this.is_paused = false;
        document.onkeydown = function (e) {
            return _this.handle_key_down(e);
        };
        this.reset();
    }
    Game.prototype.reset = function () {
        Random.seed(this.seed);
        this.world = new World(50, 50, 50);
        this.generation = 0;
    };

    Game.prototype.start = function () {
        var _this = this;
        if (!this.is_paused && this.animation == null)
            this.timerToken = setTimeout(function () {
                return _this.update();
            }, 100);
    };

    Game.prototype.stop = function () {
        if (this.timerToken != null)
            clearTimeout(this.timerToken);
        if (this.animation != null) {
            this.animation.cancel(false);
            this.animation = null;
        }
    };

    Game.prototype.update = function () {
        var _this = this;
        this.generation++;

        var info = document.getElementById('info');
        info.innerText = this.generation.toString();

        this.world.update();
        this.animation = new Animation(20, 300, function (x) {
            return _this.world.draw(_this.canvas, x);
        }, function () {
            _this.animation = null;
            _this.start();
        });
    };

    Game.prototype.handle_key_down = function (e) {
        if (e.keyCode == 82) {
            this.stop();
            this.reset();
            this.start();
        } else if (e.keyCode == 32) {
            this.is_paused = !this.is_paused;
            if (!this.is_paused)
                this.start();
        } else {
            this.world.on_key_down(e);
        }
    };
    return Game;
})();

window.onload = function () {
    var element = document.getElementById('content');
    var canvas = document.createElement('canvas');
    element.appendChild(canvas);
    canvas.width = 700;
    canvas.height = 700;

    //Utils.fullscreenify(canvas);
    var uriParams = Utils.parseURIParams(window.location.search);
    var game = new Game(canvas, uriParams["seed"]);
    game.start();
};
//# sourceMappingURL=copying_app.js.map
