const Datastore = require('nedb');

// Create a new NeDB datastore
const db = new Datastore({ filename: './question.db', autoload: true });

