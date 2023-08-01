const express = require('express')
const app = express()

const bodyParser = require('body-parser')

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.urlencoded({ extended: true }))

app.listen(3000, function () {
  console.log('Listening on 3000')
})

app.get('/', function (req, res) {
  res.send('홈입니다')
})

//임시 유저 데이터베이스
const users = [
  { id: 'asd', pw: '1234', 구분: '교육자' },
  { id: 'dfg', pw: '5678', 구분: '교육생' },
]

//로그인 구현

const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session')

app.use(session({ secret: '비밀코드', resave: true, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())

app.get('/login', function (req, res) {
  res.sendFile(__dirname + '/login.html')
})

app.post(
  '/login',
  passport.authenticate('local', { failureRedirect: '/fail' }),
  function (req, res) {
    res.redirect('/')
  }
)

passport.use(
  new LocalStrategy(
    {
      usernameField: 'id',
      passwordField: 'pw',
      session: true,
      passReqToCallback: false,
    },
    function (inputid, inputpw, done) {
      console.log(inputid, inputpw)
      const user = users.find(
        (user) => user.id === inputid && user.pw === inputpw
      )
      if (user) {
        // 로그인 성공
        return done(null, user)
      } else {
        // 로그인 실패
        return done(null, false, {
          message: '아이디 또는 비밀번호가 일치하지 않습니다.',
        })
      }
    }
  )
)

// 사용자 정보를 세션에 저장
passport.serializeUser((user, done) => {
  done(null, user.id)
})

// 세션에서 사용자 정보 가져오기
passport.deserializeUser((id, done) => {
  const user = users.find((user) => user.id === id)
  done(null, user)
})
