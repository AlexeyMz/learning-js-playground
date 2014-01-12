/// <reference path="../utils.ts"/>

module Graph {
    export class Vector {
        constructor(public x: number, public y: number) {
        }

        public negate() {
            return new Vector(-this.x, -this.y);
        }

        public multiply(s: number) {
            return new Vector(this.x * s, this.y * s);
        }

        public add(v: Vector) {
            return new Vector(this.x + v.x, this.y + v.y);
        }

        public subtract(v: Vector) {
            return new Vector(this.x - v.x, this.y - v.y);
        }

        public length() {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }

        public norm() {
            var lengthReciprocal = 1 / Math.sqrt(this.x * this.x + this.y * this.y);
            return new Vector(this.x * lengthReciprocal, this.y * lengthReciprocal);
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

    export interface Selectable {
        selected: boolean;
        savePivotPosition();
        setOffsetToPivot(offset: Vector);
    }

    export class Vertex implements Selectable {
        private pivot: Vector;
        public selected = false;

        constructor(public position: Vector) {
        }

        savePivotPosition() {
            this.pivot = this.position;
        }
        setOffsetToPivot(offset: Vector) {
            this.position = this.pivot.add(offset);
        }
    }

    export class Edge implements Selectable {
        public selected = false;

        constructor(public start: Vertex, public end: Vertex) {
        }

        savePivotPosition() {
            this.start.savePivotPosition();
            this.end.savePivotPosition();
        }
        setOffsetToPivot(offset: Vector) {
            this.start.setOffsetToPivot(offset);
            this.end.setOffsetToPivot(offset);
        }
    }

    export class GraphView {
        private vertices: Vertex[] = [];
        private edges: Edge[] = [];
        private offset: Vector;

        private edgeWidth = 8;
        private vertexRadius = 10;
        private vertexMargin = 8;

        private focused: Selectable;
        private selected: Selectable[] = [];
        private holdingPivot: Vector = null;

        constructor(private canvas: HTMLCanvasElement) {
            var a = this.createVertex(200, 200);
            var b = this.createVertex(400, 400);
            var c = this.createVertex(200, 400);
            var d = this.createVertex(400, 200);
            this.createEdge(a, b);
            this.createEdge(a, c);
            this.createEdge(b, c);
            this.createEdge(c, d);

            canvas.addEventListener('focus', () => this.draw(), true);
            canvas.addEventListener('blur', () => this.draw(), true);
            canvas.addEventListener('change', () => this.draw(), true);
            canvas.addEventListener('mousedown', e => {
                Utils.fixOffsetXY(e);
                var cursor = new Vector(e.offsetX, e.offsetY);
                this.draw(cursor);
                // now we're know focused element
                this.updateSelection(e);
                this.draw(cursor);

                if (this.selected.length == 0) {
                    this.holdingPivot = null;
                } else {
                    this.holdingPivot = cursor;
                    for (var i = 0; i < this.selected.length; i++) {
                        this.selected[i].savePivotPosition();
                    }
                }
            }, false);
            canvas.addEventListener('mouseup', e => {
                this.holdingPivot = null;
            }, false);
            canvas.addEventListener('mousemove', e => {
                Utils.fixOffsetXY(e);
                if (this.holdingPivot) {
                    var cursor = new Vector(e.offsetX, e.offsetY);
                    var moving = cursor.subtract(this.holdingPivot);
                    for (var i = 0; i < this.selected.length; i++) {
                        this.selected[i].setOffsetToPivot(moving);
                    }
                }
                this.draw(new Vector(e.offsetX, e.offsetY));
            }, false);

            this.draw();
        }

        private updateSelection(e: MouseEvent) {
            if (this.focused) {
                var elem = this.focused;
                if (elem.selected) {
                    if (e.shiftKey) {
                        // deselect item
                        elem.selected = false;
                        this.selected.splice(this.selected.indexOf(elem), 1);
                    }
                } else {
                    if (!e.shiftKey) {
                        this.deselectAll();
                    }
                    // select item
                    elem.selected = true;
                    this.selected.push(elem);
                }
            } else {
                if (!e.shiftKey)
                    this.deselectAll();
            }
        }

        private deselectAll() {
            for (var i = 0; i < this.selected.length; i++) {
                this.selected[i].selected = false;
            }
            this.selected.length = 0;
        }

        public createVertex(x: number, y: number) {
            var v = new Vertex(new Vector(x, y));
            this.vertices.push(v);
            return v;
        }

        public createEdge(start: Vertex, end: Vertex) {
            var edge = new Edge(start, end);
            this.edges.push(edge);
            return edge;
        }

        public draw(cursor: Vector = null) {
            if (cursor != null)
                this.focused = null;

            var context = this.canvas.getContext('2d');
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.drawEdges(context, cursor);
            this.drawVertices(context, cursor);
        }

        private drawEdges(context: CanvasRenderingContext2D, cursor: Vector) {
            var margin = this.vertexRadius + this.vertexMargin;

            for (var i = this.edges.length - 1; i >= 0; i--) {
                var edge = this.edges[i];
                var start = edge.start.position;
                var end = edge.end.position;

                var direction = end.subtract(start);
                if (direction.length() < margin * 2)
                    continue;

                // apply margin
                direction = direction.norm();
                start = start.add(direction.multiply(margin));
                end = end.subtract(direction.multiply(margin));

                this.drawEdge(start, end, this.edgeWidth, context);

                if (cursor && context.isPointInPath(cursor.x, cursor.y))
                    this.focused = edge;

                if (this.focused === edge) {
                    this.drawEdge(start, end, this.edgeWidth * 1.2, context);
                }

                if (edge.selected) {
                    context.closePath();
                    context.lineWidth = 3;
                    context.strokeStyle = 'black';
                    context.stroke();
                    context.fillStyle = 'orange';
                    context.fill();
                } else {
                    context.fillStyle = 'black';
                    context.fill();
                }
            }
        }

        private drawVertices(context: CanvasRenderingContext2D, cursor: Vector) {
            for (var i = this.vertices.length - 1; i >= 0; i--) {
                var vertex = this.vertices[i];
                var p = vertex.position;

                context.beginPath();
                context.arc(p.x, p.y, this.vertexRadius, 0, Math.PI * 2);

                if (cursor && context.isPointInPath(cursor.x, cursor.y))
                    this.focused = vertex;

                if (this.focused === vertex) {
                    context.beginPath();
                    context.arc(p.x, p.y, this.vertexRadius * 1.2, 0, Math.PI * 2);
                }

                if (vertex.selected) {
                    context.lineWidth = 3;
                    context.strokeStyle = 'black';
                    context.stroke();
                    context.fillStyle = 'orange';
                    context.fill();
                } else {
                    context.fillStyle = 'black';
                    context.fill();
                }
            }
        }

        private drawEdge(start: Vector, end: Vector, width: number, context: CanvasRenderingContext2D) {
            var direction = end.subtract(start);
            var orthogonal = new Vector(direction.y, -direction.x).norm().multiply(width / 2);
            var start1 = start.add(orthogonal);
            var start2 = start.subtract(orthogonal);
            var end1 = end.add(orthogonal);
            var end2 = end.subtract(orthogonal);

            context.beginPath();
            context.moveTo(start1.x, start1.y);
            context.lineTo(end1.x, end1.y);
            context.lineTo(end2.x, end2.y);
            context.lineTo(start2.x, start2.y);
        }

        public connectSelectedVertices(cyclic = false) {
            for (var i = 0; i < this.selected.length - 1; i++) {
                this.createEdge(<Vertex>this.selected[i], <Vertex>this.selected[i + 1]);
            }
            if (cyclic && this.selected.length > 2)
                this.createEdge(<Vertex>this.selected[0], <Vertex>this.selected[this.selected.length - 1]);
        }

        public removeSelected() {
            for (var i = 0; i < this.selected.length; i++) {
                var item: any = this.selected[i];
                var edgeIndex = this.edges.indexOf(item);
                if (edgeIndex >= 0) {
                    this.edges.splice(edgeIndex, 1);
                } else {
                    var vertexIndex = this.vertices.indexOf(item);
                    if (vertexIndex >= 0) {
                        this.vertices.splice(vertexIndex, 1);
                        var j = 0;
                        while (j < this.edges.length) {
                            var edge = this.edges[j];
                            if (edge.start === item || edge.end === item)
                                this.edges.splice(j, 1);
                            else
                                j++;
                        }
                    }
                }
            }
            this.deselectAll();
        }
    }

    /**
     * fullscreenify()
     * Stretch canvas to size of window.
     *
     * Zachary Johnson
     * http://www.zachstronaut.com/
     *
     * See also: https://gist.github.com/1178522
     */
    export function fullscreenify(canvas) {
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

var graph;

window.onload = () => {
    var element = document.getElementById('content');
    var canvas = <HTMLCanvasElement>document.createElement('canvas');
    element.appendChild(canvas);
    canvas.style.borderStyle = 'solid';
    canvas.style.borderWidth = '1px';
    Graph.fullscreenify(canvas);
    //canvas.width = 500;
    //canvas.height = 500;

    graph = new Graph.GraphView(canvas);
};