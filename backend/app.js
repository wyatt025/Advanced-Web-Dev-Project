const express = require('express');
const app = express()
const port = 3001

app.use(express.json());

const pools = require('./helpers/db'); 

const { adminRouter } = require('./routes/adminRoute') 
const userRouter = require('./routes/userRoute')

app.use('/admin', adminRouter);
app.use('/user', userRouter);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})