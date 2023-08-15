const express = require('express')
const app = express()

const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const MongoClient = require('mongodb').MongoClient
require('dotenv').config()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(methodOverride('_method'))

app.set('view engine', 'ejs')

let db

MongoClient.connect(process.env.MONGO_URL, function (err, client) {
  if (err) return console.log(err)
  db = client.db('DLC')
  app.listen(3000, function () {
    console.log('Listening on 3000')
  })
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
      db.collection('users').findOne(
        { 아이디: inputid },
        function (err, result) {
          if (err) return done(err)
          if (!result)
            return done(null, false, {
              message: '아이디 정보가 일치하지 않습니다.',
            })
          if (bcrypt.compareSync(inputpw, result.비밀번호)) {
            return done(null, result)
          } else {
            return done(null, false, { message: '비밀번호가 틀렸습니다' })
          }
        }
      )
    }
  )
)

// 사용자 정보를 세션에 저장
passport.serializeUser((user, done) => {
  done(null, user.아이디)
})

// 세션에서 사용자 정보 가져오기
passport.deserializeUser((아이디, done) => {
  db.collection('users').findOne({ 아이디: 아이디 }, function (err, result) {
    done(null, result)
  })
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
//권한 검사
function 교육생(req, res, next) {
  if (req.user.역할 === '교육생') {
    next()
  } else {
    res.send("<script>alert('교육생이 아닙니다')</script>")
  }
}
function 교육자(req, res, next) {
  if (req.user.역할 === '교육자') {
    next()
  } else {
    res.send("<script>alert('교육자가 아닙니다')</script>")
  }
}

//비밀번호 암호화 모듈
const bcrypt = require('bcryptjs')
const User = require('./models/User')

//회원가입
app.get('/register', function (req, res) {
  res.render('register.ejs')
})

app.post('/register', async function (req, res) {
  const { 이름, 아이디, 비밀번호, 성별, 전화번호, 핸드폰, 이메일, 역할 } =
    req.body

  try {
    let user = await db.collection('users').findOne({ 이메일 })
    if (user) {
      res.send("<script>alert('이미 가입된 이메일입니다')</script>")
    }

    const hashedPassword = await bcrypt.hash(비밀번호, 10)
    user = new User({
      이름,
      아이디,
      비밀번호: hashedPassword,
      성별,
      전화번호,
      핸드폰,
      이메일,
      역할,
    })

    db.collection('users').insertOne(user)

    res.redirect('/login')
  } catch (error) {
    console.log(error)
    res.status(500).send('오류 발생')
  }
})

//아이디 중복체크
app.post('/checkUsername', async (req, res) => {
  const { username } = req.body
  const isDuplicate = await db.collection('users').findOne({ 아이디: username })
  res.json({ duplicate: isDuplicate })
})
//강의 신청 게시판
app.get('/request', 로그인확인, 교육생, function (req, res) {
  res.send('강의 신청 페이지입니다')
})

//Q&A(건의사항)게시판
app.get('/Q&A', function (req, res) {
  db.collection('posts')
    .find({ 구분: '건의사항' })
    .toArray()
    .then((result) => {
      res.render('Q&A.ejs', { posts: result })
    })
})

//작성 페이지
app.get('/Q&A/write', 로그인확인, function (req, res) {
  res.render('/writeQ&A.ejs')
})

//작성글 배열에 추가
app.post('/addQ&A', function (req, res) {
  db.collection('postCounter').findOne(
    { name: '글개수' },
    function (err, result) {
      var totalposts = result.postscounter

      db.collection('posts').insertOne(
        {
          _id: totalposts + 1,
          제목: req.body.title,
          내용: req.body.detail,
          날짜: new Date(),
          작성자아이디: req.user.아이디,
          작성자이름: req.user.이름,
          구분: '건의사항',
        },
        function (err, result) {
          db.collection('postCounter').updateOne(
            { name: '글개수' },
            {
              $inc: { postscounter: 1 },
              function(err, result) {
                if (err) {
                  return console.log(err)
                }
              },
            }
          )
        }
      )
    }
  )
  res.redirect('/Q&A')
})

//작성글 내용 확인
app.get('/detail/:id', function (req, res) {
  db.collection('posts').findOne(
    { _id: parseInt(req.params.id) },
    function (err, result) {
      res.render('detail.ejs', { data: result })
    }
  )
})

//글 수정
app.get('/detail/:id/rewrite', 로그인확인, function (req, res) {
  db.collection('posts').findOne(
    { _id: parseInt(req.params.id) },
    function (err, result) {
      if (req.user.아이디 == result.작성자아이디) {
        res.render('rewrite.ejs', { data: result })
      } else {
        res.send("<script>alert('작성자가 아닙니다')</script>")
      }
    }
  )
})
app.put('/rewrite', function (req, res) {
  db.collection('posts').updateOne(
    { _id: parseInt(req.body.id) },
    {
      $set: {
        제목: req.body.title,
        내용: req.body.detail,
        날짜: new Date(),
      },
    }
  )
  res.redirect('/Q&A')
})

//글 삭제 페이지
app.get('/detail/:id/delete', 로그인확인, function (req, res) {
  db.collection('posts').findOne(
    { _id: parseInt(req.params.id) },
    function (err, result) {
      if (req.user.아이디 == result.작성자아이디) {
        res.render('delete.ejs', { data: result })
      } else {
        res.send("<script>alert('작성자가 아닙니다')</script>")
      }
    }
  )
})
//글 삭제 기능
app.post('/delete', function (req, res) {
  db.collection('posts').deleteOne(
    { _id: parseInt(req.body.id) },
    function (err, result) {
      res.redirect('/Q&A')
    }
  )
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
  db.collection('videoCounter').findOne(
    { name: '영상개수' },
    function (err, result) {
      let 총영상개수 = result.videocounter
      let video = {
        _id: 총영상개수 + 1,
        교육자아이디: req.user.아이디,
        교육자이름: req.user.이름,
        제목: req.body.videoTitle,
        강의: req.file.originalname,
        업로드일자: new Date(),
      }
      db.collection('videos').insertOne(video, function (err, result) {
        db.collection('videoCounter').updateOne(
          { name: '영상개수' },
          { $inc: { videocounter: 1 } },
          function (err, result) {
            if (err) {
              return console.log('저장 완료')
            }
            res.redirect('/video')
          }
        )
      })
    }
  )
})

//강의 개설페이지
app.get('/video', 로그인확인, 교육자, function (req, res) {
  db.collection('videos')
    .find({ 교육자아이디: req.user.아이디 })
    .toArray()
    .then((result) => {
      res.render('video.ejs', { data: result })
    })
})

const fs = require('fs')

//강의 목록 페이지
app.get('/learnlist', async function (req, res) {
  db.collection('videos')
    .find()
    .toArray()
    .then((result) => {
      console.log(result)
      res.render('learnlist.ejs', { videos: result })
    })
})
//강의 영상 경로 변수
let filePath = ''
//강의 시청 페이지
app.get('/learn/:id', function (req, res) {
  db.collection('videos').findOne(
    {
      _id: parseInt(req.params.id),
    },
    function (err, result) {
      filePath = `./upload/${result.강의}`
      res.render('learn.ejs', { watch: result })
    }
  )
})
//영상 재생 기능
app.get('/watchVideo/:id', function (req, res) {
  const fileStat = fs.statSync(filePath)
  const { size } = fileStat
  const { range } = req.headers

  // 범위에 대한 req이 있을 경우
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
    // 범위에 대한 req이 아님
    res.writeHead(200, {
      'Content-Length': size,
      'Content-Type': 'video/mp4',
    })
    // 스트림을 만들고 응답에 실어보냄
    fs.createReadStream(filePath).pipe(res)
  }
})

//센터 맵
app.get('/map', function (req, res) {
  db.collection('center')
    .find()
    .toArray()
    .then((result) => {
      res.render('map.ejs', { apikey: process.env.API_KEY, data: result })
    })
})
