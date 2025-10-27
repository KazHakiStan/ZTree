const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Person schema
const personSchema = new mongoose.Schema({
  name: String,
  relation: String,
  location: {
    lat: Number,
    lon: Number
  },
  connections: [String]
});

const Person = mongoose.model('Person', personSchema, 'people');

// Get all people (for testing)
app.get('/api/people', async (req, res) => {
  try {
    const people = await Person.find({});
    res.json(people);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes
app.get('/api/person/:name', async (req, res) => {
  try {
    const person = await Person.findOne({ name: req.params.name });
    
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Get all connected people
    const connectedPeople = await Person.find({ 
      name: { $in: person.connections } 
    });

    res.json({
      mainPerson: person,
      connections: connectedPeople
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add connection to person
app.post('/api/person/:name/connections', async (req, res) => {
  try {
    const { connectionName } = req.body;
    
    const person = await Person.findOne({ name: req.params.name });
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Check if connection exists
    const connectionPerson = await Person.findOne({ name: connectionName });
    if (!connectionPerson) {
      return res.status(404).json({ error: 'Connection person not found' });
    }

    // Add connection if not already present
    if (!person.connections.includes(connectionName)) {
      person.connections.push(connectionName);
      await person.save();
    }

    res.json({ success: true, person });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update person - only modify specified fields
app.put('/api/person/:name', async (req, res) => {
  try {
    const { name, relation, location } = req.body;
    
    const person = await Person.findOne({ name: req.params.name });
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Update only the fields that are provided
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (relation !== undefined) updates.relation = relation;
    if (location !== undefined) updates.location = location;

    // If name is being changed, update all references in connections
    if (name && name !== req.params.name) {
      // Update this person's name in all other people's connections
      await Person.updateMany(
        { connections: req.params.name },
        { $set: { "connections.$[elem]": name } },
        { arrayFilters: [{ "elem": req.params.name }] }
      );
    }

    const updatedPerson = await Person.findOneAndUpdate(
      { name: req.params.name },
      { $set: updates },
      { new: true } // Return the updated document
    );

    res.json({ success: true, person: updatedPerson });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove connection from person
app.delete('/api/person/:name/connections/:connectionName', async (req, res) => {
  try {
    const person = await Person.findOne({ name: req.params.name });
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    person.connections = person.connections.filter(conn => conn !== req.params.connectionName);
    await person.save();

    res.json({ success: true, person });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new person
app.post('/api/people', async (req, res) => {
  try {
    const { name, relation, location } = req.body;
    
    const existingPerson = await Person.findOne({ name });
    if (existingPerson) {
      return res.status(400).json({ error: 'Person already exists' });
    }

    const newPerson = new Person({
      name,
      relation,
      location,
      connections: []
    });

    await newPerson.save();
    res.json({ success: true, person: newPerson });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve CMS page
app.get('/cms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cms.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
