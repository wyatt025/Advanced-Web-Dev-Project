const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const { checkOrigin } = require('./middleware/checkOrigin');
const { adminRouter } = require('./routes/adminRoute');
const userRouter = require('./routes/userRoute');
const { login } = require('./middleware/login');
const { authCookieOptions } = require('./middleware/authCookie');
const { authenticate } = require('./middleware/token&roleAuth');

const port = process.env.PORT || 3001;

app.use(express.json());
app.use(cookieParser());
app.use(checkOrigin);

const pools = require('./helpers/db'); 



app.post('/auth/login', login);
app.post('/auth/logout', (req, res) => {
    res.clearCookie('authToken', authCookieOptions);
    return res.status(204).end();
});
app.get('/auth/me', authenticate, (req, res) => {
    return res.json({ role: req.user.role });
});

app.use('/admin', adminRouter);
app.use('/user', userRouter);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})