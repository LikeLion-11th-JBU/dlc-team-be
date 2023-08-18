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
  res.sendFile(__dirname + '/main.html')
})

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

// 로그아웃 기능
app.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err)
    }
    res.redirect('/')
  })
})
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
//약관동의
app.get('/registerA', function (req, res) {
  res.sendFile(__dirname + '/registerAgree.html')
})

app.get('/register', function (req, res) {
  res.render('register.ejs')
})

app.post('/register', async function (req, res) {
  const {
    이름,
    아이디,
    비밀번호,
    성별,
    전화번호1,
    전화번호2,
    전화번호3,
    핸드폰1,
    핸드폰2,
    핸드폰3,
    이메일1,
    이메일2,
    역할,
  } = req.body
  const 전화번호 = 전화번호1 + '-' + 전화번호2 + '-' + 전화번호3
  const 핸드폰 = 핸드폰1 + '-' + 핸드폰2 + '-' + 핸드폰3
  const 이메일 = 이메일1 + '@' + 이메일2
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

//회원가입 완료
app.get('/registerend', function (req, res) {
  res.sendFile(__dirname + '/registerEnd.html')
})
//아이디 중복체크
app.post('/checkUsername', async (req, res) => {
  const { username } = req.body
  const isDuplicate = await db.collection('users').findOne({ 아이디: username })
  res.json({ duplicate: isDuplicate })
})
//공지사항
app.get('/noti', function (req, res) {
  db.collection('posts')
    .find({ 구분: '공지사항' })
    .toArray()
    .then((result) => {
      res.render('noti.ejs', { posts: result })
    })
})
//공지작성 페이지
app.get('/noti/write', 로그인확인, function (req, res) {
  res.render('writeNOTI.ejs')
})
//작성글 DB에 추가
app.post('/addNOTI', function (req, res) {
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
          구분: '공지사항',
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
  res.redirect('/noti')
})
//정보나눔
app.get('/info', function (req, res) {
  db.collection('posts')
    .find({ 구분: '정보나눔' })
    .toArray()
    .then((result) => {
      res.render('info.ejs', { posts: result })
    })
})
//정보나눔작성페이지
app.get('/info/write', 로그인확인, function (req, res) {
  res.render('writeINFO.ejs')
})
//작성글 DB에 추가
app.post('/addINFO', function (req, res) {
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
          구분: '정보나눔',
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
  res.redirect('/info')
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
  res.render('writeQ&A.ejs')
})

//작성글 DB에 추가
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
  res.send("<script>alert('글이 수정되었습니다');history.go(-2);</script>")
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
      res.send("<script>alert('글이 삭제되었습니다');history.go(-3);</script>")
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
//자원봉사 안내
app.get('/bongsa1', function (req, res) {
  res.sendFile(__dirname + '/bongsa1.html')
})
//자원봉사 신청서
app.get('/bongsa2', function (req, res) {
  res.sendFile(__dirname + '/bongsa2.html')
})
//후원안내
app.get('/bongsa3', function (req, res) {
  res.sendFile(__dirname + '/bongsa3.html')
})
//후원단체
app.get('/bongsa4', function (req, res) {
  res.sendFile(__dirname + '/bongsa4.html')
})

//이미지 라우팅
//로고
app.get('/logo', function (req, res) {
  fs.readFile('./img/logo.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//백그라운드
app.get('/background', function (req, res) {
  fs.readFile('./img/background.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//카카오톡
app.get('/kakaologo', function (req, res) {
  fs.readFile('./img/ellipse-21.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//페이스북
app.get('/facebooklogo', function (req, res) {
  fs.readFile('./img/ellipse-22.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//image-4
app.get('/image-4', function (req, res) {
  fs.readFile('./img/image-4.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//마스크 사진
app.get('/rectangle-4', function (req, res) {
  fs.readFile('./img/rectangle-4.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})

//rectagle-15
app.get('/rectangle-15', function (req, res) {
  fs.readFile('./img/rectangle-15.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})

//rectagle-84
app.get('/rectangle-84', function (req, res) {
  fs.readFile('./img/rectangle-84.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//rectagle-127
app.get('/rectangle-127', function (req, res) {
  fs.readFile('./img/rectangle-127.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//rectangle-176
app.get('/rectangle-176', function (req, res) {
  fs.readFile('./img/rectangle-176.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//rectangle-177
app.get('/rectangle-177', function (req, res) {
  fs.readFile('./img/rectangle-177.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//rectangle-192
app.get('/rectangle-192', function (req, res) {
  fs.readFile('./img/rectangle-192.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//rectangle-193
app.get('/rectangle-193', function (req, res) {
  fs.readFile('./img/rectangle-193.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//rectangle-196
app.get('/rectangle-196', function (req, res) {
  fs.readFile('./img/rectangle-196.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//rectangle-200
app.get('/rectangle-200', function (req, res) {
  fs.readFile('./img/rectangle-200.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})
//rectangle-201
app.get('/rectangle-201', function (req, res) {
  fs.readFile('./img/rectangle-201.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
}) //rectangle-204
app.get('/rectangle-204', function (req, res) {
  fs.readFile('./img/rectangle-196.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
}) //rectangle-205
app.get('/rectangle-205', function (req, res) {
  fs.readFile('./img/rectangle-196.png', function (err, data) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(data)
  })
})

//사진첩
app.get('/album', function (req, res) {
  res.sendFile(__dirname + '/album.html')
})
//강사자료실
app.get('/data2', function (req, res) {
  res.sendFile(__dirname + '/data2.html')
})
