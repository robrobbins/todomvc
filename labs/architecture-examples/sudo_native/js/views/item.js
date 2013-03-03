'use strict';
_.namespace('todo');

// Todo Item. Instance of a sudo.DataView class
// --------------------------------------------

todo.Item = function(el, data) {
	// extend the item's initial model
	_.extend(data, {
		autoRender: true,
		tagName: 'li',
		template: _.template(document.querySelector(
			'#item-template').innerHTML),
		events:{
			click: {
				'.toggle': 'toggleCompleted',
				'.destroy': {
					fn: 'send',
					data: {sendMethod: 'removeChild'}
				}
			},
			dblclick: {
				label: 'edit'
			},
			keypress: {
				'.edit': 'updateOnEnter'
			},
			blur:{
				'.edit': 'edited'
			}
		}
	});
	// call to the constructor on my `super` class
	this.construct(el, data);
	// observe changes to the app model set by the navigator class,
	// individual items will then show/hide themselves
	todo.model.observe(this.toggleVisible.bind(this));
};
// Item inherits from sudo.Dataview
todo.Item.prototype = Object.create(_.DataView.prototype);

// Switch this view into `"editing"` mode, displaying the input field.
todo.Item.prototype.edit = function() {
	this.el.classList.add('editing');
	this._input.focus();
};

// Close the `"editing"` mode, saving changes to the todo.
todo.Item.prototype.edited = function() {
	var value = this._input.value;
	if (value) {
		this.model.set('title', value);
		// new state should be persisted
		this.send('persist');
		// we r done editing
		this.el.classList.remove('editing');
	}
	// no title means you don't want this todo
	else this.send('removeChild');
};

// Re-render the title if changed, overrides base render method 
// to toggle completed state
todo.Item.prototype.render = function() {
	this.base('render');
	// may have been a persisted `completed` todo
	if(this.model.get('completed')) this.el.classList.add('completed');
	else this.el.classList.remove('completed');
	// get a ref to my input
	this._input || (this._input = this.$('.edit'));
	return this;
};

// Toggle the `"completed"` state in my model
// can be called via the click event or from the containing parent
// via the clearCompleted method
todo.Item.prototype.toggleCompleted = function(arg) {
	// not interested in the event object only the boolean
	arg = typeof arg === 'boolean' ? arg : void 0;
	this.model.set('completed', arg || !this.model.get('completed'));
	// send a message that I have marked myself (in)complete
	this.model.get('completed') ? this.send('addCompleted') : this.send('removeCompleted');
	// parent should enforce the active filter state
	this.send('filter');
};

// should I show or hide based on a selected `filter`
todo.Item.prototype.toggleVisible = function(change) {
	// don't observe persistance changes
	if(change.name === 'persistedTodos') return;

	var name = change.name, 
		comp = this.model.get('completed') ? 1 : 0,
		which;
	// all (and no filter) means show everybody
	if(!name)  return this.el.classList.remove('hidden');
	// toggle via completed true/false && filter
	if(name === 'active') which = comp ? 'add' : 'remove';
	else which = comp ? 'remove' : 'add';

	this.el.classList[which]('hidden');
};

// If you hit `enter`, we're through editing the item.
todo.Item.prototype.updateOnEnter = function(e) {
	if (e.which === todo.ENTER_KEY ) {
		this.edited();
	}
};
