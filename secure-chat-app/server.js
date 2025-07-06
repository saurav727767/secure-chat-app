const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'mySecret123',
  resave: false,
  saveUninitialized: false
}));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Routes
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.send('User already exists');
  const user = new User({ email, password });
  await user.save();
  req.session.userId = user._id;
  res.redirect('/chat.html');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.send('Invalid credentials');
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.send('Invalid credentials');
  req.session.userId = user._id;
  res.redirect('/chat.html');
});

// Socket.io
io.on('connection', socket => {
  socket.on('joinRoom', room => {
    socket.join(room);
    socket.room = room;
  });

  socket.on('chatMessage', msg => {
    io.to(socket.room).emit('chatMessage', msg);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
