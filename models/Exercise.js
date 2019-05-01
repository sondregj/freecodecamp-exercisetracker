const mongoose = require('mongoose')

const ExerciseSchema = new mongoose.Schema({
  userId: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, required: true}
})

module.exports = mongoose.model('Exercise', ExerciseSchema)