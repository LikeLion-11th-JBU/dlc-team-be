const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  이름: {
    type: String,
    required: true,
  },
  아이디: {
    type: String,
    required: true,
  },
  비밀번호: {
    type: String,
    required: true,
  },
  성별: {
    type: String,
    required: true,
  },
  전화번호: {
    type: String,
    required: true,
  },
  핸드폰: {
    type: String,
    required: true,
  },
  이메일: {
    type: String,
    required: true,
    unique: true,
  },
  역할: {
    type: String,
    required: true,
  },
})

module.exports = User = mongoose.model('user', UserSchema)
