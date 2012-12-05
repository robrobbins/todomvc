'use strict';
sudo.namespace('todo');

// The List itself, a sudo.ViewController instance
// ----------------------------------------------
todo.List = function(el, data) {
	// call to the constructor of the sudo.ViewController class
	this.construct(el, data);
	// references to some key ui elements
	this.$input = this.$('#new-todo');
	this.allCheckbox = this.$('#toggle-all')[0];
	this.$footer = this.$('#footer');
	this.$main = this.$('#main');
	this.render();
};

// List inherits from sudo.ViewController -- we prefer explicitness
todo.List.prototype = Object.create(sudo.ViewController.prototype);

// Override the base addChild method to accept an object literal
// containing title and completed state (since we are only adding todos).
// The optional `hold` will prevent unnecessary rendering
todo.List.prototype.addChild = function(info, hold) {
	var child = new todo.Item(null, {
		title: info.title,
		completed: info.completed,
		renderTarget: this.$('#todo-list')
	});
	// call to `super`
	this.base('addChild', child);
	// was this a completed child?
	if(info.completed) this.addCompleted(child, true);
	if(!hold) {
		this.persist().render();
	}
};
// A `sendTarget` method for child objects.
// All sudo.Control types send themselves as an arg to a `sendTarget` method
todo.List.prototype.addCompleted = function(child, hold) {
	this.get('completed').push(child);
	// save and refresh stats unless told not to
	if (!hold) {
		this.persist().render();
	}
};

// Clear all completed todo items, removing them.
todo.List.prototype.clearCompleted = function() {
	this.get('completed').forEach(function(child) {
		this.removeChild(child, true);
	}.bind(this));
	// no need to piecemeal modify the `completed` list here
	this.set('completed', []);
	// save state and refresh stats
	this.persist().render();
};

// If you hit return in the main input field, add an Item child
todo.List.prototype.createOnEnter = function(e) {
	var title = this.$input.val().trim();
	if (e.which !== todo.ENTER_KEY || !title) return;
	// only title and completed are needed
	this.addChild({title: title, completed: false});
	// clear the input `title` field
	this.$input.val('');
};

// At initialization we register as an `observer` of the Observable model
// and bind some event listeners...
todo.List.prototype.init = function() {
	todo.model.observe(this.parsePersisted.bind(this));
	// listening for the clear-completed button click, delegated to this.$el
	this.$el.on('click', '#clear-completed', this.clearCompleted.bind(this));
	// listening for the making of new todos
	this.$('#new-todo').on('keypress', this.createOnEnter.bind(this));
	// listening to the `mark-all-as-complete` checkbox
	this.$('#toggle-all').on('click', this.toggleAllComplete.bind(this));
};

// add children from the persisted JSON string contained
// in the change record
todo.List.prototype.parsePersisted = function(change) {
	if(change.name === 'persistedTodos') {

		var ary = JSON.parse(change.object[change.name]), 
			child;
		
		ary.forEach(function(saved) {
			this.addChild(saved);
		}.bind(this));

		// refresh stats
		this.render();

		// check for a mismatch in the current filter-state
		todo.model.set(todo.location.get('fragment'), {});
	}
};

// To persis the todo list, I will hand my current children collection to
// the model to be saved into localstorage
todo.List.prototype.persist = function() {
	todo.model.persist(this._children_);
	return this;
};

// A `sendTarget` method for child objects.
// All sudo.Control types send themselves as an arg to a `sendTarget` method
todo.List.prototype.removeCompleted = function(child, hold) {
	var comp = this.get('completed'),
		index = comp.indexOf(child);
	if(index !== -1) comp.splice(index, 1);
	// refresh stats unless told not too
	if(!hold) {
		this.persist().render();
	}
};

// Override the base removeChild to remove the DOM and call
// render so the stats are refreshed.
// The optional `hold` are is so we don't call render repeatedly
// in a loop (like clearCompleted).
// Also, this method will be called from a child todo whose `x`
// button has been clicked - ignore the `event` argument in that case
todo.List.prototype.removeChild = function(child, hold) {
	// normalize the input, we want to ignore the event arg if passed
	hold = typeof hold === 'boolean' ? hold : void 0;
	// call to method on `super`
	this.base('removeChild', child);
	// by default, sudo containers do not modify their children's $el
	child.$el.remove();
	// save state and refresh unless told not to
	if(!hold) {
		// modify the `completed` list in the singular case
		this.removeCompleted(child, true);
		this.persist().render();
	}
};

// Re-rendering the List just means refreshing the statistics
todo.List.prototype.render =  function() {
	var completed = this.get('completed').length,
		remaining = this._children_.length - completed,
		frag = todo.location.get('fragment');

	if (this._children_.length > 0) {
		this.$main.show();
		this.$footer.show();
		this.$footer.html(this.get('statsTemplate')({
			completed: completed,
			remaining: remaining
		}));

		// highlight the correct active filter
		this.$('#filters li a').removeClass('selected').filter(
			'[href="#/' + frag + '"]').addClass('selected');

	} else {
		this.$main.hide();
		this.$footer.hide();
	}
	this.allCheckbox.checked = !remaining;
	return this;
};

// the child todos know how to set their visual `complete` state
todo.List.prototype.toggleAllComplete = function() {
	var completed = this.allCheckbox.checked;
	this._children_.forEach(function(child) {
		// Dataview child will auto update as we set autoRender to true,
		// but only if the state differs from that selected
		if(child.get('completed') !== completed) child.toggleCompleted(completed);
	}.bind(this));
	// save state and refresh
	this.persist().render();
};
