a = new Buffer(0);

    // expose api methods as client instance methods
    var apimethods = Object.getOwnPropertyNames(a)
    apimethods.forEach(function(name, i, apimethods)
    {
    	console.log(name);
    	console.log(i);
    	console.log(apimethods);
    });
    
    process.exit();
    

a = new Buffer(0);
console.log(a);
console.log(a.length);

b = new Buffer("123");
console.log(b);
console.log(b.length);

c = new Buffer("\n");
console.log(c);
console.log(c.length);

require('buffertools');
d = buffertools.concat(b,c);
console.log(d);
console.log(d.length);

d = buffertools.concat(a);
console.log(d);
console.log(d.length);








process.exit();

require('buffertools');
// require(Buffer);
new Buffer(42).clear();


// identical to new Buffer('foobarbaz')
a = new Buffer('foo');
b = new Buffer('bar');
// c = a.concat(b, 'baz');
// console.log(a, b, c); // "foo bar foobarbaz"

console.log(a);

// static variant
x = buffertools.concat(a, new Buffer('bar'), b);

console.log(x);


