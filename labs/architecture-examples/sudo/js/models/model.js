'use strict';
sudo.namespace('todo');

// Todo Model, a sudo.Observable Instance
// --------------------------------------

todo.Model = function Model(data) {
	this.construct(data);
	this.key = 'todo-sudo';
};

todo.Model.prototype = Object.create(sudo.Observable.prototype);

// load any persisted todos and set them - notifying any observers
todo.Model.prototype.getPersisted = function() {
	// retreive the JSON string and set it, allowing the ViewController
	// to instantiate the children via the changeRecord
	// if LS is empty set the empty array
	this.set('persistedTodos', localStorage.getItem(this.key) || '[]');
};

// simplify and stringify the child collection (passed from the todo.list)
// and set it with the correct key
todo.Model.prototype.persist = function(children) {
	// so all i really want is title and completed
	var ary = children.map(function(child) {
		return {
			title: child.get('title'),
			completed: child.get('completed')
		};
	});
	localStorage.setItem(this.key, JSON.stringify(ary));
};
