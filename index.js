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

app.get('/request', 로그인확인, 교육생, function (req, res) {
  res.send('강의 신청 페이지입니다')
})

//Q&A 게시판
//임시 글
const posts = require('./route/sample')
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

//글 삭제 페이지
app.get('/detail/:id/delete', 로그인확인, function (req, res) {
  let data = posts.sample.find((data) => data.번호 === parseInt(req.params.id))
  if (req.user.id == data.작성자) {
    res.render('delete.ejs', { data })
  } else {
    res.send("<script>alert('작성자가 아닙니다')</script>")
  }
})
//글 삭제 기능
app.delete('/delete', function (req, res) {
  let data = posts.sample.find((data) => data.번호 === parseInt(req.params.id))
  posts.sample.pop(data)
  res.redirect('/Q&A')
})

//파일업로드
app.get('/upload', function (req, res) {
  res.render('upload.ejs')
})

const multer = require('multer')

//파일 저장 디렉토리 설정
const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, 'upload/')
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname)
  },
})

//파일 업로드 미들웨어 생성
const upload = multer({ storage: storage })

//파일 업로드 처리
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).send('파일이 업로드되지 않았습니다.')
    return
  }
  videos.video.push({
    번호: videos.video.length + 1,
    강의: req.file.originalname,
    제목: req.body.videoTitle,
    교육자: req.user.id,
    업로드일자: new Date(),
  })

  console.log('업로드 완료!')
  res.redirect('/video')
})

//강의 개설페이지
app.get('/video', 로그인확인, 교육자, function (req, res) {
  const watch = videos.video.filter((watch) => watch.교육자 === req.user.id)
  res.render('video.ejs', { watch })
})

const videos = require('./route/video')
const fs = require('fs')

//강의 목록 페이지
app.get('/learnlist', function (req, res) {
  res.render('learnlist.ejs', { videos })
})
//강의 영상 경로 변수
let filePath = ''
//강의 시청 페이지
app.get('/learn/:id', function (req, res) {
  const watch = videos.video.find(
    (watch) => watch.번호 === parseInt(req.params.id)
  )
  filePath = `./upload/${watch.강의}`
  res.render('learn.ejs', { watch })
})
//영상 재생 기능
app.get('/watchVideo/:id', function (req, res) {
  const fileStat = fs.statSync(filePath)
  const { size } = fileStat
  const { range } = req.headers

  // 범위에 대한 요청이 있을 경우
  if (range) {
    // bytes= 부분을 없애고 - 단위로 문자열을 자름
    const parts = range.replace(/bytes=/, '').split('-')
    // 시작 부분의 문자열을 정수형으로 변환
    const start = parseInt(parts[0])
    // 끝 부분의 문자열을 정수형으로 변환 (끝 부분이 없으면 총 파일 사이즈에서 - 1)
    const end = parts[1] ? parseInt(parts[1]) : size - 1
    // 내보낼 부분의 길이
    const chunk = end - start + 1
    // 시작 부분과 끝 부분의 스트림을 읽음
    const stream = fs.createReadStream(filePath, { start, end })
    // 응답
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunk,
      'Content-Type': 'video/mp4',
    })
    // 스트림을 내보냄
    stream.pipe(res)
  } else {
    // 범위에 대한 요청이 아님
    res.writeHead(200, {
      'Content-Length': size,
      'Content-Type': 'video/mp4',
    })
    // 스트림을 만들고 응답에 실어보냄
    fs.createReadStream(filePath).pipe(res)
  }
})
