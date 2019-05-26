const express = require('express');
const app = express();
const https = require('https');
const querystring = require('querystring');
const request = require("request-promise-native");
const cookieParser = require('cookie-parser');
const cookies = require('browser-cookies');

// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static('public'));
app.use(cookieParser());

app.get('/', (req, res) => {
	res.render('home');
});

app.get('/login', (req, res) => {
	res.render('login');
});

app.get('/products', (req, res) => {
	res.render('products');
	// Add logic to check if person is logged in, if not, show a message to say need login to access
});

app.get('/products/:name', (req, res) => {
	var name = req.params.name;
	if (name == 'bag' || name == 'lamp' || name == 'shoe' || name == 'specs' || name == 'watch') {
		res.render('indivproduct', {name:name});
	}  else {
		res.status(404).send('This is an invalid page');
	}
});

app.get('/thankyou', (req, res) => {
	res.render('thankyou');
});

app.get('/thankyouforsubscribing', (req, res) => {
	res.render('thankyouform');
});

app.post('/subscribe', (req, res) => {
	var postData = querystring.stringify({
	    'email': req.body.email,
	    'firstname': req.body.firstname,
	    'hs_context': JSON.stringify({
	        "hutk": req.cookies.hubspotutk,
	        "ipAddress": req.headers['x-forwarded-for'] || req.connection.remoteAddress,
	        "pageUrl": "http://www.example.com/form-page",
	        "pageName": "Web app"
	    })
	});

// set the post options, changing out the HUB ID and FORM GUID variables.

	var options = {
		hostname: 'forms.hubspot.com',
		path: '/uploads/form/v2/3787161/b5913b6a-7d2d-4d2f-9a9e-186d909d1d2b',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length
		}
	}

// set up the request

	var request = https.request(options, function(response){
		console.log("Status: " + response.statusCode);
		console.log("Headers: " + JSON.stringify(response.headers));
		response.setEncoding('utf8');
		response.on('data', function(chunk){
			console.log('Body: ' + chunk)
		});
	});

	request.on('error', function(e){
		console.log("Problem with request " + e.message)
	});

// post the data

	request.write(postData);
	request.end();

	res.redirect('/thankyouforsubscribing');
});

app.post('/deal/:name', async (req, res) => {
	var name = req.params.name;
	// Get contact by cookie
	var hsCookie = req.cookies.hubspotutk;
	var url = 'https://api.hubapi.com/contacts/v1/contact/utk/' + hsCookie +'/profile?hapikey=36580426-0a35-4ac6-955d-2244e024e17b';
	const contact = async () => {
		try {
		const data = await request.get(url, {json: true});
		//console.log(data.vid);
		return data;
	} catch (e) {
		return {msg: e.message}
	}};
	
	let contactVid = await contact();
	console.log(contactVid.vid);

	var options = { method: 'POST',
	  url: 'https://api.hubapi.com/deals/v1/deal',
	  qs: { hapikey: '36580426-0a35-4ac6-955d-2244e024e17b' },
	  headers: 
	   { 'Content-Type': 'application/json' },
	  body: 
	   { associations: { associatedVids: [ contactVid.vid ] },
	     properties: 
	      [ { value: name, name: 'dealname' },
	        { value: 'appointmentscheduled', name: 'dealstage' },
	        { value: 'default', name: 'pipeline' },
	        { value: '250', name: 'amount' } ] },
	  json: true };

	request(options, function (error, response, body) {
	  if (error) throw new Error(error);
	  console.log(body);
	}); 

	res.redirect('/thankyou');
});




app.listen(port, () => {
	console.log('This app is running on port' + port)
});
