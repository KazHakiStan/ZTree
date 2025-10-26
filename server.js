const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
