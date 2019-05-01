const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const mongoose = require('mongoose')

// Models
const User = require('./models/User')
const Exercise = require('./models/Exercise')

const app = express()

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/exercise-track', {useNewUrlParser: true})

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// User Story #1

app.post('/api/exercise/new-user', (req, res, next) => {
  const username = req.body.username
  
  return User
    .create({username})
    .then(({_id, username}) => res.send( {_id, username}))
    .catch(err => next(err))
})

// User Story #2

app.get('/api/exercise/users', (req, res, next) => {
    return User.find()
      .then(docs => docs.map(doc => ({_id: doc._id, username: doc.username})))
      .then(users => res.send(users))
      .catch(err => next(err))
})


// User Story #3

/*
 I can add an exercise to any user by posting form data userId(_id), 
 description, duration, and optionally date to /api/exercise/add. If no date 
 supplied it will use current date.
 
 Returned will the the user object with also with the exercise fields added.
 */

app.post('/api/exercise/add', async (req, res, next) => {
  const {userId, description, duration} = req.body
  
  if (!(userId && description && duration)) {
    return res.send({error: 'Some required values were not specified.'}) 
  }
  
  let date = new Date(req.body.date) != 'Invalid Date'
    ? new Date(req.body.date)
    : new Date()
  
  let username
  
  try {
    const user = await User.findById(userId).exec()
    
    username = user.username
  } catch (err) {
    return res.send({error: 'User ID not found.'}) 
  }
  
  try {
    const exercise = new Exercise({userId, description, duration, date})
    
    await exercise.save()
    
    const response = {
      _id: exercise._id,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date,
      username
    }
    
    return res.send(response)
  } catch (err) {
    return res.send({error: 'Exercise could not be saved.'})
  }
})


// User Story #4 & #5

/*
  I can retrieve a full exercise log of any user by getting /api/exercise/log 
  with a parameter of userId(_id). 

  Return will be the user object with added array log and count (total exercise count).

  I can retrieve part of the log of any user by also passing along optional 
  parameters of from & to or limit. (Date format yyyy-mm-dd, limit = int)
*/

app.get('/api/exercise/log', async (req, res, next) => {
  const {userId, from, to, limit} = req.query

  if (!userId) {
    return res.send({error: 'userId is required.'})
  }
  
  let user
  
  try {
    user = await User
      .findById(userId)
      .select('-__v')
      .lean(true)
      .exec()
    
  } catch (err) {
    return res.send({error: 'User not found.'})
  }

  const query = Exercise.find({userId}).select('-userId -__v')
  
  if (from || to) {
    query.where('date')
    
    if (from) {
      query.gte(new Date(from))
    }
    
    if (to) {
      query.lte(new Date(to))
    }
  }
  
  if (limit && parseInt(limit)) {
    query.limit(parseInt(limit))
  }
  
  try {
    const exercises = await query.lean(true).exec()
    
    user.log = exercises
    user.count = exercises.length
    
    return res.send(user)
  } catch (err) {
  
    return res.send({error: 'Could not get exercises.'})
  }  
})


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'Page not found :('})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
