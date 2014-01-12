/// <reference path="../utils.ts"/>
var Graph;
(function (Graph) {
    var Vector = (function () {
        function Vector(x, y) {
            this.x = x;
            this.y = y;
        }
        Vector.prototype.negate = function () {
            return new Vector(-this.x, -this.y);
        };

        Vector.prototype.multiply = function (s) {
            return new Vector(this.x * s, this.y * s);
        };

        Vector.prototype.add = function (v) {
            return new Vector(this.x + v.x, this.y + v.y);
        };

        Vector.prototype.subtract = function (v) {
            return new Vector(this.x - v.x, this.y - v.y);
        };

        Vector.prototype.length = function () {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        };

        Vector.prototype.norm = function () {
            var lengthReciprocal = 1 / Math.sqrt(this.x * this.x + this.y * this.y);
            return new Vector(this.x * lengthReciprocal, this.y * lengthReciprocal);
        };
        return Vector;
    })();
    Graph.Vector = Vector;

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

    var Vertex = (function () {
        function Vertex(position) {
            this.position = position;
            this.selected = false;
        }
        Vertex.prototype.savePivotPosition = function () {
            this.pivot = this.position;
        };
        Vertex.prototype.setOffsetToPivot = function (offset) {
            this.position = this.pivot.add(offset);
        };
        return Vertex;
    })();
    Graph.Vertex = Vertex;

    var Edge = (function () {
        function Edge(start, end) {
            this.start = start;
            this.end = end;
            this.selected = false;
        }
        Edge.prototype.savePivotPosition = function () {
            this.start.savePivotPosition();
            this.end.savePivotPosition();
        };
        Edge.prototype.setOffsetToPivot = function (offset) {
            this.start.setOffsetToPivot(offset);
            this.end.setOffsetToPivot(offset);
        };
        return Edge;
    })();
    Graph.Edge = Edge;

    var GraphView = (function () {
        function GraphView(canvas) {
            var _this = this;
            this.canvas = canvas;
            this.vertices = [];
            this.edges = [];
            this.edgeWidth = 8;
            this.vertexRadius = 10;
            this.vertexMargin = 8;
            this.selected = [];
            this.holdingPivot = null;
            var a = this.createVertex(200, 200);
            var b = this.createVertex(400, 400);
            var c = this.createVertex(200, 400);
            var d = this.createVertex(400, 200);
            this.createEdge(a, b);
            this.createEdge(a, c);
            this.createEdge(b, c);
            this.createEdge(c, d);

            canvas.addEventListener('focus', function () {
                return _this.draw();
            }, true);
            canvas.addEventListener('blur', function () {
                return _this.draw();
            }, true);
            canvas.addEventListener('change', function () {
                return _this.draw();
            }, true);
            canvas.addEventListener('mousedown', function (e) {
                Utils.fixOffsetXY(e);
                var cursor = new Vector(e.offsetX, e.offsetY);
                _this.draw(cursor);

                // now we're know focused element
                _this.updateSelection(e);
                _this.draw(cursor);

                if (_this.selected.length == 0) {
                    _this.holdingPivot = null;
                } else {
                    _this.holdingPivot = cursor;
                    for (var i = 0; i < _this.selected.length; i++) {
                        _this.selected[i].savePivotPosition();
                    }
                }
            }, false);
            canvas.addEventListener('mouseup', function (e) {
                _this.holdingPivot = null;
            }, false);
            canvas.addEventListener('mousemove', function (e) {
                Utils.fixOffsetXY(e);
                if (_this.holdingPivot) {
                    var cursor = new Vector(e.offsetX, e.offsetY);
                    var moving = cursor.subtract(_this.holdingPivot);
                    for (var i = 0; i < _this.selected.length; i++) {
                        _this.selected[i].setOffsetToPivot(moving);
                    }
                }
                _this.draw(new Vector(e.offsetX, e.offsetY));
            }, false);

            this.draw();
        }
        GraphView.prototype.updateSelection = function (e) {
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
        };

        GraphView.prototype.deselectAll = function () {
            for (var i = 0; i < this.selected.length; i++) {
                this.selected[i].selected = false;
            }
            this.selected.length = 0;
        };

        GraphView.prototype.createVertex = function (x, y) {
            var v = new Vertex(new Vector(x, y));
            this.vertices.push(v);
            return v;
        };

        GraphView.prototype.createEdge = function (start, end) {
            var edge = new Edge(start, end);
            this.edges.push(edge);
            return edge;
        };

        GraphView.prototype.draw = function (cursor) {
            if (typeof cursor === "undefined") { cursor = null; }
            if (cursor != null)
                this.focused = null;

            var context = this.canvas.getContext('2d');
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.drawEdges(context, cursor);
            this.drawVertices(context, cursor);
        };

        GraphView.prototype.drawEdges = function (context, cursor) {
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
        };

        GraphView.prototype.drawVertices = function (context, cursor) {
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
        };

        GraphView.prototype.drawEdge = function (start, end, width, context) {
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
        };

        GraphView.prototype.connectSelectedVertices = function (cyclic) {
            if (typeof cyclic === "undefined") { cyclic = false; }
            for (var i = 0; i < this.selected.length - 1; i++) {
                this.createEdge(this.selected[i], this.selected[i + 1]);
            }
            if (cyclic && this.selected.length > 2)
                this.createEdge(this.selected[0], this.selected[this.selected.length - 1]);
        };

        GraphView.prototype.removeSelected = function () {
            for (var i = 0; i < this.selected.length; i++) {
                var item = this.selected[i];
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
        };
        return GraphView;
    })();
    Graph.GraphView = GraphView;

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
    Graph.fullscreenify = fullscreenify;
})(Graph || (Graph = {}));

var graph;

window.onload = function () {
    var element = document.getElementById('content');
    var canvas = document.createElement('canvas');
    element.appendChild(canvas);
    canvas.style.borderStyle = 'solid';
    canvas.style.borderWidth = '1px';
    Graph.fullscreenify(canvas);

    //canvas.width = 500;
    //canvas.height = 500;
    graph = new Graph.GraphView(canvas);
};
//# sourceMappingURL=graph.js.map
