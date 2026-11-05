const express = require('express');
const app = express()
const port = 3001

const pools = require('./helpers/db'); 

const userRouter = require('./routes/userRoute')

app.use('/user', userRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})