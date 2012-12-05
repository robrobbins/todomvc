'use strict';
sudo.namespace('todo');
// keep a const ref for return
todo.ENTER_KEY = 13;
// Top-level Observable model
todo.model = new todo.Model();

// Start up a sudo.Navigator to handle the filter-based `navigation`
// the Navigator will look for a passed in `root` path as well as the name
// of an `Observable` instance to send data to
// --------------------------------------------------------------------
todo.navigator = new sudo.Navigator({
	namespace: 'todo',
	root: '/', 
	observable: todo.model,
	useHashChange: true
});
todo.navigator.start();

// The list itself, a ViewController
// ---------------------------------
todo.list = new todo.List('#todoapp', {
	completed: [],
	statsTemplate: sudo.template($('#stats-template').html())
});

// The model will fetch any persisted todo's, setting them thus triggering
// any pending change observers
todo.model.getPersisted();
