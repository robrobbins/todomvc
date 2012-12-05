(function(window) {
// An object to serve as our top-level namespace as well as hold some universally
// used properties and methods
//
// `namespace`
var sudo = {
	// The sudo.ext namespace holds the `extensions` which are stand alone `modules` that
	// can be `implemented` or `mixed-in` to sudo Class Objects
	//
	// `namespace`
	ext: {}, 
	// ####_unique_
	// An integer used as 'tags' by some sudo Objects as well
	// as a unique string for views when needed
	//
	// `param` {string} prefix. Optional string identifier
	// 
	// `private`
	_unique_: function _unique_(prefix) {
		return prefix ? prefix + this._uid_++ : this._uid_++;
	},
	// ####_uid_
	// Some sudo Objects use a unique integer as a `tag` for identification.
	// (Views for example). This ensures they are indeed unique.
	//
	// @private
	_uid_: 0,
	// ####premier
	// The premier object takes precedence over all others so define it at the 
	// topmost level.
	//
	// `type` {Object}
	premier: null,
	// ####_inherit_
	// Inherit the prototype from a parent to a child.
	// Set the childs constructor for subclasses of child.
	// A _private_ method as subclasses of the library base classes will not 
	// want to use this function in *most* use-cases. Why? User Sudo Class Objects
	// possess their own constructors and any call back to a `superclass` constructor
	// will generally be looking for the library Object's constructor.
	//
	// `param` {function} `parent`
	// `param` {function} `child`
	//
	// `private`
	_inherit_: function _inherit_(parent, child) {
		child.prototype = Object.create(parent.prototype);
		child.prototype.constructor = child;
	},
	// ####makeMeASandwich
	// Notice there is no need to extrinsically instruct *how* to
	// make the sandwich, just the elegant single command.
	//
	// `returns` {string}
	makeMeASandwich: function makeMeASandwich() {return 'Okay.';},
	// ####namespace
	// Convenience method for assuring a Namespace is defined. Uses
	// the optional `obj` arg with the Base objects `setPath` method.
	//
	// `param` {string} `path`. The path that leads to a blank Object.
	namespace: function namespace(path) {
		if (!sudo.Base.prototype.getPath.call(this, path, window)) {
			sudo.Base.prototype.setPath.call(this, path, {}, window);
		}
	}
};
// ### observable extension object
// Implementaion of the ES6 Harmony Observer pattern
sudo.ext.observable = {
	// Called from deliverChangeRecords when ready to send
	// changeRecords to observers.
	//
	// `private`
	_deliver_: function _deliver_(o) {
		var i, cb = this._callbacks_;
		for(i = 0; i < cb.length; i++) {
			cb[i](o);
		}
		return this;
	},
	// ###deliverChangeRecords
	// Iterate through the changeRecords array(emptying it as you go), delivering them to the
	// observers. You can override this method to change the standard delivery behavior.
	deliverChangeRecords: function deliverChangeRecords() {
		var rec, cr = this._changeRecords_;
		// FIFO
		for(rec; cr.length && (rec = cr.shift());) {
			this._deliver_(rec);
		}
		return this;
	},
	// ###observe
	// In a quasi-ES6 Object.observe pattern, calling observe on an `observable` and 
	// passing a callback will cause that callback to be called whenever any
	// property on the observable's data store is set, changed or deleted 
	// via set, unset, setPath or unsetPath with an object containing:
	//     {
	//	     type: <new, updated, deleted>,
	//	     object: <the object being observed>,
	//	     name: <the key that was modified>,
	//	     oldValue: <if a previous value existed for this key>
	//     }
	//
	// `param` {Function} fn The callback to be called with changeRecord(s)
	observe: function observe(fn) {
		// this will fail if mixed-in and no `callbacks` created so don't do that.
		// Per the spec, do not allow the same callback to be added
		var d = this._callbacks_;
		if(d.indexOf(fn) === -1) d.push(fn);
		return this;
	},
	// ###observes
	// Allow an array of callbacks to be registered as changeRecord recipients
	//
	// `param` {Array} ary
	observes: function observes(ary) {
		var i;
		for(i = 0; i < ary.length; i++) {
			this.observe(ary[i]);
		}
		return this;
	},
	// ###set
	// Overrides sudo.Base.set to check for observers
	//
	// `param` {String} `key`. The name of the key
	// `param` {*} `value`
	// `param` {Bool} `hold` Call _deliver_ (falsy) or store the change notification
	// to be delivered upon a call to deliverChangeRecords (truthy)
	// `see` sudo.Base.set
	set: function set(key, value, hold) {
		var o = {name: key, object: this._data_};
		// did this key exist already
		if(key in this._data_) {
			o.type = 'updated';
			// then there is an oldValue
			o.oldValue = this._data_[key];
		} else o.type = 'new';
		// now actually set the value
		sudo.Base.prototype.set.call(this, key, value);
		this._changeRecords_.push(o);
		// call the observers or not
		if(hold) return this;
		return this.deliverChangeRecords();
	},
	// ###setPath
	// Overrides sudo.Base.setPath to check for observers
	//
	// `param` {String} `path`
	// `param` {*} `value`
	// `param` {Bool} `hold` Call _deliver_ (falsy) or store the change notification
	// to be delivered upon a call to deliverChangeRecords (truthy)
	// `see` sudo.Base.setPath
	setPath: function setPath(path, value, hold) {
		var curr = this._data_, o = {}, p = path.split('.'), key;
		for (key; p.length && (key = p.shift());) {
			if(!p.length) {
				// reached the last refinement
				o.name = key;
				o.object = curr;
				// pre-existing?
				if (key in curr) {
					o.type = 'updated';
					o.oldValue = curr[key];
				} else o.type = 'new';
				curr[key] = value;
			} else if (curr[key]) {
				curr = curr[key];
			} else {
				curr = curr[key] = {};
			}
		}
		this._changeRecords_.push(o);
		// call all observers or not
		if(hold) return this;
		return this.deliverChangeRecords();
	}, 
	// ###sets
	// Overrides Base.sets to hold the call to _deliver_ until
	// all operations are done
	//
	// `see` Base.sets
	sets: function sets(obj, hold) {
		var i, k = Object.keys(obj);
		for(i = 0; i < k.length; i++) {
			k[i].indexOf('.') === -1 ? this.set(k[i], obj[k[i]], true) :
				this.setPath(k[i], obj[k[i]], true);
		}
		if(hold) return this;
		return this.deliverChangeRecords();
	},
	// ###unobserve
	// Remove a particular callback from this observable
	//
	// `param` {Function} the function passed in 
	unobserve: function unobserve(fn) {
		var cb = this._callbacks_, i = cb.indexOf(fn);
		if(i !== -1) cb.splice(i, 1);
		return this;
	},
	// ###unobserves
	// Allow an array of callbacks to be unregistered as changeRecord recipients
	//
	// `param` {Array} ary
	unobserves: function unobserves(ary) {
		var i;
		for(i = 0; i < ary.length; i++) {
			this.unobserve(ary[i]);
		}
		return this;
	},
	// ###unset
	// Overrides sudo.Base.unset to check for observers
	//
	// `param` {String} `key`. The name of the key
	// `param` {Bool} `hold`
	//
	// `see` sudo.Base.unset
	unset: function unset(key, hold) {
		var o = {name: key, object: this._data_, type: 'deleted'}, 
			val = !!this._data_[key];
		sudo.Base.prototype.unset.call(this, key);
		// call the observers if there was a val to delete
		this._unset_(o, val, hold);
	},
	// `private`
	_unset_: function _unset_(o, v, h) {
		if(v) {
			this._changeRecords_.push(o);
			if(h) return this;
			return this.deliverChangeRecords();
		}
		return this;
	},
	// ###setPath
	// Overrides sudo.Base.unsetPath to check for observers
	//
	// `param` {String} `path`
	// `param` {*} `value`
	// `param` {bool} `hold`
	//
	// `see` sudo.Base.setPath
	unsetPath: function unsetPath(path, hold) {
		var o = {type: 'deleted'}, curr = this._data_, p = path.split('.'), 
			key, val;
		for (key; p.length && (key = p.shift());) {
			if(!p.length) {
				// reached the last refinement
				o.name = key;
				o.object = curr;
				val = !!curr[key];
				delete curr[key];
			} else {
				// this can obviously fail, but can be prevented by checking
				// with `getPath` first.
				curr = curr[key];
			}
		}
		this._unset_(o, val, hold);
	},
	// ###unsets
	// Override of Base.unsets to hold the call to _deliver_ until done
	//
	// `param` ary 
	// `param` hold
	// `see` Base.unsets
	unsets: function unsets(ary, hold) {
		var i;
		for(i = 0; i < ary.length; i++) {
			ary[i].indexOf('.') === -1 ? this.unset(k[i], true) :
				this.unsetPath(k[i], obj[k[i]], true);
		}
		if(hold) return this;
		return this.deliverChangeRecords();	
	}
};
// ###Container Extension Object

// View Objects and their subclasses can contain other
// sudo class objects as children. This Object exposes methods
// for adding, removing and fetching them.
//
// `namespace`
sudo.ext.container = {
	// ###addChild
	// Adds a View to this container's list of children.
	// Also adds an 'index' property and an entry in the childNames hash.
	// If `addedToParent` if found on the child, call it, sending `this` as an argument.
	//
	// `param` {Object} `child`. View (or View subclass) instance.
	// `param` {String} `name`. An optional name for the child that will go in the childNames hash.
	addChild: function addChild(child, name) {
		var c = this._children_;
		child._parent_ = this;
		child._index_ = c.length;
		if(name) {
			child._name_ = name;
			this._childNames_[name] = child._index_;
		}
		c.push(child);
		if('addedToParent' in child) child.addedToParent(this);
		return this;
	},
	// ###getChild
	// If a child was added with a name, via `addChild`,
	// that object can be fetched by name. This prevents us from having to reference a 
	// containers children by index. That is possible however, though not preferred.
	//
	// `param` {String|Number} `id`. The string `name` or numeric `index` of the child to fetch.
	getChild: function getChild(id) {
		return typeof id === 'string' ? this._children_[this._childNames_[id]] :
			this._children_[id];
	},
	// Method is called with the `index` property of a subview that is being removed.
	// Beginning at <i> decrement subview indices.
	// `param` {Number} `i`
	// `private`
	_indexChildren_: function _indexChildren_(i) {
		var c = this._children_, o = this._childNames_, len;
		for (len = c.length; i < len; i++) {
			c[i]._index_--;
			// adjust any entries in childNames
			if(c[i]._name_ in o) o[c[i]._name_] = c[i]._index_; 
		}
	},
	// ###removeChild
	// A convenience method for `this.getChild(<name>).removeFromParent(...)`.
	//
	// `param` {String|Number|Object} `arg`. Children will always have an `index` number, and optionally a `name`.
	// If passed a string `name` is assumed, so be sure to pass an actual number if expecting to use index.
	// An object will be assumed to be an actual sudo Class Object, a common case when overridden.
	removeChild: function removeChild(arg) {
		var t = typeof arg, c;
		// passed an object (or an array - which will fail so don't do that), proceed
		if(t === 'object') this._removeChild_(arg); 
		else {
			c = t === 'string' ? this._children_[this._childNames_[arg]] : this._children_[arg];
			this._removeChild_(c);
		}
		return this;
	},
	// Find <child> in the children list and remove it, adjusting child references.
	// 
	// `param` {Object} `child`. The view that is going to be removed.
	// `private`
	_removeChild_: function _removeChild_(child) {
		var i = child._index_;
		// remove from the children Array
		this._children_.splice(i, 1);
		// remove from the named child hash if present
		delete this._childNames_[child._name_];
		// child is now an `orphan`
		delete child._parent_;
		this._indexChildren_(i);
	}
};
// ###Bindable Extension Object

// Bindable methods allow various properties and attributes of
// a sudo Class Object to be synchronized with the data contained
// in a changeRecord recieved via observe().
//
// `namespace`
sudo.ext.bindable = {
	// List of attributes - $.attr() to be used.
	//
	// `private`
	_attr_: {
		accesskey: true,
		align: true,
		alt: true,
		contenteditable: true,
		draggable: true,
		href: true,
		label: true,
		name: true,
		rel: true,
		src: true,
		tabindex: true,
		title: true
	},
	// Some bindings defer to jQuery.css() to be bound.
	//
	// `private`
	_css_: {
		display: true,
		visibility: true
	},
	// bind the jQuery prop() method to this object, now exposed
	// by this name, matching passed `bindings` arguments.
	//
	// `param` {string} `meth` The name of the method to be bound
	// `private`
	_handleAttr_: function _handleAttr_(meth) {
		this[meth] = function(obj) {
			if(obj.name === meth) this.$el.attr(meth, obj.object[obj.name]);
		};
	},
	// bind the jQuery css() method to this object, now exposed
	// by this name, matching passed `bindings` arguments.
	//
	// `param` {string} `meth` The name of the method to be bound
	// `private`
	_handleCss_: function _handleCss_(meth) {
		this[meth] = function(obj) {
			if(obj.name === meth) this.$el.css(meth, obj.object[obj.name]);
		};
	},
	// bind the jQuery data() method to this object, now exposed
	// by this name, matching passed `bindings` arguments.
	//
	// `param` {string} `meth` The name of the method to be bound
	// `private`
	_handleData_: function _handleData_(meth) {
		this[meth] = function(obj) {
			if(obj.name === meth) {
				this.$el.data(obj.object[obj.name].key, obj.object[obj.name].value);
			}
		};
	},
	// bind the jQuery attr() method to this object, now exposed
	// by this name, matching passed `bindings` arguments.
	//
	// NOTE: If more than 1 data-* attribute is desired you must
	// set those up manually as <obj>.data({..}) is what will be
	// constructed via this method.
	//
	// `param` {string} `meth` The name of the method to be bound.
	// `private`
	_handleProp_: function _handleProp_(meth) {
		this[meth] = function(obj) {
			if(obj.name === meth) this.$el.prop(meth, obj.object[obj.name]);
		};
	},
	// bind the jQuery shorthand methods to this object matching
	// passed `bindings` arguments.
	//
	// `param` {string} `meth` The name of the method to be bound.
	// `private`
	_handleSpec_: function _handleSpec_(meth) {
		this[meth] = function(obj) {
			if(obj.name === meth) this.$el[meth](obj.object[obj.name]);
		};
	},
	// List of properties - $.prop() to be used.
	//
	// `private`
	_prop_: {
		checked: true,
		defaultValue: true,
		disabled: true,
		location: true,
		multiple: true,
		readOnly: true,
		selected: true
	},
	// Given a single explicit binding, create it. Called from
	// _setbindings_ as a convenience for normalizing the
	// single vs. multiple bindings scenario
	//
	// `param` {string} `b` The binding.
	// `private`
	_setBinding_: function _setBinding_(b) {
		if(b in this._spec_) return this[this._spec_[b]](b);
		if(b in this._css_) return this._handleCss_(b);
		if(b in this._attr_) return this._handleAttr_(b);
		if(b in this._prop_) return this._handleProp_(b);
	},
	// ####setBindings
	// Inspect the binding (in the single-bound use case), or the 
	// bindings Array in this Object's data store and
	// create the bound functions expected.
	setBindings: function setBindings() {
		var b, bs, i;
		// handle the single binding use case
		if((b = this.get('binding'))) return this._setBinding_(b);
		if(!(bs = this.get('bindings'))) return;
		for(i = 0; i < bs.length; i++) {
			this._setBinding_(bs[i]);
		}
	},
	// `Special` binding cases. jQuery shorthand methods to be used.
	//
	// `private`
	_spec_: {
		data: '_handleData_',
		html: '_handleSpec_',
		text: '_handleSpec_',
		val: '_handleSpec_'
	}
};
// ###Base Class Object
//
// All sudo.js objects inherit base
//
// `param` {Object} data. An optional data object for this instance.
//
// `constructor`
sudo.Base = function(data) {
	this._data_ = data || {};
};
// ###base
// Lookup the function matching the name passed in  and call it with
// any passed in argumets scoped to the calling object.
// This method will avoid the recursive-loop problem by making sure
// that the first match is not the function that called `base`.
//
// `params` {*} any other number of arguments to be passed to the looked up method
sudo.Base.prototype.base = function base() {
	var args = Array.prototype.slice.call(arguments),
		name = args.shift(), 
		found = false,
		obj = this,
		curr;
	// find method on the prototype, excluding the caller
	while(!found) {
		curr = Object.getPrototypeOf(obj);
		if(curr[name] && curr[name] !== this[name]) found = true;
		// keep digging
		else obj = curr;
	}
	return curr[name].apply(this, args);
};
// ###construct
// A convenience method that alleviates the need to place:
// `Object.getPrototypeOf(this).consturctor.apply(this, arguments)`
// in every constructor
sudo.Base.prototype.construct = function construct() {
	Object.getPrototypeOf(this).constructor.apply(this, arguments || []);
};
// ####get
// Returns the value associated with a key in `this` object's key-value-store.
//
// `param` {String} `key`. The name of the key
// `returns` {*}. The value associated with the key or false if not found.
sudo.Base.prototype.get = function get(key) {
	return this._data_[key];
};
// ###getPath
// Extract a value located at `path` relative to this objects data store
//
// `param` {String} `path`. The key in the form of a dot-delimited path.
// `param` {boolean} `obj`. Optional override, forcing getPath to operate on the passed in `obj`
// argument rather than the default data store owned by `this` Object.
// `returns` {*|undefined}. The value at keypath or undefined if not found.
sudo.Base.prototype.getPath = function getPath(path, obj) {
	var key, curr = obj || this._data_, p;
	p = path.split('.');
	for (key; p.length && (key = p.shift());) {
		if(!p.length) {
			return curr[key];
		} else {
			curr = curr[key] || {};
		}
	}
	return curr;
};
// ###gets
// Assembles and returns an object of key:value pairs for each key
// contained in the passed in Array.
//
// `param` {array} `ary`. An array of keys.
// `returns` {object}
sudo.Base.prototype.gets = function gets(ary) {
	var i, o = {};
	for (i = 0; i < ary.length; i++) {
		o[ary[i]] = ary[i].indexOf('.') === -1 ? this._data_[ary[i]] :
			this.getPath(ary[i]);
	}
	return o;
};
// ###set
// Set a key:value pair in `this` object's data store.
//
// `param` {String} `key`. The name of the key.
// `param` {*} `value`. The value associated with the key.
sudo.Base.prototype.set = function set(key, value) {
	// _NOTE: intentional possibilty of setting a falsy value_
	this._data_[key] = value;
	return this;
};
// ###setPath
// Traverse the keypath and get each object 
// (or make blank ones) eventually setting the value 
// at the end of the path
//
// `param` {string} `path`. The path to traverse when setting a value.
// `param` {*} `value`. What to set.
// `param` {Object} `obj`. Optional flag to force setPath to operate on the passed object.
sudo.Base.prototype.setPath = function setPath(path, value, obj) {
	var curr = obj || this._data_, p = path.split('.'), key;
	for (key; p.length && (key = p.shift());) {
		if(!p.length) {
			curr[key] = value;
		} else if (curr[key]) {
			curr = curr[key];
		} else {
			curr = curr[key] = {};
		}
	}
	return this;
};
// ###sets
// Invokes `set()` or `setPath()` for each key value pair in `obj`.
// Any listeners for those keys or paths will be called.
//
// `param` {Object} `obj`. The keys and values to set.
sudo.Base.prototype.sets = function sets(obj) {
	var i, k = Object.keys(obj);
	for(i = 0; i < k.length; i++) {
		k[i].indexOf('.') === -1 ? this.set(k[i], obj[k[i]]) :
			this.setPath(k[i], obj[k[i]]);
	}
	return this;
};
// ###unset
// Remove a key:value pair from this object's data store
//
// `param` {String} key
sudo.Base.prototype.unset = function unset(key) {
	delete this._data_[key];
	return this;
};
// ###unsetPath
// Remove a key:value pair from this object's data store
// located at <path>
//
// `param` {String} path
sudo.Base.prototype.unsetPath = function unsetPath(path) {
	var curr = this._data_, p = path.split('.'), key;
	for (key; p.length && (key = p.shift());) {
		if(!p.length) {
			delete curr[key];
		} else {
			// this can fail if a faulty path is passed.
			// using getPath beforehand can prevent that
			curr = curr[key];
		}
	}
	return this;
};
// ###unsets
// Deletes a number of keys or paths from this object's data store
//
// `param` {array} `ary`. An array of keys or paths.
// `returns` this
sudo.Base.prototype.unsets = function unsets(ary) {
	var i;
	for(i = 0; i < ary.length; i++) {
		ary[i].indexOf('.') === -1 ? this.unset(ary[i]) :
			this.unsetPath(ary[i]);
	}
	return this;
};
// ###Observable Class Object

// ####Implements sudo.ext.observable

// A class that implements Data mutation observation, referring to
// the ES6 proposal for Object.observe, see:
// http://wiki.ecmascript.org/doku.php?id=harmony:observe
//
// `param` {Object} `data`. Optional data object 
// `constructor`
//
// `see` sudo.ext.responder
sudo.Observable = function(data) {
	sudo.Base.call(this, data);
	this._callbacks_ = [];
	this._changeRecords_ = [];
	$.extend(sudo.Observable.prototype, sudo.ext.observable);
};
// `private`
sudo._inherit_(sudo.Base, sudo.Observable);

// ###View Class Object

// Create an instance of a sudo.View object. A view is any object
// that maintains its own `el`, that being some type of DOM element.
// Pass in a string selector or an actual dom node reference to have the object
// set that as its `el`. If no `el` is specified one will be created upon instantiation
// based on the `tagName` (`div` by default). Specify `className`, `id` (or other attributes if desired)
// as an (optional) `attributes` object literal on the `data` arg.
//
// The view object uses jquery for dom manipulation
// and event delegation etc... A jquerified `this` reference is located
// at `this.$el` and `this.$` scopes queries to this objects `el`, i.e it's
// a shortcut for `this.$el.find(selector)`
//
// `param` {string|element|jQuery} `el`. Otional el for the View instance.
// `param` {Object} `data`. Optional data object.
//
// `constructor`
sudo.View = function(el, data) {
	sudo.Base.call(this, data);
	// may choose to be a container
	this._children_ = [];
	this._childNames_ = {};
	this._uid_ = sudo._unique_();
	this.setEl(el);
	if(this._role_ === 'view') this.init();
};
// View inherits from Base, and is not a responder.
// `private`
sudo._inherit_(sudo.Base, sudo.View);
// ###becomePremier
// Premier functionality provides hooks for behavioral differentiation
// among elements or class objects.
sudo.View.prototype.becomePremier = function becomePremier() {
	var p, f = function() {
			this._isPremier_ = true;
			sudo.premier = this;
		}.bind(this);
	// is there an existing premier that isn't me?
	if((p = sudo.premier) && p._uid_ !== this._uid_) {
		// ask it to resign and call the cb
		p.resignPremier(f);
	} else f(); // no existing premier
	return this;
};
// ###bubble
// By default, `bubble` returns the current view's parent
// (if it has one)
sudo.View.prototype.bubble = function bubble() {return this._parent_;};
// ###init
// A 'contruction-time' hook to call for further initialization needs.
// A noop by default child classes should override.
//
// `type` Function
sudo.View.prototype.init = $.noop;
// the el needs to be normalized before use
// `private`
sudo.View.prototype._normalizedEl_ = function _normalizedEl_(el) {
	if(typeof el === 'string') {
		return $(el);
	} else {
		// Passed an already `jquerified` Element?
		// It will have a length of 1 if so.
		return el.length ? el : $(el);
	}	
};
// ### removeFromParent
// Remove this object from its parents list of children.
// Does not alter the dom - do that yourself by overriding this method
// or chaining method calls
sudo.View.prototype.removeFromParent = function removeFromParent() {
	if(this._parent_) this._parent_._removeChild_(this);
	return this;
};
// ### resignPremier
// Resign premier status
//
// `param` {Function} `cb`. An optional callback to execute
// after resigning premier status.
sudo.View.prototype.resignPremier = function resignPremier(cb) {
	var p;
	this._isPremier_ = false;
	// only remove the global premier if it is me
	if((p = sudo.premier) && p._uid_ === this._uid_) {
		sudo.premier = null;
	}
	// fire the cb if passed
	if(cb) cb();
	return this;
};
// `private`
sudo.View.prototype._role_ = 'view';
// ###setEl
// A view must have an element, set that here.
// Stores a jquerified object as `this.$el` the raw
// node is always then available as `this.$el[0]`.
//
// `param` {string=|element} `el`
sudo.View.prototype.setEl = function setEl(el) {
	var a, t;
	if(!el) {
		// normalize any relevant data
		t = this._data_['tagName'] || 'div';
		this.$el = $(document.createElement(t));
		if((a = this._data_['attributes'])) this.$el.attr(a);
	} else {
		this.$el = this._normalizedEl_(el);
	}
	return this;
};
// ###this.$
// Return a single Element matching `sel` scoped to this View's el.
// This is an alias to `this.$el.find(sel)`.
//
// `param` {string} `sel`. A jQuery compatible selector
// `returns` {Element} An element matching the selector
sudo.View.prototype.$ = function(sel) {
	return this.$el.find(sel);
};
// ###ViewContainer Class Object

// ####Implements sudo.ext.container

// A class that implements mechanisms to add and remove children.
//
// `param` {String | Element} Optional `el` for the view object
// `param` {Object} `data`. Optional data object 
// `constructor`
//
// `see` sudo.ext.container
sudo.ViewContainer = function(el, data) {
	sudo.View.call(this, el, data);
	$.extend(sudo.ViewContainer.prototype, sudo.ext.container);
	if(this._role_ === 'viewContainer') {
		this.init();
	}
};
// `private`
sudo._inherit_(sudo.View, sudo.ViewContainer);
// `private`
sudo.ViewContainer.prototype._role_ = 'viewContainer';
// ###ViewController Class Object

// A sudo.View object meant to contain other View objects which will refer
// to this one as `parent`. This Object can then fetch those objects with
// `this.getChild`. Also, if those child Objects are sudo.Control types
// they may utilize the `this.send` method with no target specified and the 
// responsibilty of answering those `messages` will be delegated to this Object.
// This is useful in that the children do not have to know anything about the parent.
//
// ####Implements sudo.ext.container
//
// `param` {string|element} `el`. Otional el for the View instance.
// `param` {object} `data`. Optional data object.
//
// `see` sudo.View.
// `see` sudo.ext.container.
//
// `constructor`
sudo.ViewController = function(el, data) {
	sudo.ViewContainer.call(this, el, data);
	if(this._role_ === 'viewController') {
		if('descriptor' in this) this._instantiateChildren_([this.descriptor]);
		else if('descriptors' in this) this._instantiateChildren_();
		this.init();
	}
};
// ViewController inherits from View.
// `private`
sudo._inherit_(sudo.ViewContainer, sudo.ViewController);
// instantiate the children described in the `descriptors` array.
// `private`
sudo.ViewController.prototype._instantiateChildren_ = function _instantiateChildren_(ary) {
	var i, j, len, curr, o, c, d = ary || this.descriptors,
			_hc = function(o, c) {
				var n = o.name || sudo._unique_('cb');
				c[n] = sudo.ViewController.prototype._objectForPath_(o.to).addCallback({
					key: o.key,
					path: o.path,
					fn: $.isFunction(o.fn) ? o.fn : c[o.fn].bind(c),
					pre: o.pre,
					options: o.options
				});	
			};
	for(i = 0, len = d.length; i < len; i++) {
		curr = d[i]; 
		c = new curr.is_a(curr.el, curr.data);
		this.addChild(c, curr.name);
		// handle any callback(s)
		if('callback' in curr) _hc(curr.callback, c);
		else if('callbacks' in curr) {
			for(j = 0; j < curr.callbacks.length; j++) {
				_hc(curr.callbacks[j], c);
			}
		}
		// handle any connections
		if('connect' in curr) {
			o = curr.connect;
			c.sets({
				sendTarget: o.target ? this._objectForPath_(o.target) : null,
				sendMethod: o.method
			});
		}
	}
};
// The objects used for callbacks and connections need to be
// looked-up via a key-path like address as they likely will not exist
// when viewController's are instantiated.
//
// `private`
sudo.ViewController.prototype._objectForPath_ = function _objectForPath_(path) {
	return sudo.Base.prototype.getPath.call(this, path, window);
};
// `private`
sudo.ViewController.prototype._role_ = 'viewController';
// ###Control Class Object 

// Control objects expose methods that allow another object to be named
// as a `sendTarget` for an action. The `sendTarget` has a named `sendMethod`
// that will be called when the `send` method is envoked. All Control objects pass
// themselves and any other number of arguments (the ones passed to `send`), therefore any
// object serving as a `sendTarget` should posses a method with the signature(sender, ...).
//
// One particularly useful aspect of Control Object's is that when they are children of a 
// `sudo.Container` type the sendTarget can be omitted and `bubble()` will be used to check
// parent object's for the `sendMethod`
//
// Inherits from sudo.View
//
// `param` {String|Element} `el`. This objects DOM Element.
// `param` {Object} `data`. Optional data object
//
// `see` sudo.View
//
// `constructor`
sudo.Control = function(el, data) {
	sudo.View.call(this, el, data);
	if(this._role_ === 'control') this.init();
};
// _private_
sudo._inherit_(sudo.View, sudo.Control);
// _private_
sudo.Control.prototype._role_ = 'control';
// ###send
// The call to the specific method on a unspecified target happens here.
// If the Control Object is part of a `sudo.ext.container` maintained hierarchy
// the 'target' may be left out, causing the `bubble()` method to be called.
// What this does is allow children of a `sudo.ext.container` to simply pass
// events  upward, delegating the responsibility of deciding what to do to the parent.
//
// `param` {*} Any number of arguments is supported, but the first is the only one searched for info. 
// A sendMethod will be located by:
//   1. using the first argument if it is a string
//   2. looking for a `sendMethod` property if it is an object
// In the odd-case a specified target exists on `this.get('sendTarget')` it will be used
// normally however, parent-bubbling will be used.
// Any other args will be passed to the sendMethod after `this`
sudo.Control.prototype.send = function send(/*args*/) {
	var args = Array.prototype.slice.call(arguments),
			meth, targ, fn;
	// normalize the input, common use cases first
	if('sendMethod' in this._data_) meth = this._data_.sendMethod;
	else if(typeof args[0] === 'string') meth = args.shift();
	// less common but viable options
	if(!meth) {
		// passed as a jquery custom data attr bound in events
		meth = 'data' in args[0] ? args[0].data.sendMethod :
			// passed in a hash from something or not passed at all
			args[0].sendMethod || void 0;
	}
	// target is either specified or my parent
	targ = this._data_['sendTarget'] || this._parent_;
	// obvious chance for no method here -- don't be dumb
	fn = targ[meth];
	while(!fn && (targ = targ.bubble())) {
		fn = targ[meth];
	}
	// sendMethods expect a signature (sender, ...)
	if(fn) {
		args.unshift(this);
		fn.apply(targ, args);
	}
	return this;
};
// ###Bindable Class Object

// ####Implements sudo.ext.Bindable

// Bindable methods allow various properties and attributes of
// a sudo Class Object to be synchronized with the data contained
// in another object and reflected automagically via callbacks.
//
// When instantiating a bindable declare a single `binding` or
// multiple `bindings` (in an Array) and pass those in the data argument.
//
// `param` {string|Element} el. The DOM Element for this Object.
// `param` {Object} data. Optional data object.
//
// `constructor`
sudo.Bindable = function(el, data) {
	sudo.View.call(this, el, data);
	$.extend(sudo.Bindable.prototype, sudo.ext.bindable);
	if(this._role_ === 'bindable') {
		this.setBindings();
		this.init();
	}
};
// Bindable inherits View prototype methods, Also
// sets the Bindable constructor property.
//
// `private`
sudo._inherit_(sudo.View, sudo.Bindable);
// 'private'
sudo.Bindable.prototype._role_ = 'bindable';
// ###Bindable Class Object

// ####Implements sudo.ext.Bindable

// Bindable methods allow various properties and attributes of
// a sudo Class Object to be synchronized with the data contained
// in another object and reflected automagically via callbacks.
//
// When instantiating a bindable declare a single `binding` or
// multiple `bindings` (in an Array) and pass those in the data argument.
//
// `param` {string|Element} el. The DOM Element for this Object.
// `param` {Object} data. Optional data object.
//
// `constructor`
sudo.Bindable = function(el, data) {
	sudo.View.call(this, el, data);
	$.extend(sudo.Bindable.prototype, sudo.ext.bindable);
	if(this._role_ === 'bindable') {
		this.setBindings();
		this.init();
	}
};
// Bindable inherits View prototype methods, Also
// sets the Bindable constructor property.
//
// `private`
sudo._inherit_(sudo.View, sudo.Bindable);
// 'private'
sudo.Bindable.prototype._role_ = 'bindable';
// ###Templating

// Allow the default {{ js code }}, {{= key }}, and {{- escape stuff }} 
// micro templating delimiters to be overridden if desired
//
// `type` {Object}
sudo.templateSettings = {
	evaluate: /\{\{([\s\S]+?)\}\}/g,
	interpolate: /\{\{=([\s\S]+?)\}\}/g,
	escape: /\{\{-([\s\S]+?)\}\}/g
};
// Certain characters need to be escaped so that they can be put 
// into a string literal when templating.
//
// `type` {Object}
sudo.escapes = {};
(function(s) {
	var e = {
		'\\': '\\',
		"'": "'",
		r: '\r',
		n: '\n',
		t: '\t',
		u2028: '\u2028',
		u2029: '\u2029'
	};
	for (var key in e) s.escapes[e[key]] = key;
}(sudo));
// lookup hash for `escape`
//
// `type` {Object}
sudo.htmlEscapes = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#x27;',
	'/': '&#x2F;'
};
// Escapes certain characters for templating
//
// `type` {regexp}
sudo.escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
// Escape unsafe HTML
//
// `type` {regexp}
sudo.htmlEscaper = /[&<>"'\/]/g;
// Unescapes certain characters for templating
//
// `type` {regexp}
sudo.unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;
// Remove unsafe characters from a string
//
// `param` {String}
sudo.escape = function(string) {
	return ('' + string).replace(sudo.htmlEscaper, function(match) {
		return sudo.htmlEscapes[match];
	});
};
// Within an interpolation, evaluation, or escaping,
// remove HTML escaping that had been previously added.
//
// `param` {string} code
sudo.unescape = function unescape(code) {
	return code.replace(sudo.unescaper, function(match, escape) {
		return sudo.escapes[escape];
	});
};
// JavaScript micro-templating, similar to John Resig's (and it's offspring) implementation.
// sudo templating preserves whitespace, and correctly escapes quotes within interpolated code.
// Unlike others sudo.template requires a scope name (to avoid the use of `with`) and will spit at you
// if it is not present.
//
// `param` {string} `str`. The 'templated' string.
// `param` {Object} `data`. Optional hash of key:value pairs.
// `param` {string} `scope`. Optional context name of your `data object`, set to 'data' if falsy.
sudo.template = function template(str, data, scope) {
	scope || (scope = 'data');
	var settings = sudo.templateSettings, render, template,
	// Compile the template source, taking care to escape characters that
	// cannot be included in a string literal and then unescape them in code blocks.
	source = "_p+='" + str.replace(sudo.escaper, function(match) {
		return '\\' + sudo.escapes[match];
	}).replace(settings.escape, function(match, code) {
		return "'+\n((_t=(" + sudo.unescape(code) + "))==null?'':sudo.escape(_t))+\n'";
	}).replace(settings.interpolate, function(match, code) {
		return "'+\n((_t=(" + sudo.unescape(code) + "))==null?'':_t)+\n'";
	}).replace(settings.evaluate, function(match, code) {
		return "';\n" + sudo.unescape(code) + "\n_p+='";
	}) + "';\n";
	source = "var _t,_p='';" + source + "return _p;\n";
	render = new Function(scope, source);
	if (data) return render(data);
	template = function(data) {
		return render.call(this, data);
	};
	// Provide the compiled function source as a convenience for reflection/compilation
	template.source = 'function(' + scope + '){\n' + source + '}';
	return template;
};
// ###Dataview Class Object

// Create an instance of an Object, inheriting from sudo.View that:
// 1. Expects to have a template located in its internal data Store accessible via `this.get('template')`.
// 2. Can have a `renderTarget` property in its data store. If so this will be the location
//		the child injects itself into if not already in the DOM
// 3. Can have a 'renderMethod' property in its data store. If so this is the jQuery method
//		that the child will use to place itself in it's `renderTarget`.
// 4. Has a `render` method that when called re-hydrates it's $el by passing its
//		internal data store to its template
// 5. Handles event binding/unbinding via an events array in the form:
//			events: [{
//				name: `eventName`,
//				sel: `an_optional_delegator`,
//				data: an_optional_hash_of_data
//				fn: `function name`
//			}, {...
//		This array will be searched for via `this.get('events')`. Details
//		about the hashes in the array:
//		A. name -> jQuery compatible event name
//		B. sel -> Optional jQuery compatible selector used to delegate events
//		C. data: A hash that will be passed as the custom jQuery Event.data object
//		D. fn -> If a {String} bound to the named function on this object, if a 
//			function assumed to be anonymous and called with no scope manipulation
//
//`constructor`
sudo.Dataview = function(el, data) {
	var  d, t;
	sudo.View.call(this, el, data);
	d = this._data_;
	// dont autoRender on the setting of events
	// add to this to prevent others if needed
	d.autoRenderBlacklist = {event: true, events: true};
	// compile my template if not already done
	if((t = d.template)) {
		if(typeof t === 'string') d.template = sudo.template(t);
	}
	if(this._role_ === 'dataview') {
		// as all events are delegated to this.$el binding can take place here
		this.bindEvents();
		this.init();
	}
};
// `private`
sudo._inherit_(sudo.Control, sudo.Dataview);
// ###addedToParent
// Container's will check for the presence of this method and call it if it is present
// after adding a child - essentially, this will auto render the dataview when added to a parent
sudo.Dataview.prototype.addedToParent = function() {
	this.render();
};
// ###bindEvents
// Bind the events in the data store to this object's $el
sudo.Dataview.prototype.bindEvents = function bindEvents() {
	var e;
	if((e = this._data_.event || this._data_.events)) this._handleEvents_(e, 1);
	return this;
};
// Use the jQuery `on` or 'off' method, optionally delegating to a selector if present
// `private`
sudo.Dataview.prototype._handleEvents_ = function _handleEvents_(e, which) {
	var i;
	if(Array.isArray(e)) {
		for(i = 0; i < e.length; i++) {
			this._handleEvent_(e[i], which);
		}
	} else {
		this._handleEvent_(e, which);
	}
};
// helper for binding and unbinding an individual event
// `param` {Object} e. An event descriptor
// `param` {String} which. `on` or `off`
// `private`
sudo.Dataview.prototype._handleEvent_ = function _handleEvent_(e, which) {
	if(which) {
		this.$el.on(e.name, e.sel, e.data, typeof e.fn === 'string' ? this[e.fn].bind(this) : e.fn);
	} else {
		// do not re-bind the fn going to off otherwise the unbind will fail
		this.$el.off(e.name, e.sel);
	}
};
// ###removeFromParent
// Remove this object from the DOM and its parent's list of children.
// Overrides `sudo.View.removeFromParent` to actually remove the DOM as well
sudo.Dataview.prototype.removeFromParent = function removeFromParent() {
	if(this._parent_) {
		this._parent_._removeChild_(this);
		this.$el.remove();
	}
	return this;
};
// ### render
// (Re)hydrate the innerHTML of this object via its template and internal data store.
// If a `renderTarget` is present this Object will inject itself into the target via
// `this.get('renderMethod')` or defualt to `$.append`. After injection, the `renderTarget`
// is deleted from this Objects data store.
// Event unbinding/rebinding is generally not necessary for the Objects innerHTML as all events from the
// Object's list of events (`this.get('event(s)'))` are delegated to the $el on instantiation.
sudo.Dataview.prototype.render = function render() {
	var d = this._data_;
	this.$el.html(d.template(d));
	if(d.renderTarget) {
		this._normalizedEl_(d.renderTarget)[d.renderMethod || 'append'](this.$el);
		delete d.renderTarget;
	}
	return this;
};
// `private`
sudo.Dataview.prototype._role_ = 'dataview';
// ###set
// Override `sudo.Base.set` to provide auto rendering if desired
sudo.Dataview.prototype.set = function set(key, value) {
	sudo.Base.prototype.set.call(this, key, value);
	if(this._data_['autoRender'] && !this._data_.autoRenderBlacklist[key]) return this.render();
	return this;
};
// ###setPath
// Override `sudo.Base.setPath` to provide auto rendering if desired
sudo.Dataview.prototype.setPath = function setPath(path, value) {
	sudo.Base.prototype.setPath.call(this, path, value);
	if(this._data_['autoRender']) return this.render();
	return this;
};
// ###sets
// Override `sudo.Base.sets` in case of autoRender.being true
sudo.Dataview.prototype.sets = function sets(obj) {
	var a;
	if(this._data_['autoRender']) {
		this._data_['autoRender'] = false;
		a = true;
	}	
	sudo.Base.prototype.sets.call(this, obj);
	if(a) {
		this._data_['autoRender'] = true;
		return this.render();
	}
	return this;
};
// ###unbindEvents
// Unbind the events in the data store from this object's $el
sudo.Dataview.prototype.unbindEvents = function unbindEvents() {
	var e;
	if((e = this._data_.event || this._data_.events)) this._handleEvents_(e);
	return this;
};
// Rather than require a set of psuedo `routes` a sudo.Navigator insance simply
// abstracts location and history events, parsing their information into a 
// normalized object that is set to an Observable class instance where interested
// parties can react how they wish
sudo.Navigator = function(data) {
	this.started = false;
	this.slashStripper = /^\/+|\/+$/g;
	this.construct(data);
	// my namespace or yours?
	this.ns = this._data_['namespace'] || 'sudo';
};

sudo.Navigator.prototype = Object.create(sudo.Base.prototype);

sudo.Navigator.prototype.getUrl = function getUrl() {
	return this._data_['root'] + window[this.ns].location._data_['fragment'];
};

sudo.Navigator.prototype.go = function go(fragment) {
	if(!this.started) return false;
	if(!window[this.ns].location.urlChanged(fragment)) return;
	// TODO ever use replaceState?
	if(this.isPushState) {
		window.history.pushState({}, document.title, this.getUrl());
	} else if(this.isHashChange) {
		window.location.hash = '#' + window[this.ns].location._data_['fragment'];
	}
	this.setData();
};

sudo.Navigator.prototype.handleChange = function handleChange(e) {
	if(window[this.ns].location.urlChanged()) {
		this.setData();
	}
};

sudo.Navigator.prototype.parseQuery = function parseQuery() {
	var obj = {}, seg = window[this.ns].location._data_['query'],
			i, s;
	if(seg) {
		seg = seg.split('&');
		for(i = 0; i < seg.length; i++) {
			if(!seg[i]) continue;
			s = seg[i].split('=');
			obj[s[0]] = s[1];
		}
		return obj;
	}
};

sudo.Navigator.prototype.setData = function setData() {
	var frag = window[this.ns].location._data_['fragment'],
			observable = this._data_['observable'];
	if(window[this.ns].location._data_['query']) {
		// we want to set the key minus any search/hash
		frag = frag.indexOf('?') ? frag.split('?')[0] : frag.split('#')[0];
	}
	if(observable) {
		observable.set(frag, this.parseQuery());
	}
};

sudo.Navigator.prototype.start = function start() {
	var hasPushState = window.history && window.history.pushState;
	if(this.started) return;
	this.started = true;

	// setup the initial configuration
	this.isHashChange = this._data_['useHashChange'] && 'onhashchange' in window || 
		(!hasPushState && 'onhashchange' in window);
	this.isPushState = !this.isHashChange && !!hasPushState;

	// normalize the root to always contain a leading and trailing slash
	this._data_['root'] = ('/' + this._data_['root'] + '/').replace(this.slashStripper, '/');

	// I need a location Object to talk to
	window[this.ns].location = new sudo.Location({namespace: this._data_['namespace']});

	// monitor URL changes via popState or hashchange
	if (this.isPushState) {
		$(window).on('popstate', this.handleChange.bind(this));
	} else if (this.isHashChange) {
		$(window).on('hashchange', this.handleChange.bind(this));
	} else {
		// no Navigator for you
		return;
	}
};
// A helper object for the sudo.Navigator. `window.location` type info is handled and stored
// here for speration of concerns and clarity
sudo.Location = function(data) {
	this.construct(data);
	// regular expressions for manipulation of url
	this.re = {
		leadingStripper: /^[#\/]|\s+$/g,
		trailingStripper: /\/$/
	};
	// my namespace or yours?
	this.ns = this._data_['namespace'] || 'sudo';
	// get a snapshot of the current location & query
	this.urlChanged();
};

sudo.Location.prototype = Object.create(sudo.Base.prototype);

sudo.Location.prototype.getFragment = function getFragment(fragment) {
	var root = window[this.ns].navigator._data_['root'];
	fragment || (fragment = window.location.pathname);
	// intentional use of coersion
	if (window[this.ns].navigator.isPushState) {
		root = root.replace(this.re.trailingStripper, '');
		if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
	} else {
		fragment = this.getHash();
	}
	return decodeURIComponent(fragment.replace(this.re.leadingStripper, ''));
};

sudo.Location.prototype.getHash = function getHash(fragment) {
	fragment || (fragment = window.location.href);
	var match = fragment.match(/#(.*)$/);
	return match ? match[1] : '';
};

sudo.Location.prototype.getSearch = function getSearch(fragment) {
	fragment || (fragment = window.location.href);
	var match = fragment.match(/\?(.*)$/);
	return match ? match[1] : '';
};

sudo.Location.prototype.urlChanged = function urlChanged(fragment) {
	var current = this.getFragment(fragment);
	// nothing has changed
	if (current === this._data_['fragment']) return false;
	this._data_['fragment'] = current;
	this._data_['query'] = this.getSearch(fragment) || this.getHash(fragment);
	return true;
};
sudo.version = "0.7.0";
window.sudo = sudo;
if(typeof window._ === "undefined") window._ = sudo;
}).call(this, this);
