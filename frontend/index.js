const express = require("express")

const app = express();
app.set('view engine', 'ejs');

app.get('/', (req, res) => {    
  res.render('index', {title:"mypage"});
});

app.use((req, res, next) => {
  res.status(404).render('404', {title:"Not found."});
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(80,()=>{
    console.log("Server listening on 80.")
})