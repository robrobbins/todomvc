'use strict';
sudo.namespace('todo');

// Todo Item. Instance of a sudo.DataView class
// --------------------------------------------

todo.Item = function(el, data) {
	// extend the item's initial model
	$.extend(data, {
		autoRender: true,
		tagName: 'li',
		template: sudo.template($('#item-template').html()),
		events:[{
			name: 'click',
			sel: '.toggle',
			fn: 'toggleCompleted'
		}, {
			name: 'dblclick',
			sel: 'label',
			fn: 'edit'
		}, {
			name: 'click',
			sel: '.destroy',
			data: {sendMethod: 'removeChild'},
			fn: 'send'
		}, {
			name: 'keypress',
			sel: '.edit',
			fn: 'updateOnEnter'
		}, {
			name: 'blur',
			sel: '.edit',
			fn: 'edited'
		}]
	});

	// call to the constructor on my `super` class
	this.construct(el, data);

	// observe changes to the model set by the navigator class,
	// individual items will then show/hide themselves
	todo.model.observe(this.toggleVisible.bind(this));
};

// Item inherits from sudo.Dataview
todo.Item.prototype = Object.create(sudo.Dataview.prototype);

// Switch this view into `"editing"` mode, displaying the input field.
todo.Item.prototype.edit = function() {
	this.$el.addClass('editing');
	this.$input.focus();
};

// Close the `"editing"` mode, saving changes to the todo.
todo.Item.prototype.edited = function() {
	var value = this.$input.val().trim();
	if (value) {
		this.set('title', value);
		// new state should be persisted
		this.send('persist');
		// we r done editing
		this.$el.removeClass('editing');
	}
	// no title means you don't want this todo
	else this.send('removeTodo');
};

// Re-render the title if changed, overrides base render method 
// to toggle completed state
todo.Item.prototype.render = function() {
	this.base('render');
	// may have been a persisted `completed` todo
	this.$el.toggleClass('completed', this.get('completed'));
	// get a ref to my input
	this.$input = this.$('.edit');
	return this;
};

// Toggle the `"completed"` state in my model
// can be called via the click event or from the containing parent
// via the clearCompleted method
todo.Item.prototype.toggleCompleted = function(arg) {
	// not interested in the event object only the boolean
	arg = typeof arg === 'boolean' ? arg : void 0;
	this.set('completed', arg || !this.get('completed'));
	// send a message that I have marked myself (in)complete
	this.get('completed') ? this.send('addCompleted', arg ? true : false) : 
		this.send('removeCompleted', arg ? true : false);
};

// should I show or hide based on a selected `filter`
todo.Item.prototype.toggleVisible = function(change) {
	// don't observe persistance changes
	if(change.name === 'persistedTodos') return;
	var name = change.name, 
		comp = this.get('completed');
	// all (and no filter) means show everybody
	if(name === 'all' || !name)  return this.$el.removeClass('hidden');
	// toggle via completed true/false && filter
	this.$el.toggleClass('hidden', ((comp && name === 'active') || (!comp && name === 'completed')));
};

// If you hit `enter`, we're through editing the item.
todo.Item.prototype.updateOnEnter = function(e) {
	if (e.which === todo.ENTER_KEY ) {
		this.edited();
	}
};
