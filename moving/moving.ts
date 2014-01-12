/// <reference path="../utils.ts"/>

class Animation {
    private step: number;
    private totalTime = 0;
    private timeoutToken: number = null;

    constructor(public stepCount: number, public duration: number,
        public handler: (normalized: number) => void , public stop: () => void ) {
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

class Part {
    static creation_timeout = 3;

    life = 20;
    last_creation = 0;

    constructor(public red = 0, public green = 0, public blue = 0) {
    }

    public create_child(partner: Part): Part {
        if (partner == null || this.last_creation > 0)
            return null;

        this.last_creation = Part.creation_timeout;
        partner.last_creation = Part.creation_timeout;
        this.life -= 5;
        partner.life -= 5;

        return new Part(
            Math.random() > 0.5 ? this.red : partner.red,
            Math.random() > 0.5 ? this.green : partner.green,
            Math.random() > 0.5 ? this.blue : partner.blue);
    }

    public update() {
        this.last_creation--;
    }
}

class PartMove {
    constructor(public part: Part,
        public old_x: number, public old_y: number,
        public new_x: number, public new_y: number) {
    }
}

class PartTransition {
    constructor(public part: Part, public isBirth: boolean,
        public x: number, public y: number) {
    }
}

class World {
    private parts: Part[] = [];
    private buffer: Part[] = [];
    private last_step = 0;

    private xs = [-1, 0, 1, -1, 1, -1, 0, 1];
    private ys = [-1, -1, -1, 0, 0, 1, 1, 1];

    private moves: PartMove[] = [];
    private transitions: PartTransition[] = [];

    private life_to_add = 0;
    private kill_all = false;

    constructor(public width: number, public height: number, initial_count: number) {
        for (var i = 0; i < initial_count; i++) {
            var x = 0, y = 0;
            do {
                x = Math.floor(Math.random() * (this.width - 1));
                y = Math.floor(Math.random() * (this.height - 1));
            } while (this.get_part(x, y) != null);

            //this.set_part(x, y, new Part(
            //    Math.floor(Math.random() * 255),
            //    Math.floor(Math.random() * 255),
            //    Math.floor(Math.random() * 255)));
            var black = Math.random() > 0.5;
            this.set_part(x, y, new Part(
                black ? 0 : 255, black ? 0 : 255, black ? 0 : 255));
        }
    }

    private get_part(x: number, y: number): Part {
        var result = this.parts[x + y * this.width];
        return result === undefined ? null : result;
    }

    private set_part(x: number, y: number, part: Part) {
        this.parts[x + y * this.width] = part;
    }

    private get_buffer(x: number, y: number): Part {
        var result = this.buffer[x + y * this.width];
        return result === undefined ? null : result;
    }

    private set_buffer(x: number, y: number, part: Part) {
        this.buffer[x + y * this.width] = part;
    }

    public swap_buffers() {
        for (var i = 0; i < this.parts.length; i++) {
            this.parts[i] = this.buffer[i];
            this.buffer[i] = null;
        }
    }

    public update() {
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

                var child: Part = null;
                for (var dx = -1; dx <= 1; dx++) {
                    for (var dy = -1; dy <= 1; dy++) {
                        var x1 = x + dx, y1 = y + dy;
                        if (x1 < 0 || x1 >= this.width ||
                            y1 < 0 || y1 >= this.height ||
                            (dx == 0 && dy == 0)) {
                            continue;
                        }

                        child = this.get_part(x, y).create_child(
                            this.get_part(x1, y1));
                        break;
                    }
                }

                if (child == null)
                    continue;

                var indexes = Random.permutation(this.xs.length);
                for (var i = 0; i < indexes.length; i++) {
                    var x1 = x + this.xs[indexes[i]];
                    var y1 = y + this.ys[indexes[i]];
                    if (x1 < 0 || x1 >= this.width ||
                        y1 < 0 || y1 >= this.height ||
                        this.get_part(x1, y1) != null ||
                        this.get_buffer(x1, y1) != null) {
                        continue;
                    }

                    this.set_buffer(x1, y1, child);
                    this.transitions.push(new PartTransition(
                        child, true, x1, y1));
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
                    this.transitions.push(new PartTransition(
                        part, false, x, y));
                    continue;
                }
                part.update();
                this.move(x, y);
            }
        }

        this.add_new_life(this.life_to_add);
        this.life_to_add = 0;
        this.swap_buffers();
    }

    private move(x: number, y: number) {
        var x1: number, y1: number;
        var indexes = Random.permutation(this.xs.length);
        for (var i = 0; i < indexes.length; i++) {
            var x1 = x + this.xs[indexes[i]];
            var y1 = y + this.ys[indexes[i]];
            if (x1 < 0 || x1 >= this.width ||
                y1 < 0 || y1 >= this.height ||
                this.get_buffer(x1, y1) != null) {
                continue;
            }

            var part = this.get_part(x, y);
            this.set_buffer(x1, y1, part);
            this.moves.push(new PartMove(part, x, y, x1, y1));
            break;
        }
    }

    public draw(canvas: HTMLCanvasElement, weight: number) {
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
    }

    private add_new_life(count: number) {
        for (var i = 0; i < count; i++) {
            var x = Math.floor(Math.random() * (this.width - 1));
            var y = Math.floor(Math.random() * (this.height - 1));
            if (this.get_buffer(x, y) != null)
                continue;
            var part = new Part(
                Math.floor(Math.random() * 255),
                Math.floor(Math.random() * 255),
                Math.floor(Math.random() * 255));
            this.set_buffer(x, y, part);
            this.transitions.push(new PartTransition(part, true, x, y));
        }
    }

    private kill_all_life() {
        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                var part = this.get_part(x, y);
                if (part == null)
                    continue;
                this.transitions.push(new PartTransition(part, false, x, y));
                this.set_part(x, y, null);
            }
        }
    }

    public on_key_down(e: KeyboardEvent) {
        if (e.keyCode == 76) { // 'l'
            this.life_to_add += 10;
        } else if (e.keyCode == 67) { // 'c'
            this.kill_all = true;
        }
    }
}

function rgb(r: number, g: number, b: number): string {
    return "rgb(" + r + "," + g + "," + b + ")";
}

class Game {
    timerToken: number = null;
    generation = 0;

    world: World;
    animation: Animation;
    is_paused = false;

    constructor(private canvas: HTMLCanvasElement, private seed: any = null) {
        document.onkeydown = e => this.handle_key_down(e);
        this.reset();
    }

    private reset() {
        Random.seed(this.seed);
        this.world = new World(50, 50, 150);
        this.generation = 0;
    }

    public start() {
        if (!this.is_paused && this.animation == null)
            this.timerToken = setTimeout(() => this.update(), 100);
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
        this.generation++;

        var info = document.getElementById('info');
        info.innerText = this.generation.toString();

        this.world.update();
        this.animation = new Animation(20, 300,
            x => this.world.draw(this.canvas, x),
            () => {
                this.animation = null;
                this.start();
            });
    }

    private handle_key_down(e: KeyboardEvent) {
        if (e.keyCode == 82) { // 'r'
            this.stop();
            this.reset();
            this.start();
        } else if (e.keyCode == 32) { // 'space'
            this.is_paused = !this.is_paused;
            if (!this.is_paused)
                this.start();
        } else {
            this.world.on_key_down(e);
        }
    }
}

window.onload = () => {
    var uriParams = Utils.parseURIParams(window.location.search.substr(1));
    var currentSeed = uriParams["seed"];
    if (typeof currentSeed == 'undefined')
        currentSeed = '';

    var seedElement = <HTMLTextAreaElement>document.getElementById('seed_value');
    seedElement.value = currentSeed;

    var onSetSeed = () => {
        var seed = seedElement.value;
        window.location.assign(seed.length == 0 ? '' : '?seed=' + encodeURIComponent(seed));
    };
    document.getElementById('set_seed').onclick = e => onSetSeed();
    document.getElementById('clear_seed').onclick = e => {
        window.location.assign('');
    };
    seedElement.onkeyup = e => {
        if (e.keyCode == 13) {
            onSetSeed();
            return false;
        } else {
            return true;
        }
    };

    var element = document.getElementById('content');
    var canvas = <HTMLCanvasElement>document.createElement('canvas');
    element.appendChild(canvas);
    canvas.width = 700;
    canvas.height = 700;
    //Utils.fullscreenify(canvas);
    
    var game = new Game(canvas, currentSeed);
    game.start();
};
