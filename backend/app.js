const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const { checkOrigin } = require('./middleware/checkOrigin');
const { adminRouter } = require('./routes/admin/adminRouter');
const userRouter = require('./routes/user/userRouter');
const authRouter = require('./routes/auth/authRoutes');
const stripeRouter = require('./routes/payments/stripeRoutes');

const port = process.env.PORT || 3001;

app.use(cookieParser());
app.use(stripeRouter);
app.use(express.json());
app.use(checkOrigin);
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/user', userRouter);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})