const express = require('express')
const app = express()

const bodyParser = require('body-parser')
const methodOverride = require('method-override')

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(methodOverride('_method'))

app.set('view engine', 'ejs')

app.listen(3000, function () {
  console.log('Listening on 3000')
})

app.get('/', function (req, res) {
  res.send('홈입니다')
})

//임시 유저 데이터베이스
const users = [
  { id: 'asd', pw: '1234', 권한: '교육자' },
  { id: 'dfg', pw: '5678', 권한: '교육생' },
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

//로그인 확인
function 로그인확인(req, res, next) {
  if (req.user) {
    next()
  } else {
    res.send(
      "<script>alert('로그인하지않았습니다'); location.href='/login';</script>"
    )
  }
}

function 교육생(req, res, next) {
  if (req.user.권한 === '교육생') {
    next()
  } else {
    res.send("<script>alert('교육생이 아닙니다')</script>")
  }
}
function 교육자(req, res, next) {
  if (req.user.권한 === '교육자') {
    next()
  } else {
    res.send("<script>alert('교육자가 아닙니다')</script>")
  }
}

app.get('/video', 로그인확인, 교육자, function (req, res) {
  res.send('강의 개설 페이지입니다')
})

app.get('/request', 로그인확인, 교육생, function (req, res) {
  res.send('강의 신청 페이지입니다')
})

//Q&A 게시판
//임시 글
const posts = require('./sample')
//Q&A 페이지에 임시 글 전송
app.get('/Q&A', function (req, res) {
  res.render('Q&A.ejs', { posts })
})

//작성 페이지
app.get('/Q&A/write', 로그인확인, function (req, res) {
  res.sendFile(__dirname + '/write.html')
  // console.log(req.user.id)
})

//작성글 배열에 추가
app.post('/add', function (req, res) {
  posts.sample.push({
    번호: posts.sample.length + 1,
    작성자: req.user.id,
    제목: req.body.title,
    내용: req.body.detail,
    날짜: new Date(),
  })
  res.redirect('/Q&A')
})

//작성글 내용 확인
app.get('/detail/:id', function (req, res) {
  const data = posts.sample.find(
    (data) => data.번호 === parseInt(req.params.id)
  )
  res.render('detail.ejs', { data })
})

//글 수정
app.get('/detail/:id/rewrite', 로그인확인, function (req, res) {
  let data = posts.sample.find((data) => data.번호 === parseInt(req.params.id))
  if (req.user.id == data.작성자) {
    res.render('rewrite.ejs', { data })
  } else {
    res.send("<script>alert('작성자가 아닙니다')</script>")
  }
})
app.put('/rewrite', function (req, res) {
  let data = posts.sample.find((data) => data.번호 === parseInt(req.body.id))
  data.제목 = req.body.title
  data.내용 = req.body.detail
  res.redirect('/Q&A')
})

//글 삭제
app.get('/detail/:id/delete', 로그인확인, function (req, res) {
  let data = posts.sample.find((data) => data.번호 === parseInt(req.params.id))
  if (req.user.id == data.작성자) {
    res.render('delete.ejs', { data })
  } else {
    res.send("<script>alert('작성자가 아닙니다')</script>")
  }
})
app.delete('/delete', function (req, res) {
  let data = posts.sample.find((data) => data.번호 === parseInt(req.params.id))
  posts.sample.pop(data)
  res.redirect('/Q&A')
})
