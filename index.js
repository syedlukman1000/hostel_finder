const express = require('express')
var mysql = require('mysql');
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const path = require('path');
const flash = require('connect-flash')
const session = require('express-session')
let cookie_parser = require('cookie-parser');


const multer = require('multer')
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/images/')
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname))
    }
})
const upload = multer({ storage })


const app = express()

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookie_parser('1234'))
app.use(express.static('public'));
app.use(session({ secret: 'thisisasecret', resave: false, saveUninitialized: false }))
app.use(flash())
app.use((req, res, next) => {
    res.locals.success = req.flash("success")
    res.locals.error = req.flash("error")
    next()

})

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'waytohostel'
});

connection.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + connection.threadId);
});


app.get('/', async (req, res) => {
    let user = req.signedCookies.user

    var query = 'SELECT * FROM hostels LIMIT 4';
    await connection.query(query, async (error, result, fields) => {
        if (error) {
            req.flash("error", error)
            res.render("home.ejs", { user: user, hostels: result })
        }
        else {
            res.render("home.ejs", { user: user, hostels: result })
        }
    })


})


app.get('/signup', (req, res) => {
    let user = req.signedCookies.user
    if (user) {
        return res.redirect('/')
    }
    res.render("signup.ejs")
})

app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body

    var query = 'insert into user(name,email,password) values(?,?,?)';
    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            req.flash("error", err.message)
            return res.redirect('/signup')
        }
        else {
            bcrypt.hash(password, salt, async (err, hash) => {
                if (err) {
                    req.flash("error", err.message)
                    return res.redirect('/signup')
                }
                else {
                    await connection.query(query, [name, email, hash], function (error, results, fields) {
                        if (error) {
                            req.flash("error", "user already exists")
                            return res.redirect('/signup')
                        }
                        else {
                            req.flash("success", "Successfully signed up")
                            res.cookie('user', email, { signed: true })
                            res.redirect('/')
                        }

                    })
                }
            })
        }
    })
})

app.get('/signout', (req, res) => {
    res.status(200).clearCookie('user', {
        path: '/'
    });
    req.flash("success", "Successfully signed out");
    res.redirect('/')

})

app.get('/signin', (req, res) => {
    let user = req.signedCookies.user
    if (user) {
        return res.redirect('/')
    }
    res.render('signin.ejs')

})

app.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    var query = 'select * from user where email=?';
    await connection.query(query, [email], async (error, results, fields) => {
        if (error) {
            req.flash("error", error)
            res.redirect('/signin')
        }
        else {
            if (results.length == 0) {
                req.flash("error", "no user found")
                res.redirect('/signin')
            }
            else {
                await bcrypt.compare(password, results[0]["password"], (err, isMatch) => {
                    if (err) {
                        req.flash("error", err.message)
                        res.redirect('/signin')
                    }
                    if (!isMatch) {
                        req.flash("error", "incorrect username and password")
                        res.redirect('/signin')
                    }
                    else if (isMatch) {
                        req.flash("success", "Successfully signed in")
                        res.cookie('user', email, { signed: true })
                        res.redirect('/')
                    }
                })
            }
        }
    })

})

app.get('/addhostel', (req, res) => {
    res.render('addhostel.ejs')
})

app.post('/addhostel', upload.single("image"), async (req, res) => {
    const { name, email, password, town, district, state, pincode, share1, share2, share3, share4 } = req.body;
    console.log(req)
    var query = 'insert into hostels values(?,?,?,?,?,?,?,?,?,?,?,?)';


    await connection.query(query, [name, email, password, town, district, state, pincode, share1, share2, share3, share4, req.file.filename], function (error, results, fields) {
        if (error) {
            req.flash("error", error.message)
            res.redirect('/addhostel')
        }
        else {
            req.flash("success", "Hostel added successfully")
            res.redirect('/')
        }

    })



})

app.get('/browsehostels', async (req, res) => {
    let user = req.signedCookies.user
    const pin = req.query.pincode

    if (!pin) {
        res.render('browsehostels.ejs', { user, hostels: [] })

    }
    else {
        console.log("hello")
        var query = 'SELECT * FROM `hostels` where pincode=?';
        await connection.query(query, [pin], async (error, result, fields) => {
            if (error) {
                req.flash("error", error.message)
                res.render('browsehostels.ejs', { user, hostels: [] })
            }
            else {
                res.render("browsehostels.ejs", { user, hostels: result })
            }
        })

    }

})

app.get('/details/:id', async (req, res) => {
    let user = req.signedCookies.user
    let id = req.params.id
    if (!id) {
        req.flash("error", "no hostel found")
        res.render('details.ejs', { id: id, user, details: {} })
    }
    else {
        var query = 'SELECT * FROM `hostels` where email=?';
        await connection.query(query, [id], async (error, result, fields) => {
            if (error) {
                req.flash("error", error.message)
                res.redirect('/browsehostels')
            }
            else {

                var query1 = 'select * from reviews where hostelemail=?'
                await connection.query(query1, [id], async (error, result1, fields) => {
                    if (error) {
                        req.flash("error", error.message)
                        res.render("details.ejs", { id: id, user: user, details: result })
                    }
                    else {
                        res.render("details.ejs", { id: id, user: user, details: result, reviews: result1 })

                    }
                })

            }
        })

    }
})



app.post('/addreview/:id', async (req, res) => {
    console.log(req.headers.authorization)
    let id = req.params.id
    const user = req.signedCookies.user
    let review = req.body.review
    let rating = req.body.rating


    console.log(user)
    if (!user) {
        req.flash("error", "Sign in/Sign up to add review")
        return res.redirect(`/details/${id}`)

    }

    var query = 'insert into reviews values(?,?,?,?)';
    await connection.query(query, [id, user, review, rating], function (error, results, fields) {
        if (error) {
            req.flash("error", error.message)
            res.redirect(`/details/${id}`)
        }
        else {
            req.flash("success", "Review added Successfully");
            res.redirect(`/details/${id}`)
        }

    })




})

app.listen(3000, () => {
    console.log('listening on port 3000')
})