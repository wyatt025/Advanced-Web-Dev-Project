const express = require("express")
const path = require('path')

const app = express();
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {    
  res.render('index', {pageId:"index", title:"Aurora"});
});
app.get('/movies', (req, res) => {
    // This array can later be populated by an API or Database query
    const moviesList = [
        {
            title: 'Inception',
            year: 2010,
            genre: 'Sci-Fi',
            rating: '8.8',
            image: 'https://unsplash.com',
            description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.'
        },
        {
            title: 'The Dark Knight',
            year: 2008,
            genre: 'Action',
            rating: '9.0',
            image: 'https://unsplash.com',
            description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological tests.'
        },
        {
            title: 'Interstellar',
            year: 2014,
            genre: 'Adventure',
            rating: '8.7',
            image: 'https://unsplash.com',
            description: 'When Earth becomes uninhabitable, a team of explorers travels through a wormhole in space in an attempt to ensure humanity\'s survival.'
        }
    ];

    res.render('movies', { 
        pageId: 'movies',
        movies: moviesList,
        title:"Movies"
    });
});


app.get('/about', (req, res) => {
    // You can also pass dynamic data like team members from a database
    const team = [
        { name: 'Jane Doe', role: 'CEO & Founder', image: 'https://unsplash.com' },
        { name: 'John Smith', role: 'Lead Developer', image: 'https://unsplash.com' },
        { name: 'Alex Jones', role: 'UI/UX Designer', image: 'https://unsplash.com' }
    ];
    
    res.render('about', { 
        pageId: 'about',
        teamMembers: team,
        title:"About"
    });
});


app.use((req, res, next) => {
  res.status(404).render('404', {pageId:"404", title:"Not found."});
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(80,()=>{
    console.log("Server listening on 80.")
})