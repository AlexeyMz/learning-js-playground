/**
 * Отображает индикатор ожидания вместо содержмого SVG-элемента.
 * Пример использования:
 *     var indicator = Indicator.create(d3.select("#svg"));
 *     d3.json("data.js", function(data) {
 *         indicator.stop();
 *         // TODO: отобразить data в svg
 *     });
 */
var Indicator = {
    /**
     * Создаёт новый индикатор, скрывая предыдущее содержимое SVG,
     * и заменяя его на анимацию ожидания.
     * @param svg - селектор SVG-элемента
     */
    create: function (svg) {
        var indicator = Object.create(this);
        indicator.wrapper = svg.append("svg:g");
        this.moveChildren(svg.node(), indicator.wrapper.node());
        indicator.wrapper
            .transition()
            .style("opacity", 0)
            .each("end", function() { 
                indicator.animate(svg);
            });
        return indicator;
    },
    /**
     * Возвращает SVG-элемент в первоначальный вид.
     */
    stop: function () {
        var svg = this.wrapper.node().parentNode;
        if (this.animation != null)
            svg.removeChild(this.animation.node());
        this.moveChildren(this.wrapper.node(), svg);
        svg.removeChild(this.wrapper.node());
    },
    /**
     * Добавляет анимацию ожидания.
     * @param svg - селектор SVG-элемента
     */
    /*private*/ animate: function (svg) {
        this.animation = svg.append("svg:g")
            .attr("transform", "translate(" + svg.attr("width") / 2 + "," + svg.attr("height") / 2 + ")");
        var arrow = this.animation.append("svg:g");
        arrow.append("svg:path")
            .attr("d", "m3.47,-19.7 a20,20 0 1,1 -6.95,0 l-6,5 m6,-5 l-8,-0")
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", 2.5)
            .attr("stroke-linecap", "round");
        // добавляем повторяющуюся анимацию вращения
        (function rotateArrow() {
            arrow.transition()
                .duration(1500)
                .attrTween("transform", function () {
                    return d3.interpolateString("rotate(0)", "rotate(360)");
                }).each("end", rotateArrow);
        })();
    },
    /**
     * Перемещает дочерние узлы из узла from в узел to,
     * за исключением самого узла to.
     */
    /*private*/ moveChildren: function (from, to) {
        for (var node = from.firstChild; node != null;) {
            var next = node.nextSibling;
            if (node !== to) {
                from.removeChild(node);
                to.appendChild(node);
            }
            node = next;
        }
    },
};