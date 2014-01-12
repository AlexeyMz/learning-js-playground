function extend(base, derivedTemplate) {
    var derived = Object.create(base);
    for (var key in derivedTemplate) {
        derived[key] = derivedTemplate[key];
    }
    return derived;
} 
function constructable(classTemplate) {
    return extend(constructable.prototype, classTemplate);
}
constructable.prototype = {
    create: function () {
        var obj = Object.create(this);
        if ("init" in this) obj.init.apply(obj, arguments);
        return obj;
    }
};

var Foo = constructable({
    init: function (x, y) {
        this.x = x;
        this.y = y;
        console.log(["foo", x, y]);
    },
    foo1: function () {
        console.log("foo1 from Foo");
    },
    foo2: function () {
        console.log("foo2 from Foo");
    },
    foo3: function () {
        console.log("foo3 from Foo");
    }
});

var Bar = extend(Foo, {
    init: function (x, y) {
        Foo.init.call(this, x, y);
        console.log(["bar", this.x, this.y]);
    },
    foo2: function () {
        console.log("foo2 from Bar");
    },
    foo3: function () {
        Foo.foo3.call(this);
        console.log("foo3 from Bar");
    }
});

var Baz = constructable({
    say: function (a) {
        console.log(["baz", a]);
    }
});